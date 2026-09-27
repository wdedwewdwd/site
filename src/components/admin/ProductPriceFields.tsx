"use client";

import { useId, useState } from "react";
import { BadgePercent } from "lucide-react";
import { discountPercent, faDigits, toman } from "@/lib/format";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
/** "۳۹۰,۰۰۰" → 390000 (0 when empty or not a number). */
function num(v: string) {
  const en = v.replace(/[۰-۹٠-٩]/g, (d) => String(FA.includes(d) ? FA.indexOf(d) : AR.indexOf(d))).replace(/[,٬\s]/g, "");
  return /^\d+$/.test(en) ? Number(en) : 0;
}
/** Discounted prices are rounded to whole thousands, like shop prices usually are. */
const roundSale = (v: number) => (v >= 10_000 ? Math.round(v / 1000) * 1000 : Math.round(v));

type Props = { price?: number; compareAtPrice?: number | null; errors: Record<string, string | undefined> };

/**
 * Price + discount editor. The owner thinks in "normal price" and "discount", so that is what the form
 * shows; the server stores the paid price and the struck-through price (price / compareAtPrice).
 */
export function ProductPriceFields({ price, compareAtPrice, errors }: Props) {
  const id = useId();
  const hadDiscount = !!price && !!compareAtPrice && compareAtPrice > price;
  const [base, setBase] = useState(String(hadDiscount ? compareAtPrice : (price ?? "")));
  const [on, setOn] = useState(hadDiscount);
  const [sale, setSale] = useState(hadDiscount ? String(price) : "");
  const [pct, setPct] = useState(hadDiscount ? String(discountPercent(price!, compareAtPrice)) : "");

  const saleFromPct = (b: number, p: number) => (b > 0 && p > 0 && p < 100 ? String(roundSale(b * (1 - p / 100))) : "");

  const changeBase = (v: string) => {
    setBase(v);
    if (on && num(pct)) setSale(saleFromPct(num(v), num(pct)));
  };
  const changePct = (v: string) => {
    setPct(v);
    setSale(saleFromPct(num(base), num(v)));
  };
  const changeSale = (v: string) => {
    setSale(v);
    const s = num(v);
    setPct(s > 0 && s < num(base) ? String(discountPercent(s, num(base))) : "");
  };
  const toggle = (next: boolean) => {
    setOn(next);
    if (next && !num(sale)) {
      setPct("10");
      setSale(saleFromPct(num(base), 10));
    }
  };

  const b = num(base);
  const s = num(sale);
  const valid = on && b > 0 && s > 0 && s < b;
  const input = (err?: string) => `input ${err ? "border-brand" : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-base`} className="label">قیمت اصلی (تومان) *</label>
        <input id={`${id}-base`} name="basePrice" value={base} onChange={(e) => changeBase(e.target.value)} inputMode="numeric" dir="ltr" placeholder="430000" required className={input(errors.basePrice)} />
        {errors.basePrice ? <p className="field-error" role="alert">{errors.basePrice}</p> : <p className="mt-1.5 text-xs text-muted">قیمت کالا بدون تخفیف؛ با یا بدون ویرگول.</p>}
      </div>

      <div className={`rounded-2xl border p-4 transition-colors ${on ? "border-brand/30 bg-brand-soft/40" : "border-line bg-canvas/60"}`}>
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-black">
            <BadgePercent className={`size-5 ${on ? "text-brand" : "text-muted"}`} aria-hidden /> تخفیف
          </span>
          <input type="checkbox" role="switch" name="hasDiscount" checked={on} onChange={(e) => toggle(e.target.checked)} className="peer sr-only" />
          <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full bg-subtle/60 transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:-translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
        </label>

        {on ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-[96px_1fr] gap-3">
              <div>
                <label htmlFor={`${id}-pct`} className="mb-1 block text-xs font-bold">درصد</label>
                <div className="relative">
                  <input id={`${id}-pct`} value={pct} onChange={(e) => changePct(e.target.value)} inputMode="numeric" dir="ltr" maxLength={2} placeholder="10" className="input py-2 pr-8" />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-muted">٪</span>
                </div>
              </div>
              <div>
                <label htmlFor={`${id}-sale`} className="mb-1 block text-xs font-bold">قیمت بعد از تخفیف (تومان)</label>
                <input id={`${id}-sale`} name="salePrice" value={sale} onChange={(e) => changeSale(e.target.value)} inputMode="numeric" dir="ltr" placeholder="390000" className={`${input(errors.salePrice)} py-2`} />
              </div>
            </div>
            {errors.salePrice && <p className="field-error -mt-1" role="alert">{errors.salePrice}</p>}
            <p className="text-[11px] leading-5 text-muted">درصد را بزنید تا قیمت خودکار حساب شود (گرد به هزار تومان)، یا قیمت نهایی را مستقیم بنویسید.</p>

            {valid && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
                <span className="text-[11px] font-bold text-muted">در فروشگاه:</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-brand px-1.5 py-0.5 text-[11px] font-black text-white">{faDigits(discountPercent(s, b))}٪</span>
                  <s className="text-xs text-subtle">{toman(b)}</s>
                  <span className="text-sm font-black">{toman(s)}</span>
                  <span className="text-[11px] text-muted">تومان</span>
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">{b > 0 ? `بدون تخفیف؛ مشتری ${toman(b)} تومان می‌پردازد.` : "برای نمایش خط‌خورده و درصد تخفیف، روشنش کنید."}</p>
        )}
      </div>
    </div>
  );
}
