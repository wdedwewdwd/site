"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { faDigits } from "@/lib/format";

/** File name from a Content-Disposition header (prefers the UTF-8 form). */
function fileName(header: string | null, fallback: string) {
  const utf8 = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) {
    try {
      return decodeURIComponent(utf8);
    } catch {}
  }
  return header?.match(/filename="([^"]+)"/i)?.[1] ?? fallback;
}

/**
 * "دریافت خروجی" menu of the admin product list: the whole filtered list (all pages) as an Excel file or as a
 * printable page to save as PDF. `query` is the list's filter query string (without the page number).
 */
export function ExportMenu({ query, count }: { query: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const suffix = query ? `?${query}` : "";

  async function downloadExcel() {
    setOpen(false);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/export${suffix}`, { cache: "no-store" });
      const type = res.headers.get("Content-Type") ?? "";
      if (!res.ok || !type.includes("spreadsheetml")) {
        setError(res.status === 429 ? await res.text() : "ساخت فایل اکسل انجام نشد؛ دوباره امتحان کنید.");
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(res.headers.get("Content-Disposition"), "products.xlsx");
      document.body.append(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setError("اتصال برقرار نشد؛ دوباره امتحان کنید.");
    } finally {
      setBusy(false);
    }
  }

  const item = "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-canvas";
  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy || count === 0}
        title={count === 0 ? "محصولی برای خروجی گرفتن نیست" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        className="btn-ghost py-2.5 disabled:opacity-70"
      >
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
        {busy ? (
          "در حال ساخت فایل…"
        ) : (
          <span>
            <span className="hidden sm:inline">دریافت </span>خروجی
          </span>
        )}
        {!busy && <ChevronDown className="size-4" aria-hidden />}
      </button>

      {open && (
        <div role="menu" className="absolute start-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-white p-1.5 shadow-lg">
          <p className="px-3 pb-1.5 pt-1 text-[11px] text-muted">
            {faDigits(count)} محصول (همه صفحه‌ها{query ? "، با همین فیلترها" : ""}) — عکس، نام، کد کالا، قیمت فعلی و ستون خالی قیمت جدید
          </p>
          <button type="button" role="menuitem" onClick={downloadExcel} className={item}>
            <FileSpreadsheet className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
            <span>
              <span className="block text-sm font-bold">فایل اکسل (Excel)</span>
              <span className="block text-[11px] text-muted">برای نوشتن قیمت‌های جدید در کامپیوتر</span>
            </span>
          </button>
          <a role="menuitem" href={`/admin/print/products?${query ? `${query}&` : ""}auto=1`} target="_blank" rel="noopener" onClick={() => setOpen(false)} className={item}>
            <FileText className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
            <span>
              <span className="block text-sm font-bold">فایل PDF / چاپ</span>
              <span className="block text-[11px] text-muted">در پنجره‌ی چاپ «<bdi>Save as PDF</bdi>» را بزنید</span>
            </span>
          </a>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute start-0 top-full z-30 mt-2 w-72 rounded-xl bg-brand-soft px-3 py-2 text-xs font-bold text-brand">
          {error}
        </p>
      )}
    </div>
  );
}
