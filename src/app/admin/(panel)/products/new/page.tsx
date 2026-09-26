import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "افزودن محصول" };

export default async function NewProductPage() {
  await requireStaff(["ADMIN"]);
  const [categories, brands, cars] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.carModel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="افزودن محصول جدید" />
      <ProductForm categories={categories} brands={brands} cars={cars} />
    </>
  );
}
