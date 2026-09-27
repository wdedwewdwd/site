"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { CATEGORY_ICON_NAMES } from "@/lib/shop";
import { uniqueSlug } from "@/lib/slug";
import { idSchema, text } from "@/lib/validation";

export type CategoryActionState = { ok: boolean; message: string } | null;

function refresh() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/categories");
}

async function nextSortOrder(parentId: string | null) {
  const max = await db.category.aggregate({ where: { parentId }, _max: { sortOrder: true } });
  return (max._max.sortOrder ?? -1) + 1;
}

const saveSchema = z.object({
  id: z.union([z.literal(""), idSchema]),
  name: text(60, 2),
  parentId: z.union([z.literal(""), idSchema]),
  icon: z.enum(CATEGORY_ICON_NAMES, "یک آیکون انتخاب کنید"),
  description: z.union([z.literal(""), text(600)]),
  isActive: z.string().optional(),
});

export async function saveCategory(_: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = saveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name, icon, description, isActive } = parsed.data;
  const parentId = parsed.data.parentId || null;

  const current = id
    ? await db.category.findUnique({ where: { id }, include: { _count: { select: { children: true } } } })
    : null;
  if (id && !current) return { ok: false, message: "دسته‌بندی یافت نشد." };

  // Only two levels: a subcategory's parent must itself be a main category.
  if (parentId) {
    if (parentId === id) return { ok: false, message: "یک دسته نمی‌تواند والد خودش باشد." };
    const parent = await db.category.findUnique({ where: { id: parentId }, select: { parentId: true } });
    if (!parent) return { ok: false, message: "دسته والد یافت نشد." };
    if (parent.parentId) return { ok: false, message: "زیردسته فقط زیر یک دسته اصلی قرار می‌گیرد." };
    if (current && current._count.children > 0) return { ok: false, message: "این دسته زیردسته دارد و نمی‌تواند زیرمجموعه دسته دیگری شود." };
  }

  const duplicate = await db.category.findFirst({ where: { name, NOT: id ? { id } : undefined }, select: { id: true } });
  if (duplicate) return { ok: false, message: "دسته‌بندی دیگری با همین نام وجود دارد." };

  const data = { name, icon, parentId, description: description || null, isActive: isActive === "on" };
  if (current) {
    const moved = current.parentId !== parentId;
    await db.category.update({
      where: { id: current.id },
      data: { ...data, ...(moved ? { sortOrder: await nextSortOrder(parentId) } : {}) },
    });
    await audit(admin.id, "category.update", "Category", current.id, { name });
  } else {
    // The URL slug is generated once from the name and never changes, so links keep working.
    const created = await db.category.create({
      data: {
        ...data,
        slug: await uniqueSlug(name, async (s) => !!(await db.category.findUnique({ where: { slug: s } }))),
        sortOrder: await nextSortOrder(parentId),
      },
    });
    await audit(admin.id, "category.create", "Category", created.id, { name });
  }
  refresh();
  return { ok: true, message: current ? "تغییرات ذخیره شد." : "دسته‌بندی اضافه شد." };
}

export async function toggleCategory(id: string): Promise<CategoryActionState> {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false, message: "درخواست نامعتبر است." };
  const row = await db.category.findUnique({ where: { id }, select: { isActive: true } });
  if (!row) return { ok: false, message: "دسته‌بندی یافت نشد." };
  await db.category.update({ where: { id }, data: { isActive: !row.isActive } });
  await audit(admin.id, row.isActive ? "category.hide" : "category.show", "Category", id);
  refresh();
  return { ok: true, message: row.isActive ? "دسته‌بندی پنهان شد." : "دسته‌بندی نمایش داده می‌شود." };
}

export async function moveCategory(id: string, direction: "up" | "down"): Promise<CategoryActionState> {
  await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success || (direction !== "up" && direction !== "down")) return { ok: false, message: "درخواست نامعتبر است." };
  const row = await db.category.findUnique({ where: { id }, select: { parentId: true } });
  if (!row) return { ok: false, message: "دسته‌بندی یافت نشد." };

  const siblings = await db.category.findMany({
    where: { parentId: row.parentId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const i = siblings.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return { ok: true, message: "" };
  [siblings[i], siblings[j]] = [siblings[j], siblings[i]];

  // Rewrite the whole sibling order so values stay compact and unique.
  await db.$transaction(siblings.map((s, index) => db.category.update({ where: { id: s.id }, data: { sortOrder: index } })));
  refresh();
  return { ok: true, message: "" };
}

const deleteSchema = z.object({ id: idSchema, moveTo: z.union([z.literal(""), idSchema]) });

export async function deleteCategory(_: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = deleteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "درخواست نامعتبر است." };
  const { id, moveTo } = parsed.data;

  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true, children: true } } },
  });
  if (!category) return { ok: false, message: "دسته‌بندی یافت نشد." };

  const productCount = category._count.products;
  if (productCount > 0) {
    if (!moveTo) return { ok: false, message: "برای حذف، ابتدا مشخص کنید محصولات به کدام دسته منتقل شوند." };
    if (moveTo === id) return { ok: false, message: "دسته مقصد نمی‌تواند همین دسته باشد." };
    if (!(await db.category.findUnique({ where: { id: moveTo }, select: { id: true } }))) return { ok: false, message: "دسته مقصد یافت نشد." };
  }

  await db.$transaction(async (tx) => {
    if (productCount > 0) await tx.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
    // Subcategories become main categories (appended at the end).
    if (category._count.children > 0) {
      const start = await tx.category.aggregate({ where: { parentId: null }, _max: { sortOrder: true } });
      const children = await tx.category.findMany({ where: { parentId: id }, orderBy: { sortOrder: "asc" }, select: { id: true } });
      for (const [k, child] of children.entries()) {
        await tx.category.update({ where: { id: child.id }, data: { parentId: null, sortOrder: (start._max.sortOrder ?? 0) + 1 + k } });
      }
    }
    await tx.category.delete({ where: { id } });
  });

  await audit(admin.id, "category.delete", "Category", id, { name: category.name, movedProducts: productCount, moveTo: moveTo || undefined });
  refresh();
  return { ok: true, message: `دسته «${category.name}» حذف شد.` };
}
