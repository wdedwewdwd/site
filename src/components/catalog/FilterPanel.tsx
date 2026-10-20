"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LoaderCircle, SlidersHorizontal, X } from "lucide-react";

type Option = { slug: string; label: string };

export function FilterPanel({ brands, cars }: { brands: Option[]; cars: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const selected = (key: string) => new Set((params.get(key) ?? "").split(",").filter(Boolean));

  const update = (mutate: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    next.delete("page");
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const toggle = (key: string, slug: string) =>
    update((p) => {
      const set = selected(key);
      if (set.has(slug)) set.delete(slug);
      else set.add(slug);
      if (set.size) p.set(key, [...set].join(","));
      else p.delete(key);
    });

  const inStock = params.get("stock") === "1";
  const active = selected("brand").size + selected("car").size + (inStock ? 1 : 0);

  // The phone sheet covers the page: keep the page behind it from scrolling, close it with Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel = (
    <div className={`flex flex-col gap-5 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black">فیلترهای جستجو</h2>
        <button type="button" className="text-xs font-bold text-brand md:hidden" onClick={() => setOpen(false)}>
          <X className="size-5" aria-label="بستن" />
        </button>
      </div>
      <hr className="border-line" />
      {brands.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-extrabold">برندها</legend>
          {brands.map((b) => (
            <Check key={b.slug} label={b.label} checked={selected("brand").has(b.slug)} onChange={() => toggle("brand", b.slug)} />
          ))}
        </fieldset>
      )}
      <hr className="border-line" />
      {cars.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-extrabold">سازگاری خودرو</legend>
          {cars.map((c) => (
            <Check key={c.slug} label={c.label} checked={selected("car").has(c.slug)} onChange={() => toggle("car", c.slug)} />
          ))}
        </fieldset>
      )}
      <hr className="border-line" />
      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm font-extrabold">فقط کالاهای موجود</span>
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={inStock}
          onChange={() => update((p) => (inStock ? p.delete("stock") : p.set("stock", "1")))}
        />
        <span className="relative h-6 w-11 rounded-full bg-line transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-brand peer-checked:after:-translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
      </label>
    </div>
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost w-full py-2.5 md:hidden">
        <SlidersHorizontal className="size-4" /> فیلترها
        {active > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-black text-white">{active.toLocaleString("fa-IR")}</span>}
      </button>
      <aside className="card hidden h-fit p-5 md:block">{panel}</aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="فیلترها">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="بستن" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl bg-white animate-fade-up">
            <div className="overflow-y-auto overscroll-contain p-5">{panel}</div>
            <div className="flex gap-3 border-t border-line bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button type="button" onClick={() => setOpen(false)} className="btn-primary flex-1">
                {pending && <LoaderCircle className="size-4 animate-spin" />}
                مشاهده نتایج
              </button>
              {active > 0 && (
                <button
                  type="button"
                  onClick={() => update((p) => ["brand", "car", "stock"].forEach((k) => p.delete(k)))}
                  className="btn-ghost"
                >
                  حذف فیلترها
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-5 cursor-pointer rounded accent-brand" />
      {label}
    </label>
  );
}
