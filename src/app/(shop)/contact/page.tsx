import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, Clock, Mail, MapPin, MessageCircleMore, Phone, Smartphone } from "lucide-react";
import { getContact, getShopLocation } from "@/lib/settings";
import { PageBar } from "@/components/layout/PageBar";
import { OpenChatButton } from "@/components/chat/OpenChatButton";
import { ShopMap } from "@/components/map/ShopMap";
import { ChannelIcon, type Channel } from "@/components/support/ChannelIcon";

export const metadata: Metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const [location, contact] = await Promise.all([getShopLocation(), getContact()]);
  const items: { Icon: typeof Phone; label: string; value: string; href?: string; ltr?: boolean }[] = [
    { Icon: Phone, label: "تلفن پشتیبانی", value: contact.phoneDisplay, href: `tel:${contact.phone}`, ltr: true },
    ...(contact.mobile ? [{ Icon: Smartphone, label: "موبایل پشتیبانی", value: contact.mobileDisplay!, href: `tel:${contact.mobile}`, ltr: true }] : []),
    { Icon: Clock, label: "ساعات پاسخگویی", value: contact.hours },
    ...(contact.email ? [{ Icon: Mail, label: "ایمیل", value: contact.email, href: `mailto:${contact.email}`, ltr: true }] : []),
    { Icon: MapPin, label: "نشانی فروشگاه", value: contact.addressLine },
  ];
  const socials: { channel: Channel; label: string; handle: string; url: string }[] = [
    ...(contact.instagramUrl ? [{ channel: "instagram" as const, label: "اینستاگرام", handle: `@${contact.instagram}`, url: contact.instagramUrl }] : []),
    ...(contact.telegramUrl ? [{ channel: "telegram" as const, label: "تلگرام", handle: `@${contact.telegram}`, url: contact.telegramUrl }] : []),
    ...(contact.whatsappUrl ? [{ channel: "whatsapp" as const, label: "واتساپ", handle: contact.whatsappDisplay!, url: contact.whatsappUrl }] : []),
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

        {socials.length > 0 && (
          <section className="mt-8" aria-labelledby="socials-title">
            <h2 id="socials-title" className="mb-4 text-base font-black">ما را در شبکه‌های اجتماعی دنبال کنید</h2>
            <ul className="grid gap-3 sm:grid-cols-3">
              {socials.map((s) => (
                <li key={s.channel}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-card border border-line p-4 transition-colors hover:border-subtle hover:bg-canvas">
                    <ChannelIcon channel={s.channel} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-extrabold">{s.label}</span>
                      <span className="truncate text-xs text-muted" dir="ltr">{s.handle}</span>
                    </span>
                    <ChevronLeft className="size-4 text-subtle transition-transform group-hover:-translate-x-0.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {location && (
          <section className="mt-8" aria-labelledby="map-title">
            <h2 id="map-title" className="mb-1 text-base font-black">موقعیت فروشگاه روی نقشه</h2>
            <p className="mb-4 text-xs leading-6 text-muted">{contact.address}</p>
            <ShopMap location={location} address={contact.address} />
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
