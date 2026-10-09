"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ArrowDownUp, LoaderCircle, Search, X } from "lucide-react";

type Opt = { id: string; name: string };

/** Search, category, brand and sort for the admin product list; every change goes back to page 1. */
export function ProductsToolbar(props: {
  q: string;
  category: string;
  brand: string;
  sort: string;
  defaultSort: string;
  categories: Opt[];
  brands: Opt[];
  sorts: { key: string; label: string }[];
  filtered: boolean;
}) {
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
    p.delete("saved");
    const s = p.toString();
    start(() => router.push(s ? `/admin/products?${s}` : "/admin/products", { scroll: false }));
  };

  const select = "h-11 min-w-0 rounded-xl border border-line bg-white px-3 text-sm";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 md:gap-3">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "").trim() });
        }}
        className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-brand sm:w-auto"
      >
        <Search className="size-4 shrink-0 text-muted" aria-hidden />
        <input
          key={props.q}
          name="q"
          type="search"
          defaultValue={props.q}
          placeholder="نام، کد کالا، کد فنی یا برند"
          aria-label="جستجوی محصول"
          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none sm:w-64"
        />
      </form>
      <select value={props.category} onChange={(e) => go({ category: e.target.value })} aria-label="دسته‌بندی" className={`${select} flex-1 sm:flex-none`}>
        <option value="">همه دسته‌ها</option>
        {props.categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <select value={props.brand} onChange={(e) => go({ brand: e.target.value })} aria-label="برند" className={`${select} flex-1 sm:flex-none`}>
        <option value="">همه برندها</option>
        {props.brands.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
      <label className="relative flex w-full items-center sm:w-auto">
        <ArrowDownUp className="pointer-events-none absolute right-3 size-4 text-muted" aria-hidden />
        <select value={props.sort} onChange={(e) => go({ sort: e.target.value === props.defaultSort ? null : e.target.value })} aria-label="مرتب‌سازی" className={`${select} w-full pr-9`}>
          {props.sorts.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </label>
      {pending && <LoaderCircle className="size-5 animate-spin text-muted" aria-label="در حال بارگذاری" />}
      {props.filtered && (
        <Link href="/admin/products" className="flex items-center gap-1 text-xs font-bold text-brand hover:underline">
          <X className="size-3.5" aria-hidden /> حذف فیلترها
        </Link>
      )}
    </div>
  );
}
