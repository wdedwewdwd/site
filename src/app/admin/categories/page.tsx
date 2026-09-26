import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveCategory } from "@/app/actions/admin/misc";
import { faDigits } from "@/lib/format";
import { CATEGORY_ICON_NAMES } from "@/lib/shop";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export const metadata = { title: "دسته‌بندی‌ها" };

function CategoryFields({ c }: { c?: { id: string; name: string; slug: string; icon: string | null; sortOrder: number; isActive: boolean } }) {
  return (
    <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <input name="name" defaultValue={c?.name} placeholder="نام دسته" aria-label="نام" className="input py-2" required />
      <input name="slug" defaultValue={c?.slug} placeholder="نامک انگلیسی" aria-label="نامک" dir="ltr" className="input py-2" required />
      <select name="icon" defaultValue={c?.icon ?? "wrench"} aria-label="آیکون" className="input py-2">
        {CATEGORY_ICON_NAMES.map((i) => <option key={i} value={i}>{i}</option>)}
      </select>
      <input name="sortOrder" defaultValue={c?.sortOrder ?? 0} aria-label="ترتیب" inputMode="numeric" className="input py-2" />
      {c && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={c.isActive} className="accent-brand" /> فعال
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
      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-base font-black">افزودن دسته‌بندی</h2>
        <ActionForm action={saveCategory} submitLabel="افزودن" className="flex flex-col gap-4" resetOnSuccess>
          <CategoryFields />
        </ActionForm>
      </section>
      <ul className="flex flex-col gap-3">
        {categories.map((c) => (
          <li key={c.id} className="card flex flex-col gap-3 p-4">
            <p className="flex items-center gap-2 text-sm font-black">
              <CategoryIcon name={c.icon} className="size-5 text-brand" /> {c.name}
              <span className="text-xs font-normal text-muted">({faDigits(c._count.products)} محصول)</span>
            </p>
            <ActionForm action={saveCategory} submitLabel="ذخیره" className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <CategoryFields c={c} />
            </ActionForm>
          </li>
        ))}
      </ul>
    </>
  );
}
