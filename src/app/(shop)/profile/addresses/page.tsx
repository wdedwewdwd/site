import Link from "next/link";
import { MapPin, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDigits } from "@/lib/format";
import { AddressActions } from "@/components/profile/AddressActions";

export default async function AddressesPage() {
  const user = await requireUser("/profile/addresses");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });

  return (
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-black">آدرس‌های من</h1>
        <Link href="/profile/addresses/new" className="flex items-center gap-1 text-sm font-bold text-brand hover:underline">
          <Plus className="size-4" /> افزودن آدرس جدید
        </Link>
      </div>
      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <MapPin className="size-10 text-subtle" />
          <p className="text-sm text-muted">هنوز آدرسی ثبت نکرده‌اید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {addresses.map((a) => (
            <li key={a.id} className={`flex flex-col gap-3 rounded-card border p-4 ${a.isDefault ? "border-brand" : "border-line"}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black">{a.title ?? "آدرس"}</span>
                {a.isDefault && <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand">پیش‌فرض</span>}
              </div>
              <p className="text-[13px] leading-7">{a.province}، {a.city}، {a.fullAddress}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                <span>گیرنده: <b className="text-ink">{a.receiverName} (<span dir="ltr">{faDigits(a.receiverPhone)}</span>)</b></span>
                <span>کد پستی: <b className="text-ink">{a.postalCode ? faDigits(a.postalCode) : "وارد نشده"}</b></span>
              </div>
              <AddressActions id={a.id} isDefault={a.isDefault} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
