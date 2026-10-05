"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Eye, LoaderCircle, MapPin, Save } from "lucide-react";
import { saveShippingSettings } from "@/app/actions/admin/shipping";
import { toast } from "@/components/ui/Toaster";
import { SHIPPING_ICONS } from "@/components/checkout/shipping-icons";
import { faDigits, toman } from "@/lib/format";
import { METHOD_INFO, quoteShipping, type PricingMode, type ShippingConfig, type ShippingOption } from "@/lib/shipping-shared";
import type { ShippingMethod } from "@/generated/prisma/client";

const FA = "۰۱۲۳۴۵۶۷۸۹";
const AR = "٠١٢٣٤٥٦٧٨٩";
/** "۴۵,۰۰۰" → 45000; null when empty or not a whole number. */
function toNumber(v: string): number | null {
  const en = v.replace(/[۰-۹٠-٩]/g, (d) => String(FA.includes(d) ? FA.indexOf(d) : AR.indexOf(d))).replace(/[,٬\s]/g, "");
  return /^\d+$/.test(en) ? Number(en) : null;
}
const asText = (n: number | null) => (n ? String(n) : "");

const PRICING: { key: PricingMode; label: string; hint: string }[] = [
  { key: "fixed", label: "هزینه ثابت", hint: "مبلغی که مشتری هنگام خرید پرداخت می‌کند" },
  { key: "collect", label: "پس‌کرایه", hint: "مشتری کرایه را هنگام تحویل به شرکت حمل می‌دهد" },
  { key: "free", label: "رایگان", hint: "هزینه ارسال با فروشگاه است" },
];

type Draft = Omit<ShippingOption, "price" | "freeOver"> & { price: string; freeOn: boolean; freeOver: string };

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-label={label} />
      <span aria-hidden className="relative h-6 w-11 shrink-0 rounded-full bg-subtle/60 transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40" />
      <span className={checked ? "text-success" : "text-muted"}>{checked ? "فعال" : "غیرفعال"}</span>
    </label>
  );
}

/** Edits all shipping methods at once; the preview shows exactly what customers see at checkout. */
export function ShippingSettingsForm({ initial }: { initial: ShippingConfig }) {
  const [order, setOrder] = useState<ShippingMethod[]>(initial.order);
  const [drafts, setDrafts] = useState<Record<ShippingMethod, Draft>>(
    () =>
      Object.fromEntries(
        initial.order.map((k) => {
          const m = initial.methods[k];
          return [k, { ...m, price: asText(m.price), freeOn: m.freeOver !== null, freeOver: asText(m.freeOver) }];
        }),
      ) as Record<ShippingMethod, Draft>,
  );
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [sample, setSample] = useState("1000000");

  const patch = (k: ShippingMethod, p: Partial<Draft>) => {
    setDrafts((d) => ({ ...d, [k]: { ...d[k], ...p } }));
    setDirty(true);
  };
  const move = (k: ShippingMethod, dir: -1 | 1) => {
    setOrder((o) => {
      const i = o.indexOf(k);
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const next = [...o];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setDirty(true);
  };

  /** Draft → the saved shape; `null` fields mean the text could not be read as a number. */
  const toOption = (d: Draft): ShippingOption & { bad?: string } => {
    const price = toNumber(d.price);
    const freeOver = d.freeOn ? toNumber(d.freeOver) : null;
    return {
      enabled: d.enabled,
      title: d.title,
      description: d.description,
      pricing: d.pricing,
      price: d.pricing === "fixed" ? (price ?? 0) : 0,
      freeOver: d.pricing === "fixed" && d.freeOn ? freeOver : null,
      tehranOnly: d.tehranOnly,
      bad:
        d.pricing === "fixed" && !price
          ? `مبلغ «${d.title || "روش ارسال"}» را به عدد وارد کنید.`
          : d.pricing === "fixed" && d.freeOn && !freeOver
            ? `مبلغ «ارسال رایگان بالای…» برای «${d.title}» را به عدد وارد کنید.`
            : undefined,
    };
  };

  const save = () => {
    setError(null);
    const methods = Object.fromEntries(order.map((k) => [k, toOption(drafts[k])])) as Record<ShippingMethod, ShippingOption & { bad?: string }>;
    const bad = order.map((k) => methods[k].bad).find(Boolean);
    if (bad) return setError(bad);
    for (const k of order) delete methods[k].bad;
    start(async () => {
      const res = await saveShippingSettings({ order, methods });
      if (res.ok) {
        toast(res.message);
        setDirty(false);
      } else setError(res.message);
    });
  };

  const sampleAmount = toNumber(sample) ?? 0;
  const enabledCount = order.filter((k) => drafts[k].enabled).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {order.map((k, i) => {
          const d = drafts[k];
          const Icon = SHIPPING_ICONS[k];
          return (
            <section key={k} className={`card flex flex-col gap-4 p-5 transition-opacity ${d.enabled ? "" : "opacity-70"}`} aria-label={METHOD_INFO[k].label}>
              <header className="flex flex-wrap items-center gap-3">
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${d.enabled ? "bg-brand-soft text-brand" : "bg-surface text-muted"}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <b className="text-sm font-black">{METHOD_INFO[k].label}</b>
                  <span className="text-[11px] text-muted">{METHOD_INFO[k].note}</span>
                </span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => move(k, -1)} disabled={i === 0} aria-label="بالاتر" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface disabled:opacity-30">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" onClick={() => move(k, 1)} disabled={i === order.length - 1} aria-label="پایین‌تر" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface disabled:opacity-30">
                    <ArrowDown className="size-4" />
                  </button>
                </span>
                <Switch checked={d.enabled} onChange={(v) => patch(k, { enabled: v })} label={`فعال بودن ${METHOD_INFO[k].label}`} />
              </header>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor={`${k}-title`} className="label">عنوانی که مشتری می‌بیند</label>
                  <input id={`${k}-title`} value={d.title} onChange={(e) => patch(k, { title: e.target.value })} maxLength={60} className="input" />
                </div>
                <div>
                  <label htmlFor={`${k}-desc`} className="label">توضیح کوتاه (زمان تحویل، شرایط…)</label>
                  <input id={`${k}-desc`} value={d.description} onChange={(e) => patch(k, { description: e.target.value })} maxLength={200} className="input" />
                </div>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="label">هزینه ارسال</legend>
                <div className="grid grid-cols-3 gap-2" role="radiogroup">
                  {PRICING.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      role="radio"
                      aria-checked={d.pricing === p.key}
                      onClick={() => patch(k, { pricing: p.key })}
                      title={p.hint}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-extrabold transition-colors ${d.pricing === p.key ? "border-brand bg-brand-soft text-brand" : "border-line bg-white text-muted hover:text-ink"}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted">{PRICING.find((p) => p.key === d.pricing)?.hint}</p>
              </fieldset>

              {d.pricing === "fixed" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label htmlFor={`${k}-price`} className="label">مبلغ (تومان)</label>
                    <input id={`${k}-price`} value={d.price} onChange={(e) => patch(k, { price: e.target.value })} inputMode="numeric" dir="ltr" placeholder="45000" className="input" />
                    {toNumber(d.price) ? <p className="mt-1 text-[11px] text-muted">{toman(toNumber(d.price)!)} تومان</p> : null}
                  </div>
                  <div>
                    <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                      <input type="checkbox" checked={d.freeOn} onChange={(e) => patch(k, { freeOn: e.target.checked })} className="size-4 accent-brand" />
                      ارسال رایگان برای خریدهای بالای:
                    </label>
                    <input
                      value={d.freeOver}
                      onChange={(e) => patch(k, { freeOver: e.target.value, freeOn: true })}
                      disabled={!d.freeOn}
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="2000000"
                      aria-label="حداقل مبلغ خرید برای ارسال رایگان (تومان)"
                      className="input mt-1.5 disabled:opacity-50"
                    />
                    {d.freeOn && toNumber(d.freeOver) ? <p className="mt-1 text-[11px] text-success">خرید {toman(toNumber(d.freeOver)!)} تومان و بیشتر: ارسال رایگان</p> : null}
                  </div>
                </div>
              )}

              {k !== "PICKUP" && (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-bold">
                  <input type="checkbox" checked={d.tehranOnly} onChange={(e) => patch(k, { tehranOnly: e.target.checked })} className="size-4 accent-brand" />
                  <MapPin className="size-3.5 text-muted" aria-hidden /> فقط برای آدرس‌های استان تهران
                </label>
              )}
            </section>
          );
        })}
      </div>

      <aside className="flex h-fit flex-col gap-4 xl:sticky xl:top-4">
        <section className="card flex flex-col gap-3 p-5" aria-labelledby="preview">
          <h2 id="preview" className="flex items-center gap-2 text-sm font-black">
            <Eye className="size-4 text-muted" aria-hidden /> پیش‌نمایش برای مشتری
          </h2>
          <label className="flex items-center gap-2 text-[11px] text-muted">
            اگر مبلغ خرید
            <input value={sample} onChange={(e) => setSample(e.target.value)} inputMode="numeric" dir="ltr" className="input h-8 w-28 px-2 py-1 text-xs" aria-label="مبلغ خرید نمونه" />
            تومان باشد:
          </label>
          {order
            .filter((k) => drafts[k].enabled)
            .map((k) => {
              const o = toOption(drafts[k]);
              const q = quoteShipping(o, sampleAmount);
              const Icon = SHIPPING_ICONS[k];
              return (
                <div key={k} className="flex items-center gap-3 rounded-xl border border-line p-3">
                  <Icon className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-xs font-extrabold">{o.title || "—"}</span>
                    <span className="truncate text-[10px] text-muted">{o.tehranOnly ? "فقط تهران · " : ""}{o.description}</span>
                  </span>
                  <span className="shrink-0 text-xs font-black">
                    {q.collect ? "پس‌کرایه" : q.cost === 0 ? <span className="text-success">رایگان</span> : `${toman(q.cost)} ت`}
                  </span>
                </div>
              );
            })}
          {enabledCount === 0 && <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand">حداقل یک روش ارسال را فعال کنید.</p>}
          <p className="text-[11px] text-muted">{faDigits(enabledCount)} روش فعال · ترتیب بالا همان ترتیب صفحه پرداخت است.</p>
        </section>

        <div className="card flex flex-col gap-3 p-4">
          {error && <p className="rounded-lg bg-brand-soft p-3 text-xs font-bold text-brand" role="alert">{error}</p>}
          <button type="button" onClick={save} disabled={pending || !dirty} className="btn-primary w-full py-3">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره روش‌های ارسال
          </button>
          {dirty && !pending && <p className="text-center text-[11px] font-bold text-warning">تغییرات هنوز ذخیره نشده است.</p>}
        </div>
      </aside>

      {/* Phones: the save button floats once something has changed, so it isn't a long scroll away. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.2)] backdrop-blur xl:hidden">
          {error && <p className="mb-2 rounded-lg bg-brand-soft p-2 text-xs font-bold text-brand">{error}</p>}
          <button type="button" onClick={save} disabled={pending} className="btn-primary w-full py-3">
            {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />} ذخیره تغییرات
          </button>
        </div>
      )}
    </div>
  );
}
