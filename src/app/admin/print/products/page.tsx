import type { Metadata } from "next";
import Image from "next/image";
import { requireStaff } from "@/lib/auth/session";
import { parseProductFilters, productListQuery } from "@/lib/admin-products";
import { exportFilterLabel, exportProducts } from "@/lib/product-export";
import { faDigits, toman } from "@/lib/format";
import { jLong, jNumeric, tehranToday } from "@/lib/jalali";
import { SITE } from "@/lib/shop";
import { BackButton } from "@/components/layout/BackButton";
import { PrintButton } from "@/components/admin/orders/PrintButton";
import { AutoPrint } from "@/components/admin/products/AutoPrint";

// Chrome names the saved PDF after the page title, so it is a plain file name (no "|" suffix).
export function generateMetadata(): Metadata {
  return {
    title: { absolute: `لیست قیمت محصولات ${SITE.name} ${jNumeric(tehranToday()).replace(/\//g, "-")}` },
    robots: { index: false, follow: false },
  };
}

/**
 * Printable price list of the admin product list (same filters and order, all pages): photo, name, code,
 * current price and an empty "new price" column. Saved as PDF from the browser's print dialog.
 */
export default async function PrintProductsPage({ searchParams }: PageProps<"/admin/print/products">) {
  await requireStaff(["ADMIN"]);
  const sp = await searchParams;
  const f = parseProductFilters(sp);
  const [products, filters] = await Promise.all([exportProducts(f), exportFilterLabel(f)]);
  const back = new URLSearchParams(productListQuery(sp));
  back.delete("page");
  const backHref = back.toString() ? `/admin/products?${back}` : "/admin/products";

  return (
    <main className="min-h-dvh bg-canvas py-6 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 px-4 print:hidden">
        <BackButton fallback={backHref} variant="pill" />
        <p className="text-[13px] text-muted">
          برای فایل <bdi>PDF</bdi>، در پنجره‌ی چاپ گزینه‌ی «<b className="text-ink"><bdi>Save as PDF</bdi></b>» را انتخاب کنید.
        </p>
        <PrintButton />
      </div>
      <AutoPrint enabled={sp.auto === "1"} />

      <article data-print-sheet className="print-price-list mx-auto max-w-[210mm] bg-white p-8 text-ink shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-5 flex items-end justify-between gap-4 border-b-2 border-ink pb-3">
          <div>
            <p className="text-[11px] font-bold text-muted">{SITE.name}</p>
            <h1 className="text-lg font-black">لیست قیمت محصولات</h1>
            {filters && <p className="mt-0.5 text-[11px] text-muted">{filters}</p>}
          </div>
          <div className="text-left text-[11px] leading-5 text-muted">
            <p>تاریخ: <b className="text-ink">{jLong(tehranToday())}</b></p>
            <p>تعداد: <b className="text-ink">{faDigits(products.length)}</b> محصول</p>
          </div>
        </header>

        {products.length === 0 ? (
          <p className="py-12 text-center text-sm font-bold text-muted">محصولی با این فیلترها پیدا نشد.</p>
        ) : (
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="bg-ink text-white [print-color-adjust:exact]">
                <th className="w-[22mm] border border-ink px-2 py-2 font-bold">عکس کالا</th>
                <th className="border border-ink px-2 py-2 text-right font-bold">نام کالا</th>
                <th className="w-[24mm] border border-ink px-2 py-2 font-bold">کد کالا</th>
                <th className="w-[28mm] border border-ink px-2 py-2 font-bold">قیمت فعلی (تومان)</th>
                <th className="w-[32mm] border border-ink px-2 py-2 font-bold">قیمت جدید (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="break-inside-avoid">
                  <td className="border border-line p-1">
                    {p.images[0] ? (
                      <Image src={p.images[0].url} alt="" width={64} height={48} sizes="64px" loading="eager" className="mx-auto h-[12mm] w-[16mm] object-contain" />
                    ) : (
                      <span className="block text-center text-[10px] text-muted">بدون عکس</span>
                    )}
                  </td>
                  <td className="border border-line px-2 py-1 font-bold leading-5">{p.name}</td>
                  <td className="border border-line px-1 py-1 text-center" dir="ltr">{faDigits(p.sku)}</td>
                  <td className="border border-line px-1 py-1 text-center font-bold">{toman(p.price)}</td>
                  <td className="border border-line bg-[#fff6d5] [print-color-adjust:exact]" />
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </main>
  );
}
