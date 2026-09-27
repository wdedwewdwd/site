"use client";

import { useActionState, useState } from "react";
import { CircleCheck, CircleAlert, Clock, ExternalLink, LoaderCircle, Mail, MapPin, Phone, Smartphone } from "lucide-react";
import { saveContact } from "@/app/actions/admin/contact";
import type { AdminFormState } from "@/app/actions/admin/misc";
import {
  CONTACT_DEFAULTS,
  SUPPORT_CHANNELS,
  formatPhone,
  parseChannels,
  instagramUrl,
  parseInstagram,
  parsePhone,
  parseTelegram,
  parseWhatsapp,
  resolveContact,
  telegramUrl,
  whatsappUrl,
  type ContactKey,
  type SupportChannel,
} from "@/lib/contact-shared";
import { SupportChannels } from "@/components/support/SupportChannels";
import { ChannelIcon, type Channel } from "@/components/support/ChannelIcon";

type Values = Record<ContactKey, string>;

const CHANNEL_TITLE: Record<SupportChannel, string> = {
  phone: "تماس تلفنی",
  chat: "گفتگوی آنلاین",
  whatsapp: "واتساپ",
  telegram: "تلگرام",
  instagram: "اینستاگرام",
};

/** On/off switches for the options of the floating support menu, with what each one needs to appear. */
function SupportMenuSwitches({ value, onChange, available }: { value: string; onChange: (v: string) => void; available: Record<SupportChannel, boolean> }) {
  const on = new Set(value.split(","));
  const toggle = (c: SupportChannel) => {
    const next = new Set(on);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    const parsed = parseChannels([...next].join(","));
    if (parsed) onChange(parsed); // the last option can't be switched off
  };
  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {SUPPORT_CHANNELS.map((c) => {
        const enabled = on.has(c);
        const last = enabled && on.size === 1;
        const status = !enabled
          ? { cls: "text-muted", text: "خاموش؛ در منو نمایش داده نمی‌شود" }
          : available[c]
            ? { cls: "text-success", text: "در منو نمایش داده می‌شود" }
            : { cls: "text-warning", text: `روشن است، ولی تا ${c === "whatsapp" ? "شماره" : "آیدی"} ${CHANNEL_TITLE[c]} را در بخش بالا وارد نکنید، نمایش داده نمی‌شود` };
        return (
          <li key={c} className="flex items-center gap-3 px-4 py-3">
            <span className={enabled ? "" : "opacity-40 grayscale transition"}>
              <ChannelIcon channel={c} size="sm" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-bold">{CHANNEL_TITLE[c]}</span>
              <span className={`text-[11px] leading-5 ${status.cls}`}>{status.text}</span>
            </span>
            <label className={`relative shrink-0 ${last ? "cursor-not-allowed" : "cursor-pointer"}`} title={last ? "حداقل یک گزینه باید روشن بماند" : undefined}>
              <input type="checkbox" role="switch" checked={enabled} disabled={last} onChange={() => toggle(c)} className="peer sr-only" aria-label={`نمایش «${CHANNEL_TITLE[c]}» در منوی پشتیبانی`} />
              <span aria-hidden className="block h-6 w-11 rounded-full bg-line transition-colors after:absolute after:top-0.5 after:right-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-success peer-checked:after:-translate-x-5 peer-disabled:opacity-60 peer-focus-visible:outline-2 peer-focus-visible:outline-brand" />
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/** What the site will actually use for a field, for the ✓ / ⚠ line under it. */
function check(key: ContactKey, v: string): { ok: boolean; text: string; url?: string } | null {
  const value = v.trim();
  if (!value) return null;
  switch (key) {
    case "contact_phone":
    case "contact_mobile": {
      const p = parsePhone(value);
      return p ? { ok: true, text: `نمایش در سایت: ${formatPhone(p)}`, url: `tel:${p}` } : { ok: false, text: "شماره ۱۱ رقمی با ۰ شروع شود (مثلاً ۰۲۱۳۳۹۴۷۲۷۰)" };
    }
    case "social_instagram": {
      const u = parseInstagram(value);
      return u ? { ok: true, text: `instagram.com/${u}`, url: instagramUrl(u) } : { ok: false, text: "آیدی (مثلاً arizonyadak@) یا لینک صفحه اینستاگرام را وارد کنید" };
    }
    case "social_telegram": {
      const u = parseTelegram(value);
      return u ? { ok: true, text: `t.me/${u}`, url: telegramUrl(u) } : { ok: false, text: "آیدی (مثلاً arizonyadak@) یا لینک t.me را وارد کنید" };
    }
    case "social_whatsapp": {
      const n = parseWhatsapp(value);
      return n ? { ok: true, text: `wa.me/${n}`, url: whatsappUrl(n) } : { ok: false, text: "شماره موبایل واتساپ (مثلاً ۰۹۱۲۲۰۵۴۸۳۹) یا لینک wa.me را وارد کنید" };
    }
    default:
      return null;
  }
}

export function ContactForm({ initial }: { initial: Values }) {
  const [v, setV] = useState<Values>(initial);
  const [state, action, pending] = useActionState<AdminFormState, FormData>(saveContact, null);
  const contact = resolveContact(v);

  const field = (key: ContactKey, label: string, opts: { icon?: React.ReactNode; placeholder?: string; ltr?: boolean; hint?: string; required?: boolean; textarea?: boolean } = {}) => {
    const c = check(key, v[key]);
    const common = {
      id: key,
      name: key,
      value: v[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV((s) => ({ ...s, [key]: e.target.value })),
      placeholder: opts.placeholder,
      dir: opts.ltr ? "ltr" : undefined,
      className: `input py-2.5 ${opts.icon ? "pr-12" : ""} ${opts.ltr ? "text-left" : ""}`,
    };
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={key} className="text-xs font-bold">
          {label} {opts.required && <span className="text-brand">*</span>}
        </label>
        <div className="relative">
          {opts.icon && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">{opts.icon}</span>}
          {opts.textarea ? <textarea {...common} rows={2} maxLength={200} className={`${common.className} resize-none`} /> : <input {...common} maxLength={300} />}
        </div>
        {c ? (
          <span className={`flex flex-wrap items-center gap-1.5 text-[11px] ${c.ok ? "text-success" : "text-brand"}`}>
            {c.ok ? <CircleCheck className="size-3.5" /> : <CircleAlert className="size-3.5" />}
            <span dir={c.ok && key.startsWith("social") ? "ltr" : undefined}>{c.text}</span>
            {c.ok && c.url && (
              <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 font-bold text-info hover:underline">
                آزمایش <ExternalLink className="size-3" />
              </a>
            )}
          </span>
        ) : (
          opts.hint && <span className="text-[11px] text-muted">{opts.hint}</span>
        )}
      </div>
    );
  };

  const brand = (c: Channel) => <ChannelIcon channel={c} size="sm" />;
  const plain = (Icon: typeof Phone) => (
    <span className="grid size-8 place-items-center rounded-full bg-canvas text-muted">
      <Icon className="size-4" />
    </span>
  );

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-black">شماره‌های تماس</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {field("contact_phone", "تلفن پشتیبانی (دکمه «تماس تلفنی»)", { icon: brand("phone"), placeholder: "۰۲۱۳۳۹۴۷۲۷۰", ltr: true, required: true })}
            {field("contact_mobile", "موبایل پشتیبانی", { icon: plain(Smartphone), placeholder: "۰۹۱۲۲۰۵۴۸۳۹", ltr: true, hint: "خالی بگذارید تا در سایت نمایش داده نشود." })}
            {field("contact_hours", "ساعات پاسخگویی", { icon: plain(Clock), placeholder: "مثلاً: شنبه تا پنجشنبه ۹ تا ۱۸", required: true })}
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <h2 className="text-base font-black">شبکه‌های اجتماعی</h2>
          <p className="-mt-2 text-xs leading-6 text-muted">آیدی را با @ یا لینک کامل صفحه را کپی کنید؛ هر کدام خالی باشد، در سایت نمایش داده نمی‌شود.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {field("social_whatsapp", "واتساپ", { icon: brand("whatsapp"), placeholder: "09122054839", ltr: true, hint: "شماره موبایلی که واتساپ روی آن فعال است" })}
            {field("social_telegram", "تلگرام", { icon: brand("telegram"), placeholder: "@arizonyadak", ltr: true, hint: "در منوی پشتیبانی، فوتر و صفحه تماس با ما" })}
            {field("social_instagram", "اینستاگرام", { icon: brand("instagram"), placeholder: "@arizonyadak", ltr: true, hint: "در منوی پشتیبانی، فوتر و صفحه تماس با ما" })}
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-black">گزینه‌های منوی «پشتیبانی»</h2>
            <p className="mt-1 text-xs leading-6 text-muted">
              انتخاب کنید کدام راه‌های ارتباطی در منوی دکمه قرمز «پشتیبانی» (پایین همه صفحات سایت) نمایش داده شوند. گزینه‌ها به همین ترتیب در منو می‌آیند.
            </p>
          </div>
          <input type="hidden" name="support_channels" value={v.support_channels} />
          <SupportMenuSwitches
            value={v.support_channels}
            onChange={(next) => setV((s) => ({ ...s, support_channels: next }))}
            available={{ phone: true, chat: true, whatsapp: !!contact.whatsappUrl, telegram: !!contact.telegramUrl, instagram: !!contact.instagramUrl }}
          />
        </section>

        <section className="card flex flex-col gap-4 p-5">
          <div>
            <h2 className="text-base font-black">نشانی و ایمیل</h2>
            <p className="text-xs leading-6 text-warning">این اطلاعات باید دقیقاً با اطلاعات ثبت‌شده در اینماد یکی باشد.</p>
          </div>
          {field("contact_address", "نشانی فروشگاه", { icon: plain(MapPin), required: true, textarea: true })}
          <div className="grid gap-4 md:grid-cols-2">
            {field("contact_postal", "کد پستی", { placeholder: "۱۰ رقم", ltr: true, hint: "خالی بگذارید تا نمایش داده نشود." })}
            {field("contact_email", "ایمیل", { icon: plain(Mail), placeholder: "info@example.com", ltr: true, hint: "خالی بگذارید تا نمایش داده نشود." })}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className="btn-primary">
            {pending && <LoaderCircle className="size-4 animate-spin" />}
            ذخیره اطلاعات تماس
          </button>
          <button type="button" onClick={() => setV(initial)} disabled={pending} className="btn-ghost">
            برگرداندن تغییرات
          </button>
          {state && <p className={`text-xs font-bold ${state.ok ? "text-success" : "text-brand"}`} role="status">{state.ok ? state.message : state.error}</p>}
        </div>
      </div>

      {/* Live preview of the floating support menu */}
      <aside className="flex flex-col gap-2 xl:sticky xl:top-6 xl:self-start">
        <span className="text-xs font-bold text-muted">پیش‌نمایش منوی «پشتیبانی» در سایت</span>
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
          <div className="bg-night px-4 py-3.5 text-white">
            <span className="block text-sm font-black">پشتیبانی آریزون یدک</span>
            <span className="text-[11px] text-white/70">از چه راهی با ما در ارتباط باشید؟</span>
          </div>
          <div className="pointer-events-none" aria-hidden>
            <SupportChannels contact={contact} onChat={() => undefined} online={null} />
          </div>
          <p className="flex items-center gap-1.5 border-t border-line px-4 py-2.5 text-[11px] text-muted">
            <Clock className="size-3.5 shrink-0" /> ساعات پاسخگویی: {contact.hours}
          </p>
        </div>
        <p className="text-[11px] leading-5 text-muted">
          فقط گزینه‌هایی که در «گزینه‌های منوی پشتیبانی» روشن هستند نمایش داده می‌شوند؛ واتساپ، تلگرام و اینستاگرام علاوه بر روشن بودن، شماره یا آیدی هم لازم دارند. پیش‌فرض تلفن: {formatPhone(CONTACT_DEFAULTS.contact_phone)}
        </p>
      </aside>
    </form>
  );
}
