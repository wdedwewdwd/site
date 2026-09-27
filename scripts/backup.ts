/**
 * Command-line backup and restore (same format as the admin panel).
 *
 *   npm run backup:create -- [output.zip]
 *   npm run backup:restore -- backup.zip --yes     (replaces ALL site data)
 */
import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createBackup, restoreBackup } from "../src/lib/backup-core";

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? "./storage/uploads");

async function main() {
  const [command, file, ...flags] = process.argv.slice(2);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 }) });
  try {
    if (command === "create") {
      const out = file ?? `arizon-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
      const { zip, manifest } = await createBackup(db, uploadDir);
      await writeFile(out, zip);
      console.log(`Backup written to ${out} (${(zip.byteLength / 1024).toFixed(0)} KB)`, manifest.counts, `images: ${manifest.files}`);
    } else if (command === "restore") {
      if (!file) throw new Error("Usage: npm run backup:restore -- backup.zip --yes");
      if (!flags.includes("--yes")) throw new Error("This replaces ALL site data. Re-run with --yes to confirm.");
      const result = await restoreBackup(db, uploadDir, new Uint8Array(await readFile(file)));
      console.log("Restore complete:", result.counts, `images: ${result.files}`);
    } else {
      throw new Error("Usage: npm run backup:create -- [file] | npm run backup:restore -- file --yes");
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  if (e instanceof Error && e.cause instanceof Error) console.error("Cause:", e.cause.message.slice(-1500));
  process.exit(1);
});
