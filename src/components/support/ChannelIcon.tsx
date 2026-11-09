import { MessageCircleMore, Navigation, Phone } from "lucide-react";
import { BaleLogo, InstagramLogo, Rubika, TelegramLogo, WhatsApp } from "@/components/icons/Social";

export type Channel = "phone" | "chat" | "instagram" | "telegram" | "whatsapp" | "bale" | "rubika" | "route";

const InstagramCircle = ({ className }: { className?: string }) => <InstagramLogo round className={className} />;

type Look = { Icon: React.ComponentType<{ className?: string }> } & (
  | { kind: "glyph"; bg: string } // white glyph on a coloured circle
  | { kind: "mark"; bg: string } // multicoloured mark on a circle, a size larger than the glyphs
  | { kind: "logo" } // the brand's own round logo fills the circle
);

// Each channel in its real brand look, so customers recognise it at a glance.
const STYLE: Record<Channel, Look> = {
  phone: { kind: "glyph", bg: "bg-success", Icon: Phone },
  chat: { kind: "glyph", bg: "bg-brand", Icon: MessageCircleMore },
  instagram: { kind: "logo", Icon: InstagramCircle },
  telegram: { kind: "logo", Icon: TelegramLogo },
  whatsapp: { kind: "glyph", bg: "bg-[#25D366]", Icon: WhatsApp },
  bale: { kind: "logo", Icon: BaleLogo },
  rubika: { kind: "mark", bg: "bg-white ring-1 ring-inset ring-line", Icon: Rubika },
  route: { kind: "glyph", bg: "bg-[#2563EB]", Icon: Navigation },
};

/** A channel's icon in a circle: its round logo, or its glyph on its brand colour. */
export function ChannelIcon({ channel, size = "md" }: { channel: Channel; size?: "sm" | "md" | "lg" }) {
  const look = STYLE[channel];
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  if (look.kind === "logo") {
    return (
      <span className={`grid shrink-0 place-items-center rounded-full shadow-sm ${box}`} aria-hidden>
        <look.Icon className="size-full" />
      </span>
    );
  }
  const icon =
    look.kind === "mark" ? (size === "sm" ? "size-5" : size === "lg" ? "size-8" : "size-6") : size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-white shadow-sm ${look.bg} ${box}`} aria-hidden>
      <look.Icon className={icon} />
    </span>
  );
}
