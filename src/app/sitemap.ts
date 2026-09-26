import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
  ]);
  const staticPages = ["", "/categories", "/offers", "/about", "/contact", "/terms", "/privacy", "/returns", "/shipping", "/faq"];
  return [
    ...staticPages.map((p) => ({ url: `${base}${p}` })),
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}` })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
