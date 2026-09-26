import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "ویرایش محصول" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  await requireStaff(["ADMIN"]);
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [product, categories, brands, cars] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } }, fitments: { select: { carModelId: true } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.carModel.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title="ویرایش محصول">
        <Link href={`/product/${product.slug}`} target="_blank" className="btn-ghost py-2.5">مشاهده در فروشگاه</Link>
      </PageHeader>
      <ProductForm product={product} categories={categories} brands={brands} cars={cars} />
    </>
  );
}
