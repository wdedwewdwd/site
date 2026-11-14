import "server-only";
import { db } from "./db";
import { buildIndex, search, type IndexedDoc, type SearchResult } from "./search";
import { hideOutOfStock } from "./settings";

/** Rebuilt at most this often, so product edits show up in search within a few seconds. */
const TTL_MS = 30_000;

let cache: { at: number; index: Promise<IndexedDoc[]> } | null = null;

async function load(): Promise<IndexedDoc[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      oemCode: true,
      stock: true,
      soldCount: true,
      brand: { select: { name: true, latin: true } },
      category: { select: { name: true, parent: { select: { name: true } } } },
      fitments: { select: { carModel: { select: { make: true, name: true } } } },
    },
  });
  return buildIndex(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      related: [
        p.brand?.name ?? "",
        p.brand?.latin ?? "",
        p.category.name,
        p.category.parent?.name ?? "",
        ...p.fitments.map((f) => `${f.carModel.make} ${f.carModel.name}`),
      ],
      codes: [p.sku, p.oemCode ?? ""],
      inStock: p.stock > 0,
      soldCount: p.soldCount,
    })),
  );
}

function index() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    const next = { at: Date.now(), index: load() };
    // A failed load is not cached; the next search tries again.
    next.index.catch(() => cache === next && (cache = null));
    cache = next;
  }
  return cache.index;
}

/** Products customers may see that match the query, best first. */
export async function searchProducts(query: string): Promise<SearchResult> {
  const [docs, hide] = await Promise.all([index(), hideOutOfStock()]);
  // Stock in the index can be up to TTL_MS old; the pages showing results check it again in the database.
  return search(hide ? docs.filter((d) => d.inStock) : docs, query.slice(0, 100));
}
