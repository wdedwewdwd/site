import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { categoryOptions } from "@/lib/catalog";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "افزودن محصول" };

export default async function NewProductPage() {
  await requireStaff(["ADMIN"]);
  const [categories, brands, cars] = await Promise.all([
    categoryOptions(),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.carModel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="افزودن محصول جدید" />
      <HelpBox
        items={[
          "فقط نام، دسته‌بندی، قیمت و موجودی الزامی است. بقیه فیلدها را می‌توانید بعداً کامل کنید.",
          "آدرس صفحه محصول و در صورت خالی بودن، کد کالا به‌طور خودکار ساخته می‌شود.",
          "برای نمایش تخفیف، «قیمت قبل از تخفیف» را بیشتر از قیمت فروش وارد کنید.",
          "پس از ذخیره، محصول بلافاصله در فروشگاه نمایش داده می‌شود (مگر تیک «نمایش در فروشگاه» را برداشته باشید).",
        ]}
      />
      <ProductForm categories={categories} brands={brands} cars={cars} />
    </>
  );
}
