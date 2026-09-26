import { Info } from "lucide-react";

/** Collapsible "how to use this page" guide shown at the top of admin pages. */
export function HelpBox({ title = "راهنمای این بخش", items, open = false }: { title?: string; items: React.ReactNode[]; open?: boolean }) {
  return (
    <details open={open} className="group mb-6 rounded-card border border-info/20 bg-info-soft/60 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3.5 font-extrabold text-info">
        <Info className="size-5 shrink-0" aria-hidden />
        {title}
        <span className="mr-auto text-xs font-bold text-info/70 group-open:hidden">نمایش</span>
        <span className="mr-auto hidden text-xs font-bold text-info/70 group-open:inline">بستن</span>
      </summary>
      <ul className="flex flex-col gap-2 px-5 pb-4 leading-7 text-ink">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-info" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
