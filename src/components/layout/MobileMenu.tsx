"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgePercent,
  ChevronLeft,
  CircleHelp,
  FileText,
  House,
  Info,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  PackageSearch,
  Phone,
  Headset,
  TrendingUp,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoLockup } from "@/components/brand/Logo";
import { faDigits } from "@/lib/format";

const LINKS: { href: string; label: string; Icon: LucideIcon; match?: (p: string) => boolean }[] = [
  { href: "/", label: "صفحه اصلی", Icon: House, match: (p) => p === "/" },
  { href: "/categories", label: "دسته‌بندی قطعات", Icon: LayoutGrid, match: (p) => p.startsWith("/categor") },
  { href: "/products?sort=bestselling", label: "محصولات پرفروش", Icon: TrendingUp },
  { href: "/offers", label: "تخفیف‌ها و پیشنهادها", Icon: BadgePercent, match: (p) => p.startsWith("/offers") },
  { href: "/profile/orders", label: "پیگیری سفارش", Icon: PackageSearch, match: (p) => p.startsWith("/profile/orders") },
  { href: "/faq", label: "سوالات متداول", Icon: CircleHelp, match: (p) => p.startsWith("/faq") },
  { href: "/about", label: "درباره ما", Icon: Info, match: (p) => p.startsWith("/about") },
  { href: "/contact", label: "تماس با ما", Icon: Phone, match: (p) => p.startsWith("/contact") },
  { href: "/terms", label: "قوانین و مقررات", Icon: FileText, match: (p) => p.startsWith("/terms") },
];

type Props = {
  isStaff?: boolean;
  /** null = not signed in */
  account: { name: string | null } | null;
  support: { phone: string; phoneDisplay: string; hours: string };
};

export function MobileMenu({ isStaff = false, account, support }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

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

  const close = () => setOpen(false);

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
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="منو">
          <button type="button" className="absolute inset-0 animate-fade-in bg-black/50" aria-label="بستن منو" onClick={close} />
          <div className="absolute inset-y-0 right-0 flex w-[300px] max-w-[85%] animate-slide-in-right flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 bg-night px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <LogoLockup height={32} gap="gap-2" nameClassName="text-base font-black" />
              <button type="button" onClick={close} aria-label="بستن" className="grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20">
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="flex flex-col gap-2 border-b border-line p-4">
                {account ? (
                  <Link href="/profile" onClick={close} className="flex items-center gap-3 rounded-2xl bg-canvas p-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-base font-black text-brand">
                      {account.name ? account.name.charAt(0) : <UserRound className="size-5" aria-hidden />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-extrabold">{account.name ? `سلام، ${account.name}` : "حساب کاربری"}</span>
                      <span className="truncate text-xs text-muted">سفارش‌ها و اطلاعات حساب</span>
                    </span>
                    <ChevronLeft className="size-4 text-muted" aria-hidden />
                  </Link>
                ) : (
                  <Link href="/login" onClick={close} className="btn-primary w-full">
                    <UserRound className="size-4" aria-hidden /> ورود / ثبت‌نام
                  </Link>
                )}
                {isStaff && (
                  <Link href="/admin" onClick={close} className="flex items-center justify-center gap-2 rounded-xl bg-ink px-3 py-3 text-sm font-bold text-white">
                    <LayoutDashboard className="size-4" aria-hidden /> پنل مدیریت
                  </Link>
                )}
              </div>

              <ul className="flex flex-col p-2">
                {LINKS.map(({ href, label, Icon, match }) => {
                  const active = match?.(pathname) ?? false;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold ${active ? "bg-brand-soft text-brand" : "text-ink hover:bg-canvas"}`}
                      >
                        <Icon className={`size-5 shrink-0 ${active ? "" : "text-muted"}`} aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <a
              href={`tel:${support.phone}`}
              className="flex items-center gap-3 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] hover:bg-canvas"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white">
                <Headset className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-muted">پشتیبانی · {support.hours}</span>
                <span className="text-sm font-black" dir="ltr">{faDigits(support.phoneDisplay)}</span>
              </span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
