import { toman } from "@/lib/format";

/** `text` replaces the amount (e.g. «رایگان» or «پس‌کرایه» for shipping). */
export function SummaryRow({ label, value, tone, strong, text }: { label: string; value: number; tone?: "red" | "green"; strong?: boolean; text?: string }) {
  const color = tone === "red" ? "text-brand" : tone === "green" ? "text-success" : "";
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-base font-black" : "text-[13px]"}`}>
      <dt className={strong ? "" : `text-muted ${color}`}>{label}</dt>
      <dd className={`shrink-0 font-extrabold ${color}`}>
        {text ?? (
          <>
            {tone === "red" && value > 0 ? "−" : ""}
            {toman(value)} <span className="text-[11px] font-normal text-muted">تومان</span>
          </>
        )}
      </dd>
    </div>
  );
}
