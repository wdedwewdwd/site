import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { SITE } from "@/lib/shop";
import { PageBar } from "@/components/layout/PageBar";

export const metadata: Metadata = { title: "تماس با ما" };

export default function ContactPage() {
  const items = [
    { Icon: Phone, label: "تلفن پشتیبانی", value: SITE.supportPhone, href: "tel:02112345678" },
    { Icon: Clock, label: "ساعات پاسخگویی", value: SITE.supportHours },
    { Icon: Mail, label: "ایمیل", value: SITE.email, href: `mailto:${SITE.email}`, ltr: true },
    { Icon: MapPin, label: "نشانی دفتر مرکزی", value: `${SITE.address} — کد پستی: ${SITE.postalCode}` },
  ];
  return (
    <div className="container-page flex flex-col gap-6 py-6 md:py-8">
      <PageBar title="تماس با ما" backHref="/" />
      <div className="card mx-auto w-full max-w-4xl p-6 md:p-10">
        <h1 className="mb-2 text-xl font-black md:text-2xl">تماس با ما</h1>
        <p className="mb-8 text-sm text-muted">برای پیگیری سفارش، مشاوره خرید قطعه یا ثبت شکایت از راه‌های زیر با ما در ارتباط باشید.</p>
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
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-card bg-canvas p-5">
          <p className="text-sm">کاربران عضو می‌توانند درخواست پشتیبانی یا شکایت خود را به‌صورت تیکت ثبت و پیگیری کنند.</p>
          <Link href="/support" className="btn-primary">ثبت تیکت پشتیبانی</Link>
        </div>
      </div>
    </div>
  );
}
