"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ImageUp, LoaderCircle } from "lucide-react";
import { saveBanner } from "@/app/actions/admin/banners";
import type { AdminFormState } from "@/app/actions/admin/misc";
import { BannerTile } from "@/components/home/BannerTile";
import type { BannerDTO } from "@/lib/banners-shared";

export type LinkOption = { label: string; href: string };
export type SizeHint = { name: string; desktop: string; mobile?: string };

const MAX_BYTES = 4 * 1024 * 1024;

/** Picks an image file and shows it right away (before it is uploaded). */
function useLocalImage(initial: string | null) {
  const [url, setUrl] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const created = useRef<string | null>(null);
  useEffect(() => () => void (created.current && URL.revokeObjectURL(created.current)), []);
  const pick = (file: File | undefined, input: HTMLInputElement) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > MAX_BYTES) {
      setError("فقط تصویر JPG، PNG یا WEBP تا ۴ مگابایت");
      input.value = "";
      return;
    }
    setError(null);
    if (created.current) URL.revokeObjectURL(created.current);
    created.current = URL.createObjectURL(file);
    setUrl(created.current);
  };
  return { url, error, pick };
}

export function BannerForm({
  banner,
  hint,
  variant,
  links,
  onDone,
}: {
  banner: BannerDTO | null;
  /** Recommended size for the place this banner fills in the current layout. */
  hint: SizeHint;
  variant: "large" | "small";
  links: LinkOption[];
  onDone: (message: string) => void;
}) {
  const [f, setF] = useState({
    title: banner?.title ?? "",
    subtitle: banner?.subtitle ?? "",
    badge: banner?.badge ?? "",
    buttonLabel: banner?.buttonLabel ?? "",
    href: banner?.href ?? "",
    showText: banner?.showText ?? true,
    isActive: banner?.isActive ?? true,
  });
  const desktop = useLocalImage(banner?.image ?? null);
  const mobile = useLocalImage(banner?.mobileImage ?? null);
  const [removeMobile, setRemoveMobile] = useState(false);
  const [state, action, pending] = useActionState<AdminFormState, FormData>(async (prev, fd) => {
    const r = await saveBanner(prev, fd);
    if (r?.ok) onDone(r.message ?? "ذخیره شد.");
    return r;
  }, null);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((s) => ({ ...s, [k]: e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const preview: BannerDTO = {
    id: banner?.id ?? "preview",
    image: desktop.url ?? "",
    mobileImage: null,
    title: f.title || null,
    subtitle: f.subtitle || null,
    badge: f.badge || null,
    buttonLabel: f.buttonLabel || null,
    href: null,
    showText: f.showText,
    isActive: true,
  };
  const small = variant === "small";

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={banner?.id ?? ""} />

      {/* Live preview of this banner in its place */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-muted">پیش‌نمایش ({hint.name})</span>
        <div className="@container/hero">
          <div className={`mx-auto ${small ? "aspect-square max-w-72" : "aspect-[2.4/1]"}`}>
            {desktop.url ? (
              <BannerTile banner={preview} variant={small ? "small" : "large"} sizes="600px" />
            ) : (
              <div className="grid h-full place-items-center rounded-[20px] border-2 border-dashed border-line bg-canvas text-xs text-muted">ابتدا تصویر بنر را انتخاب کنید</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          <span>
            تصویر بنر {banner ? <span className="font-normal text-muted">(برای تعویض، فایل جدید انتخاب کنید)</span> : <span className="text-brand">*</span>}
          </span>
          <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 py-3 font-normal text-muted hover:border-brand">
            <ImageUp className="size-5 shrink-0 text-brand" />
            <span>
              اندازه پیشنهادی: <b dir="ltr" className="text-ink">{hint.desktop}</b> پیکسل
            </span>
          </span>
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => desktop.pick(e.target.files?.[0], e.target)} className="sr-only" />
          {desktop.error && <span className="field-error">{desktop.error}</span>}
        </label>

        {hint.mobile ? (
          <div className="flex flex-col gap-1.5 text-xs font-bold">
            <label className="flex flex-col gap-1.5">
              تصویر مخصوص موبایل (اختیاری)
              <span className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-canvas px-3 py-3 font-normal text-muted hover:border-brand">
                {mobile.url && !removeMobile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mobile.url} alt="" className="h-8 w-14 shrink-0 rounded object-cover" />
                ) : (
                  <ImageUp className="size-5 shrink-0 text-brand" />
                )}
                <span>
                  اندازه پیشنهادی: <b dir="ltr" className="text-ink">{hint.mobile}</b>
                </span>
              </span>
              <input
                name="mobileImage"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  mobile.pick(e.target.files?.[0], e.target);
                  setRemoveMobile(false);
                }}
                className="sr-only"
              />
            </label>
            {mobile.error && <span className="field-error">{mobile.error}</span>}
            {banner?.mobileImage && (
              <label className="flex items-center gap-2 font-normal text-muted">
                <input type="checkbox" name="removeMobileImage" checked={removeMobile} onChange={(e) => setRemoveMobile(e.target.checked)} className="accent-brand" />
                حذف تصویر موبایل (همان تصویر اصلی در موبایل هم نمایش داده شود)
              </label>
            )}
          </div>
        ) : (
          <p className="self-end rounded-xl bg-canvas p-3 text-[11px] leading-6 text-muted">در این چیدمان همان تصویر در موبایل هم نمایش داده می‌شود.</p>
        )}
      </div>

      <label className="flex items-start gap-2 rounded-xl bg-canvas p-3 text-xs leading-6">
        <input type="checkbox" name="showText" checked={f.showText} onChange={set("showText")} className="mt-1 accent-brand" />
        <span>
          <b>نمایش متن روی بنر</b>
          <span className="block text-muted">اگر متن و دکمه داخل خود عکس طراحی شده است، این گزینه را بردارید؛ عنوان فقط برای گوگل و نابینایان استفاده می‌شود.</span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-bold sm:col-span-2">
          عنوان
          <input name="title" value={f.title} onChange={set("title")} maxLength={80} placeholder="مثلاً: تا ۳۰٪ تخفیف روی دیسک و لنت ترمز" className="input py-2.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold sm:col-span-2">
          توضیح کوتاه
          <textarea name="subtitle" value={f.subtitle} onChange={set("subtitle")} maxLength={160} rows={2} placeholder="مثلاً: تضمین اصالت کالا همراه با فاکتور معتبر" className="input resize-none py-2.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          برچسب قرمز (اختیاری)
          <input name="badge" value={f.badge} onChange={set("badge")} maxLength={30} placeholder="مثلاً: تخفیف ویژه" className="input py-2.5 font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-bold">
          متن دکمه (اختیاری)
          <input name="buttonLabel" value={f.buttonLabel} onChange={set("buttonLabel")} maxLength={30} placeholder="مثلاً: مشاهده و خرید" className="input py-2.5 font-normal" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5 text-xs font-bold">
        <label htmlFor="banner-href">با زدن روی بنر به کجا برود؟</label>
        <div className="grid gap-2 sm:grid-cols-[1fr_1.2fr]">
          <select
            aria-label="انتخاب از صفحه‌های سایت"
            value={links.some((l) => l.href === f.href) ? f.href : ""}
            onChange={(e) => e.target.value && setF((s) => ({ ...s, href: e.target.value }))}
            className="input py-2.5 font-normal"
          >
            <option value="">انتخاب از صفحه‌های سایت…</option>
            {links.map((l) => (
              <option key={l.href} value={l.href}>
                {l.label}
              </option>
            ))}
          </select>
          <input id="banner-href" name="href" value={f.href} onChange={set("href")} dir="ltr" maxLength={300} placeholder="/offers  یا  https://…" className="input py-2.5 text-left font-normal" />
        </div>
        <span className="font-normal text-muted">خالی بگذارید تا بنر لینک نداشته باشد. می‌توانید آدرس یک محصول را هم از نوار آدرس مرورگر کپی کنید (از / به بعد).</span>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" checked={f.isActive} onChange={set("isActive")} className="accent-brand" />
        نمایش این بنر در سایت
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button type="submit" disabled={pending || !desktop.url} className="btn-primary">
          {pending && <LoaderCircle className="size-4 animate-spin" />}
          {banner ? "ذخیره تغییرات" : "افزودن بنر"}
        </button>
        {state && !state.ok && <p className="text-xs font-bold text-brand" role="alert">{state.error}</p>}
      </div>
    </form>
  );
}
