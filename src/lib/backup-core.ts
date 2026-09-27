/**
 * Full-site backup and restore: every database table (except throwaway security state)
 * plus uploaded product and chat images, in one ZIP file.
 *
 * Used by the admin panel routes and by scripts/backup.ts, so it must not import "server-only".
 */
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { Prisma, type PrismaClient } from "../generated/prisma/client";

export const BACKUP_APP = "arizon-yadak";
export const BACKUP_FORMAT = 1;

/** Restore order respects foreign keys (parents first). Names match Prisma models and SQL tables. */
const TABLES = [
  "User", "Category", "Brand", "CarModel", "Product", "ProductImage", "ProductFitment", "Review", "WishlistItem",
  "Cart", "CartItem", "Address", "DiscountCode", "Order", "OrderItem", "OrderEvent", "Payment",
  "Notification", "Ticket", "TicketMessage", "ChatConversation", "ChatMessage", "Faq", "Setting", "AuditLog",
] as const;
type Table = (typeof TABLES)[number];

/** Tables added after the first release: older backups don't have them and restore them as empty. */
const OPTIONAL_TABLES = new Set<Table>(["ChatConversation", "ChatMessage"]);

/** Upload folders included in backups. */
const UPLOAD_FOLDERS = ["products", "chat"] as const;

/** Short-lived security state: never backed up, always cleared on restore (everyone signs in again). */
const TRANSIENT = ["Session", "OtpCode", "RateLimit"] as const;

/** Nullable JSON columns need Prisma.DbNull instead of a plain null on insert. */
const JSON_COLUMNS: Partial<Record<Table, string[]>> = { Product: ["specs"], AuditLog: ["meta"] };

const MAX_ZIP_BYTES = 500 * 1024 * 1024;
const MAX_UNZIPPED_BYTES = 1024 * 1024 * 1024;
const MAX_ENTRIES = 20_000;
const UPLOAD_ENTRY = /^uploads\/(products|chat)\/[A-Za-z0-9_-]{16,64}\.webp$/;

type Manifest = {
  app: string;
  format: number;
  createdAt: string;
  migrations: string[];
  counts: Record<string, number>;
  files: number;
};

const delegate = (db: PrismaClient, table: Table) => {
  const key = (table[0].toLowerCase() + table.slice(1)) as keyof PrismaClient;
  return db[key] as unknown as {
    findMany: (args?: object) => Promise<Record<string, unknown>[]>;
    createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
  };
};

async function appliedMigrations(db: PrismaClient) {
  const rows = await db.$queryRaw<{ migration_name: string }[]>`
    SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
  return rows.map((r) => r.migration_name);
}

/** Creates the backup ZIP in memory. */
export async function createBackup(db: PrismaClient, uploadDir: string) {
  const files: Zippable = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows = await delegate(db, table).findMany();
    counts[table] = rows.length;
    files[`data/${table}.json`] = strToU8(JSON.stringify(rows));
  }

  let fileCount = 0;
  for (const folder of UPLOAD_FOLDERS) {
    const dir = path.join(uploadDir, folder);
    const names = await readdir(dir).catch(() => [] as string[]);
    for (const name of names) {
      const entry = `uploads/${folder}/${name}`;
      if (!UPLOAD_ENTRY.test(entry)) continue;
      // Images are already compressed; store them as-is.
      files[entry] = [new Uint8Array(await readFile(path.join(dir, name))), { level: 0 }];
      fileCount++;
    }
  }

  const manifest: Manifest = {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    createdAt: new Date().toISOString(),
    migrations: await appliedMigrations(db),
    counts,
    files: fileCount,
  };
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  return { zip: zipSync(files, { level: 6 }), manifest };
}

export class BackupError extends Error {}

/** Opens and validates a backup ZIP without touching the database. */
export function readBackup(zipBytes: Uint8Array) {
  if (zipBytes.byteLength > MAX_ZIP_BYTES) throw new BackupError("حجم فایل بکاپ بیش از حد مجاز است.");
  let total = 0;
  let entries = 0;
  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(zipBytes, {
      // Checked before inflating anything: guards against zip bombs and unexpected paths.
      filter: (f) => {
        entries++;
        total += f.originalSize;
        if (entries > MAX_ENTRIES || total > MAX_UNZIPPED_BYTES) throw new BackupError("محتوای فایل بکاپ بیش از حد بزرگ است.");
        return f.name === "manifest.json" || /^data\/[A-Za-z]+\.json$/.test(f.name) || UPLOAD_ENTRY.test(f.name);
      },
    });
  } catch (e) {
    if (e instanceof BackupError) throw e;
    throw new BackupError("فایل انتخاب‌شده یک فایل بکاپ معتبر (ZIP) نیست.");
  }

  let manifest: Manifest;
  try {
    manifest = JSON.parse(strFromU8(unzipped["manifest.json"]));
  } catch {
    throw new BackupError("این فایل، بکاپ آریزون یدک نیست (manifest یافت نشد).");
  }
  if (manifest.app !== BACKUP_APP || manifest.format !== BACKUP_FORMAT) throw new BackupError("این فایل، بکاپ آریزون یدک نیست یا نسخه آن پشتیبانی نمی‌شود.");

  const tables = {} as Record<Table, Record<string, unknown>[]>;
  for (const table of TABLES) {
    const raw = unzipped[`data/${table}.json`];
    if (!raw && OPTIONAL_TABLES.has(table)) {
      tables[table] = [];
      continue;
    }
    if (!raw) throw new BackupError(`جدول ${table} در فایل بکاپ وجود ندارد.`);
    const rows = JSON.parse(strFromU8(raw));
    if (!Array.isArray(rows) || rows.some((r) => typeof r !== "object" || r === null || Array.isArray(r))) {
      throw new BackupError(`داده‌های جدول ${table} معتبر نیست.`);
    }
    tables[table] = rows;
  }
  const uploads = Object.entries(unzipped).filter(([name]) => UPLOAD_ENTRY.test(name));
  return { manifest, tables, uploads };
}

/**
 * Replaces ALL site data with the backup's content, atomically: if any row fails,
 * nothing changes. Uploaded images are swapped in only after the database commit.
 */
export async function restoreBackup(db: PrismaClient, uploadDir: string, zipBytes: Uint8Array) {
  const { manifest, tables, uploads } = readBackup(zipBytes);

  const current = new Set(await appliedMigrations(db));
  const unknown = manifest.migrations.filter((m) => !current.has(m));
  if (unknown.length) throw new BackupError("این بکاپ از نسخه جدیدتری از سایت گرفته شده است. ابتدا سایت را به‌روزرسانی کنید.");

  // Stage images next to the live folders first, so a write failure can't leave the DB restored without them.
  const stagingDir = path.join(uploadDir, `.restore-${Date.now()}`);
  for (const folder of UPLOAD_FOLDERS) await mkdir(path.join(stagingDir, folder), { recursive: true });
  try {
    for (const [name, data] of uploads) {
      const [, folder, file] = name.split("/");
      await writeFile(path.join(stagingDir, folder, path.basename(file)), data);
    }

    // Main categories before subcategories (self-reference).
    tables.Category.sort((a, b) => Number(a.parentId !== null) - Number(b.parentId !== null));

    await db.$transaction(
      async (tx) => {
        const all = [...TABLES, ...TRANSIENT].map((t) => `"${t}"`).join(", ");
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${all} RESTART IDENTITY CASCADE`);
        for (const table of TABLES) {
          const jsonCols = JSON_COLUMNS[table] ?? [];
          const rows = tables[table].map((row) => {
            const copy = { ...row };
            for (const c of jsonCols) if (copy[c] === null || copy[c] === undefined) copy[c] = Prisma.DbNull;
            return copy;
          });
          for (let i = 0; i < rows.length; i += 1000) {
            await delegate(tx as unknown as PrismaClient, table).createMany({ data: rows.slice(i, i + 1000) });
          }
        }
        // Continue auto-numbering after the restored order and ticket numbers.
        for (const [table, column] of [["Order", "number"], ["Ticket", "number"], ["ChatConversation", "number"]]) {
          await tx.$executeRawUnsafe(
            `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), COALESCE((SELECT MAX("${column}") FROM "${table}"), 1), (SELECT MAX("${column}") FROM "${table}") IS NOT NULL)`,
          );
        }
      },
      { timeout: 10 * 60 * 1000, maxWait: 30_000 },
    );

    // Database committed: swap the image folders.
    for (const folder of UPLOAD_FOLDERS) {
      const liveDir = path.join(uploadDir, folder);
      const oldDir = path.join(uploadDir, `.old-${folder}-${Date.now()}`);
      await rename(liveDir, oldDir).catch(() => undefined);
      await rename(path.join(stagingDir, folder), liveDir);
      await rm(oldDir, { recursive: true, force: true });
    }
    await rm(stagingDir, { recursive: true, force: true });
  } catch (e) {
    await rm(stagingDir, { recursive: true, force: true });
    if (e instanceof Prisma.PrismaClientKnownRequestError || e instanceof Prisma.PrismaClientValidationError) {
      throw new BackupError("داده‌های بکاپ با ساختار فعلی سایت سازگار نیست؛ هیچ تغییری اعمال نشد.", { cause: e });
    }
    throw e;
  }

  return { manifest, counts: Object.fromEntries(TABLES.map((t) => [t, tables[t].length])), files: uploads.length };
}
