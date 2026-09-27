import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { HelpBox } from "@/components/admin/HelpBox";
import { CategoryManager, type CategoryRow } from "@/components/admin/categories/CategoryManager";

export const metadata = { title: "دسته‌بندی‌ها" };

export default async function CategoriesPage() {
  await requireStaff(["ADMIN"]);
  const rows = await db.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });

  const categories: CategoryRow[] = rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    description: c.description,
    isActive: c.isActive,
    parentId: c.parentId,
    productCount: c._count.products,
    childCount: c._count.children,
  }));

  return (
    <CategoryManager
      categories={categories}
      help={
        <HelpBox
          items={[
            "دسته‌بندی‌ها گروه‌های قطعات هستند (مثل «لوازم ترمز»). دسته‌های اصلی در صفحه اول سایت، منو و فیلترها نمایش داده می‌شوند.",
            "افزودن: دکمه «افزودن دسته‌بندی» را بزنید، نام فارسی را بنویسید و یک آیکون انتخاب کنید. آدرس صفحه خودکار ساخته می‌شود.",
            "زیردسته: با دکمه «افزودن زیردسته» (آیکون پوشه) کنار هر دسته اصلی، دسته‌های جزئی‌تر بسازید؛ مثل «لنت ترمز» زیر «لوازم ترمز».",
            "ترتیب: با فلش‌های بالا و پایین، جای دسته‌ها را در سایت عوض کنید.",
            "پنهان کردن: کلید «نمایش در سایت» را خاموش کنید؛ دسته از منو حذف می‌شود ولی محصولاتش پاک نمی‌شوند.",
            "حذف: با آیکون سطل زباله. اگر دسته محصول داشته باشد، قبل از حذف می‌پرسد محصولات به کدام دسته منتقل شوند تا هیچ محصولی بی‌دسته نماند.",
          ]}
        />
      }
    />
  );
}
