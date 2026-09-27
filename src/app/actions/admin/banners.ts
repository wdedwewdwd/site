"use server";

import { rm } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { idSchema, text } from "@/lib/validation";
import { UPLOAD_DIR, UPLOADED_BANNER_URL, saveBannerImage } from "@/lib/uploads";
import { AUTOPLAY_CHOICES, HERO_LAYOUTS, MAX_BANNERS, type HeroLayout } from "@/lib/banners-shared";
import type { AdminFormState } from "./misc";

const optional = (max: number) => text(max, 0).transform((v) => v || null);

const hrefSchema = z
  .string()
  .trim()
  .max(300, "لینک خیلی طولانی است")
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\")) || /^https:\/\/[^\s<>"']+$/i.test(v), {
    message: "لینک باید با / شروع شود (صفحه‌ای از همین سایت) یا با https:// (سایت دیگر)",
  })
  .transform((v) => v || null);

const bannerSchema = z.object({
  id: z.union([z.literal(""), idSchema]),
  title: optional(80),
  subtitle: optional(160),
  badge: optional(30),
  buttonLabel: optional(30),
  href: hrefSchema,
});

const fileFrom = (fd: FormData, name: string) => {
  const f = fd.get(name);
  return f instanceof File && f.size > 0 ? f : null;
};

/** Deletes an uploaded banner image file; built-in images (/banners/*.jpg) are never touched. */
async function removeUploaded(url: string | null | undefined) {
  const name = url?.match(UPLOADED_BANNER_URL)?.[1];
  if (name) await rm(path.join(UPLOAD_DIR, "banners", name), { force: true });
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/admin/banners");
}

export async function saveBanner(_: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = bannerSchema.safeParse({
    id: formData.get("id") ?? "",
    title: formData.get("title") ?? "",
    subtitle: formData.get("subtitle") ?? "",
    badge: formData.get("badge") ?? "",
    buttonLabel: formData.get("buttonLabel") ?? "",
    href: formData.get("href") ?? "",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است." };
  const { id, ...fields } = parsed.data;
  const showText = formData.get("showText") === "on";
  const isActive = formData.get("isActive") === "on";
  const image = fileFrom(formData, "image");
  const mobileImage = fileFrom(formData, "mobileImage");
  const removeMobile = formData.get("removeMobileImage") === "on";

  const existing = id ? await db.banner.findUnique({ where: { id } }) : null;
  if (id && !existing) return { ok: false, error: "این بنر پیدا نشد؛ صفحه را دوباره باز کنید." };
  if (!existing && !image) return { ok: false, error: "تصویر بنر را انتخاب کنید." };
  if (!existing && (await db.banner.count()) >= MAX_BANNERS) return { ok: false, error: `حداکثر ${MAX_BANNERS.toLocaleString("fa-IR")} بنر می‌توانید داشته باشید؛ بنرهای قدیمی را حذف کنید.` };

  // Save new files first; only swap (and delete old files) once everything is valid.
  const savedImage = image ? await saveBannerImage(image) : null;
  if (savedImage && !savedImage.ok) return { ok: false, error: `تصویر بنر: ${savedImage.error}` };
  const savedMobile = mobileImage ? await saveBannerImage(mobileImage) : null;
  if (savedMobile && !savedMobile.ok) {
    if (savedImage?.ok) await removeUploaded(savedImage.url);
    return { ok: false, error: `تصویر موبایل: ${savedMobile.error}` };
  }

  const data = {
    ...fields,
    showText,
    isActive,
    ...(savedImage?.ok ? { image: savedImage.url } : {}),
    ...(savedMobile?.ok ? { mobileImage: savedMobile.url } : removeMobile ? { mobileImage: null } : {}),
  };

  if (existing) {
    await db.banner.update({ where: { id: existing.id }, data });
    if (savedImage?.ok) await removeUploaded(existing.image);
    if (savedMobile?.ok || removeMobile) await removeUploaded(existing.mobileImage);
    await audit(admin.id, "banner.update", "Banner", existing.id, { title: fields.title });
  } else {
    const last = await db.banner.aggregate({ _max: { sortOrder: true } });
    const row = await db.banner.create({
      data: { ...data, image: (savedImage as { ok: true; url: string }).url, sortOrder: (last._max.sortOrder ?? -1) + 1 },
    });
    await audit(admin.id, "banner.create", "Banner", row.id, { title: fields.title });
  }
  refresh();
  return { ok: true, message: existing ? "بنر ذخیره شد." : "بنر اضافه شد." };
}

export async function deleteBanner(id: string) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false };
  const row = await db.banner.findUnique({ where: { id } });
  if (!row) return { ok: false };
  await db.banner.delete({ where: { id } });
  await removeUploaded(row.image);
  await removeUploaded(row.mobileImage);
  await audit(admin.id, "banner.delete", "Banner", id, { title: row.title });
  refresh();
  return { ok: true };
}

export async function toggleBanner(id: string) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success) return { ok: false };
  const row = await db.banner.findUnique({ where: { id }, select: { isActive: true } });
  if (!row) return { ok: false };
  await db.banner.update({ where: { id }, data: { isActive: !row.isActive } });
  await audit(admin.id, "banner.toggle", "Banner", id, { active: !row.isActive });
  refresh();
  return { ok: true };
}

/** Moves a banner one place up (-1) or down (+1) in the order. */
export async function moveBanner(id: string, direction: -1 | 1) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(id).success || (direction !== -1 && direction !== 1)) return { ok: false };
  const rows = await db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const from = rows.findIndex((r) => r.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= rows.length) return { ok: false };
  [rows[from], rows[to]] = [rows[to], rows[from]];
  await db.$transaction(rows.map((r, i) => db.banner.update({ where: { id: r.id }, data: { sortOrder: i } })));
  await audit(admin.id, "banner.reorder", "Banner", id, { direction });
  refresh();
  return { ok: true };
}

export async function setHeroLayout(layout: HeroLayout, autoplay: number) {
  const admin = await requireStaff(["ADMIN"]);
  if (!HERO_LAYOUTS.includes(layout) || !(AUTOPLAY_CHOICES as readonly number[]).includes(autoplay)) return { ok: false };
  await db.$transaction([
    db.setting.upsert({ where: { key: "hero_layout" }, create: { key: "hero_layout", value: layout }, update: { value: layout } }),
    db.setting.upsert({ where: { key: "hero_autoplay" }, create: { key: "hero_autoplay", value: String(autoplay) }, update: { value: String(autoplay) } }),
  ]);
  await audit(admin.id, "settings.hero_layout", "Setting", undefined, { layout, autoplay });
  refresh();
  return { ok: true };
}
