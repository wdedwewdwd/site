"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Boxes, ChartNoAxesCombined, Contact, FolderTree, GalleryHorizontalEnd, Headset, LayoutDashboard, LogOut, Menu, MessageSquareText, MessagesSquare, Percent, Settings, ShoppingBag, Store, Truck, Users, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand/Logo";
import { faDigits } from "@/lib/format";
import { useStaffChat } from "./chat/StaffChatProvider";

type BadgeKey = "orders" | "tickets" | "chat" | "reviews";
type Item = { href: string; label: string; Icon: typeof Boxes; exact?: boolean; badgeKey?: BadgeKey };

/** The admin menu, grouped by what the owner is doing. */
const GROUPS: { title?: string; items: Item[] }[] = [
  {
    items: [
      { href: "/admin", label: "داشبورد", Icon: LayoutDashboard, exact: true },
      { href: "/admin/analytics", label: "آمار بازدید", Icon: ChartNoAxesCombined },
    ],
  },
  {
    title: "فروش",
    items: [
      { href: "/admin/orders", label: "سفارش‌ها", Icon: ShoppingBag, badgeKey: "orders" },
      { href: "/admin/customers", label: "مشتریان", Icon: Users },
      { href: "/admin/discounts", label: "تخفیف‌ها", Icon: Percent },
    ],
  },
  {
    title: "کالاها و ویترین",
    items: [
      { href: "/admin/products", label: "محصولات", Icon: Boxes },
      { href: "/admin/categories", label: "دسته‌بندی‌ها", Icon: FolderTree },
      { href: "/admin/banners", label: "بنرهای صفحه اصلی", Icon: GalleryHorizontalEnd },
    ],
  },
  {
    title: "ارتباط با مشتری",
    items: [
      { href: "/admin/chat", label: "گفتگوی آنلاین", Icon: MessagesSquare, badgeKey: "chat" },
      { href: "/admin/tickets", label: "تیکت‌های پشتیبانی", Icon: Headset, badgeKey: "tickets" },
      { href: "/admin/reviews", label: "نظرات کاربران", Icon: MessageSquareText, badgeKey: "reviews" },
    ],
  },
  {
    title: "تنظیمات فروشگاه",
    items: [
      { href: "/admin/shipping", label: "روش‌های ارسال", Icon: Truck },
      { href: "/admin/contact", label: "اطلاعات تماس و شبکه‌ها", Icon: Contact },
      { href: "/admin/settings", label: "تنظیمات", Icon: Settings },
    ],
  },
];

/**
 * Sidebar on large screens, a drawer on phones and tablets. The logo and the account area stay put;
 * only the menu scrolls when the screen is too short for it, so every item is always reachable.
 */
export function AdminNav({ name, role, badges: serverBadges }: { name: string; role: string; badges: Record<BadgeKey, number> }) {
  const pathname = usePathname();
  const live = useStaffChat();
  // The chat badge updates live; the others refresh on navigation.
  const badges = { ...serverBadges, chat: live?.unread ?? serverBadges.chat };
  const [open, setOpen] = useState(false);

  // The drawer closes with Esc and keeps the page behind it still.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const props = { pathname, badges, name, role, onNavigate: () => setOpen(false) };

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 bg-night text-white lg:block">
        <NavContent {...props} />
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-night px-4 py-3 text-white lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="باز کردن منو" aria-expanded={open} className="grid size-9 place-items-center rounded-lg hover:bg-white/10">
          <Menu className="size-6" />
        </button>
        <span className="text-sm font-black">پنل مدیریت آریزون</span>
        <LogoMark className="h-6 w-[40px]" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="منوی پنل مدیریت">
          <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-label="بستن منو" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(19rem,88vw)] flex-col bg-night text-white shadow-2xl">
            <NavContent {...props} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function NavContent({
  pathname,
  badges,
  name,
  role,
  onNavigate,
  onClose,
}: {
  pathname: string;
  badges: Record<BadgeKey, number>;
  name: string;
  role: string;
  onNavigate: () => void;
  /** In the phone drawer: a close button takes the logo's place. */
  onClose?: () => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  // On a short screen, keep the current page's item in view.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-5">
        <span className="text-base font-black">پنل مدیریت آریزون</span>
        {onClose ? (
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label="بستن منو">
            <X className="size-5" />
          </button>
        ) : (
          <LogoMark className="h-8 w-[54px]" />
        )}
      </div>

      <nav
        ref={listRef}
        aria-label="منوی پنل مدیریت"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-color:rgb(255_255_255/0.18)_transparent] [scrollbar-width:thin]"
      >
        {GROUPS.map((g, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {g.title && <p className="mb-1.5 px-3 text-[11px] font-bold tracking-wide text-white/40">{g.title}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.items.map(({ href, label, Icon, exact, badgeKey }) => {
                const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
                const badge = badgeKey ? badges[badgeKey] : 0;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-bold transition-colors ${
                        active ? "bg-white/[0.09] text-white" : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {/* Active marker on the inner (right) edge, like a bookmark. */}
                      <span className={`absolute inset-y-2 right-0 w-1 rounded-l-full bg-brand transition-opacity ${active ? "opacity-100" : "opacity-0"}`} aria-hidden />
                      <Icon className={`size-[18px] shrink-0 ${active ? "text-brand" : "text-white/55 group-hover:text-white"}`} aria-hidden />
                      <span className="flex-1 truncate">{label}</span>
                      {badge > 0 && <span className="min-w-6 rounded-full bg-brand px-1.5 text-center text-[11px] font-black leading-5 text-white">{faDigits(badge)}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Link href="/" target="_blank" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-white/65 hover:bg-white/5 hover:text-white">
          <Store className="size-[18px]" aria-hidden /> مشاهده فروشگاه
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-black" aria-hidden>
            {name.trim().charAt(0) || "؟"}
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-bold">{name}</span>
            <span className="text-[11px] text-white/50">{role === "ADMIN" ? "مدیر ارشد" : "پشتیبان"}</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" title="خروج از حساب" aria-label="خروج از حساب" className="grid size-9 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white">
              <LogOut className="size-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
