"use client";

import { useState, useTransition } from "react";
import { CreditCard, LoaderCircle, ShieldCheck, Truck } from "lucide-react";
import { placeOrder } from "@/app/actions/checkout";
import { RadioCard } from "./RadioCard";
import { toman } from "@/lib/format";

type Props = { addressId: string; shipping: "EXPRESS" | "POST"; total: number; onlineEnabled: boolean; summary: React.ReactNode };

export function PaymentStep({ addressId, shipping, total, onlineEnabled, summary }: Props) {
  const [payment, setPayment] = useState<"ONLINE" | "COD">(onlineEnabled ? "ONLINE" : "COD");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setError(null);
      // On success the action redirects (to the bank gateway or the result page).
      const res = await placeOrder({ addressId, shipping, payment });
      if (res && !res.ok) setError(res.error);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="card flex flex-col gap-4 p-5" aria-labelledby="pay">
        <h2 id="pay" className="text-base font-black">انتخاب روش پرداخت</h2>
        <RadioCard name="payment" value="ONLINE" checked={payment === "ONLINE"} disabled={!onlineEnabled} onChange={() => setPayment("ONLINE")} aside={<CreditCard className="size-6 text-muted" />}>
          <span className="text-sm font-extrabold">درگاه آنلاین بانکی</span>
          <span className="text-xs text-muted">{onlineEnabled ? "پرداخت امن شتابی با تمام کارت‌های عضو شبکه بانکی کشور (شاپرک)" : "به‌زودی فعال می‌شود"}</span>
        </RadioCard>
        <RadioCard name="payment" value="COD" checked={payment === "COD"} onChange={() => setPayment("COD")} aside={<Truck className="size-6 text-muted" />}>
          <span className="text-sm font-extrabold">پرداخت در محل (کارت به کارت یا کارتخوان)</span>
          <span className="text-xs text-muted">پرداخت با دستگاه کارتخوان مأمور ارسال هنگام تحویل قطعات</span>
        </RadioCard>
        <p className="flex items-center gap-2 rounded-lg bg-success-soft p-3 text-xs font-bold text-success">
          <ShieldCheck className="size-4 shrink-0" />
          اطلاعات کارت شما فقط در صفحه امن بانک وارد می‌شود و هرگز در سایت ما ذخیره نمی‌شود.
        </p>
      </section>

      <aside className="card flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-4">
        <h2 className="border-b border-line pb-4 text-base font-black">خلاصه فاکتور نهایی</h2>
        {summary}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">روش انتخابی</span>
          <span className="font-extrabold text-success">{payment === "ONLINE" ? "درگاه آنلاین" : "پرداخت در محل"}</span>
        </div>
        {error && <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">{error}</p>}
        <button type="button" onClick={submit} disabled={pending} className="btn-primary w-full py-3.5 text-base">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {payment === "ONLINE" ? `پرداخت ${toman(total)} تومان و ثبت سفارش` : "ثبت نهایی سفارش"}
        </button>
      </aside>
    </div>
  );
}
