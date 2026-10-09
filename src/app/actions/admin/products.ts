"use server";

import { rm } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { productListQuery } from "@/lib/admin-products";
import { faDigits } from "@/lib/format";
import { saveProductImage, UPLOAD_DIR } from "@/lib/uploads";
import { uniqueSlug } from "@/lib/slug";
import { idSchema, text, toEnDigits } from "@/lib/validation";

export type ProductFormState = { ok: boolean; error?: string; errors?: Record<string, string> } | null;

const money = (label: string) =>
  z
    .string()
    .transform((v) => toEnDigits(v).replace(/[,٬\s]/g, ""))
    .pipe(z.string().regex(/^\d{1,10}$/, `${label} معتبر نیست`))
    .transform(Number);

// Missing counts as empty: e.g. the sale price field is not rendered while the discount switch is off.
const optionalMoney = (label: string) =>
  z
    .string()
    .optional()
    .transform((v) => toEnDigits(v ?? "").replace(/[,٬\s]/g, ""))
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
    // What the owner types: the normal price, and optionally a discounted price.
    basePrice: money("قیمت اصلی").pipe(z.number().min(1000, "قیمت باید حداقل ۱۰۰۰ تومان باشد")),
    hasDiscount: z.string().optional(),
    salePrice: optionalMoney("قیمت بعد از تخفیف"),
    stock: z.string().transform((v) => toEnDigits(v)).pipe(z.string().regex(/^\d{1,6}$/, "موجودی معتبر نیست")).transform(Number),
    warranty: z.union([z.literal(""), text(80)]),
    madeIn: z.union([z.literal(""), text(40)]),
    weightGrams: optionalMoney("وزن"),
    description: z.union([z.literal(""), text(5000)]),
    specs: z.string().max(3000),
    isActive: z.string().optional(),
    isFeatured: z.string().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.hasDiscount !== "on") return;
    if (d.salePrice === null) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "قیمت بعد از تخفیف یا درصد تخفیف را وارد کنید" });
    else if (d.salePrice < 1000) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "قیمت بعد از تخفیف باید حداقل ۱۰۰۰ تومان باشد" });
    else if (d.salePrice >= d.basePrice) ctx.addIssue({ code: "custom", path: ["salePrice"], message: "قیمت بعد از تخفیف باید کمتر از قیمت اصلی باشد" });
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
  // Stored as the price the customer pays plus the struck-through price.
  const discounted = d.hasDiscount === "on" && d.salePrice !== null;
  const price = discounted ? d.salePrice! : d.basePrice;
  const compareAtPrice = discounted ? d.basePrice : null;

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
    price,
    compareAtPrice,
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
  // Back to the list exactly as it was (filters, page), with the saved product highlighted.
  const back = productListQuery(new URLSearchParams(String(formData.get("back") ?? "").slice(0, 600)));
  redirect(`/admin/products?${back ? `${back}&` : ""}saved=${product.id}`);
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

export type ProductActionResult = { ok: boolean; message: string };

const quickSchema = z.discriminatedUnion("field", [
  z.object({ id: idSchema, field: z.literal("price"), value: money("قیمت").pipe(z.number().min(1000, "قیمت باید حداقل ۱۰۰۰ تومان باشد")) }),
  z.object({
    id: idSchema,
    field: z.literal("stock"),
    value: z.string().transform((v) => toEnDigits(v).trim()).pipe(z.string().regex(/^\d{1,6}$/, "موجودی معتبر نیست")).transform(Number),
  }),
]);

/** Inline edit of the selling price or stock from the product list. */
export async function quickUpdateProduct(input: { id: string; field: "price" | "stock"; value: string }): Promise<ProductActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = quickSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "مقدار معتبر نیست." };
  const d = parsed.data;
  const p = await db.product.findUnique({ where: { id: d.id }, select: { sku: true, price: true, stock: true, compareAtPrice: true } });
  if (!p) return { ok: false, message: "محصول یافت نشد." };
  if (d.field === "price" && p.compareAtPrice !== null && d.value >= p.compareAtPrice) {
    return { ok: false, message: "قیمت فروش باید کمتر از قیمت اصلی (خط‌خورده) باشد؛ برای تغییر تخفیف، محصول را باز کنید." };
  }
  await db.product.update({ where: { id: d.id }, data: { [d.field]: d.value } });
  await audit(admin.id, `product.${d.field}`, "Product", d.id, { sku: p.sku, from: p[d.field], to: d.value });
  revalidatePath("/", "layout");
  return { ok: true, message: d.field === "price" ? "قیمت ذخیره شد." : "موجودی ذخیره شد." };
}

const bulkSchema = z.object({
  ids: z.array(idSchema).min(1, "محصولی انتخاب نشده است.").max(200),
  action: z.enum(["activate", "deactivate", "move", "delete"]),
  categoryId: idSchema.optional(),
});

/** Uploaded product photos no product uses anymore (sample images under /images are never touched). */
async function removeOrphanImages(urls: string[]) {
  const names = urls.map((u) => u.match(/^\/media\/products\/([A-Za-z0-9_-]{16,64}\.webp)$/)?.[1]).filter((n): n is string => !!n);
  if (!names.length) return;
  const stillUsed = new Set((await db.productImage.findMany({ where: { url: { in: names.map((n) => `/media/products/${n}`) } }, select: { url: true } })).map((i) => i.url));
  for (const n of names) if (!stillUsed.has(`/media/products/${n}`)) await rm(path.join(UPLOAD_DIR, "products", n), { force: true });
}

/** Actions on the products ticked in the list (or one product's delete button). */
export async function bulkProducts(input: { ids: string[]; action: "activate" | "deactivate" | "move" | "delete"; categoryId?: string }): Promise<ProductActionResult> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "درخواست معتبر نیست." };
  const { action, categoryId } = parsed.data;
  const ids = [...new Set(parsed.data.ids)];
  const products = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true, sku: true } });
  if (!products.length) return { ok: false, message: "محصولی یافت نشد." };
  const found = products.map((p) => p.id);
  const meta = { count: found.length, skus: products.slice(0, 50).map((p) => p.sku) };
  const n = faDigits(found.length);

  let message: string;
  if (action === "activate" || action === "deactivate") {
    await db.product.updateMany({ where: { id: { in: found } }, data: { isActive: action === "activate" } });
    message = action === "activate" ? `${n} محصول فعال شد.` : `${n} محصول غیرفعال شد و در فروشگاه نمایش داده نمی‌شود.`;
  } else if (action === "move") {
    const category = categoryId ? await db.category.findUnique({ where: { id: categoryId }, select: { id: true, name: true } }) : null;
    if (!category) return { ok: false, message: "دسته‌بندی مقصد را انتخاب کنید." };
    await db.product.updateMany({ where: { id: { in: found } }, data: { categoryId: category.id } });
    Object.assign(meta, { categoryId: category.id });
    message = `${n} محصول به دسته «${category.name}» منتقل شد.`;
  } else {
    // Orders keep their own copy of the name, code and price, so order history stays intact.
    const images = await db.productImage.findMany({ where: { productId: { in: found } }, select: { url: true } });
    await db.product.deleteMany({ where: { id: { in: found } } });
    await removeOrphanImages(images.map((i) => i.url));
    message = `${n} محصول برای همیشه حذف شد.`;
  }

  await audit(admin.id, `product.bulk.${action}`, "Product", found.length === 1 ? found[0] : undefined, meta);
  revalidatePath("/", "layout");
  return { ok: true, message };
}
