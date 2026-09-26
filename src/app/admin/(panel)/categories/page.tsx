import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveCategory } from "@/app/actions/admin/misc";
import { faDigits } from "@/lib/format";
import { CATEGORY_ICON_LABELS, CATEGORY_ICON_NAMES } from "@/lib/shop";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import { HelpBox } from "@/components/admin/HelpBox";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export const metadata = { title: "دسته‌بندی‌ها" };

type Category = { id: string; name: string; slug: string; icon: string | null; sortOrder: number; isActive: boolean };

function IconPicker({ name, value }: { name: string; value: string }) {
  return (
    <fieldset>
      <legend className="label">آیکون دسته (در صفحه اصلی کنار نام نمایش داده می‌شود)</legend>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ICON_NAMES.map((icon) => (
          <label key={icon} className="cursor-pointer" title={CATEGORY_ICON_LABELS[icon]}>
            <input type="radio" name={name} value={icon} defaultChecked={icon === value} className="peer sr-only" />
            <span className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-muted transition-colors peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand peer-focus-visible:outline-2 peer-focus-visible:outline-brand">
              <CategoryIcon name={icon} className="size-5" />
              {CATEGORY_ICON_LABELS[icon]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function CategoryFields({ c }: { c?: Category }) {
  const prefix = c ? c.id : "new";
  return (
    <div className="flex flex-1 flex-col gap-4">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div>
          <label htmlFor={`name-${prefix}`} className="label">نام دسته‌بندی</label>
          <input id={`name-${prefix}`} name="name" defaultValue={c?.name} placeholder="مثلاً: لوازم ترمز" className="input" required maxLength={60} />
        </div>
        <div>
          <label htmlFor={`order-${prefix}`} className="label">ترتیب نمایش</label>
          <input id={`order-${prefix}`} name="sortOrder" defaultValue={c?.sortOrder ?? ""} placeholder="۰" inputMode="numeric" className="input" />
          <p className="mt-1 text-[11px] text-muted">عدد کوچک‌تر = نمایش جلوتر</p>
        </div>
      </div>
      <IconPicker name="icon" value={c?.icon ?? "wrench"} />
      {c && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={c.isActive} className="size-4 accent-brand" />
          نمایش در فروشگاه
          <span className="text-xs text-muted">(اگر تیک را بردارید، این دسته و محصولاتش در منوی فروشگاه دیده نمی‌شوند)</span>
        </label>
      )}
    </div>
  );
}

export default async function CategoriesPage() {
  await requireStaff(["ADMIN"]);
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="دسته‌بندی‌ها" />
      <HelpBox
        open
        items={[
          "دسته‌بندی‌ها گروه‌های اصلی قطعات هستند (مثل «لوازم ترمز» یا «فیلترجات»). در صفحه اصلی، منوی سایت و فیلترها نمایش داده می‌شوند.",
          "برای افزودن، فقط نام دسته را بنویسید، یک آیکون انتخاب کنید و «افزودن» را بزنید. آدرس صفحه دسته خودکار ساخته می‌شود.",
          "برای ویرایش، نام یا آیکون را در کارت همان دسته تغییر دهید و «ذخیره» را بزنید. تغییر نام، لینک‌های قبلی را خراب نمی‌کند.",
          "برای پنهان کردن یک دسته (بدون حذف محصولات)، تیک «نمایش در فروشگاه» را بردارید.",
          "هنگام افزودن محصول، دسته آن را از همین فهرست انتخاب می‌کنید.",
        ]}
      />
      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-base font-black">افزودن دسته‌بندی جدید</h2>
        <ActionForm action={saveCategory} submitLabel="افزودن دسته‌بندی" className="flex flex-col gap-4" resetOnSuccess>
          <CategoryFields />
        </ActionForm>
      </section>

      <h2 className="mb-3 text-base font-black">دسته‌بندی‌های موجود ({faDigits(categories.length)})</h2>
      <ul className="flex flex-col gap-3">
        {categories.map((c) => (
          <li key={c.id} className="card flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-black">
                <CategoryIcon name={c.icon} className="size-5 text-brand" /> {c.name}
                <span className="text-xs font-normal text-muted">({faDigits(c._count.products)} محصول)</span>
                {!c.isActive && <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-bold text-muted">پنهان</span>}
              </p>
              <Link href={`/category/${c.slug}`} target="_blank" className="flex items-center gap-1 text-xs font-bold text-info hover:underline">
                مشاهده در فروشگاه <ExternalLink className="size-3.5" />
              </Link>
            </div>
            <ActionForm action={saveCategory} submitLabel="ذخیره تغییرات" className="flex flex-col gap-4">
              <CategoryFields c={c} />
            </ActionForm>
          </li>
        ))}
      </ul>
    </>
  );
}
