import Link from "next/link";
import { SITE } from "@/lib/shop";

/** Width ÷ height of public/brand/logo.svg. */
const LOGO_RATIO = 3203 / 1868.81;
/**
 * Persian letters sit on the baseline, so the visual middle of the name (the centre of mass of its ink: 0.16em above
 * the baseline in Vazirmatn Black, measured on «آریزون یدک») is 0.08em below the middle of its line box (with
 * `leading-none`, 0.245em above the baseline). This lift puts that visual middle exactly on the logo's middle.
 */
const NAME_OPTICAL_LIFT = "translateY(-0.08em)";

export function LogoMark({ className = "h-10 w-[68px]" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed
  return <img src="/brand/logo.svg" alt="" aria-hidden className={`${className} object-contain`} />;
}

/**
 * The logo on a dark tile with a soft yellow glow, like the site's app icon: on a white card the yellow mark was hard
 * to see. Sits half over the top edge of the sign-in and sign-up cards (the white ring cuts it into the card).
 */
export function LogoTile({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative grid size-[88px] shrink-0 place-items-center overflow-hidden rounded-[28px] bg-night shadow-[0_18px_36px_-16px_rgba(25,25,25,0.6)] ring-[6px] ring-white ${className}`}
    >
      <span aria-hidden className="absolute inset-0 bg-[radial-gradient(110%_75%_at_50%_0%,rgba(245,212,27,0.22),transparent_65%)]" />
      <LogoMark className="relative h-11 w-[75px]" />
    </span>
  );
}

/**
 * The logo with the shop name beside it, the name's visual middle on the logo's middle (owner's choice, 2026-10-28,
 * after trying it on the baseline of the «ARIZON» lettering). The row is exactly as tall as the logo, so the lockup
 * centres in a bar by the logo alone. `markFirst` puts the logo before (to the right of) the name in RTL.
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
    <span className={`whitespace-nowrap leading-none ${nameClassName}`} style={{ transform: NAME_OPTICAL_LIFT }}>
      {name}
    </span>
  );
  return (
    <span className={`flex items-center ${gap}`}>
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
