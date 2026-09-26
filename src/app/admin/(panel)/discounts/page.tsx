import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { createDiscount } from "@/app/actions/admin/misc";
import { faDate, faDigits, toman } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import { DiscountToggle } from "@/components/admin/DiscountToggle";

export const metadata = { title: "کدهای تخفیف" };

export default async function DiscountsPage() {
  await requireStaff(["ADMIN"]);
  const codes = await db.discountCode.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <>
      <PageHeader title="کدهای تخفیف" />
      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-base font-black">تعریف کوپن تخفیف جدید</h2>
        <ActionForm action={createDiscount} submitLabel="ساخت کد" className="flex flex-col gap-4" resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-bold">کد<input name="code" dir="ltr" required className="input py-2" placeholder="AUTUMN15" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">نوع
              <select name="type" className="input py-2"><option value="PERCENT">درصدی</option><option value="FIXED">مبلغ ثابت (تومان)</option></select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">مقدار<input name="value" inputMode="numeric" required className="input py-2" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">سقف تخفیف (تومان)<input name="maxDiscount" inputMode="numeric" className="input py-2" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">حداقل مبلغ سفارش<input name="minOrder" inputMode="numeric" className="input py-2" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">حداکثر دفعات استفاده<input name="maxUses" inputMode="numeric" className="input py-2" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">اعتبار (روز)<input name="validDays" inputMode="numeric" className="input py-2" /></label>
          </div>
        </ActionForm>
      </section>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">کد</th>
              <th className="px-4 py-3 text-right font-bold">تخفیف</th>
              <th className="px-4 py-3 text-right font-bold">حداقل سفارش</th>
              <th className="px-4 py-3 text-right font-bold">استفاده</th>
              <th className="px-4 py-3 text-right font-bold">انقضا</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {codes.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-black" dir="ltr">{c.code}</td>
                <td className="px-4 py-3">{c.type === "PERCENT" ? `${faDigits(c.value)}٪` : `${toman(c.value)} تومان`}{c.maxDiscount ? ` (سقف ${toman(c.maxDiscount)})` : ""}</td>
                <td className="px-4 py-3">{toman(c.minOrder)}</td>
                <td className="px-4 py-3">{faDigits(c.usedCount)}{c.maxUses ? ` / ${faDigits(c.maxUses)}` : ""}</td>
                <td className="px-4 py-3 text-muted">{c.validTo ? faDate(c.validTo) : "—"}</td>
                <td className="px-4 py-3"><DiscountToggle id={c.id} active={c.isActive} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
