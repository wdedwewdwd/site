"use client";

import { useState, useTransition } from "react";
import { EyeOff, LoaderCircle } from "lucide-react";
import { setHideOutOfStock } from "@/app/actions/admin/products";
import { faDigits } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";

/**
 * «پنهان کردن کالاهای ناموجود از سایت» on the admin product list. Turning it on asks first and says how many products
 * leave the shop and how many stay (with no stock anywhere, the shop would be empty).
 */
export function HideOutOfStockSwitch({ on, outOfStock, inStock }: { on: boolean; outOfStock: number; inStock: number }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const apply = (next: boolean) =>
    start(async () => {
      const res = await setHideOutOfStock(next);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setConfirming(false);
    });

  return (
    <section className={`card mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${on ? "border-warning/40 bg-warning-soft/40" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${on ? "bg-warning-soft text-warning" : "bg-surface text-muted"}`}>
          <EyeOff className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="hide-oos" className="text-sm font-black">پنهان کردن کالاهای ناموجود از سایت</h2>
          <p className="text-xs leading-6 text-muted">
            {on
              ? `روشن است: ${faDigits(outOfStock)} کالای ناموجود در فروشگاه دیده نمی‌شود. هر کالا به محض موجود شدن، خودش دوباره نمایش داده می‌شود.`
              : `خاموش است: کالاهای ناموجود با برچسب «ناموجود» در فروشگاه دیده می‌شوند (الان ${faDigits(outOfStock)} کالا).`}
          </p>
        </div>
      </div>
      <label className="flex shrink-0 cursor-pointer items-center gap-2 self-end sm:self-auto">
        <span className="text-xs font-bold">{on ? "روشن" : "خاموش"}</span>
        <input
          type="checkbox"
          role="switch"
          checked={on}
          disabled={pending}
          aria-labelledby="hide-oos"
          onChange={() => (on ? apply(false) : setConfirming(true))}
          className="peer sr-only"
        />
        <span className="relative h-6 w-11 shrink-0 rounded-full bg-line transition-colors after:absolute after:right-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand peer-disabled:opacity-60" />
      </label>

      <Modal open={confirming} onClose={() => !pending && setConfirming(false)} title="پنهان کردن کالاهای ناموجود">
        <div className="flex flex-col gap-4 text-sm leading-7">
          <p>
            <b>{faDigits(outOfStock)}</b> کالای ناموجود از لیست‌ها، جستجو، صفحهٔ اصلی و صفحهٔ خود کالا برداشته می‌شود و{" "}
            <b>{faDigits(inStock)}</b> کالای موجود در سایت می‌ماند.
          </p>
          {inStock === 0 && (
            <p className="rounded-xl bg-brand-soft p-3 text-[13px] font-bold text-brand">
              هیچ کالای موجودی ندارید؛ با روشن کردن، فروشگاه خالی دیده می‌شود. اول موجودی کالاها را وارد کنید.
            </p>
          )}
          <p className="text-[13px] text-muted">کالاها حذف یا غیرفعال نمی‌شوند؛ هر وقت این گزینه را خاموش کنید یا کالایی موجود شود، دوباره نمایش داده می‌شود.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="btn-ghost px-5 py-2.5">
              انصراف
            </button>
            <button type="button" onClick={() => apply(true)} disabled={pending} className="btn-primary px-5 py-2.5">
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              پنهان کن
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
