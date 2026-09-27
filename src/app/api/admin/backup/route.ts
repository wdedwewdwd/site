import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { createBackup } from "@/lib/backup-core";
import { db } from "@/lib/db";
import { jKey, tehranJDate, tehranParts } from "@/lib/jalali";
import { rateLimit } from "@/lib/rate-limit";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";

/** Downloads a full backup (all data + product images) as a ZIP. Admins only. */
export async function GET() {
  const admin = await requireStaff(["ADMIN"]);
  const rl = await rateLimit(`backup:download:${admin.id}`, 10, 3600);
  if (!rl.ok) return new Response("تعداد درخواست بکاپ زیاد است؛ کمی بعد تلاش کنید.", { status: 429 });

  const { zip, manifest } = await createBackup(db, UPLOAD_DIR);
  await audit(admin.id, "backup.download", undefined, undefined, { counts: manifest.counts, files: manifest.files, bytes: zip.byteLength });

  const now = new Date();
  const t = tehranParts(now);
  const name = `arizon-backup-${jKey(tehranJDate(now))}-${String(t.hour).padStart(2, "0")}${String(t.minute).padStart(2, "0")}.zip`;
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Content-Length": String(zip.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
