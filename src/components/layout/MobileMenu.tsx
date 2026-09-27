"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/categories", label: "دسته‌بندی قطعات" },
  { href: "/products?sort=bestselling", label: "محصولات پرفروش" },
  { href: "/offers", label: "تخفیف‌ها و پیشنهادها" },
  { href: "/profile/orders", label: "پیگیری سفارش" },
  { href: "/faq", label: "سوالات متداول" },
  { href: "/about", label: "درباره ما" },
  { href: "/contact", label: "تماس با ما" },
  { href: "/terms", label: "قوانین و مقررات" },
];

export function MobileMenu({ isStaff = false }: { isStaff?: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/[0.12]"
        aria-label="باز کردن منو"
        aria-expanded={open}
      >
        <Menu className="size-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="منو">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="بستن منو" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-black">منو</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="بستن" className="grid size-9 place-items-center rounded-full hover:bg-canvas">
                <X className="size-5" />
              </button>
            </div>
            <ul className="flex flex-col">
              {isStaff && (
                <li>
                  <Link href="/admin" onClick={() => setOpen(false)} className="mb-2 block rounded-lg bg-ink px-3 py-3 text-sm font-bold text-white">
                    پنل مدیریت
                  </Link>
                </li>
              )}
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-bold text-ink hover:bg-canvas">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
