"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, LayoutGrid, ShoppingCart, UserSquare } from "lucide-react";
import { faDigits } from "@/lib/format";

export function BottomNav({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "خانه", Icon: House, active: pathname === "/" },
    { href: "/categories", label: "دسته‌بندی", Icon: LayoutGrid, active: pathname.startsWith("/categor") },
    { href: "/cart", label: "سبد خرید", Icon: ShoppingCart, active: pathname.startsWith("/cart"), badge: cartCount },
    { href: "/profile", label: "پروفایل", Icon: UserSquare, active: pathname.startsWith("/profile") },
  ];
  return (
    <nav
      aria-label="منوی پایین"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, Icon, active, badge }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-bold ${active ? "text-brand" : "text-muted"}`}
            >
              <span className="relative">
                <Icon className="size-6" aria-hidden />
                {!!badge && (
                  <span className="absolute -top-1.5 -left-2.5 grid min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-black text-white">
                    {faDigits(badge)}
                  </span>
                )}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
