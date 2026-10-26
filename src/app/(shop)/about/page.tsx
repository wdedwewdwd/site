import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Clock, Headset, Mail, MapPin, Phone, RotateCcw, ScanSearch, ShieldCheck, Ship, Smartphone, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getContact } from "@/lib/settings";
import { categoryCovers } from "@/lib/category-covers";
import { faDigits } from "@/lib/format";
import { SITE } from "@/lib/shop";
import { PageBar } from "@/components/layout/PageBar";
import { LogoMark } from "@/components/brand/Logo";
import { CategoryCover } from "@/components/ui/CategoryCover";
import { NeshanIcon } from "@/components/icons/MapApps";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "آریزون یدک؛ بیش از دو دهه تجربه در بازار قطعات یدکی تهران و واردکننده‌ی مستقیم قطعات یدکی با نشان آریزون.",
};

const REASONS = [
  {
    Icon: Ship,
    title: "واردکننده‌ی مستقیم آریزون",
    text: "قطعات با نشان «آریزون» را خودمان وارد می‌کنیم؛ کالا بدون واسطه و دست اول، با قیمتی منصفانه به دست شما می‌رسد.",
  },
  {
    Icon: ShieldCheck,
    title: "دست اول، با ضمانت اصالت",
    text: "اصالت همه‌ی کالاها را تضمین می‌کنیم و برای هر سفارش فاکتور رسمی صادر می‌شود.",
  },
  {
    Icon: ScanSearch,
    title: "انتخاب دقیق، بدون خطا",
    text: "خودروهای سازگار و کد فنی (OEM) هر قطعه کنار آن آمده و کارشناسان ما در انتخاب قطعه‌ی درست همراهتان هستند.",
  },
  {
    Icon: Truck,
    title: "ارسال سریع به سراسر کشور",
    text: "ارسال سریع در تهران و ارسال با پست، تیپاکس و باربری به همه‌ی شهرهای ایران.",
  },
  {
    Icon: RotateCcw,
    title: "۷ روز ضمانت بازگشت کالا",
    text: "آریزون یدک برای همه‌ی خریدها ۷ روز ضمانت بازگشت کالا می‌دهد.",
    link: { href: "/returns", label: "رویه بازگرداندن کالا" },
  },
  {
    Icon: Headset,
    title: "پشتیبانی کارشناسی",
    text: "پیش و پس از خرید کنار شما هستیم؛ از راه تلفن، گفتگوی آنلاین و شبکه‌های اجتماعی.",
  },
];

function SectionTitle({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-2 text-xs font-extrabold text-brand">
        <span className="h-0.5 w-6 rounded-full bg-brand" aria-hidden />
        {eyebrow}
      </span>
      <h2 id={id} className="text-xl font-black md:text-2xl">{title}</h2>
    </div>
  );
}

export default async function AboutPage() {
  const [contact, productCount, mains] = await Promise.all([
    getContact(),
    db.product.count({ where: { isActive: true } }),
    db.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, slug: true, name: true, icon: true, image: true },
      take: 3,
    }),
  ]);
  const covers = await categoryCovers(mains);
  // A round figure that stays true as products come and go (e.g. 705 → «+۷۰۰»).
  const parts = productCount >= 100 ? Math.floor(productCount / 50) * 50 : productCount;
  const stats = [
    { value: faDigits(20), plus: true, label: "سال تجربه در بازار تهران" },
    { value: "دست اول", label: "واردات مستقیم با نشان آریزون" },
    { value: faDigits(parts), plus: productCount >= 100, label: "قطعه‌ی برقی، موتوری و جلوبندی" },
    { value: "۷ روز", label: "ضمانت بازگشت کالا" },
  ];
  const contactItems = [
    { Icon: MapPin, label: "نشانی", value: contact.addressLine },
    { Icon: Phone, label: "تلفن", value: contact.phoneDisplay, href: `tel:${contact.phone}`, ltr: true },
    ...(contact.mobile ? [{ Icon: Smartphone, label: "موبایل", value: contact.mobileDisplay!, href: `tel:${contact.mobile}`, ltr: true }] : []),
    ...(contact.email ? [{ Icon: Mail, label: "ایمیل", value: contact.email, href: `mailto:${contact.email}`, ltr: true }] : []),
    { Icon: Clock, label: "ساعات پاسخگویی", value: contact.hours },
  ];

  return (
    <div className="container-page flex flex-col gap-12 py-6 md:gap-16 md:py-8">
      <PageBar title="درباره ما" backHref="/" />

      {/* Hero: the Arizon emblem as a large watermark on the brand's dark colour. */}
      <div>
        <section aria-labelledby="about-title" className="relative isolate overflow-hidden rounded-xl2 bg-night px-6 pb-24 pt-10 text-white md:px-12 md:pb-28 md:pt-16">
          <Image
            src="/brand/emblem.webp"
            alt=""
            width={1200}
            height={476}
            priority
            className="pointer-events-none absolute -left-40 top-6 -z-10 w-[560px] max-w-none -rotate-12 opacity-[0.1] md:-left-24 md:top-1/2 md:w-[820px] md:-translate-y-1/2"
          />
          <span aria-hidden className="pointer-events-none absolute -right-28 -top-28 -z-10 size-96 rounded-full bg-brand/30 blur-3xl" />
          <span aria-hidden className="pointer-events-none absolute -bottom-40 left-1/4 -z-10 size-80 rounded-full bg-[#f5d41b]/10 blur-3xl" />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
          />

          <div className="flex max-w-2xl flex-col gap-5">
            <span className="flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 backdrop-blur">
              <LogoMark className="h-4 w-7" />
              واردکننده‌ی قطعات یدکی خودرو
            </span>
            <h1 id="about-title" className="text-2xl font-black leading-[1.7] md:text-4xl md:leading-[1.6]">
              بیش از دو دهه تجربه در بازار قطعات یدکی تهران
            </h1>
            <p className="text-sm leading-8 text-white/75 md:text-base md:leading-9">
              {SITE.name} سال‌هاست در خیابان امیرکبیر، قلب بازار لوازم یدکی کشور، فعالیت می‌کند. ما واردکننده‌ی مستقیم قطعات با نشان
              تجاری «آریزون» هستیم و کالای دست اول و اصل را بدون واسطه به دست تعمیرکاران، فروشگاه‌ها و مالکان خودرو در سراسر ایران
              می‌رسانیم.
            </p>
            <div className="grid gap-3 pt-1 sm:flex sm:flex-wrap">
              <Link href="/categories" className="btn-primary">
                مشاهده محصولات <ArrowLeft className="size-4" aria-hidden />
              </Link>
              <Link href="/contact" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
                تماس با ما
              </Link>
            </div>
          </div>
        </section>

        {/* Key figures, overlapping the bottom of the hero. */}
        <ul className="relative z-10 -mt-14 grid grid-cols-2 gap-3 px-3 md:-mt-12 md:grid-cols-4 md:gap-4 md:px-8">
          {stats.map((s) => (
            <li key={s.label} className="card flex flex-col items-center justify-center gap-1 px-3 py-4 text-center shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] md:py-5">
              <span className="flex items-center gap-0.5 text-xl font-black text-brand md:text-3xl" dir={s.plus ? "ltr" : undefined}>
                {s.plus && <span className="sr-only">بیش از</span>}
                {s.plus && <span aria-hidden>+</span>}
                {s.value}
              </span>
              <span className="text-[11px] font-bold leading-5 text-muted md:text-xs">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Our story, next to the three main kinds of parts. */}
      <section aria-labelledby="story-title" className="grid items-center gap-8 md:grid-cols-[1.15fr_1fr] md:gap-12">
        <div className="flex flex-col gap-5">
          <SectionTitle eyebrow="داستان ما" title="از بازار امیرکبیر تا همه‌ی شهرهای ایران" id="story-title" />
          <div className="flex flex-col gap-4 text-sm leading-8 text-ink/85 md:text-[15px] md:leading-9">
            <p>
              بیش از بیست سال کار در بازار قطعات یدکی تهران، ما را هر روز با تعمیرکاران، فروشندگان و مالکان خودرو روبه‌رو کرده است. در
              این سال‌ها از نزدیک دیده‌ایم که یک قطعه‌ی خوب چه ویژگی‌هایی دارد: دقیق سر جایش می‌نشیند، دوام می‌آورد و قیمتش منصفانه
              است.
            </p>
            <p>
              همین تجربه ما را به سمت واردات مستقیم برد. امروز {SITE.name} واردکننده‌ی قطعات با نشان «آریزون» است و قطعات برقی، موتوری
              و جلوبندی خودروهای پرکاربرد ایران، از پژو، سمند و دنا تا پراید، تیبا و ال ۹۰، را دست اول و بدون واسطه عرضه می‌کند.
            </p>
            <p>
              فروشگاه اینترنتی {SITE.name} ادامه‌ی همین مسیر است: همان کیفیت و قیمت بازار تهران، این بار با چند کلیک، در دسترس همه‌ی
              شهرهای ایران.
            </p>
          </div>
        </div>

        <ul className="grid grid-cols-2 grid-rows-2 gap-3 md:gap-4">
          {mains.map((c, i) => (
            <li key={c.slug} className={i === 0 ? "row-span-2" : ""}>
              <Link
                href={`/category/${c.slug}`}
                className={`group relative flex overflow-hidden rounded-card border border-line bg-surface ${i === 0 ? "h-full min-h-64" : "aspect-[4/3]"}`}
              >
                <CategoryCover
                  image={covers.get(c.id)}
                  icon={c.icon}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pb-3 pt-10 text-white">
                  <span className="text-sm font-black">{c.name}</span>
                  <ArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-1" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why-title" className="flex flex-col gap-6">
        <SectionTitle eyebrow="چرا آریزون یدک؟" title="کیفیت دست اول، مستقیم از واردکننده" id="why-title" />
        <ul className="grid gap-3 sm:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {REASONS.map(({ Icon, title, text, link }) => (
            <li key={title} className="card group flex gap-4 p-5 transition-shadow hover:shadow-[0_18px_40px_-28px_rgba(0,0,0,0.35)]">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-sm font-black md:text-base">{title}</span>
                <span className="text-[13px] leading-7 text-muted">
                  {text}
                  {link && (
                    <>
                      {" "}
                      <Link href={link.href} className="font-bold text-brand hover:underline">{link.label}</Link>
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="contact-title" className="card flex flex-col gap-6 p-5 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow="در ارتباط باشیم" title="اطلاعات تماس" id="contact-title" />
          <div className="flex flex-wrap gap-2">
            {contact.neshanUrl && (
              <a href={contact.neshanUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost px-4 py-2.5 text-xs">
                <NeshanIcon className="size-[18px]" /> مسیریابی با نشان
              </a>
            )}
            <Link href="/contact" className="btn-primary px-4 py-2.5 text-xs">
              همه راه‌های ارتباطی <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contactItems.map(({ Icon, label, value, href, ltr }) => (
            <li key={label} className="flex items-start gap-3 rounded-2xl bg-canvas p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[11px] text-muted">{label}</span>
                {href ? (
                  <a href={href} dir={ltr ? "ltr" : undefined} className="self-start break-all text-sm font-extrabold hover:text-brand">
                    {value}
                  </a>
                ) : (
                  <span className="text-sm font-extrabold leading-7">{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
