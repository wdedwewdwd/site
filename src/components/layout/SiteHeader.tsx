import Link from "next/link";
import { Bell, LayoutDashboard, ShoppingCart, User } from "lucide-react";
import { getUser } from "@/lib/auth/session";
import { getCartCount } from "@/lib/cart";
import { faDigits } from "@/lib/format";
import { SITE } from "@/lib/shop";
import { getContact } from "@/lib/settings";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { SearchBox } from "./SearchBox";
import { NavLinks } from "./NavLinks";
import { MobileMenu } from "./MobileMenu";
import { OnlyOnPaths } from "./navigation";

export async function SiteHeader() {
  const [user, cartCount, contact] = await Promise.all([getUser(), getCartCount(), getContact()]);
  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") || "حساب کاربری" : null;
  const isStaff = user?.role === "ADMIN" || user?.role === "SUPPORT";

  return (
    <header>
      {/* Top bar (desktop) */}
      <div className="hidden border-b border-white/[0.06] bg-coal md:block">
        <div className="container-page flex items-center justify-between py-2 text-[13px] text-white/60">
          <Link href="/profile/orders" className="hover:text-white">پیگیری سفارش</Link>
          <p className="flex items-center gap-3">
            <span>
              پشتیبانی: <a href={`tel:${contact.phone}`} dir="ltr" className="hover:text-white">{contact.phoneDisplay}</a>
              {contact.mobile && <> · <a href={`tel:${contact.mobile}`} dir="ltr" className="hover:text-white">{contact.mobileDisplay}</a></>}
            </span>
            <span aria-hidden>·</span>
            <span>{contact.hours}</span>
          </p>
        </div>
      </div>

      {/* Main header (desktop) */}
      <div className="hidden bg-night md:block">
        <div className="container-page flex items-center justify-between gap-6 py-4">
          <Logo tone="dark" />
          <SearchBox className="w-full max-w-[600px]" />
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/cart"
              className="flex items-center gap-2 rounded-[10px] bg-brand px-4 py-2 text-[13px] font-bold text-white shadow-[0_8px_24px_-10px] shadow-brand transition-colors hover:bg-brand-dark"
            >
              سبد خرید
              <span className="sr-only">({faDigits(cartCount)} کالا)</span>
              <ShoppingCart className="size-[18px]" aria-hidden />
              {cartCount > 0 && (
                <span aria-hidden className="min-w-5 rounded-full bg-white px-1.5 py-0.5 text-center text-[11px] font-black text-brand">{faDigits(cartCount)}</span>
              )}
            </Link>
            <span className="mx-1 h-6 w-px bg-white/10" aria-hidden />
            <Link
              href={user ? "/profile" : "/login"}
              className="flex items-center gap-2 rounded-[10px] border border-white/15 bg-white/[0.04] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:border-white/25 hover:bg-white/10"
            >
              {displayName ?? "ورود / ثبت‌نام"}
              <User className="size-[18px]" aria-hidden />
            </Link>
            {isStaff && (
              <Link href="/admin" className="flex items-center gap-2 rounded-[10px] bg-white px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:bg-white/85">
                پنل مدیریت
                <LayoutDashboard className="size-[18px]" aria-hidden />
              </Link>
            )}
          </div>
        </div>
      </div>
      <NavLinks />

      {/* Mobile brand header — home only; inner pages show their own PageBar with a back button */}
      <OnlyOnPaths paths={["/"]}>
      <div className="rounded-b-[24px] bg-night pb-4 md:hidden">
        <div className="flex items-center justify-between px-4 py-2">
          <MobileMenu isStaff={isStaff} />
          <Link href="/" className="flex items-center gap-2" aria-label={`${SITE.name} — صفحه اصلی`}>
            <LogoMark className="h-8 w-[54px]" />
            <span className="text-lg font-black text-white">{SITE.name}</span>
          </Link>
          <Link
            href={user ? "/profile/notifications" : "/login"}
            className="grid size-10 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/[0.12]"
            aria-label="اعلان‌ها"
          >
            <Bell className="size-5" />
          </Link>
        </div>
        <div className="flex items-stretch gap-2 px-4 pt-2">
          <SearchBox className="min-w-0 flex-1" />
          {isStaff && (
            <Link href="/admin" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-extrabold text-ink transition-colors hover:bg-white/85">
              پنل مدیریت
              <LayoutDashboard className="size-4" aria-hidden />
            </Link>
          )}
        </div>
      </div>
      </OnlyOnPaths>
    </header>
  );
}
