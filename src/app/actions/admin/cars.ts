"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { uniqueSlug } from "@/lib/slug";
import { idSchema, text } from "@/lib/validation";

export type CarActionResult = { ok: true; message: string } | { ok: false; message: string };

const carSchema = z.object({
  id: z.union([z.literal(""), idSchema]),
  make: text(40, 2).refine((v) => !/[<>]/.test(v), "نام سازنده معتبر نیست"),
  name: text(60, 2).refine((v) => !/[<>]/.test(v), "نام خودرو معتبر نیست"),
});

/**
 * Car models are one shared list: renaming or deleting one changes every product that uses it.
 * The slug (used in filter links) is created once and kept when the name changes.
 */
export async function saveCarModel(input: { id?: string; make: string; name: string }): Promise<CarActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = carSchema.safeParse({ id: input.id ?? "", make: input.make ?? "", name: input.name ?? "" });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { id, make, name } = parsed.data;

  const duplicate = await db.carModel.findFirst({ where: { name, NOT: id ? { id } : undefined }, select: { id: true } });
  if (duplicate) return { ok: false, message: "خودرویی با همین نام در فهرست هست." };

  if (id) {
    const updated = await db.carModel.updateMany({ where: { id }, data: { make, name } });
    if (!updated.count) return { ok: false, message: "این خودرو پیدا نشد." };
    await audit(admin.id, "car.update", "CarModel", id, { make, name });
  } else {
    const slug = await uniqueSlug(name, async (s) => !!(await db.carModel.findUnique({ where: { slug: s }, select: { id: true } })));
    const last = await db.carModel.aggregate({ _max: { sortOrder: true } });
    const car = await db.carModel.create({ data: { make, name, slug, sortOrder: (last._max.sortOrder ?? -1) + 1 } });
    await audit(admin.id, "car.create", "CarModel", car.id, { make, name });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "ذخیره شد." : `«${name}» به فهرست اضافه شد.` };
}

/** Removes the car from the list and from every product it was ticked on. */
export async function deleteCarModel(id: string): Promise<CarActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false, message: "درخواست نامعتبر است." };
  const car = await db.carModel.findUnique({ where: { id }, select: { name: true, _count: { select: { fitments: true } } } });
  if (!car) return { ok: false, message: "این خودرو پیدا نشد." };

  await db.carModel.delete({ where: { id } }); // fitments cascade
  await audit(admin.id, "car.delete", "CarModel", id, { name: car.name, products: car._count.fitments });
  revalidatePath("/", "layout");
  return { ok: true, message: `«${car.name}» حذف شد.` };
}
