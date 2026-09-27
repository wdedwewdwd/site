"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Link2, Monitor, Pencil, Smartphone, Trash2 } from "lucide-react";
import { deleteBanner, moveBanner, setHeroLayout, toggleBanner } from "@/app/actions/admin/banners";
import { HeroBanners } from "@/components/home/HeroBanners";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toaster";
import { faDigits } from "@/lib/format";
import { AUTOPLAY_CHOICES, HERO_LAYOUTS, LAYOUT_INFO, MAX_BANNERS, layoutCapacity, slotFor, type BannerDTO, type HeroLayout } from "@/lib/banners-shared";
import { BannerForm, type LinkOption } from "./BannerForm";

/** Small drawing of each layout for the picker. */
function LayoutSketch({ layout, on }: { layout: HeroLayout; on: boolean }) {
  const box = `rounded-md ${on ? "bg-brand/80" : "bg-subtle/50"}`;
  const soft = `rounded-md ${on ? "bg-brand/40" : "bg-subtle/30"}`;
  return (
    <div className="flex h-12 w-full gap-1.5 sm:h-16" aria-hidden>
      {layout === "single" && <div className={`${box} flex-1`} />}
      {layout === "split" && (
        <>
          <div className={`${soft} w-[30%]`} />
          <div className={`${box} flex-1`} />
        </>
      )}
      {layout === "grid4" && [0, 1, 2, 3].map((i) => <div key={i} className={`${i % 2 ? soft : box} flex-1`} />)}
      {layout === "slider" && (
        <div className={`${box} relative flex-1`}>
          <span className="absolute right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-white/90" />
          <span className="absolute left-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full bg-white/90" />
          <span className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
            <span className="h-1.5 w-3 rounded-full bg-white" />
            <span className="size-1.5 rounded-full bg-white/60" />
            <span className="size-1.5 rounded-full bg-white/60" />
          </span>
        </div>
      )}
    </div>
  );
}

export function BannerManager({ banners, layout: savedLayout, autoplay: savedAutoplay, links }: { banners: BannerDTO[]; layout: HeroLayout; autoplay: number; links: LinkOption[] }) {
  const [layout, setLayout] = useState(savedLayout);
  const [autoplay, setAutoplay] = useState(savedAutoplay);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [editing, setEditing] = useState<BannerDTO | "new" | null>(null);
  const [pending, start] = useTransition();

  const active = banners.filter((b) => b.isActive);
  const capacity = layoutCapacity(layout);
  const shown = active.slice(0, capacity);
  const info = LAYOUT_INFO[layout];

  function chooseLayout(next: HeroLayout, nextAutoplay = autoplay) {
    setLayout(next);
    setAutoplay(nextAutoplay);
    start(async () => {
      const r = await setHeroLayout(next, nextAutoplay);
      if (r.ok) toast(next === layout ? "تنظیم اسلایدر ذخیره شد." : `چیدمان «${LAYOUT_INFO[next].label}» فعال شد.`);
      else toast("ذخیره نشد؛ دوباره تلاش کنید.", "error");
    });
  }

  const run = (fn: () => Promise<{ ok: boolean }>, message?: string) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) toast("انجام نشد؛ صفحه را دوباره باز کنید.", "error");
      else if (message) toast(message);
    });

  // The place a banner fills (or would fill) in the chosen layout, for size hints and labels.
  const editingIndex = editing && editing !== "new" ? active.findIndex((b) => b.id === editing.id) : active.length;
  const fits = editingIndex >= 0 && slotFor(layout, editingIndex) !== null;
  const editingSlot = (fits ? slotFor(layout, editingIndex) : null) ?? info.slots[0];
  const editingSmall = (layout === "split" && editingIndex === 1) || layout === "grid4";
  const editingNote = editing && editing !== "new" && !editing.isActive
    ? "این بنر فعلاً مخفی است؛ برای نمایش در سایت، تیک «نمایش این بنر در سایت» را بزنید."
    : fits
    ? `در چیدمان «${info.label}»، این بنر در جایگاه «${editingSlot.name}» قرار می‌گیرد.`
    : `جایگاه‌های چیدمان «${info.label}» پر است؛ این بنر ذخیره می‌شود ولی تا وقتی با فلش‌ها بالاتر نیاید (یا چیدمان عوض نشود) در سایت دیده نمی‌شود.`;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Layout */}
      <section className="card p-5">
        <h2 className="mb-1 text-base font-black">۱. چیدمان بنرها</h2>
        <p className="mb-4 text-xs text-muted">شکل نمایش بنرها در بالای صفحه اصلی را انتخاب کنید. تغییر فوراً در سایت اعمال می‌شود.</p>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="radiogroup" aria-label="چیدمان بنرها">
          {HERO_LAYOUTS.map((l) => {
            const on = l === layout;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={pending}
                onClick={() => !on && chooseLayout(l)}
                className={`flex flex-col gap-3 rounded-xl border-2 p-3 text-right transition-colors sm:p-4 ${on ? "border-brand bg-brand-soft/40" : "border-line hover:border-subtle"}`}
              >
                <LayoutSketch layout={l} on={on} />
                <span className="flex items-center gap-2 text-sm font-black">
                  <span className={`grid size-4 place-items-center rounded-full border-2 ${on ? "border-brand" : "border-subtle"}`}>{on && <span className="size-2 rounded-full bg-brand" />}</span>
                  {LAYOUT_INFO[l].label}
                </span>
                <span className="text-xs leading-5 text-muted">{LAYOUT_INFO[l].description}</span>
              </button>
            );
          })}
        </div>
        {layout === "slider" && (
          <label className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="font-bold">عوض شدن خودکار اسلایدها:</span>
            <select value={autoplay} disabled={pending} onChange={(e) => chooseLayout("slider", Number(e.target.value))} className="input w-auto py-2">
              {AUTOPLAY_CHOICES.map((s) => (
                <option key={s} value={s}>
                  {s === 0 ? "خاموش (فقط با ورق زدن)" : `هر ${faDigits(s)} ثانیه`}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {/* 2. Preview */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black">۲. پیش‌نمایش</h2>
            <p className="text-xs text-muted">دقیقاً همان چیزی که مشتری در بالای صفحه اصلی می‌بیند.</p>
          </div>
          <div className="flex gap-1 rounded-xl bg-canvas p-1" role="tablist" aria-label="نوع دستگاه">
            {(
              [
                ["desktop", "کامپیوتر", Monitor],
                ["mobile", "موبایل", Smartphone],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={device === key}
                onClick={() => setDevice(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold ${device === key ? "bg-white shadow-sm" : "text-muted"}`}
              >
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-canvas p-3 md:p-5">
          <div className={device === "mobile" ? "mx-auto w-[360px] max-w-full rounded-[28px] border-[6px] border-ink bg-canvas p-3" : "w-full"}>
            {shown.length > 0 ? (
              <HeroBanners key={`${layout}-${device}`} layout={layout} banners={shown} autoplay={autoplay} priority={false} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">هیچ بنر فعالی نیست؛ بخش بنرها در سایت نمایش داده نمی‌شود.</p>
            )}
          </div>
        </div>
        {!info.repeat && active.length < capacity && active.length > 0 && (
          <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs leading-6 text-warning">
            این چیدمان {faDigits(capacity)} جای بنر دارد و فعلاً {faDigits(active.length)} بنر فعال دارید؛
            {active.length === 1 ? " تا وقتی بنر دیگری اضافه نشود، همین یک بنر تمام‌عرض نمایش داده می‌شود." : ` برای کامل شدن، ${faDigits(capacity - active.length)} بنر دیگر اضافه کنید.`}
          </p>
        )}
        {info.repeat && active.length === 1 && <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">برای ورق خوردن اسلایدر، حداقل دو بنر فعال لازم است.</p>}
      </section>

      {/* 3. Banners */}
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div>
            <h2 className="text-base font-black">۳. بنرها ({faDigits(banners.length)})</h2>
            <p className="text-xs text-muted">ترتیب بنرها جای هر کدام را در چیدمان تعیین می‌کند؛ با فلش‌ها جابه‌جا کنید.</p>
          </div>
          <button type="button" onClick={() => setEditing("new")} disabled={banners.length >= MAX_BANNERS} className="btn-primary py-2.5">
            <ImagePlus className="size-4" /> افزودن بنر
          </button>
        </div>
        {banners.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted">هنوز بنری ندارید. با «افزودن بنر» اولین بنر را بسازید.</p>
        ) : (
          <ol className="divide-y divide-line">
            {banners.map((b, i) => {
              const activeIndex = active.findIndex((a) => a.id === b.id);
              const slot = b.isActive ? slotFor(layout, activeIndex) : null;
              return (
                <li key={b.id} className={`flex flex-wrap items-center gap-3 p-4 md:flex-nowrap ${b.isActive ? "" : "bg-canvas/60"}`}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-xs font-black text-muted">{faDigits(i + 1)}</span>
                  <div className={`relative aspect-[16/9] w-32 shrink-0 overflow-hidden rounded-lg bg-surface ${b.isActive ? "" : "opacity-50 grayscale"}`}>
                    <Image src={b.image} alt="" fill sizes="128px" className="object-cover" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-sm font-bold">{b.title || <span className="text-muted">(بدون عنوان)</span>}</span>
                    <span className="flex flex-wrap items-center gap-2 text-[11px]">
                      {!b.isActive ? (
                        <span className="rounded bg-surface px-2 py-0.5 font-bold text-muted">غیرفعال</span>
                      ) : slot ? (
                        <span className="rounded bg-success-soft px-2 py-0.5 font-bold text-success">جایگاه: {slot.name}</span>
                      ) : (
                        <span className="rounded bg-warning-soft px-2 py-0.5 font-bold text-warning">در این چیدمان جا نمی‌شود</span>
                      )}
                      {!b.showText && <span className="rounded bg-surface px-2 py-0.5 text-muted">متن داخل عکس</span>}
                      {b.mobileImage && <span className="rounded bg-info-soft px-2 py-0.5 text-info">تصویر موبایل دارد</span>}
                      {b.href && (
                        <span className="flex min-w-0 items-center gap-1 text-muted" dir="ltr">
                          <Link2 className="size-3 shrink-0" /> <span className="truncate">{decodeURIComponent(b.href)}</span>
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton label="بالاتر" disabled={pending || i === 0} onClick={() => run(() => moveBanner(b.id, -1))}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton label="پایین‌تر" disabled={pending || i === banners.length - 1} onClick={() => run(() => moveBanner(b.id, 1))}>
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label={b.isActive ? "مخفی کردن" : "نمایش در سایت"} disabled={pending} onClick={() => run(() => toggleBanner(b.id), b.isActive ? "بنر مخفی شد." : "بنر در سایت نمایش داده می‌شود.")}>
                      {b.isActive ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </IconButton>
                    <IconButton label="ویرایش" disabled={pending} onClick={() => setEditing(b)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton
                      label="حذف"
                      danger
                      disabled={pending}
                      onClick={() => confirm(`بنر «${b.title || faDigits(i + 1)}» برای همیشه حذف شود؟`) && run(() => deleteBanner(b.id), "بنر حذف شد.")}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing === "new" ? "افزودن بنر" : "ویرایش بنر"}
        description={editingNote}
      >
        {editing !== null && (
          <BannerForm
            key={editing === "new" ? "new" : editing.id}
            banner={editing === "new" ? null : editing}
            hint={editingSlot}
            variant={editingSmall ? "small" : "large"}
            links={links}
            onDone={(message) => {
              setEditing(null);
              toast(message);
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-9 place-items-center rounded-lg border border-line text-muted transition-colors disabled:opacity-40 ${danger ? "hover:border-brand hover:bg-brand-soft hover:text-brand" : "hover:bg-canvas hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
