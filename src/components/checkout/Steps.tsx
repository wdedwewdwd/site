import { faDigits } from "@/lib/format";

const STEPS = ["سبد خرید", "اطلاعات ارسال", "روش پرداخت"];

export function Steps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="mx-auto flex w-full max-w-lg items-center justify-center gap-2" aria-label="مراحل خرید">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none" aria-current={active ? "step" : undefined}>
            <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-black ${active ? "bg-brand text-white" : done ? "bg-ink text-white" : "bg-line text-muted"}`}>
              {faDigits(n)}
            </span>
            <span className={`whitespace-nowrap text-[13px] ${active ? "font-extrabold text-brand" : "text-muted"}`}>{label}</span>
            {n < STEPS.length && <span className="h-px min-w-6 flex-1 bg-line" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
