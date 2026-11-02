import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { faDigits } from "@/lib/format";

/** Page numbers around the current page, the first and last page, «…» for the gaps, and previous/next arrows. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  const shown = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const cell = "grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold";
  const arrow = (to: number, label: string, Icon: typeof ChevronLeft) =>
    to < 1 || to > pages ? (
      <span className={`${cell} border border-line bg-white text-subtle`} aria-hidden>
        <Icon className="size-4" />
      </span>
    ) : (
      <Link href={href(to)} aria-label={label} className={`${cell} border border-line bg-white hover:bg-canvas`}>
        <Icon className="size-4" />
      </Link>
    );
  return (
    <nav aria-label="صفحه‌بندی" className="flex items-center justify-center gap-1.5 sm:gap-2">
      {arrow(page - 1, "صفحه قبل", ChevronRight)}
      {shown.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - shown[i - 1] > 1 && <span className="px-0.5 text-sm text-muted" aria-hidden>…</span>}
          <Link
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={`${cell} ${n === page ? "bg-brand text-white" : "border border-line bg-white hover:bg-canvas"}`}
          >
            {faDigits(n)}
          </Link>
        </span>
      ))}
      {arrow(page + 1, "صفحه بعد", ChevronLeft)}
    </nav>
  );
}
