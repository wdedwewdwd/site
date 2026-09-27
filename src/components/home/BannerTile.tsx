import Image from "next/image";
import Link from "next/link";
import { isExternal, showsText, type BannerDTO } from "@/lib/banners-shared";

/**
 * One banner. Sizes react to the surrounding containers (not the screen), so the admin preview
 * can show the phone and desktop versions side by side: `@container/hero` decides phone vs
 * desktop image, the tile's own `@container` sizes its text.
 */
export function BannerTile({
  banner: b,
  variant = "large",
  sizes,
  priority = false,
}: {
  banner: BannerDTO;
  /** "small" tiles (side banner, four-up grid) use compact text and a white button. */
  variant?: "large" | "small";
  sizes: string;
  priority?: boolean;
}) {
  const text = showsText(b);
  const alt = b.title ?? "";
  const img = "object-cover transition-transform duration-500 group-hover:scale-[1.03]";

  const content = (
    <>
      {b.mobileImage ? (
        <>
          <Image src={b.mobileImage} alt={alt} fill sizes={sizes} priority={priority} className={`${img} @3xl/hero:hidden`} />
          <Image src={b.image} alt={alt} fill sizes={sizes} priority={priority} className={`${img} hidden @3xl/hero:block`} />
        </>
      ) : (
        <Image src={b.image} alt={alt} fill sizes={sizes} priority={priority} className={img} />
      )}
      {text && (
        <>
          <div
            className={`absolute inset-0 ${variant === "large" ? "bg-linear-to-l from-ink/80 via-ink/50 to-ink/15" : "bg-ink/50"}`}
            aria-hidden
          />
          {variant === "large" ? (
            <div className="relative flex h-full flex-col justify-between gap-2 p-4 @md:p-6 @2xl:p-12">
              <span className="min-h-6">
                {b.badge && <span className="inline-block rounded-lg bg-brand px-2.5 py-1 text-[11px] font-extrabold text-white @md:px-3 @md:py-1.5 @md:text-xs">{b.badge}</span>}
              </span>
              <div className="flex max-w-[92%] flex-col gap-1.5 @md:gap-3 @2xl:max-w-[70%]">
                {b.title && <p className="text-base font-black leading-snug text-white @md:text-2xl @2xl:text-[32px] @2xl:leading-tight">{b.title}</p>}
                {b.subtitle && <p className="line-clamp-2 text-xs leading-5 text-[#d1d5db] @md:text-sm @2xl:text-base">{b.subtitle}</p>}
              </div>
              <span className="min-h-0 @md:min-h-12">
                {b.buttonLabel && <span className="btn-primary hidden w-fit @md:inline-flex">{b.buttonLabel}</span>}
              </span>
            </div>
          ) : (
            <div className="relative flex h-full flex-col justify-between gap-2 p-4 @xs:p-6 @sm:p-8">
              <div className="flex flex-col gap-1.5">
                {b.badge && <span className="w-fit rounded-lg bg-brand px-2 py-1 text-[10px] font-extrabold text-white">{b.badge}</span>}
                {b.title && <p className="text-sm font-black leading-snug text-white @xs:text-lg @sm:text-[22px]">{b.title}</p>}
              </div>
              {b.subtitle && <p className="hidden text-[13px] leading-6 text-[#e5e7eb] @xs:line-clamp-2">{b.subtitle}</p>}
              {b.buttonLabel ? (
                <span className="w-fit rounded-lg bg-white px-3 py-1.5 text-[11px] font-extrabold text-ink group-hover:bg-canvas @xs:px-4 @xs:py-2 @xs:text-xs">{b.buttonLabel}</span>
              ) : (
                <span />
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  const cls = "@container group relative block h-full w-full overflow-hidden rounded-[20px] bg-surface @3xl/hero:rounded-xl2";
  if (!b.href) return <div className={cls}>{content}</div>;
  // Image-only banners still need a readable name for screen readers.
  const label = text ? undefined : b.title || "مشاهده پیشنهاد";
  return isExternal(b.href) ? (
    <a href={b.href} target="_blank" rel="noopener" aria-label={label} className={cls}>
      {content}
    </a>
  ) : (
    <Link href={b.href} aria-label={label} className={cls}>
      {content}
    </Link>
  );
}
