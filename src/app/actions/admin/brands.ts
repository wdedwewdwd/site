"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { idSchema, text } from "@/lib/validation";

export type BrandActionResult = { ok: true; message: string } | { ok: false; message: string };

const brandSchema = z.object({
  id: z.union([z.literal(""), idSchema]),
  name: text(60).refine((v) => !/[<>]/.test(v), "نام برند معتبر نیست"),
  // Shown next to the Persian name in the filters, e.g. «بوش (BOSCH)». Optional.
  latin: z
    .string()
    .max(60, "نام لاتین حداکثر ۶۰ حرف باشد")
    .refine((v) => v === "" || /^[A-Za-z0-9][A-Za-z0-9 .&'+\-]*$/.test(v), "نام لاتین را فقط با حروف انگلیسی، عدد و فاصله بنویسید (مثلاً BOSCH)"),
});

/**
 * Brands are one shared list (product form + the brand filter on listings). Renaming changes every product
 * that uses the brand; the slug (used in filter links) is created once and kept.
 */
export async function saveBrand(input: { id?: string; name: string; latin: string }): Promise<BrandActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = brandSchema.safeParse({ id: input.id ?? "", name: input.name ?? "", latin: (input.latin ?? "").trim() });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, name } = parsed.data;
  const latin = parsed.data.latin || null;

  const duplicate = await db.brand.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: id ? { id } : undefined }, select: { id: true } });
  if (duplicate) return { ok: false, message: "برندی با همین نام در فهرست هست." };

  if (id) {
    const updated = await db.brand.updateMany({ where: { id }, data: { name, latin } });
    if (!updated.count) return { ok: false, message: "این برند پیدا نشد." };
    await audit(admin.id, "brand.update", "Brand", id, { name, latin });
  } else {
    const slug = await uniqueSlug(latin ?? name, async (s) => !!(await db.brand.findUnique({ where: { slug: s }, select: { id: true } })));
    const brand = await db.brand.create({ data: { name, latin, slug } });
    await audit(admin.id, "brand.create", "Brand", brand.id, { name, latin });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "ذخیره شد." : `«${name}» به فهرست اضافه شد.` };
}

/** Removes the brand; its products stay and simply have no brand. */
export async function deleteBrand(id: string): Promise<BrandActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false, message: "درخواست نامعتبر است." };
  const brand = await db.brand.findUnique({ where: { id }, select: { name: true, _count: { select: { products: true } } } });
  if (!brand) return { ok: false, message: "این برند پیدا نشد." };

  await db.brand.delete({ where: { id } }); // products keep existing with brandId set to null
  await audit(admin.id, "brand.delete", "Brand", id, { name: brand.name, products: brand._count.products });
  revalidatePath("/", "layout");
  return { ok: true, message: `«${brand.name}» حذف شد.` };
}
