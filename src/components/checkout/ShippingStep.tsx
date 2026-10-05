"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Pencil, Plus } from "lucide-react";
import { RadioCard } from "./RadioCard";
import { SHIPPING_ICONS } from "./shipping-icons";
import { faDigits, toman } from "@/lib/format";
import { needsAddress, quoteShipping, shippingBadge, type ShippingOption } from "@/lib/shipping-shared";
import type { ShippingMethod } from "@/generated/prisma/client";

type Address = { id: string; receiverName: string; receiverPhone: string; province: string; city: string; fullAddress: string; isDefault: boolean };
type Method = ShippingOption & { key: ShippingMethod };

type Props = {
  addresses: Address[];
  methods: Method[];
  /** Items total after discount: decides "free shipping over …". */
  orderAmount: number;
  pickupAddress: string;
  summary: React.ReactNode;
};

export function ShippingStep({ addresses, methods, orderAmount, pickupAddress, summary }: Props) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const address = addresses.find((a) => a.id === addressId);
  const allowed = (m: Method) => !m.tehranOnly || address?.province === "تهران";
  const [picked, setPicked] = useState<ShippingMethod | null>(null);
  // Keep the customer's pick while it is allowed for the chosen address; otherwise the first allowed method.
  const current = methods.find((m) => m.key === picked && allowed(m)) ?? methods.find(allowed) ?? null;
  const quote = current ? quoteShipping(current, orderAmount) : null;
  const addressMissing = !!current && needsAddress(current.key) && !address;
  const pickup = current?.key === "PICKUP";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="addr">
          <div className="flex items-center justify-between">
            <h2 id="addr" className="text-base font-black">
              آدرس تحویل سفارش {pickup && <span className="text-xs font-bold text-muted">(برای تحویل حضوری لازم نیست)</span>}
            </h2>
            <Link href="/profile/addresses/new?next=/checkout" className="flex items-center gap-1 text-xs font-bold text-brand hover:underline">
              <Plus className="size-4" /> افزودن آدرس جدید
            </Link>
          </div>
          {addresses.length === 0 ? (
            pickup ? (
              <p className="rounded-xl bg-canvas p-4 text-center text-sm text-muted">برای تحویل حضوری نیازی به آدرس نیست؛ با شماره موبایل شما هماهنگ می‌کنیم.</p>
            ) : (
              <Link href="/profile/addresses/new?next=/checkout" className="rounded-xl border-2 border-dashed border-line p-6 text-center text-sm font-bold text-muted hover:border-brand hover:text-brand">
                برای ادامه، یک آدرس اضافه کنید
              </Link>
            )
          ) : (
            addresses.map((a) => (
              <RadioCard
                key={a.id}
                name="address"
                value={a.id}
                checked={a.id === addressId}
                onChange={setAddressId}
                aside={
                  <Link href={`/profile/addresses/${a.id}`} className="flex items-center gap-1 text-xs text-muted hover:text-ink">
                    <Pencil className="size-3.5" /> ویرایش
                  </Link>
                }
              >
                <span className="text-sm font-extrabold">{a.receiverName}</span>
                <span className="text-xs text-muted" dir="ltr">{faDigits(a.receiverPhone)}</span>
                <span className="text-xs text-muted">{a.province}، {a.city}، {a.fullAddress}</span>
              </RadioCard>
            ))
          )}
        </section>

        <section className="card flex flex-col gap-3 p-5" aria-labelledby="ship">
          <h2 id="ship" className="text-base font-black">انتخاب روش ارسال</h2>
          {methods.map((m) => {
            const Icon = SHIPPING_ICONS[m.key];
            const ok = allowed(m);
            const q = quoteShipping(m, orderAmount);
            return (
              <RadioCard
                key={m.key}
                name="shipping"
                value={m.key}
                checked={current?.key === m.key}
                onChange={() => setPicked(m.key)}
                disabled={!ok}
                aside={<MethodPrice method={m} cost={q.cost} collect={q.collect} freeByThreshold={q.freeByThreshold} />}
              >
                <span className="flex items-center gap-2 text-sm font-extrabold">
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${current?.key === m.key ? "bg-brand-soft text-brand" : "bg-surface text-muted"}`}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  {m.title}
                </span>
                <span className="text-xs leading-5 text-muted">{ok ? m.description : "فقط برای آدرس‌های استان تهران"}</span>
                {ok && m.pricing === "fixed" && m.freeOver !== null && !q.freeByThreshold && (
                  <span className="text-[11px] font-bold text-success">رایگان برای خریدهای بالای {toman(m.freeOver)} تومان</span>
                )}
                {m.key === "PICKUP" && current?.key === "PICKUP" && pickupAddress && (
                  <span className="mt-1 flex items-start gap-1.5 rounded-lg bg-canvas p-2 text-[11px] leading-5">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden /> {pickupAddress}
                  </span>
                )}
              </RadioCard>
            );
          })}
          {methods.length === 0 && <p className="text-sm text-muted">در حال حاضر روش ارسالی فعال نیست؛ لطفاً با پشتیبانی تماس بگیرید.</p>}
        </section>
      </div>

      <aside className="card flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-4">
        <h2 className="border-b border-line pb-4 text-base font-black">خلاصه سفارش</h2>
        {summary}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">هزینه ارسال</span>
          <span className="font-extrabold">{quote ? (shippingBadge(quote.cost, quote.collect) ?? `${toman(quote.cost)} تومان`) : "—"}</span>
        </div>
        {quote?.collect && <p className="-mt-2 text-[11px] leading-5 text-muted">کرایه هنگام تحویل مستقیماً به شرکت حمل پرداخت می‌شود.</p>}
        {addressMissing && <p className="rounded-lg bg-warning-soft p-2.5 text-xs font-bold text-warning">برای این روش ارسال، یک آدرس اضافه یا انتخاب کنید.</p>}
        <button
          type="button"
          disabled={!current || addressMissing}
          onClick={() => current && router.push(`/checkout/payment?shipping=${current.key}${address ? `&address=${address.id}` : ""}`)}
          className="btn-primary w-full py-3.5 text-base"
        >
          تایید و انتخاب روش پرداخت
        </button>
      </aside>
    </div>
  );
}

function MethodPrice({ method, cost, collect, freeByThreshold }: { method: Method; cost: number; collect: boolean; freeByThreshold: boolean }) {
  if (collect) return <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-black">پس‌کرایه</span>;
  if (cost === 0)
    return (
      <span className="flex shrink-0 flex-col items-end">
        {freeByThreshold && <s className="text-[11px] text-subtle">{toman(method.price)}</s>}
        <span className="rounded-lg bg-success-soft px-2.5 py-1 text-xs font-black text-success">رایگان</span>
      </span>
    );
  return (
    <span className="shrink-0 text-sm font-black">
      {toman(cost)} <span className="text-[10px] font-normal text-muted">تومان</span>
    </span>
  );
}
