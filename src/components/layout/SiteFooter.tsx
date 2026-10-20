import Link from "next/link";
import { Mail, MapPin, Navigation, Phone, Smartphone, Mailbox } from "lucide-react";
import { Bale, Instagram, Rubika, Telegram, WhatsApp } from "@/components/icons/Social";
import { LogoMark } from "@/components/brand/Logo";
import { SITE } from "@/lib/shop";
import { db } from "@/lib/db";
import { getContact, getSettings } from "@/lib/settings";

// Footer shortcuts to the main categories, found by slug (it never changes when a category is renamed).
// A hidden or deleted category falls back to the full category list.
const FOOTER_CATEGORIES = [
  { slug: "engine", label: "قطعات موتور" },
  { slug: "electrical", label: "قطعات برقی" },
  { slug: "suspension", label: "قطعات جلوبندی" },
];

const GUIDE = {
  title: "راهنمای خرید",
  links: [
    { href: "/how-to-order", label: "نحوه ثبت سفارش" },
    { href: "/shipping", label: "رویه ارسال سفارش" },
    { href: "/payment-methods", label: "شیوه‌های پرداخت" },
    { href: "/returns", label: "رویه بازگرداندن کالا" },
    { href: "/terms", label: "قوانین و مقررات" },
    { href: "/privacy", label: "حریم خصوصی" },
  ],
};

export async function SiteFooter() {
  const [settings, contact, liveCategories] = await Promise.all([
    getSettings(),
    getContact(),
    db.category.findMany({ where: { slug: { in: FOOTER_CATEGORIES.map((c) => c.slug) }, isActive: true }, select: { slug: true } }),
  ]);
  const live = new Set(liveCategories.map((c) => c.slug));
  const columns = [
    {
      title: "دسته‌بندی‌های محبوب",
      links: FOOTER_CATEGORIES.map((c) => ({ href: live.has(c.slug) ? `/category/${c.slug}` : "/categories", label: c.label })),
    },
    GUIDE,
  ];
  const socials = [
    { url: contact.instagramUrl, label: "اینستاگرام", Icon: Instagram },
    { url: contact.telegramUrl, label: "تلگرام", Icon: Telegram },
    { url: contact.whatsappUrl, label: "واتساپ", Icon: WhatsApp },
    { url: contact.baleUrl, label: "بله", Icon: Bale },
    { url: contact.rubikaUrl, label: "روبیکا", Icon: Rubika },
  ].filter((s): s is typeof s & { url: string } => !!s.url);
  const enamadId = settings.enamad_id;
  const enamadCode = settings.enamad_code;

  return (
    <footer className="mt-16 bg-night pb-40 pt-14 text-line md:pb-10">
      <div className="container-page flex flex-col gap-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[360px_1fr_1fr_auto] lg:justify-between">
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex w-fit items-center gap-3" aria-label={`${SITE.name} — صفحه اصلی`}>
              <LogoMark className="h-9 w-[61px]" />
              <span className="text-lg font-black text-white">{SITE.name}</span>
            </Link>
            <p className="text-[13px] leading-[1.9]">{SITE.description}</p>
            {/* One line per contact detail, each with its icon. */}
            <address className="not-italic">
              <ul className="flex flex-col gap-2.5 text-[13px] leading-6 text-subtle">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-1 size-4 shrink-0 text-white/40" aria-hidden />
                  <span>نشانی: {contact.address}</span>
                </li>
                {contact.postalCode && (
                  <li className="flex items-start gap-2.5">
                    <Mailbox className="mt-1 size-4 shrink-0 text-white/40" aria-hidden />
                    <span>کد پستی: {contact.postalCode}</span>
                  </li>
                )}
                <li className="flex items-start gap-2.5">
                  <Phone className="mt-1 size-4 shrink-0 text-white/40" aria-hidden />
                  <span>
                    تلفن: <a href={`tel:${contact.phone}`} dir="ltr" className="hover:text-white">{contact.phoneDisplay}</a>
                  </span>
                </li>
                {contact.mobile && (
                  <li className="flex items-start gap-2.5">
                    <Smartphone className="mt-1 size-4 shrink-0 text-white/40" aria-hidden />
                    <span>
                      موبایل: <a href={`tel:${contact.mobile}`} dir="ltr" className="hover:text-white">{contact.mobileDisplay}</a>
                    </span>
                  </li>
                )}
                {contact.email && (
                  <li className="flex items-start gap-2.5">
                    <Mail className="mt-1 size-4 shrink-0 text-white/40" aria-hidden />
                    <span className="min-w-0 break-all">
                      ایمیل: <a href={`mailto:${contact.email}`} dir="ltr" className="hover:text-white">{contact.email}</a>
                    </span>
                  </li>
                )}
              </ul>
            </address>
            {(contact.neshanUrl || contact.googleMapsUrl) && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Navigation className="size-4 text-brand" aria-hidden /> مسیریابی تا فروشگاه:
                </span>
                {contact.neshanUrl && (
                  <a href={contact.neshanUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20">
                    نشان
                  </a>
                )}
                {contact.googleMapsUrl && (
                  <a href={contact.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20">
                    گوگل مپ
                  </a>
                )}
              </div>
            )}
          </div>

          {columns.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <p className="text-[15px] font-extrabold text-white">{col.title}</p>
              <ul className="flex flex-col gap-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-[13px] text-subtle hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="flex flex-col gap-4">
            <p className="text-[15px] font-extrabold text-white">نمادهای اعتماد</p>
            <div className="flex gap-3">
              <div className="grid size-[100px] place-items-center rounded-xl bg-white p-2">
                {enamadId && enamadCode ? (
                  // Official eNamad trust seal. `referrerPolicy="origin"` is required: eNamad validates the referring domain.
                  <a
                    href={`https://trustseal.enamad.ir/?id=${encodeURIComponent(enamadId)}&Code=${encodeURIComponent(enamadCode)}`}
                    target="_blank"
                    rel="noopener"
                    referrerPolicy="origin"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://trustseal.enamad.ir/logo.aspx?id=${encodeURIComponent(enamadId)}&Code=${encodeURIComponent(enamadCode)}`}
                      alt="نماد اعتماد الکترونیکی"
                      referrerPolicy="origin"
                      className="max-h-[84px] cursor-pointer"
                    />
                  </a>
                ) : (
                  <span className="text-[11px] font-black text-info">نماد Enamad</span>
                )}
              </div>
              <div className="grid size-[100px] place-items-center rounded-xl bg-white p-2">
                <span className="text-[11px] font-black text-brand">رسانه دیجیتال</span>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-white/10" />

        {/* Copyright on the start side, social links centred (clear of the floating support button). */}
        <div className="grid items-center gap-5 md:grid-cols-[1fr_auto_1fr]">
          <p className="order-2 text-center text-xs text-subtle md:order-none md:text-right">کلیه حقوق مادی و معنوی این وب‌سایت متعلق به {SITE.name} می‌باشد.</p>
          {socials.length > 0 && (
            <div className="order-1 flex flex-wrap justify-center gap-3 text-line md:order-none">
              {socials.map(({ url, label, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="grid size-9 place-items-center rounded-full bg-white/5 transition-colors hover:bg-white/15 hover:text-white">
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
          )}
          <span className="hidden md:block" aria-hidden />
        </div>
      </div>
    </footer>
  );
}
