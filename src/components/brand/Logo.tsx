import Link from "next/link";
import { SITE } from "@/lib/shop";

export function LogoMark({ className = "h-10 w-[68px]" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- static SVG, no optimization needed
  return <img src="/brand/logo.svg" alt="" aria-hidden className={`${className} object-contain`} />;
}

export function Logo({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${SITE.name} — صفحه اصلی`}>
      <span className="flex flex-col">
        <span className="text-lg font-black leading-tight text-ink">{SITE.name}</span>
        {subtitle && <span className="text-[10px] font-medium text-muted" dir="ltr">{SITE.latinName}</span>}
      </span>
      <LogoMark />
    </Link>
  );
}
