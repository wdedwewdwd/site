"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CircleUserRound, Headset, Heart, LayoutDashboard, LogOut, MapPin, ShoppingBag } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { faDigits } from "@/lib/format";

export function ProfileNav({ openOrders, unread }: { openOrders: number; unread: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/profile", label: "خلاصه فعالیت", Icon: LayoutDashboard, exact: true },
    { href: "/profile/orders", label: "سفارش‌های من", Icon: ShoppingBag, badge: openOrders },
    { href: "/profile/wishlist", label: "لیست علاقه‌مندی‌ها", Icon: Heart },
    { href: "/profile/addresses", label: "آدرس‌ها", Icon: MapPin },
    { href: "/profile/notifications", label: "اعلان‌ها", Icon: Bell, badge: unread },
    { href: "/profile/support", label: "پشتیبانی", Icon: Headset },
    { href: "/profile/account", label: "اطلاعات حساب", Icon: CircleUserRound },
  ];

  return (
    <nav aria-label="منوی حساب کاربری" className="card p-2">
      <ul className="flex flex-col gap-1">
        {items.map(({ href, label, Icon, badge, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                  active ? "bg-brand-soft font-extrabold text-brand" : "font-bold text-ink hover:bg-canvas"
                }`}
              >
                <Icon className="size-5" aria-hidden />
                <span className="flex-1">{label}</span>
                {!!badge && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-black text-brand">{faDigits(badge)}</span>}
              </Link>
            </li>
          );
        })}
        <li className="mt-1 border-t border-line pt-1">
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-extrabold text-brand hover:bg-brand-soft">
              <LogOut className="size-5" aria-hidden />
              خروج از حساب
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
