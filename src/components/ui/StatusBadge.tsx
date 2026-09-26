import type { OrderStatus } from "@/generated/prisma/client";
import { ORDER_STATUS } from "@/lib/shop";

const TONES = {
  green: "bg-success-soft text-success",
  amber: "bg-warning-soft text-warning",
  red: "bg-brand-soft text-brand",
  blue: "bg-info-soft text-info",
  gray: "bg-surface text-muted",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`rounded-md px-2.5 py-1 text-[11px] font-extrabold ${TONES[s.tone]}`}>{s.label}</span>;
}
