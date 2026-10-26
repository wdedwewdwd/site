import Link from "next/link";
import { SITE } from "@/lib/shop";

/** Width ÷ height of public/brand/logo.svg. */
const LOGO_RATIO = 3203 / 1868.81;
/** The «ARIZON» lettering under the emblem rests on this line (fraction of the logo's height, from the top). */
const WORDMARK_BASELINE = 0.96;

export function LogoMark({ className = "h-10 w-[68px]" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed
  return <img src="/brand/logo.svg" alt="" aria-hidden className={`${className} object-contain`} />;
}

/**
 * The logo with the shop name beside it on one line: the name stands on the same baseline as the «ARIZON» lettering.
 * (Centred on the whole logo it floated between the emblem and the lettering.) The name's descenders hang below
 * without making the row taller, so the lockup still centres in a bar by the logo alone. `markFirst` puts the logo
 * before (to the right of) the name in RTL.
 */
export function LogoLockup({
  height,
  name = SITE.name,
  nameClassName = "text-lg font-black",
  gap = "gap-3",
  markFirst = true,
}: {
  height: number;
  name?: string;
  nameClassName?: string;
  gap?: string;
  markFirst?: boolean;
}) {
  const mark = (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed
    <img src="/brand/logo.svg" alt="" aria-hidden className="shrink-0" style={{ height, width: Math.round(height * LOGO_RATIO) }} />
  );
  const text = (
    <span
      className={`whitespace-nowrap leading-none ${nameClassName}`}
      // A flex item without text lines (the logo) has its baseline at its bottom edge; lift the name to the lettering.
      style={{ marginBottom: "-0.28em", transform: `translateY(-${((1 - WORDMARK_BASELINE) * height).toFixed(2)}px)` }}
    >
      {name}
    </span>
  );
  return (
    <span className={`flex items-baseline ${gap}`}>
      {markFirst ? mark : text}
      {markFirst ? text : mark}
    </span>
  );
}

/** Desktop header logo. `tone="dark"` is for dark backgrounds. */
export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link href="/" className="flex shrink-0 items-center" aria-label={`${SITE.name} — صفحه اصلی`}>
      <LogoLockup height={40} nameClassName={`text-xl font-black ${tone === "dark" ? "text-white" : "text-ink"}`} />
    </Link>
  );
}
