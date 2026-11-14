"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import { bulkUpdatePrices } from "@/app/actions/admin/products";
import { discountPercent, faDigits, toman } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

export type PriceRow = { id: string; name: string; sku: string; image: string | null; price: number; compareAtPrice: number | null };

/** «تغییر یکسان همه محصولات»: one change applied to every ticked product. */
const MODES = {
  pctUp: { label: "افزایش درصدی", unit: "٪" },
  pctDown: { label: "کاهش درصدی", unit: "٪" },
  amtUp: { label: "افزایش مبلغی", unit: "تومان" },
  amtDown: { label: "کاهش مبلغی", unit: "تومان" },
  same: { label: "یک قیمت برای همه", unit: "تومان" },
} as const;
type Mode = keyof typeof MODES;

const MIN = 1000;
const MAX = 9_999_999_999;

const enDigits = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
/** A toman amount as typed (Persian or Latin digits, with or without separators); NaN when it is not a whole number. */
const parseAmount = (v: string) => {
  const s = enDigits(v).replace(/[,٬،\s]/g, "");
  return /^\d{1,13}$/.test(s) ? Number(s) : NaN;
};
/** A percentage such as «۱۰» or «۷٫۵»; NaN otherwise. */
const parsePercent = (v: string) => {
  const s = enDigits(v).trim().replace(/[٫/]/, ".");
  return /^\d{1,4}(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
};

/** «+۱۸٫۸٪» / «−۵٪»: a price change in percent, with the Persian decimal mark. */
const change = (pct: number) => `${pct > 0 ? "+" : "−"}${faDigits(Math.abs(Math.round(pct * 10) / 10)).replace(".", "٫")}٪`;

type Next = { price: number; compareAt: number | null; error: string | null };

function check(price: number, compareAt: number | null): string | null {
  if (!Number.isFinite(price)) return "قیمت را درست وارد کنید";
  if (price < MIN) return "قیمت باید حداقل ۱,۰۰۰ تومان باشد";
  if (price > MAX || (compareAt !== null && compareAt > MAX)) return "قیمت خیلی بزرگ است";
  if (compareAt !== null && !Number.isFinite(compareAt)) return "قیمت قبل از تخفیف را درست وارد کنید";
  if (compareAt !== null && compareAt <= price) return `قیمت باید کمتر از قیمت قبل از تخفیف (${toman(compareAt)}) باشد`;
  return null;
}

/**
 * «ویرایش گروهی قیمت» for the products ticked in the list. Either a price per product, or «تغییر یکسان همه محصولات»:
 * a percentage or amount up or down, or one price for all. Discounted products keep their discount: the price before
 * the discount moves by the same percentage or amount (with one price for all it stays, and must remain higher).
 * Nothing is saved until «ذخیره», and then all of it at once, or none if a price changed elsewhere meanwhile.
 */
export function BulkPriceDialog({ rows, onClose, onSaved }: { rows: PriceRow[]; onClose: () => void; onSaved: () => void }) {
  const [uniform, setUniform] = useState(false);
  const [mode, setMode] = useState<Mode>("pctUp");
  const [amount, setAmount] = useState("");
  const [round, setRound] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, { price: string; compareAt: string }>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, { price: toman(r.price), compareAt: r.compareAtPrice ? toman(r.compareAtPrice) : "" }])),
  );
  const [pending, start] = useTransition();

  const pct = mode === "pctUp" || mode === "pctDown";
  const value = pct ? parsePercent(amount) : parseAmount(amount);
  const valueError = !amount.trim()
    ? null
    : !Number.isFinite(value) || value <= 0
      ? pct
        ? "درصد را درست وارد کنید (مثلاً ۱۰)"
        : "مبلغ را درست وارد کنید"
      : mode === "pctDown" && value >= 100
        ? "کاهش باید کمتر از ۱۰۰٪ باشد"
        : mode === "pctUp" && value > 1000
          ? "افزایش خیلی زیاد است"
          : mode === "same" && value < MIN
            ? "قیمت باید حداقل ۱,۰۰۰ تومان باشد"
            : null;
  const uniformReady = uniform && !!amount.trim() && !valueError;

  const roundTo = (x: number) => (pct && round ? Math.round(x / 1000) * 1000 : Math.round(x));
  const nextOf = (r: PriceRow): Next | null => {
    if (uniform) {
      if (!uniformReady) return null;
      const move = (x: number) =>
        mode === "pctUp" ? roundTo(x * (1 + value / 100)) : mode === "pctDown" ? roundTo(x * (1 - value / 100)) : mode === "amtUp" ? x + value : x - value;
      const price = mode === "same" ? value : move(r.price);
      const compareAt = r.compareAtPrice === null ? null : mode === "same" ? r.compareAtPrice : move(r.compareAtPrice);
      return { price, compareAt, error: check(price, compareAt) };
    }
    const d = drafts[r.id];
    const price = parseAmount(d.price);
    // Emptying the «before discount» field removes the discount.
    const compareAt = r.compareAtPrice === null || !d.compareAt.trim() ? null : parseAmount(d.compareAt);
    return { price, compareAt, error: check(price, compareAt) };
  };

  const results = rows.map((r) => ({ row: r, next: nextOf(r) }));
  const changed = results.filter(({ row, next }) => next && !next.error && (next.price !== row.price || next.compareAt !== row.compareAtPrice));
  const errors = results.filter(({ next }) => next?.error).length;
  const canSave = !pending && changed.length > 0 && errors === 0;

  const save = () =>
    start(async () => {
      const res = await bulkUpdatePrices(
        changed.map(({ row, next }) => ({ id: row.id, price: next!.price, compareAtPrice: next!.compareAt, fromPrice: row.price, fromCompareAt: row.compareAtPrice })),
      );
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) onSaved();
    });

  const setDraft = (id: string, key: "price" | "compareAt", v: string) => setDrafts((all) => ({ ...all, [id]: { ...all[id], [key]: v } }));
  // Show what was typed as a tidy amount once the field is left.
  const tidy = (id: string, key: "price" | "compareAt") => {
    const n = parseAmount(drafts[id][key]);
    if (Number.isFinite(n) && n > 0) setDraft(id, key, toman(n));
  };

  return (
    <Modal open onClose={() => !pending && onClose()} title="ویرایش گروهی قیمت" description={`${faDigits(rows.length)} محصول انتخاب شده`} size="lg">
      <div className="flex flex-col gap-4">
        <section className={`rounded-2xl border p-4 transition-colors ${uniform ? "border-ink/20 bg-canvas" : "border-line"}`}>
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-black">تغییر یکسان همه محصولات</span>
              <span className="text-xs text-muted">یک تغییر برای همه؛ مثلاً همه ۱۰٪ گران‌تر.</span>
            </span>
            <input type="checkbox" role="switch" checked={uniform} onChange={(e) => setUniform(e.target.checked)} className="peer sr-only" />
            <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:right-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
          </label>

          {uniform && (
            <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="نوع تغییر">
                {(Object.keys(MODES) as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === m ? "bg-ink text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`}
                  >
                    {MODES[m].label}
                  </button>
                ))}
              </div>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold">{pct ? "چند درصد؟" : mode === "same" ? "قیمت جدید همه محصولات" : "چه مبلغی؟"}</span>
                <span className="relative">
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    dir="ltr"
                    placeholder={pct ? "10" : "50,000"}
                    className="input py-2.5 pl-16 text-right font-bold"
                  />
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted">{MODES[mode].unit}</span>
                </span>
                {valueError && <span className="text-xs font-bold text-brand">{valueError}</span>}
              </label>
              {pct && (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-bold">
                  <input type="checkbox" checked={round} onChange={(e) => setRound(e.target.checked)} className="size-4 accent-brand" />
                  گرد کردن قیمت‌های جدید به هزار تومان
                </label>
              )}
              {rows.some((r) => r.compareAtPrice !== null) && (
                <p className="text-xs leading-6 text-muted">
                  {mode === "same"
                    ? "در کالاهای تخفیف‌دار، قیمت قبل از تخفیف همان می‌ماند و قیمت جدید باید از آن کمتر باشد."
                    : "در کالاهای تخفیف‌دار، قیمت قبل از تخفیف هم به همین اندازه تغییر می‌کند تا تخفیف سر جایش بماند."}
                </p>
              )}
            </div>
          )}
        </section>

        <ul className="flex flex-col divide-y divide-line">
          {results.map(({ row, next }) => {
            const d = drafts[row.id];
            const off = discountPercent(row.price, row.compareAtPrice);
            const diff = next && !next.error && next.price !== row.price ? ((next.price - row.price) / row.price) * 100 : 0;
            return (
              <li key={row.id} className="flex flex-col gap-3 py-4 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface text-subtle">
                    {row.image ? <Image src={row.image} alt="" fill sizes="48px" className="object-cover" /> : <ImageOff className="size-5" aria-label="بدون عکس" />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="line-clamp-2 text-[13px] font-bold leading-6">{row.name}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      <span dir="ltr">{row.sku}</span>
                      {off > 0 && <span className="rounded bg-brand-soft px-1 font-black text-brand">{faDigits(off)}٪ تخفیف</span>}
                    </span>
                  </span>
                </div>

                {uniform ? (
                  <div className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-3 text-[13px]">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted">قیمت فعلی</span>
                      <span className="font-bold">{toman(row.price)} تومان</span>
                      {row.compareAtPrice !== null && <s className="text-[11px] text-subtle">{toman(row.compareAtPrice)}</s>}
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[11px] text-muted">قیمت جدید</span>
                      {next ? (
                        <>
                          <span className={`font-black ${next.error ? "text-brand" : ""}`}>
                            {Number.isFinite(next.price) && next.price > 0 ? `${toman(next.price)} تومان` : "—"}
                            {diff !== 0 && <span className={`mr-1.5 text-[11px] font-bold ${diff > 0 ? "text-success" : "text-brand"}`}>{change(diff)}</span>}
                          </span>
                          {next.compareAt !== null && Number.isFinite(next.compareAt) && next.compareAt > 0 && (
                            <s className="text-[11px] text-subtle">{toman(next.compareAt)}</s>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className={`grid gap-3 ${row.compareAtPrice !== null ? "sm:grid-cols-2" : ""}`}>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold">{row.compareAtPrice !== null ? "قیمت فروش (بعد از تخفیف)" : "قیمت"}</span>
                      <span className="relative">
                        <input
                          value={d.price}
                          onChange={(e) => setDraft(row.id, "price", e.target.value)}
                          onBlur={() => tidy(row.id, "price")}
                          inputMode="numeric"
                          dir="ltr"
                          aria-label={`قیمت ${row.name}`}
                          className="input py-2.5 pl-16 text-right font-bold"
                        />
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted">تومان</span>
                      </span>
                    </label>
                    {row.compareAtPrice !== null && (
                      <label className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold">قیمت قبل از تخفیف</span>
                        <span className="relative">
                          <input
                            value={d.compareAt}
                            onChange={(e) => setDraft(row.id, "compareAt", e.target.value)}
                            onBlur={() => tidy(row.id, "compareAt")}
                            inputMode="numeric"
                            dir="ltr"
                            placeholder="خالی = بدون تخفیف"
                            aria-label={`قیمت قبل از تخفیف ${row.name}`}
                            className="input py-2.5 pl-16 text-right font-bold"
                          />
                          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted">تومان</span>
                        </span>
                      </label>
                    )}
                    {next && !next.error && next.price !== row.price && (
                      <span className="-mt-1 text-[11px] text-muted">
                        قبلاً {toman(row.price)} تومان
                        <span className={`mr-1.5 font-bold ${diff > 0 ? "text-success" : "text-brand"}`}>({change(diff)})</span>
                      </span>
                    )}
                  </div>
                )}
                {next?.error && <p className="text-xs font-bold text-brand">{next.error}</p>}
              </li>
            );
          })}
        </ul>

        {/* Stays at the bottom of the window while the list scrolls. */}
        <div className="sticky -bottom-5 -mx-6 -mb-5 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-6 py-4">
          <span className="text-xs text-muted">
            {errors > 0
              ? `${faDigits(errors)} قیمت ایراد دارد؛ قرمزها را درست کنید.`
              : changed.length > 0
                ? `قیمت ${faDigits(changed.length)} محصول تغییر می‌کند.`
                : "هنوز قیمتی تغییر نکرده است."}
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={onClose} disabled={pending} className="btn-ghost px-5 py-2.5">
              بازگشت
            </button>
            <button type="button" onClick={save} disabled={!canSave} className="btn-primary px-6 py-2.5">
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              ذخیره
            </button>
          </span>
        </div>
      </div>
    </Modal>
  );
}
