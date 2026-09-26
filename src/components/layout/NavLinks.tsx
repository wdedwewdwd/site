"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "صفحه اصلی", match: (p: string) => p === "/" },
  { href: "/categories", label: "دسته‌بندی قطعات", match: (p: string) => p.startsWith("/categor") || p.startsWith("/product") },
  { href: "/products?sort=bestselling", label: "محصولات پرفروش", match: () => false },
  { href: "/offers", label: "تخفیف‌ها و پیشنهادها", match: (p: string) => p.startsWith("/offers") },
  { href: "/about", label: "درباره ما", match: (p: string) => p.startsWith("/about") },
  { href: "/contact", label: "تماس با ما", match: (p: string) => p.startsWith("/contact") },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="منوی اصلی" className="hidden border-b border-line bg-white md:block">
      <ul className="container-page flex h-12 items-stretch justify-between">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <li key={l.href} className="flex">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center border-b-[3px] px-2 text-sm transition-colors ${
                  active ? "border-brand font-extrabold text-brand" : "border-transparent font-medium text-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
