import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { faDigits } from "@/lib/format";
import type { PopularSubcategory } from "@/lib/home-sections";
import { CategoryCover } from "@/components/ui/CategoryCover";

/** Round shortcuts to the subcategories with the most parts (photo of the category), plus «all categories». */
export function PopularParts({ items }: { items: PopularSubcategory[] }) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="parts-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="parts-title" className="text-base font-black md:text-lg">خرید بر اساس نوع قطعه</h2>
        <Link href="/categories" className="shrink-0 text-[13px] font-bold text-brand hover:underline">همه انواع قطعه</Link>
      </div>
      {/* Phones: one row that scrolls sideways; desktop: a 7-column grid. */}
      <ul className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-7 md:gap-5 md:overflow-visible md:px-0">
        {items.map((c) => (
          <li key={c.slug} className="w-[76px] shrink-0 md:w-auto">
            <Link href={`/category/${c.slug}`} className="group flex flex-col items-center gap-2 text-center">
              <span className="relative size-[76px] overflow-hidden rounded-full border border-line bg-surface shadow-sm transition-all group-hover:border-brand group-hover:shadow-md md:size-24">
                <CategoryCover image={c.image} icon={c.icon} sizes="96px" className="scale-110 transition-transform duration-300 group-hover:scale-125" />
              </span>
              <span className="line-clamp-2 text-[11px] font-extrabold leading-5 group-hover:text-brand md:text-xs">{c.name}</span>
              <span className="-mt-1.5 text-[10px] text-muted">{faDigits(c.count)} قطعه</span>
            </Link>
          </li>
        ))}
        <li className="w-[76px] shrink-0 md:w-auto">
          <Link href="/categories" className="group flex flex-col items-center gap-2 text-center">
            <span className="grid size-[76px] place-items-center rounded-full border border-dashed border-brand bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white md:size-24">
              <LayoutGrid className="size-7" aria-hidden />
            </span>
            <span className="text-[11px] font-extrabold leading-5 text-brand md:text-xs">همه دسته‌ها</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
