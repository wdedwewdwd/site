"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, DatabaseBackup, Download, LoaderCircle, Upload } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const CONFIRM_WORD = "بازیابی";
const nf = new Intl.NumberFormat("fa-IR");

type Result = { ok: true; counts: Record<string, number>; files: number; backupDate: string; staysSignedIn: boolean } | { ok: false; message: string };

export function BackupSection({ lastBackup }: { lastBackup: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [downloading, setDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const restore = () => {
    if (!file) return;
    setConfirmOpen(false);
    setResult(null);
    setProgress(0);
    const body = new FormData();
    body.set("file", file);
    body.set("confirm", typed.trim());
    // XHR (not fetch) so large uploads can report progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/backup/restore");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let res: Result;
      try {
        res = JSON.parse(xhr.responseText);
      } catch {
        res = { ok: false, message: "پاسخ نامعتبر از سرور." };
      }
      setResult(res);
      if (res.ok) {
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        // Reload so every page shows the restored data (or sign in again if needed).
        setTimeout(() => (window.location.href = res.ok && res.staysSignedIn ? "/admin/settings" : "/login?next=/admin"), 4000);
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setResult({ ok: false, message: "ارتباط با سرور قطع شد؛ هیچ تغییری اعمال نشد." });
    };
    xhr.send(body);
  };

  const total = result?.ok ? Object.values(result.counts).reduce((s, n) => s + n, 0) : 0;

  return (
    <section className="card mb-6 flex flex-col gap-5 p-5" aria-labelledby="backup-title">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-info-soft text-info"><DatabaseBackup className="size-6" /></span>
        <div className="flex flex-col gap-1">
          <h2 id="backup-title" className="text-base font-black">پشتیبان‌گیری و بازیابی</h2>
          <p className="text-xs leading-6 text-muted">
            فایل بکاپ شامل همه اطلاعات سایت است: محصولات، دسته‌ها، مشتریان، آدرس‌ها، سفارش‌ها، پرداخت‌ها، تیکت‌ها، تنظیمات و تصاویر محصولات.
            آن را در جای امنی نگه دارید؛ اطلاعات شخصی مشتریان داخل آن است.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Download */}
        <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <p className="text-sm font-extrabold">دریافت بکاپ</p>
          <p className="text-xs leading-6 text-muted">یک فایل ZIP از وضعیت فعلی سایت ساخته و دانلود می‌شود. پیشنهاد می‌شود هر هفته یک بکاپ بگیرید.</p>
          {lastBackup && <p className="text-[11px] text-muted">آخرین بکاپ: {lastBackup}</p>}
          <a
            href="/api/admin/backup"
            onClick={() => {
              setDownloading(true);
              setTimeout(() => setDownloading(false), 6000);
            }}
            className="btn-primary mt-auto w-fit py-2.5"
          >
            {downloading ? <LoaderCircle className="size-4 animate-spin" /> : <Download className="size-4" />}
            دریافت بکاپ
          </a>
        </div>

        {/* Restore */}
        <div className="flex flex-col gap-3 rounded-xl border border-brand/30 bg-brand-soft/30 p-4">
          <p className="text-sm font-extrabold">بازیابی بکاپ</p>
          <p className="flex gap-2 text-xs leading-6 text-brand">
            <AlertTriangle className="mt-1 size-4 shrink-0" />
            همه اطلاعات فعلی سایت پاک و با محتوای فایل بکاپ جایگزین می‌شود. اگر فایل مشکل داشته باشد، هیچ تغییری اعمال نمی‌شود.
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-subtle bg-white px-3 py-3 text-xs hover:border-brand">
            <Upload className="size-5 shrink-0 text-muted" />
            <span className="truncate">{file ? `${file.name} (${nf.format(Math.ceil(file.size / 1024))} کیلوبایت)` : "انتخاب فایل بکاپ (ZIP)"}</span>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </label>
          <button
            type="button"
            disabled={!file || progress !== null}
            onClick={() => {
              setTyped("");
              setConfirmOpen(true);
            }}
            className="btn mt-auto w-fit bg-brand py-2.5 text-white hover:bg-brand-dark"
          >
            {progress !== null ? <LoaderCircle className="size-4 animate-spin" /> : <DatabaseBackup className="size-4" />}
            بازیابی بکاپ
          </button>
        </div>
      </div>

      {progress !== null && (
        <div className="flex flex-col gap-2" role="status">
          <div className="flex justify-between text-xs font-bold">
            <span>{progress < 100 ? "در حال ارسال فایل..." : "در حال بازیابی اطلاعات؛ صفحه را نبندید..."}</span>
            <span>{nf.format(progress)}٪</span>
          </div>
          <span className="h-2 overflow-hidden rounded-full bg-surface">
            <span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </span>
        </div>
      )}

      {result && (
        <div role="alert" className={`flex items-start gap-2 rounded-xl p-4 text-sm ${result.ok ? "bg-success-soft text-success" : "bg-brand-soft text-brand"}`}>
          {result.ok ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0" />}
          <div className="flex flex-col gap-1">
            {result.ok ? (
              <>
                <b>بازیابی با موفقیت انجام شد.</b>
                <span className="text-xs">
                  {nf.format(total)} رکورد و {nf.format(result.files)} تصویر بازیابی شد
                  {result.counts.Product !== undefined && <> (شامل {nf.format(result.counts.Product)} محصول و {nf.format(result.counts.Order ?? 0)} سفارش)</>}.
                  {result.staysSignedIn ? " صفحه تا چند لحظه دیگر تازه می‌شود." : " لطفاً دوباره وارد شوید."}
                </span>
              </>
            ) : (
              <b>{result.message}</b>
            )}
          </div>
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="تأیید بازیابی بکاپ">
        <div className="flex flex-col gap-4 text-sm">
          <p className="leading-7">
            با بازیابی فایل <b dir="ltr">{file?.name}</b>، <b className="text-brand">همه اطلاعات فعلی سایت حذف</b> و با اطلاعات این فایل جایگزین می‌شود.
            همه کاربران (از جمله مشتریان) باید دوباره وارد شوند.
          </p>
          <p className="rounded-lg bg-warning-soft p-3 text-xs leading-6 text-warning">
            پیشنهاد: قبل از بازیابی، از وضعیت فعلی یک «دریافت بکاپ» بگیرید تا در صورت نیاز بتوانید برگردید.
          </p>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold">برای تأیید، کلمه «{CONFIRM_WORD}» را بنویسید:</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className="input" autoComplete="off" />
          </label>
          <div className="flex flex-wrap gap-3 border-t border-line pt-4">
            <button type="button" onClick={restore} disabled={typed.trim() !== CONFIRM_WORD} className="btn bg-brand text-white hover:bg-brand-dark">
              بازیابی و جایگزینی اطلاعات
            </button>
            <button type="button" onClick={() => setConfirmOpen(false)} className="btn-ghost">انصراف</button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
