import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDate } from "@/lib/format";
import { jKey, tehranJDate, tehranToday } from "@/lib/jalali";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { DiscountManager, type DiscountRow } from "@/components/admin/discounts/DiscountManager";

export const metadata = { title: "کدهای تخفیف" };

export default async function DiscountsPage() {
  await requireStaff(["ADMIN"]);
  const codes = await db.discountCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const now = new Date();
  const rows: DiscountRow[] = codes.map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    maxDiscount: c.maxDiscount,
    minOrder: c.minOrder,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    // The day the code ends on (it is valid until that day's last moment).
    lastDay: c.validTo ? jKey(tehranJDate(new Date(c.validTo.getTime() - 1))) : null,
    expired: !!c.validTo && c.validTo < now,
    isActive: c.isActive,
    createdLabel: faDate(c.createdAt),
  }));

  return (
    <>
      <PageHeader title="کدهای تخفیف" />
      <HelpBox
        items={[
          "کد تخفیف را مشتری در سبد خرید وارد می‌کند. کد فقط حروف انگلیسی و عدد است (مثلاً AUTUMN15).",
          "«درصدی»: درصد را بنویسید (مثلاً ۱۵)؛ «سقف تخفیف» جلوی تخفیف‌های خیلی بزرگ را در سفارش‌های گران می‌گیرد. «مبلغ ثابت»: مبلغ را به تومان بنویسید.",
          "«حداقل مبلغ سفارش»، «حداکثر دفعات استفاده» و «تاریخ انقضا» اختیاری‌اند؛ خالی یعنی بدون محدودیت. کد تا پایان روز انقضا معتبر است.",
          "برای ویرایش یا حذف، روی هر کد در فهرست بزنید. برای توقف موقت، کلید کنار کد را خاموش کنید؛ سفارش‌های قبلی با حذف یا تغییر کد عوض نمی‌شوند.",
        ]}
      />
      <DiscountManager rows={rows} today={jKey(tehranToday())} />
    </>
  );
}
