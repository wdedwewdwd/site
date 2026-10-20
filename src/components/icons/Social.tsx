// Lucide v1 removed brand icons, so they are kept locally in the same stroke style
// (paths from Tabler Icons, MIT licence).
export { MessageCircle, Send } from "lucide-react";

type IconProps = { className?: string };

const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function Instagram({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3" />
      <path d="M16.5 7.5v.01" />
    </svg>
  );
}

export function Telegram({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M15 10l-4 4l6 6l4 -16l-18 7l4 2l2 6l3 -4" />
    </svg>
  );
}

export function WhatsApp({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
      <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
    </svg>
  );
}

/** Bale (بله): a chat bubble with a tick, drawn in the same stroke style. */
export function Bale({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3a9 9 0 0 0 -7.8 13.5l-1.2 4.5l4.6 -1.2a9 9 0 1 0 4.4 -16.8z" />
      <path d="M8.5 12.2l2.3 2.3l4.7 -4.7" />
    </svg>
  );
}

/** Rubika (روبیکا): its hexagon "cube" mark, drawn in the same stroke style. */
export function Rubika({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 2.8l8 4.6v9.2l-8 4.6l-8 -4.6v-9.2z" />
      <path d="M12 12l8 -4.6" />
      <path d="M12 12v9.2" />
      <path d="M12 12l-8 -4.6" />
    </svg>
  );
}
