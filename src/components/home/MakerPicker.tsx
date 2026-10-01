"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronLeft, LayoutGrid } from "lucide-react";
import { faDigits } from "@/lib/format";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import type { MakerSection } from "@/lib/home-makers";

/** Each maker's accent colour, used by the card border, glow and accents. */
const accent = (m: MakerSection) => ({ "--mk": m.color, "--mk-soft": m.soft }) as CSSProperties;

function MakerLogo({ maker, className }: { maker: MakerSection; className: string }) {
  return <Image src={maker.logo} alt="" width={96} height={96} unoptimized={maker.logo.endsWith(".svg")} className={`object-contain ${className}`} />;
}

/**
 * Home page entry to the catalogue: first the carmaker (ایران خودرو / سایپا), then the categories that
 * have parts for that maker's cars. Every link carries ?maker= so the category page stays filtered.
 */
export function MakerPicker({ makers }: { makers: MakerSection[] }) {
  // The choice lives in the address (/?maker=saipa), so coming back from a category page shows the same maker.
  const key = useSearchParams().get("maker");
  const chosen = makers.find((m) => m.key === key) ?? null;
  const setChosen = (m: MakerSection | null) => window.history.replaceState(null, "", m ? `/?maker=${m.key}` : "/");

  return (
    <section className="flex flex-col gap-4" aria-labelledby="cat-title">
      <div className="flex min-h-9 items-center justify-between gap-3">
        {chosen ? (
          <h2 id="cat-title" className="flex items-center gap-2.5 text-base font-black md:text-lg" style={accent(chosen)}>
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--mk-soft)]">
              <MakerLogo maker={chosen} className="size-6" />
            </span>
            <span>
              قطعات <span className="hidden sm:inline">خودروهای </span>
              {chosen.name}
            </span>
          </h2>
        ) : (
          <h2 id="cat-title" className="text-base font-black md:text-lg">خودروساز خود را انتخاب کنید</h2>
        )}
        {chosen ? (
          <button type="button" onClick={() => setChosen(null)} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[13px] font-bold text-brand hover:bg-brand-soft">
            <ArrowRight className="size-4" aria-hidden /> تغییر خودروساز
          </button>
        ) : (
          <Link href="/categories" className="shrink-0 text-[13px] font-bold text-brand hover:underline">همه دسته‌بندی‌ها</Link>
        )}
      </div>

      <div aria-live="polite">
        {chosen ? <MakerCategories key={chosen.key} maker={chosen} /> : <MakerCards makers={makers} onPick={setChosen} />}
      </div>
    </section>
  );
}

function MakerCards({ makers, onPick }: { makers: MakerSection[]; onPick: (m: MakerSection) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-5">
      {makers.map((m, i) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onPick(m)}
          aria-label={`${m.name} (${m.latin}) — ${m.hint}`}
          style={{ ...accent(m), animationDelay: `${i * 70}ms` }}
          className="group relative flex animate-fade-up flex-col items-center gap-3 overflow-hidden rounded-card border border-line bg-white px-3 pb-6 pt-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--mk)] hover:shadow-[0_14px_34px_-16px_var(--mk)] focus-visible:border-[var(--mk)] md:flex-row md:gap-5 md:px-6 md:py-6 md:text-right"
        >
          {/* Big faded logo in the corner, and the maker's colour along the bottom edge. */}
          <MakerLogo maker={m} className="pointer-events-none absolute -bottom-6 -left-6 size-28 opacity-[0.06] transition-transform duration-300 group-hover:scale-110 md:size-36" />
          <span className="absolute inset-x-0 bottom-0 h-1 bg-[var(--mk)]" aria-hidden />

          <span className="grid size-[76px] shrink-0 place-items-center rounded-2xl bg-[var(--mk-soft)] md:size-24">
            <MakerLogo maker={m} className="size-12 transition-transform duration-200 group-hover:scale-110 md:size-16" />
          </span>
          <span className="relative flex min-w-0 flex-col gap-1 md:flex-1">
            <span className="text-base font-black md:text-xl">{m.name}</span>
            <span className="text-[11px] leading-5 text-muted md:text-[13px]">{m.hint}</span>
            {m.total > 0 && <span className="mt-0.5 text-[11px] font-extrabold text-[var(--mk)] md:text-xs">{faDigits(m.total)} قطعه مناسب</span>}
          </span>
          <span className="relative hidden size-10 shrink-0 place-items-center rounded-full bg-surface text-muted transition-colors group-hover:bg-[var(--mk)] group-hover:text-white md:grid" aria-hidden>
            <ChevronLeft className="size-5" />
          </span>
        </button>
      ))}
    </div>
  );
}

function MakerCategories({ maker }: { maker: MakerSection }) {
  const q = `maker=${maker.key}`;
  return (
    <div className="flex flex-col gap-4" style={accent(maker)}>
      {maker.cars.length > 0 && (
        <nav aria-label={`خودروهای ${maker.name}`} className="-mx-4 flex animate-fade-up items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <span className="shrink-0 text-xs font-bold text-muted">خودروی شما:</span>
          {maker.cars.map((c) => (
            <Link
              key={c.slug}
              href={`/products?car=${c.slug}`}
              className="shrink-0 rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-bold transition-colors hover:border-[var(--mk)] hover:text-[var(--mk)]"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}

      {maker.categories.length === 0 ? (
        <div className="card flex animate-fade-up flex-col items-center gap-3 px-6 py-10 text-center">
          <p className="text-sm font-bold">هنوز قطعه‌ای برای خودروهای {maker.name} ثبت نشده است.</p>
          <Link href="/categories" className="btn-ghost">مشاهده همه دسته‌بندی‌ها</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:gap-4 lg:grid-cols-6">
          {maker.categories.map((c, i) => (
            <li key={c.slug} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <Link
                href={`/category/${c.slug}?${q}`}
                className="group flex h-full flex-col items-center gap-2 rounded-card border border-line bg-white px-2 py-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--mk)] hover:shadow-[0_12px_28px_-18px_var(--mk)]"
              >
                <span className="grid size-12 place-items-center rounded-full bg-[var(--mk-soft)] text-[var(--mk)] transition-colors group-hover:bg-[var(--mk)] group-hover:text-white md:size-14">
                  <CategoryIcon name={c.icon} className="size-6" />
                </span>
                <span className="line-clamp-2 text-xs font-extrabold leading-5 md:text-[13px]">{c.name}</span>
                <span className="text-[11px] text-muted">{faDigits(c.count)} قطعه</span>
              </Link>
            </li>
          ))}
          <li className="animate-fade-up" style={{ animationDelay: `${maker.categories.length * 40}ms` }}>
            <Link
              href={`/products?${q}`}
              className="flex h-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-[var(--mk)] bg-[var(--mk-soft)] px-2 py-4 text-center text-[var(--mk)] transition-colors hover:bg-white"
            >
              <span className="grid size-12 place-items-center rounded-full bg-white md:size-14">
                <LayoutGrid className="size-6" aria-hidden />
              </span>
              <span className="text-xs font-extrabold leading-5 md:text-[13px]">همه قطعات {maker.name}</span>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
