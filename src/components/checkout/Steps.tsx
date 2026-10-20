import { Check } from "lucide-react";
import { faDigits } from "@/lib/format";

const STEPS = ["سبد خرید", "اطلاعات ارسال", "روش پرداخت"];

/** Checkout progress: numbered circles joined by a line, labels underneath (fits a 320px phone). */
export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex w-full max-w-md items-start" aria-label="مراحل خرید">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={label} className="relative flex flex-1 flex-col items-center gap-1.5 text-center" aria-current={active ? "step" : undefined}>
            {i > 0 && (
              <span
                className={`absolute right-[calc(-50%+18px)] top-3.5 h-0.5 w-[calc(100%-36px)] rounded-full ${done || active ? "bg-brand" : "bg-line"}`}
                aria-hidden
              />
            )}
            <span
              className={`relative grid size-7 place-items-center rounded-full text-xs font-black ${
                active ? "bg-brand text-white ring-4 ring-brand-soft" : done ? "bg-ink text-white" : "bg-line text-muted"
              }`}
            >
              {done ? <Check className="size-4" aria-hidden /> : faDigits(n)}
            </span>
            <span className={`text-xs md:text-[13px] ${active ? "font-extrabold text-brand" : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
