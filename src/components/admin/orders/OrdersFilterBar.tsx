"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Download, LoaderCircle, Search, X } from "lucide-react";
import { jKey, type JDate } from "@/lib/jalali";
import { JalaliRangePicker } from "@/components/admin/reports/JalaliRangePicker";

type Props = {
  from: JDate | null;
  to: JDate | null;
  today: JDate;
  preset: string | null;
  presets: readonly { key: string; label: string }[];
  q: string;
  pay: string;
  noPostal: boolean;
  exportHref: string;
  filtered: boolean;
};

/** One row of filters above the order list; every change resets to page 1. */
export function OrdersFilterBar(props: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  const go = (next: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    p.delete("page");
    start(() => router.push(`/admin/orders?${p.toString()}`, { scroll: false }));
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
        }}
        className="flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-3"
      >
        <Search className="size-4 text-muted" aria-hidden />
        <input name="q" defaultValue={props.q} placeholder="شماره سفارش، موبایل، نام یا کد رهگیری" aria-label="جستجوی سفارش" className="w-64 bg-transparent text-sm focus:outline-none" />
      </form>
      <JalaliRangePicker
        from={props.from}
        to={props.to}
        today={props.today}
        activePreset={props.preset ?? (props.from ? null : "all")}
        presets={props.presets}
        onPreset={(key) => go({ p: key === "all" ? null : key, from: null, to: null })}
        onRange={(f, t) => go({ p: null, from: jKey(f), to: jKey(t) })}
      />
      <select value={props.pay} onChange={(e) => go({ pay: e.target.value })} aria-label="روش پرداخت" className="h-11 rounded-xl border border-line bg-white px-3 text-sm">
        <option value="">همه روش‌های پرداخت</option>
        <option value="ONLINE">درگاه آنلاین</option>
        <option value="COD">پرداخت در محل</option>
      </select>
      <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm">
        <input type="checkbox" checked={props.noPostal} onChange={(e) => go({ nopostal: e.target.checked ? "1" : null })} className="size-4 accent-brand" />
        فقط بدون کد پستی
      </label>
      {pending && <LoaderCircle className="size-5 animate-spin text-muted" aria-label="در حال بارگذاری" />}
      {props.filtered && (
        <Link href="/admin/orders" className="flex items-center gap-1 text-xs font-bold text-brand hover:underline">
          <X className="size-3.5" /> حذف فیلترها
        </Link>
      )}
      <a href={props.exportHref} className="mr-auto flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[13px] font-bold hover:bg-canvas">
        <Download className="size-4" aria-hidden /> خروجی اکسل
      </a>
    </div>
  );
}
