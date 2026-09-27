import Link from "next/link";
import { Instagram, MessageCircle, Send } from "@/components/icons/Social";
import { LogoMark } from "@/components/brand/Logo";
import { SITE, SITE_ADDRESS } from "@/lib/shop";
import { getSettings } from "@/lib/settings";

const COLUMNS = [
  {
    title: "دسته‌بندی‌های محبوب",
    links: [
      { href: "/categories", label: "قطعات موتور" },
      { href: "/categories", label: "سیستم ترمز و لنت" },
      { href: "/categories", label: "تعلیق و جلوبندی" },
      { href: "/categories", label: "فیلتر هوا و روغن" },
    ],
  },
  {
    title: "راهنمای خرید",
    links: [
      { href: "/how-to-order", label: "نحوه ثبت سفارش" },
      { href: "/shipping", label: "رویه ارسال سفارش" },
      { href: "/payment-methods", label: "شیوه‌های پرداخت" },
      { href: "/returns", label: "رویه بازگرداندن کالا" },
      { href: "/terms", label: "قوانین و مقررات" },
      { href: "/privacy", label: "حریم خصوصی" },
    ],
  },
];

export async function SiteFooter() {
  const settings = await getSettings();
  const enamadId = settings.enamad_id;
  const enamadCode = settings.enamad_code;

  return (
    <footer className="mt-16 bg-night pb-24 pt-14 text-line md:pb-10">
      <div className="container-page flex flex-col gap-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[360px_1fr_1fr_auto] lg:justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="text-lg font-black text-white">{SITE.name}</span>
              <LogoMark className="h-9 w-[61px]" />
            </div>
            <p className="text-[13px] leading-[1.9]">{SITE.description}</p>
            <address className="text-[13px] not-italic leading-[1.9] text-subtle">
              نشانی: {SITE_ADDRESS}
              <br />
              تلفن: <a href={`tel:${SITE.supportPhoneTel}`} dir="ltr" className="hover:text-white">{SITE.supportPhone}</a> — موبایل:{" "}
              <a href={`tel:${SITE.supportMobileTel}`} dir="ltr" className="hover:text-white">{SITE.supportMobile}</a>
              {SITE.email && <> — ایمیل: <span dir="ltr">{SITE.email}</span></>}
            </address>
          </div>

          {COLUMNS.map((col) => (
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

        <div className="flex flex-col-reverse items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-subtle">کلیه حقوق مادی و معنوی این وب‌سایت متعلق به {SITE.name} می‌باشد.</p>
          <div className="flex gap-4 text-line">
            <a href="https://instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="اینستاگرام" className="hover:text-white">
              <Instagram className="size-5" />
            </a>
            <a href="https://t.me/" target="_blank" rel="noopener noreferrer" aria-label="تلگرام" className="hover:text-white">
              <Send className="size-5" />
            </a>
            <Link href="/support" aria-label="پشتیبانی" className="hover:text-white">
              <MessageCircle className="size-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
