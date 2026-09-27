import { NextResponse } from "next/server";
import { requireStaff, createSession } from "@/lib/auth/session";
import { BackupError, restoreBackup } from "@/lib/backup-core";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { UPLOAD_DIR } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const MAX_BYTES = 500 * 1024 * 1024;
const CONFIRM_WORD = "بازیابی";

/**
 * Replaces ALL site data with an uploaded backup. Admins only, same-origin only,
 * explicit typed confirmation, rate-limited and audited. The restore is atomic.
 */
export async function POST(req: Request) {
  // CSRF defense for a state-changing route handler: the request must come from our own pages.
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(env.APP_URL).origin) {
    return NextResponse.json({ ok: false, message: "درخواست نامعتبر است." }, { status: 403 });
  }

  const admin = await requireStaff(["ADMIN"]);
  const rl = await rateLimit(`backup:restore:${admin.id}`, 3, 3600);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "تعداد بازیابی‌ها در یک ساعت گذشته زیاد است." }, { status: 429 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ ok: false, message: "حجم فایل بکاپ بیش از ۵۰۰ مگابایت است." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "فایل دریافت نشد." }, { status: 400 });
  }
  if (form.get("confirm") !== CONFIRM_WORD) {
    return NextResponse.json({ ok: false, message: `برای تأیید، کلمه «${CONFIRM_WORD}» را وارد کنید.` }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, message: "فایل بکاپ را انتخاب کنید." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, message: "حجم فایل بکاپ بیش از ۵۰۰ مگابایت است." }, { status: 413 });

  const adminPhone = admin.phone;
  try {
    const result = await restoreBackup(db, UPLOAD_DIR, new Uint8Array(await file.arrayBuffer()));

    // All sessions were cleared by the restore. Keep this admin signed in if the
    // restored data still has them as staff with a login code.
    const me = await db.user.findUnique({ where: { phone: adminPhone } });
    const staysSignedIn = !!me && me.isActive && !!me.passwordHash && (me.role === "ADMIN" || me.role === "SUPPORT");
    if (staysSignedIn) await createSession(me.id);
    // The pre-restore admin id may not exist in the restored data, so log against the restored account (or none).
    await db.auditLog.create({
      data: { actorId: me?.id ?? null, action: "backup.restore", meta: { counts: result.counts, files: result.files, from: result.manifest.createdAt, by: adminPhone } },
    });

    return NextResponse.json({ ok: true, counts: result.counts, files: result.files, backupDate: result.manifest.createdAt, staysSignedIn });
  } catch (e) {
    if (e instanceof BackupError) return NextResponse.json({ ok: false, message: e.message }, { status: 400 });
    console.error("Restore failed", e);
    return NextResponse.json({ ok: false, message: "بازیابی با خطا مواجه شد؛ هیچ تغییری در اطلاعات سایت اعمال نشد." }, { status: 500 });
  }
}
