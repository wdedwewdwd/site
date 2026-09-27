import { ChevronLeft } from "lucide-react";
import { faDigits } from "@/lib/format";
import type { ContactInfo } from "@/lib/contact-shared";
import { ChannelIcon, type Channel } from "./ChannelIcon";

/** The contact details the support menu needs (all public). */
export type SupportContact = Pick<ContactInfo, "phone" | "phoneDisplay" | "hours" | "instagram" | "instagramUrl" | "whatsappUrl" | "whatsappDisplay">;

type Row = { channel: Channel; title: string; sub: React.ReactNode; href?: string; external?: boolean; onClick?: () => void; badge?: number };

/**
 * Ways to reach support, in the shop's order of preference: phone, live chat, Instagram, WhatsApp.
 * Channels without a link in the admin panel are left out.
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
  const rows: Row[] = [
    { channel: "phone", title: "تماس تلفنی", sub: <span dir="ltr">{contact.phoneDisplay}</span>, href: `tel:${contact.phone}` },
    {
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
    ...(contact.instagramUrl ? [{ channel: "instagram" as const, title: "اینستاگرام", sub: <span dir="ltr">@{contact.instagram}</span>, href: contact.instagramUrl, external: true }] : []),
    ...(contact.whatsappUrl ? [{ channel: "whatsapp" as const, title: "واتساپ", sub: "پیام در واتساپ", href: contact.whatsappUrl, external: true }] : []),
  ];

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
