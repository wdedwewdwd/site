import { requireStaff } from "@/lib/auth/session";
import { parseProductFilters } from "@/lib/admin-products";
import { jKey, tehranJDate } from "@/lib/jalali";
import { exportProducts, mapLimit, photoThumb } from "@/lib/product-export";
import { rateLimit } from "@/lib/rate-limit";
import { SITE } from "@/lib/shop";
import { buildXlsx } from "@/lib/xlsx";

export const dynamic = "force-dynamic";

// Photo box inside the first column (pixels); the column and rows are sized around it.
const PHOTO = { width: 84, height: 63 };

/**
 * Excel price list of the admin product list (same filters and order, all pages): photo, name, code,
 * current price and an empty "new price" column for the owner to fill in.
 */
export async function GET(req: Request) {
  const admin = await requireStaff(["ADMIN"]);
  const rl = await rateLimit(`products:export:${admin.id}`, 30, 3600);
  if (!rl.ok) return new Response("تعداد درخواست خروجی زیاد است؛ کمی بعد دوباره امتحان کنید.", { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });

  const f = parseProductFilters(Object.fromEntries(new URL(req.url).searchParams));
  const products = await exportProducts(f);
  const thumbs = await mapLimit(products, 8, (p) => (p.images[0] ? photoThumb(p.images[0].url, PHOTO) : Promise.resolve(null)));

  const file = buildXlsx({
    name: "لیست قیمت",
    title: `لیست قیمت محصولات ${SITE.name}`,
    columns: [
      { title: "عکس کالا", width: 14, style: "note" },
      { title: "نام کالا", width: 58, style: "text" },
      { title: "کد کالا", width: 14, style: "code" },
      { title: "قیمت فعلی (تومان)", width: 18, style: "money" },
      { title: "قیمت جدید (تومان)", width: 20, style: "input" },
    ],
    rowHeight: 54,
    rows: products.map((p, i) => ({
      cells: [thumbs[i] ? null : "بدون عکس", p.name, p.sku, p.price, null],
      image: thumbs[i] && { ...thumbs[i], alt: p.name },
    })),
    footer: `&C${SITE.name} — لیست قیمت محصولات — صفحه &P از &N`,
  });

  const stamp = jKey(tehranJDate(new Date()));
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="products-${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(`لیست-قیمت-محصولات-${stamp}.xlsx`)}`,
      "Content-Length": String(file.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
