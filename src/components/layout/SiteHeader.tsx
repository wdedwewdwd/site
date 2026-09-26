import Link from "next/link";
import { Bell, LayoutDashboard, ShoppingCart, User } from "lucide-react";
import { getUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { SITE } from "@/lib/shop";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { SearchBox } from "./SearchBox";
import { NavLinks } from "./NavLinks";
import { MobileMenu } from "./MobileMenu";

export async function SiteHeader() {
  const [user, cartCount] = await Promise.all([getUser(), getCartCount()]);
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "حساب کاربری" : null;
  const isStaff = user?.role === "ADMIN" || user?.role === "SUPPORT";

  return (
    <header>
      {/* Top bar (desktop) */}
      <div className="hidden bg-night md:block">
        <div className="container-page flex items-center justify-between py-2 text-[13px] text-line">
          <p className="flex items-center gap-5">
            <Link href="/profile/orders" className="hover:text-white">پیگیری سفارش</Link>
            <Link href="/contact" className="hover:text-white">فروشنده شوید</Link>
          </p>
          <p className="flex items-center gap-3">
            <span>پشتیبانی: <a href="tel:02112345678" className="hover:text-white">{SITE.supportPhone}</a></span>
            <span aria-hidden>·</span>
            <span>{SITE.supportHours}</span>
          </p>
        </div>
      </div>

      {/* Main header (desktop) */}
      <div className="hidden border-b border-line bg-white md:block">
        <div className="container-page flex items-center justify-between gap-6 py-4">
          <Logo />
          <SearchBox className="w-full max-w-[600px]" />
          <div className="flex shrink-0 items-center gap-4">
            <Link href="/cart" className="flex items-center gap-2 rounded-[10px] bg-brand-soft px-4 py-2 text-[13px] font-bold text-brand hover:bg-brand/15">
              سبد خرید
              <span className="sr-only">({faDigits(cartCount)} کالا)</span>
              <ShoppingCart className="size-[18px]" aria-hidden />
              {cartCount > 0 && (
                <span aria-hidden className="rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-black text-white">{faDigits(cartCount)}</span>
              )}
            </Link>
            <span className="h-6 w-px bg-line" aria-hidden />
            <Link
              href={user ? "/profile" : "/login"}
              className="flex items-center gap-2 rounded-[10px] border border-line px-4 py-2 text-[13px] font-bold text-ink hover:bg-canvas"
            >
              {displayName ?? "ورود / ثبت‌نام"}
              <User className="size-[18px]" aria-hidden />
            </Link>
            {isStaff && (
              <Link href="/admin" className="flex items-center gap-2 rounded-[10px] bg-ink px-4 py-2 text-[13px] font-bold text-white hover:bg-night">
                پنل مدیریت
                <LayoutDashboard className="size-[18px]" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
      <NavLinks />

      {/* Mobile header */}
      <div className="sticky top-0 z-30 bg-white md:hidden">
        <div className="flex items-center justify-between px-5 py-2">
          <MobileMenu isStaff={isStaff} />
          <Link href="/" className="flex items-center gap-2" aria-label={`${SITE.name} — صفحه اصلی`}>
            <LogoMark className="h-8 w-[54px]" />
            <span className="text-lg font-black">{SITE.name}</span>
          </Link>
          <Link href={user ? "/profile/notifications" : "/login"} className="grid size-10 place-items-center" aria-label="اعلان‌ها">
            <Bell className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
