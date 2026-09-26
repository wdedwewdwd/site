"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { RadioCard } from "./RadioCard";
import { faDigits, toman } from "@/lib/format";

type Address = { id: string; receiverName: string; receiverPhone: string; province: string; city: string; fullAddress: string; isDefault: boolean };
type Method = { key: "EXPRESS" | "POST"; title: string; description: string; price: number };

export function ShippingStep({ addresses, methods, summary }: { addresses: Address[]; methods: Method[]; summary: React.ReactNode }) {
  const router = useRouter();
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? "");
  const address = addresses.find((a) => a.id === addressId);
  const expressAllowed = address?.province === "تهران";
  const [shipping, setShipping] = useState<Method["key"]>(expressAllowed ? "EXPRESS" : "POST");
  const effective = shipping === "EXPRESS" && !expressAllowed ? "POST" : shipping;
  const price = methods.find((m) => m.key === effective)?.price ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <section className="card flex flex-col gap-4 p-5" aria-labelledby="addr">
          <div className="flex items-center justify-between">
            <h2 id="addr" className="text-base font-black">آدرس تحویل سفارش</h2>
            <Link href="/profile/addresses/new?next=/checkout" className="flex items-center gap-1 text-xs font-bold text-brand hover:underline">
              <Plus className="size-4" /> افزودن آدرس جدید
            </Link>
          </div>
          {addresses.length === 0 ? (
            <Link href="/profile/addresses/new?next=/checkout" className="rounded-xl border-2 border-dashed border-line p-6 text-center text-sm font-bold text-muted hover:border-brand hover:text-brand">
              برای ادامه، یک آدرس اضافه کنید
            </Link>
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

        <section className="card flex flex-col gap-4 p-5" aria-labelledby="ship">
          <h2 id="ship" className="text-base font-black">انتخاب روش ارسال</h2>
          {methods.map((m) => {
            const disabled = m.key === "EXPRESS" && !expressAllowed;
            return (
              <RadioCard
                key={m.key}
                name="shipping"
                value={m.key}
                checked={effective === m.key}
                onChange={(v) => setShipping(v as Method["key"])}
                disabled={disabled}
                aside={
                  <span className="text-sm font-black">
                    {toman(m.price)} <span className="text-[10px] font-normal text-muted">تومان</span>
                  </span>
                }
              >
                <span className="text-sm font-extrabold">{m.title}</span>
                <span className="text-xs text-muted">{disabled ? "فقط برای آدرس‌های استان تهران" : m.description}</span>
              </RadioCard>
            );
          })}
        </section>
      </div>

      <aside className="card flex h-fit flex-col gap-4 p-5 lg:sticky lg:top-4">
        <h2 className="border-b border-line pb-4 text-base font-black">خلاصه سفارش</h2>
        {summary}
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-muted">هزینه ارسال</span>
          <span className="font-extrabold">{toman(price)} تومان</span>
        </div>
        <button
          type="button"
          disabled={!addressId}
          onClick={() => router.push(`/checkout/payment?address=${addressId}&shipping=${effective}`)}
          className="btn-primary w-full py-3.5 text-base"
        >
          تایید و انتخاب روش پرداخت
        </button>
      </aside>
    </div>
  );
}
