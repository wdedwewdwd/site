import { requireStaff } from "@/lib/auth/session";
import { brandRows, carRows, categoryOptions } from "@/lib/catalog";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "افزودن محصول" };

export default async function NewProductPage() {
  await requireStaff(["ADMIN"]);
  const [categories, brands, cars] = await Promise.all([
    categoryOptions(),
    brandRows(),
    carRows(),
  ]);
  return (
    <>
      <PageHeader title="افزودن محصول جدید" backHref="/admin/products" />
      <HelpBox
        items={[
          "فقط نام، دسته‌بندی، قیمت و موجودی الزامی است. بقیه فیلدها را می‌توانید بعداً کامل کنید.",
          "آدرس صفحه محصول و در صورت خالی بودن، کد کالا به‌طور خودکار ساخته می‌شود.",
          "برای تخفیف، کلید «تخفیف» را روشن کنید و درصد یا قیمت بعد از تخفیف را بنویسید؛ پیش‌نمایش قیمت همان‌جا دیده می‌شود.",
          "خودروی جدید را با دکمه «مدیریت خودروها» در بخش خودروهای سازگار اضافه کنید؛ فهرست خودروها بین همه محصولات مشترک است.",
          "برندها را با دکمه «مدیریت برندها» کنار انتخاب برند اضافه، ویرایش یا حذف کنید؛ همین نام‌ها در «فیلتر برندها»ی فروشگاه نمایش داده می‌شوند.",
          "پس از ذخیره، محصول بلافاصله در فروشگاه نمایش داده می‌شود (مگر تیک «نمایش در فروشگاه» را برداشته باشید).",
        ]}
      />
      <ProductForm categories={categories} brands={brands} cars={cars} />
    </>
  );
}
