import { Star } from "lucide-react";
import { faDigits } from "@/lib/format";

/** Read-only 5-star row; `value` may be fractional (rounded to the nearest star). */
export function Stars({ value, size = "size-4", className = "" }: { value: number; size?: string; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`flex gap-0.5 ${className}`} role="img" aria-label={`امتیاز ${faDigits(full)} از ۵`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${size} ${i < full ? "fill-star text-star" : "fill-line text-line"}`} aria-hidden />
      ))}
    </span>
  );
}
