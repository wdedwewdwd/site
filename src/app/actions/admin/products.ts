"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { saveProductImage } from "@/lib/uploads";
import { uniqueSlug } from "@/lib/slug";
import { idSchema, text, toEnDigits } from "@/lib/validation";

export type ProductFormState = { ok: boolean; error?: string; errors?: Record<string, string> } | null;

const money = (label: string) =>
  z
    .string()
    .transform((v) => toEnDigits(v).replace(/[,٬\s]/g, ""))
    .pipe(z.string().regex(/^\d{1,10}$/, `${label} معتبر نیست`))
    .transform(Number);

const optionalMoney = (label: string) =>
  z
    .string()
    .transform((v) => toEnDigits(v).replace(/[,٬\s]/g, ""))
    .pipe(z.union([z.literal(""), z.string().regex(/^\d{1,10}$/, `${label} معتبر نیست`)]))
    .transform((v) => (v === "" ? null : Number(v)));

const productSchema = z
  .object({
    name: text(160, 3),
    // Optional: generated automatically when left empty.
    sku: z
      .string()
      .transform((v) => toEnDigits(v).trim().toUpperCase())
      .pipe(z.union([z.literal(""), z.string().regex(/^[A-Z0-9-]{2,40}$/, "کد کالا فقط می‌تواند حروف انگلیسی، عدد و خط تیره باشد")])),
    oemCode: z.union([z.literal(""), text(60)]),
    categoryId: idSchema,
    brandId: z.union([z.literal(""), idSchema]),
    price: money("قیمت").pipe(z.number().min(1000, "قیمت باید حداقل ۱۰۰۰ تومان باشد")),
    compareAtPrice: optionalMoney("قیمت قبل از تخفیف"),
    stock: z.string().transform((v) => toEnDigits(v)).pipe(z.string().regex(/^\d{1,6}$/, "موجودی معتبر نیست")).transform(Number),
    warranty: z.union([z.literal(""), text(80)]),
    madeIn: z.union([z.literal(""), text(40)]),
    weightGrams: optionalMoney("وزن"),
    description: z.union([z.literal(""), text(5000)]),
    specs: z.string().max(3000),
    isActive: z.string().optional(),
    isFeatured: z.string().optional(),
  })
  .refine((d) => d.compareAtPrice === null || d.compareAtPrice > d.price, {
    path: ["compareAtPrice"],
    message: "قیمت قبل از تخفیف باید بیشتر از قیمت فعلی باشد",
  });

function parseSpecs(raw: string) {
  return raw
    .split("\n")
    .map((l) => l.split(":"))
    .filter((p) => p.length >= 2 && p[0].trim() && p.slice(1).join(":").trim())
    .slice(0, 30)
    .map(([label, ...rest]) => ({ label: label.trim().slice(0, 60), value: rest.join(":").trim().slice(0, 200) }));
}

export async function saveProduct(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (id && !idSchema.safeParse(id).success) return { ok: false, error: "شناسه نامعتبر" };

  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors };
  }
  const d = parsed.data;

  const fitmentIds = formData.getAll("fitments").map(String).filter((v) => idSchema.safeParse(v).success).slice(0, 100);
  const removeImages = formData.getAll("removeImage").map(String).filter((v) => idSchema.safeParse(v).success);
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 8);

  // Validate and store all uploads before touching the database.
  const uploaded: string[] = [];
  for (const f of files) {
    const res = await saveProductImage(f);
    if (!res.ok) return { ok: false, errors: { images: res.error } };
    uploaded.push(res.url);
  }

  const existing = id ? await db.product.findUnique({ where: { id }, select: { slug: true, sku: true } }) : null;
  if (id && !existing) return { ok: false, error: "محصول یافت نشد." };

  // Slug (URL) is created once from the name and kept stable; SKU is generated if not provided.
  const slug = existing?.slug ?? (await uniqueSlug(d.name, async (s) => !!(await db.product.findUnique({ where: { slug: s } }))));
  const sku = d.sku || existing?.sku || `AY-${Date.now().toString(36).toUpperCase()}`;
  if (await db.product.findFirst({ where: { sku, NOT: id ? { id } : undefined }, select: { id: true } })) {
    return { ok: false, errors: { sku: "این کد کالا برای محصول دیگری ثبت شده است" } };
  }

  const data = {
    name: d.name,
    slug,
    sku,
    oemCode: d.oemCode || null,
    categoryId: d.categoryId,
    brandId: d.brandId || null,
    price: d.price,
    compareAtPrice: d.compareAtPrice,
    stock: d.stock,
    warranty: d.warranty || null,
    madeIn: d.madeIn || null,
    weightGrams: d.weightGrams,
    description: d.description || null,
    specs: parseSpecs(d.specs),
    isActive: d.isActive === "on",
    isFeatured: d.isFeatured === "on",
  };


  const product = await db.$transaction(async (tx) => {
    const p = id ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    if (removeImages.length) await tx.productImage.deleteMany({ where: { id: { in: removeImages }, productId: p.id } });
    if (uploaded.length) {
      const last = await tx.productImage.aggregate({ where: { productId: p.id }, _max: { sortOrder: true } });
      const start = (last._max.sortOrder ?? -1) + 1;
      await tx.productImage.createMany({ data: uploaded.map((url, i) => ({ productId: p.id, url, alt: d.name, sortOrder: start + i })) });
    }
    await tx.productFitment.deleteMany({ where: { productId: p.id } });
    if (fitmentIds.length) await tx.productFitment.createMany({ data: fitmentIds.map((carModelId) => ({ productId: p.id, carModelId })), skipDuplicates: true });
    return p;
  });

  await audit(admin.id, id ? "product.update" : "product.create", "Product", product.id, { sku: product.sku, price: product.price, stock: product.stock });
  revalidatePath("/", "layout");
  redirect(`/admin/products?saved=${product.id}`);
}

export async function toggleProductActive(id: string) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return;
  const p = await db.product.findUnique({ where: { id }, select: { isActive: true } });
  if (!p) return;
  await db.product.update({ where: { id }, data: { isActive: !p.isActive } });
  await audit(admin.id, p.isActive ? "product.deactivate" : "product.activate", "Product", id);
  revalidatePath("/", "layout");
}
