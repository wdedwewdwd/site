import { MessageCircleMore, Navigation, Phone } from "lucide-react";
import { Bale, Instagram, Rubika, Telegram, WhatsApp } from "@/components/icons/Social";

export type Channel = "phone" | "chat" | "instagram" | "telegram" | "whatsapp" | "bale" | "rubika" | "route";

// Each channel in its familiar brand colour, so customers recognise it at a glance.
const STYLE: Record<Channel, { bg: string; Icon: React.ComponentType<{ className?: string }> }> = {
  phone: { bg: "bg-success", Icon: Phone },
  chat: { bg: "bg-brand", Icon: MessageCircleMore },
  instagram: { bg: "bg-[linear-gradient(45deg,#f9ce34_0%,#ee2a7b_50%,#6228d7_100%)]", Icon: Instagram },
  telegram: { bg: "bg-[#229ED9]", Icon: Telegram },
  whatsapp: { bg: "bg-[#25D366]", Icon: WhatsApp },
  bale: { bg: "bg-[#1FB5A7]", Icon: Bale },
  rubika: { bg: "bg-[linear-gradient(135deg,#ff2d55_0%,#ff9500_35%,#34c759_65%,#007aff_100%)]", Icon: Rubika },
  route: { bg: "bg-[#2563EB]", Icon: Navigation },
};

/** White channel glyph on its brand-coloured circle. */
export function ChannelIcon({ channel, size = "md" }: { channel: Channel; size?: "sm" | "md" | "lg" }) {
  const { bg, Icon } = STYLE[channel];
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10";
  const icon = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5";
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-white shadow-sm ${bg} ${box}`} aria-hidden>
      <Icon className={icon} />
    </span>
  );
}
