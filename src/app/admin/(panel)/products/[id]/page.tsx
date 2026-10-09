import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { carRows, categoryOptions } from "@/lib/catalog";
import { productListQuery } from "@/lib/admin-products";
import { idSchema } from "@/lib/validation";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "ویرایش محصول" };

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  await requireStaff(["ADMIN"]);
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  // The list's filters and page, so "back" and "save" return to the same place.
  const back = typeof sp.back === "string" ? productListQuery(new URLSearchParams(sp.back.slice(0, 600))) : "";
  if (!idSchema.safeParse(id).success) notFound();
  const [product, categories, brands, cars] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: { images: { orderBy: { sortOrder: "asc" }, select: { id: true, url: true } }, fitments: { select: { carModelId: true } } },
    }),
    categoryOptions(),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    carRows(),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title="ویرایش محصول" backHref={back ? `/admin/products?${back}` : "/admin/products"}>
        <Link href={`/product/${product.slug}`} target="_blank" className="btn-ghost py-2.5">مشاهده در فروشگاه</Link>
      </PageHeader>
      <ProductForm product={product} categories={categories} brands={brands} cars={cars} back={back} />
    </>
  );
}
