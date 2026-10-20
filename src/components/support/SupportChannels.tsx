import { ChevronLeft } from "lucide-react";
import { faDigits } from "@/lib/format";
import type { ContactInfo, SupportChannel } from "@/lib/contact-shared";
import { ChannelIcon, type Channel } from "./ChannelIcon";

/** The contact details the support menu needs (all public). */
export type SupportContact = Pick<
  ContactInfo,
  | "phone"
  | "phoneDisplay"
  | "hours"
  | "instagram"
  | "instagramUrl"
  | "telegram"
  | "telegramUrl"
  | "whatsappUrl"
  | "whatsappDisplay"
  | "bale"
  | "baleUrl"
  | "rubika"
  | "rubikaUrl"
  | "neshanUrl"
  | "googleMapsUrl"
  | "address"
  | "supportChannels"
>;

type Row = {
  channel: Channel;
  title: string;
  sub: React.ReactNode;
  href?: string;
  external?: boolean;
  onClick?: () => void;
  badge?: number;
  /** Several direct actions on one row (directions: Neshan / Google Maps). */
  links?: { label: string; href: string }[];
};

/**
 * Ways to reach support: phone, live chat, WhatsApp, Telegram, Bale, Rubika, Instagram and directions to the shop —
 * the ones switched on in the admin panel ("اطلاعات تماس و شبکه‌ها"). An option without its ID/number/link is left out.
 */
export function SupportChannels({
  contact,
  onChat,
  onPick,
  unread = 0,
  online = null,
}: {
  contact: SupportContact;
  onChat: () => void;
  /** Called after any choice (e.g. to close the menu). */
  onPick?: () => void;
  unread?: number;
  online?: boolean | null;
}) {
  const all: Record<SupportChannel, Row | null> = {
    phone: { channel: "phone", title: "تماس تلفنی", sub: <span dir="ltr">{contact.phoneDisplay}</span>, href: `tel:${contact.phone}` },
    chat: {
      channel: "chat",
      title: "گفتگوی آنلاین",
      sub:
        online === true ? (
          <span className="flex items-center gap-1.5 text-success">
            <span className="size-1.5 rounded-full bg-success" aria-hidden /> کارشناس آنلاین است
          </span>
        ) : (
          "پیام بدهید، سریع پاسخ می‌دهیم"
        ),
      onClick: onChat,
      badge: unread,
    },
    whatsapp: contact.whatsappUrl
      ? { channel: "whatsapp", title: "واتساپ", sub: <span dir="ltr">{contact.whatsappDisplay}</span>, href: contact.whatsappUrl, external: true }
      : null,
    telegram: contact.telegramUrl
      ? { channel: "telegram", title: "تلگرام", sub: <span dir="ltr">@{contact.telegram}</span>, href: contact.telegramUrl, external: true }
      : null,
    bale: contact.baleUrl ? { channel: "bale", title: "بله", sub: <span dir="ltr">@{contact.bale}</span>, href: contact.baleUrl, external: true } : null,
    rubika: contact.rubikaUrl
      ? { channel: "rubika", title: "روبیکا", sub: <span dir="ltr">@{contact.rubika}</span>, href: contact.rubikaUrl, external: true }
      : null,
    instagram: contact.instagramUrl
      ? { channel: "instagram", title: "اینستاگرام", sub: <span dir="ltr">@{contact.instagram}</span>, href: contact.instagramUrl, external: true }
      : null,
    route:
      contact.neshanUrl || contact.googleMapsUrl
        ? {
            channel: "route",
            title: "مسیریابی",
            sub: contact.address,
            links: [
              ...(contact.neshanUrl ? [{ label: "نشان", href: contact.neshanUrl }] : []),
              ...(contact.googleMapsUrl ? [{ label: "گوگل مپ", href: contact.googleMapsUrl }] : []),
            ],
          }
        : null,
  };
  const rows = contact.supportChannels.map((c) => all[c]).filter((r): r is Row => r !== null);

  return (
    <ul className="flex flex-col gap-0.5 p-2">
      {rows.map((r) => {
        const inner = (
          <>
            <ChannelIcon channel={r.channel} />
            <span className="flex min-w-0 flex-1 flex-col text-right">
              <span className="text-sm font-extrabold text-ink">{r.title}</span>
              <span className="truncate text-xs text-muted">{r.sub}</span>
            </span>
            {!!r.badge && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-black text-white">{faDigits(r.badge)}</span>}
            <ChevronLeft className="size-4 shrink-0 text-subtle transition-transform group-hover:-translate-x-0.5" aria-hidden />
          </>
        );
        const cls = "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-canvas focus-visible:bg-canvas";
        if (r.links)
          return (
            <li key={r.channel} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <ChannelIcon channel={r.channel} />
              <span className="flex min-w-0 flex-1 flex-col text-right">
                <span className="text-sm font-extrabold text-ink">{r.title}</span>
                <span className="truncate text-xs text-muted">{r.sub}</span>
              </span>
              <span className="flex shrink-0 gap-1.5">
                {r.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onPick}
                    className="rounded-lg bg-info-soft px-2.5 py-1.5 text-[11px] font-extrabold text-info transition-colors hover:bg-info hover:text-white"
                  >
                    {l.label}
                  </a>
                ))}
              </span>
            </li>
          );
        return (
          <li key={r.channel}>
            {r.href ? (
              <a href={r.href} onClick={onPick} className={cls} {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {inner}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onPick?.();
                  r.onClick?.();
                }}
                className={cls}
              >
                {inner}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
