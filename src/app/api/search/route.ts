import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { searchProducts } from "@/lib/search-index";
import { buildIndex, search } from "@/lib/search";

export const dynamic = "force-dynamic";

const querySchema = z.string().trim().min(2).max(100);
const LIMIT = 6;

/** Suggestions for the header search box while the customer types. */
export async function GET(req: Request) {
  const parsed = querySchema.safeParse(new URL(req.url).searchParams.get("q") ?? "");
  const headers = { "Cache-Control": "no-store" };
  if (!parsed.success) return Response.json({ products: [], categories: [], total: 0 }, { headers });
  const rl = await rateLimit(`search:${await clientIp()}`, 120, 60);
  if (!rl.ok) return Response.json({ error: "rate_limited" }, { status: 429, headers });

  const q = parsed.data;
  const [{ hits, partial }, categories] = await Promise.all([
    searchProducts(q),
    db.category.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true } }),
  ]);
  const ids = hits.slice(0, LIMIT).map((h) => h.id);
  const rows = await db.product.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      stock: true,
      images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const products = ids.flatMap((id) => {
    const p = byId.get(id);
    return p ? [{ slug: p.slug, name: p.name, price: p.price, inStock: p.stock > 0, image: p.images[0]?.url ?? null }] : [];
  });

  const categoryIndex = buildIndex(categories.map((c) => ({ id: c.id, name: c.name, related: [], codes: [], inStock: true, soldCount: 0 })));
  const catHits = search(categoryIndex, q, 3);
  const catById = new Map(categories.map((c) => [c.id, c]));
  const cats = catHits.partial ? [] : catHits.hits.flatMap((h) => {
    const c = catById.get(h.id);
    return c ? [{ slug: c.slug, name: c.name }] : [];
  });

  return Response.json({ products, categories: cats, total: partial ? 0 : hits.length, partial }, { headers });
}
