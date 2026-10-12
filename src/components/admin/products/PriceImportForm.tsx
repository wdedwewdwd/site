"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, LoaderCircle, Upload } from "lucide-react";
import { priceImportAction, type PriceImportState } from "@/app/actions/admin/price-import";
import { keepValuesOnSubmit } from "@/components/ui/keepValuesOnSubmit";
import { faDigits, toman } from "@/lib/format";

/** Upload → preview of every price change (and skipped rows) → apply. The same file is sent again to apply. */
export function PriceImportForm() {
  const [state, formAction, pending] = useActionState<PriceImportState, FormData>(priceImportAction, null);
  const [fileName, setFileName] = useState("");
  // Which button was pressed (sent with the form as the submitter); only used for the spinner here.
  const [step, setStep] = useState<"preview" | "apply">("preview");
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // A file picked before the page finished loading (or restored by the browser) has no change event.
  useEffect(() => setFileName(fileInput.current?.files?.[0]?.name ?? ""), []);
  const preview = state?.ok && state.stage === "preview" ? state : null;
  // A preview only belongs to the file it was made from.
  const previewMatches = preview && preview.fileName === fileName;

  if (state?.ok && state.stage === "done") {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="size-12 text-success" aria-hidden />
        <p className="text-lg font-black">قیمت {faDigits(state.updated)} محصول به‌روز شد.</p>
        {state.skipped > 0 && <p className="text-sm text-muted">{faDigits(state.skipped)} ردیف مشکل‌دار اعمال نشد؛ می‌توانید آن‌ها را در فایل درست کنید و دوباره بارگذاری کنید.</p>}
        <Link href="/admin/products" className="btn-primary mt-2 py-2.5">بازگشت به محصولات</Link>
      </div>
    );
  }

  return (
    <form ref={form} onSubmit={keepValuesOnSubmit(formAction)} className="flex flex-col gap-5">
      <input type="hidden" name="digest" value={previewMatches ? preview.digest : ""} />

      <div className="card flex flex-wrap items-center gap-4 p-5">
        <FileSpreadsheet className="size-8 shrink-0 text-success" aria-hidden />
        <label className="min-w-0 flex-1 basis-56">
          <span className="label">فایل اکسل قیمت‌ها (xlsx)</span>
          <input
            ref={fileInput}
            type="file"
            name="file"
            required
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="block w-full text-sm file:me-3 file:rounded-lg file:border-0 file:bg-canvas file:px-4 file:py-2 file:text-sm file:font-bold file:text-ink hover:file:bg-surface"
          />
        </label>
        <button type="submit" name="step" value="preview" onClick={() => setStep("preview")} disabled={pending} className="btn-ghost w-full py-2.5 sm:w-auto">
          {pending && step === "preview" ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          بررسی فایل
        </button>
      </div>

      {state && !state.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-brand-soft p-4 text-sm font-bold text-brand">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.error}
        </p>
      )}

      {previewMatches && (
        <>
          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-lg bg-success-soft px-3 py-2 text-success">{faDigits(preview.changes.length)} قیمت تغییر می‌کند</span>
            <span className="rounded-lg bg-surface px-3 py-2 text-muted">{faDigits(preview.unchanged)} ردیف بدون تغییر</span>
            {preview.problems.length > 0 && <span className="rounded-lg bg-warning-soft px-3 py-2 text-warning">{faDigits(preview.problems.length)} ردیف مشکل دارد و اعمال نمی‌شود</span>}
          </div>

          {preview.problems.length > 0 && (
            <section className="card overflow-hidden">
              <h2 className="border-b border-line bg-warning-soft/60 px-4 py-3 text-sm font-extrabold text-warning">ردیف‌هایی که اعمال نمی‌شوند</h2>
              <ul className="max-h-64 divide-y divide-line overflow-y-auto text-[13px]">
                {preview.problems.map((p, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3 gap-y-1 px-4 py-2.5">
                    <span className="text-muted">ردیف {faDigits(p.row)}</span>
                    {p.sku && <bdi className="font-bold" dir="ltr">{p.sku}</bdi>}
                    <span>{p.message}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {preview.changes.length > 0 ? (
            <section className="card overflow-hidden">
              <h2 className="border-b border-line px-4 py-3 text-sm font-extrabold">تغییرات قیمت (تومان)</h2>
              <div className="max-h-[28rem] overflow-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-canvas text-muted">
                    <tr>
                      <th className="px-3 py-2.5 text-right font-bold">کالا</th>
                      <th className="px-3 py-2.5 text-right font-bold">قیمت فعلی</th>
                      <th className="px-3 py-2.5 text-right font-bold">قیمت جدید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {preview.changes.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2.5">
                          <span className="block font-bold">{c.name}</span>
                          <bdi className="text-[11px] text-muted" dir="ltr">{faDigits(c.sku)}</bdi>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-muted line-through">{toman(c.from)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-black text-success">{toman(c.to)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p className="card p-6 text-center text-sm font-bold text-muted">هیچ قیمتی تغییر نمی‌کند؛ ستون «قیمت جدید» را پر کنید و دوباره بارگذاری کنید.</p>
          )}

          {preview.changes.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" name="step" value="apply" onClick={() => setStep("apply")} disabled={pending} className="btn-primary py-3">
                {pending && step === "apply" && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
                اعمال {faDigits(preview.changes.length)} تغییر قیمت
              </button>
              <p className="text-xs text-muted">تا این دکمه را نزنید هیچ قیمتی در سایت عوض نمی‌شود.</p>
            </div>
          )}
        </>
      )}
    </form>
  );
}
