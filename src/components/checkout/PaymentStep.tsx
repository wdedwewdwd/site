"use client";

import { useState, useTransition } from "react";
import { CreditCard, Headset, LoaderCircle, ShieldCheck } from "lucide-react";
import { placeOrder } from "@/app/actions/checkout";
import { RadioCard } from "./RadioCard";
import { toman } from "@/lib/format";
import type { ShippingMethod } from "@/generated/prisma/client";

type Props = { addressId: string; shipping: ShippingMethod; total: number; onlineEnabled: boolean; summary: React.ReactNode };

/** Last checkout step. Payment is online only; while the bank gateway is not set up, orders cannot be placed. */
export function PaymentStep({ addressId, shipping, total, onlineEnabled, summary }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      // On success the action redirects to the bank gateway.
      const res = await placeOrder({ addressId, shipping });
      if (res && !res.ok) setError(res.error);
    });

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="card flex flex-col gap-4 p-5" aria-labelledby="pay">
        <h2 id="pay" className="text-base font-black">روش پرداخت</h2>
        <RadioCard name="payment" value="ONLINE" checked={onlineEnabled} disabled={!onlineEnabled} onChange={() => {}} aside={<CreditCard className="size-6 text-muted" />}>
          <span className="text-sm font-extrabold">درگاه آنلاین بانکی</span>
          <span className="text-xs text-muted">{onlineEnabled ? "پرداخت امن شتابی با تمام کارت‌های عضو شبکه بانکی کشور (شاپرک)" : "به‌زودی فعال می‌شود"}</span>
        </RadioCard>
        {onlineEnabled ? (
          <p className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-xs font-bold text-success">
            <ShieldCheck className="size-4 shrink-0" />
            اطلاعات کارت شما فقط در صفحه امن بانک وارد می‌شود و هرگز در سایت ما ذخیره نمی‌شود.
          </p>
        ) : (
          <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-xs font-bold leading-6 text-warning">
            <Headset className="mt-0.5 size-4 shrink-0" />
            پرداخت آنلاین به‌زودی فعال می‌شود. تا آن زمان برای ثبت سفارش با پشتیبانی تماس بگیرید.
          </p>
        )}
      </section>

      <aside className="card flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-4">
        <h2 className="border-b border-line pb-4 text-base font-black">خلاصه فاکتور نهایی</h2>
        {summary}
        {error && <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">{error}</p>}
        <button type="button" onClick={submit} disabled={pending || !onlineEnabled} className="btn-primary w-full py-3.5 text-base disabled:opacity-60">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {`پرداخت ${toman(total)} تومان و ثبت سفارش`}
        </button>
      </aside>
    </div>
  );
}
