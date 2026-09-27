"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Boxes, FolderTree, Headset, LayoutDashboard, LogOut, Menu, MessagesSquare, Percent, Settings, ShoppingBag, Store, Users, X } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { LogoMark } from "@/components/brand/Logo";
import { faDigits } from "@/lib/format";
import { useStaffChat } from "./chat/StaffChatProvider";

const ITEMS = [
  { href: "/admin", label: "داشبورد", Icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "محصولات", Icon: Boxes },
  { href: "/admin/orders", label: "سفارش‌ها", Icon: ShoppingBag, badgeKey: "orders" as const },
  { href: "/admin/customers", label: "مشتریان", Icon: Users },
  { href: "/admin/chat", label: "گفتگوی آنلاین", Icon: MessagesSquare, badgeKey: "chat" as const },
  { href: "/admin/tickets", label: "تیکت‌های پشتیبانی", Icon: Headset, badgeKey: "tickets" as const },
  { href: "/admin/categories", label: "دسته‌بندی‌ها", Icon: FolderTree },
  { href: "/admin/discounts", label: "تخفیف‌ها", Icon: Percent },
  { href: "/admin/settings", label: "تنظیمات", Icon: Settings },
];

export function AdminNav({ name, role, badges: serverBadges }: { name: string; role: string; badges: { orders: number; tickets: number; chat: number } }) {
  const pathname = usePathname();
  const live = useStaffChat();
  // The chat badge updates live; the others refresh on navigation.
  const badges = { ...serverBadges, chat: live?.unread ?? serverBadges.chat };
  const [open, setOpen] = useState(false);

  const nav = (
    <div className="flex h-full flex-col gap-6 p-5">
      <div className="flex items-center justify-between">
        <span className="text-base font-black">پنل مدیریت آریزون</span>
        <LogoMark className="h-8 w-[54px]" />
      </div>
      <ul className="flex flex-1 flex-col gap-1">
        {ITEMS.map(({ href, label, Icon, exact, badgeKey }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const badge = badgeKey ? badges[badgeKey] : 0;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${active ? "bg-black text-white" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
              >
                <Icon className="size-5" aria-hidden />
                <span className="flex-1">{label}</span>
                {badge > 0 && <span className="rounded-full bg-brand px-2 text-[11px] font-black text-white">{faDigits(badge)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-white/70 hover:text-white">
          <Store className="size-5" /> مشاهده فروشگاه
        </Link>
        <div className="flex items-center justify-between gap-3 px-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold">{name}</span>
            <span className="text-[11px] text-white/50">سطح دسترسی: {role === "ADMIN" ? "مدیر ارشد" : "پشتیبان"}</span>
          </div>
          <form action={logoutAction}>
            <button type="submit" aria-label="خروج" className="grid size-9 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white">
              <LogOut className="size-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 bg-night text-white lg:block">{nav}</aside>
      <div className="flex items-center justify-between bg-night px-4 py-3 text-white lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="منو"><Menu className="size-6" /></button>
        <span className="text-sm font-black">پنل مدیریت آریزون</span>
        <span className="size-6" />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="بستن" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-72 bg-night text-white">
            <button type="button" onClick={() => setOpen(false)} className="absolute left-3 top-3" aria-label="بستن"><X className="size-5" /></button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
