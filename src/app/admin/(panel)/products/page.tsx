import Image from "next/image";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDigits, toman } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ToggleActiveButton } from "@/components/admin/ToggleActiveButton";

export const metadata = { title: "محصولات" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff(["ADMIN"]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const products = await db.product.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }, { oemCode: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { category: { select: { name: true } }, brand: { select: { name: true } }, images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  return (
    <>
      <PageHeader title="محصولات">
        <form className="flex items-center gap-2 rounded-xl border border-line bg-white px-3" role="search">
          <Search className="size-4 text-muted" />
          <input name="q" defaultValue={q} placeholder="نام، کد کالا یا کد فنی" className="w-56 py-2.5 text-sm focus:outline-none" />
        </form>
        <Link href="/admin/products/new" className="btn-primary py-2.5"><Plus className="size-4" /> افزودن محصول</Link>
      </PageHeader>
      <HelpBox
        items={[
          "برای افزودن قطعه جدید، دکمه «افزودن محصول» را بزنید. برای ویرایش، روی نام محصول در جدول کلیک کنید.",
          "با کادر جستجو می‌توانید بر اساس نام، کد کالا یا کد فنی (OEM) محصول را پیدا کنید.",
          "رنگ عدد موجودی: قرمز یعنی تمام شده، نارنجی یعنی ۵ عدد یا کمتر مانده.",
          "دکمه «فعال / غیرفعال» محصول را بدون حذف، از فروشگاه پنهان یا دوباره نمایان می‌کند.",
        ]}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">محصول</th>
              <th className="px-4 py-3 text-right font-bold">کد کالا</th>
              <th className="px-4 py-3 text-right font-bold">دسته</th>
              <th className="px-4 py-3 text-right font-bold">قیمت (تومان)</th>
              <th className="px-4 py-3 text-right font-bold">موجودی</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-canvas">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-bold hover:text-brand">
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-surface">
                      {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="44px" className="object-cover" />}
                    </span>
                    <span className="line-clamp-2">{p.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3" dir="ltr">{p.sku}</td>
                <td className="px-4 py-3 text-muted">{p.category.name}</td>
                <td className="px-4 py-3 font-bold">{toman(p.price)}</td>
                <td className={`px-4 py-3 font-black ${p.stock === 0 ? "text-brand" : p.stock <= 5 ? "text-warning" : ""}`}>{faDigits(p.stock)}</td>
                <td className="px-4 py-3"><ToggleActiveButton id={p.id} active={p.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="p-8 text-center text-sm text-muted">محصولی یافت نشد.</p>}
      </div>
    </>
  );
}
