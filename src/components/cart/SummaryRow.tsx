import { toman } from "@/lib/format";

export function SummaryRow({ label, value, tone, strong }: { label: string; value: number; tone?: "red" | "green"; strong?: boolean }) {
  const color = tone === "red" ? "text-brand" : tone === "green" ? "text-success" : "";
  return (
    <div className={`flex items-center justify-between ${strong ? "text-base font-black" : "text-[13px]"}`}>
      <dt className={strong ? "" : `text-muted ${color}`}>{label}</dt>
      <dd className={`font-extrabold ${color}`}>
        {tone === "red" && value > 0 ? "−" : ""}
        {toman(value)} <span className="text-[11px] font-normal text-muted">تومان</span>
      </dd>
    </div>
  );
}
