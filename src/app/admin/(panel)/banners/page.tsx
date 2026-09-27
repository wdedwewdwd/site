import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { bannerSelect, getHeroSettings } from "@/lib/banners";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { BannerManager } from "@/components/admin/banners/BannerManager";
import type { LinkOption } from "@/components/admin/banners/BannerForm";

export const metadata = { title: "بنرهای صفحه اصلی" };

export default async function BannersPage() {
  await requireStaff(["ADMIN"]);
  const [banners, hero, categories] = await Promise.all([
    db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: bannerSelect }),
    getHeroSettings(),
    db.category.findMany({ where: { isActive: true }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }], select: { name: true, slug: true } }),
  ]);

  const links: LinkOption[] = [
    { label: "تخفیف‌ها و پیشنهادها", href: "/offers" },
    { label: "همه محصولات", href: "/products" },
    { label: "پرفروش‌ترین محصولات", href: "/products?sort=bestselling" },
    { label: "همه دسته‌بندی‌ها", href: "/categories" },
    ...categories.map((c) => ({ label: `دسته: ${c.name}`, href: `/category/${c.slug}` })),
    { label: "تماس با ما", href: "/contact" },
    { label: "باز کردن گفتگوی آنلاین", href: "/?chat=1" },
  ];

  return (
    <>
      <PageHeader title="بنرهای صفحه اصلی" />
      <HelpBox
        items={[
          "اول چیدمان را انتخاب کنید: تک بنر، دو بنر کنار هم، چهار بنر، یا اسلایدر (چند بنر که خودکار عوض می‌شوند و مشتری هم می‌تواند با انگشت ورق بزند). تغییر چیدمان فوراً در سایت اعمال می‌شود.",
          "بنرها به ترتیب فهرست در جایگاه‌های چیدمان قرار می‌گیرند؛ مثلاً در «دو بنر کنار هم»، بنر اول بزرگ و بنر دوم کوچک است. با فلش‌های بالا/پایین جای بنرها را عوض کنید. برچسب سبز کنار هر بنر جایگاه آن را نشان می‌دهد.",
          "برای هر بنر یک تصویر با اندازه پیشنهادی بگذارید (اندازه در فرم نوشته شده). اگر روی موبایل بخشی از تصویر بریده می‌شود، یک «تصویر مخصوص موبایل» هم اضافه کنید.",
          "متن روی بنر (عنوان، توضیح، برچسب قرمز و دکمه) اختیاری است. اگر متن را داخل خود عکس طراحی کرده‌اید، تیک «نمایش متن روی بنر» را بردارید.",
          "لینک: صفحه‌ای را که مشتری با زدن روی بنر به آن می‌رود از فهرست انتخاب کنید یا آدرس را بنویسید (مثلاً آدرس یک محصول). با دکمه چشم، بنر را بدون حذف کردن موقتاً مخفی کنید.",
          "همه بنرها و تصاویرشان در فایل بکاپ (بخش تنظیمات) ذخیره می‌شوند.",
        ]}
      />
      <BannerManager banners={banners} layout={hero.layout} autoplay={hero.autoplay} links={links} />
    </>
  );
}
