import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircleMore, Phone, Smartphone } from "lucide-react";
import { SITE, SITE_ADDRESS } from "@/lib/shop";
import { getShopLocation } from "@/lib/settings";
import { PageBar } from "@/components/layout/PageBar";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { ShopMap } from "@/components/map/ShopMap";

export const metadata: Metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const location = await getShopLocation();
  const items: { Icon: typeof Phone; label: string; value: string; href?: string; ltr?: boolean }[] = [
    { Icon: Phone, label: "تلفن ثابت پشتیبانی", value: SITE.supportPhone, href: `tel:${SITE.supportPhoneTel}`, ltr: true },
    { Icon: Smartphone, label: "موبایل پشتیبانی", value: SITE.supportMobile, href: `tel:${SITE.supportMobileTel}`, ltr: true },
    { Icon: Clock, label: "ساعات پاسخگویی", value: SITE.supportHours },
    ...(SITE.email ? [{ Icon: Mail, label: "ایمیل", value: SITE.email, href: `mailto:${SITE.email}`, ltr: true }] : []),
    { Icon: MapPin, label: "نشانی فروشگاه", value: SITE_ADDRESS },
  ];
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title="تماس با ما" backHref="/" />
      <div className="card mx-auto w-full max-w-4xl p-6 md:p-10">
        <h1 className="mb-2 text-xl font-black md:text-2xl">تماس با ما</h1>
        <p className="mb-8 text-sm text-muted">برای پیگیری سفارش، مشاوره خرید قطعه یا ثبت شکایت از راه‌های زیر با ما در ارتباط باشید.</p>

        <section className="mb-6 flex flex-col gap-4 overflow-hidden rounded-card bg-night p-5 text-white sm:flex-row sm:items-center md:p-6" aria-labelledby="live-chat-title">
          <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-brand">
            <MessageCircleMore className="size-7" aria-hidden />
            <span className="absolute -left-1 -top-1 size-3.5 animate-pulse rounded-full border-2 border-night bg-green-500" aria-hidden />
          </span>
          <div className="flex flex-1 flex-col gap-1">
            <h2 id="live-chat-title" className="text-base font-black">گفتگوی آنلاین با کارشناس</h2>
            <p className="text-[13px] leading-6 text-white/75">
              سریع‌ترین راه برای استعلام قیمت و موجودی و مشاوره انتخاب قطعه. می‌توانید عکس قطعه را هم بفرستید؛ بدون نیاز به ثبت‌نام.
            </p>
          </div>
          <OpenChatButton className="btn-primary shrink-0" />
        </section>

        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map(({ Icon, label, value, href, ltr }) => (
            <li key={label} className="flex items-start gap-4 rounded-card border border-line p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><Icon className="size-5" /></span>
              <span className="flex flex-col gap-1">
                <span className="text-xs text-muted">{label}</span>
                {href ? (
                  <a href={href} className="text-sm font-extrabold hover:text-brand" dir={ltr ? "ltr" : undefined}>{value}</a>
                ) : (
                  <span className="text-sm font-extrabold leading-7">{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {location && (
          <section className="mt-8" aria-labelledby="map-title">
            <h2 id="map-title" className="mb-1 text-base font-black">موقعیت فروشگاه روی نقشه</h2>
            <p className="mb-4 text-xs leading-6 text-muted">{SITE.address}</p>
            <ShopMap location={location} address={SITE.address} />
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card bg-canvas p-5">
          <p className="text-sm">کاربران عضو می‌توانند درخواست پشتیبانی یا شکایت خود را به‌صورت تیکت ثبت و پیگیری کنند.</p>
          <Link href="/support" className="btn-ghost">ثبت تیکت پشتیبانی</Link>
        </div>
      </div>
    </div>
  );
}
