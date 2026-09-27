import type { BannerDTO, HeroLayout } from "@/lib/banners-shared";
import { BannerTile } from "./BannerTile";
import { HeroSlider } from "./HeroSlider";

/**
 * Homepage banner area in the layout chosen in the admin panel. Phone vs desktop is decided by the
 * width of this section (container queries), so the admin preview renders exactly like the site.
 */
export function HeroBanners({ layout, banners, autoplay, priority = true }: { layout: HeroLayout; banners: BannerDTO[]; autoplay: number; priority?: boolean }) {
  if (banners.length === 0) return null;
  // With a single banner every layout looks best as a full-width banner.
  const mode = banners.length === 1 ? "single" : layout;

  return (
    <section aria-label="پیشنهادهای ویژه" className="@container/hero">
      {mode === "single" && (
        <div className="aspect-[16/9] @3xl/hero:aspect-[3.4/1]">
          <BannerTile banner={banners[0]} sizes="100vw" priority={priority} />
        </div>
      )}

      {mode === "split" && (
        <div className="grid gap-4 @3xl/hero:aspect-[3.4/1] @3xl/hero:grid-cols-[3fr_7fr] @3xl/hero:grid-rows-1 @3xl/hero:gap-6">
          {/* Big banner first on phones; on desktop the small one sits on the right (start) like the original design. */}
          <div className="aspect-[16/9] @3xl/hero:order-last @3xl/hero:aspect-auto">
            <BannerTile banner={banners[0]} sizes="(min-width: 1024px) 70vw, 100vw" priority={priority} />
          </div>
          <div className="aspect-[2/1] @3xl/hero:aspect-auto">
            <BannerTile banner={banners[1]} variant="small" sizes="(min-width: 1024px) 30vw, 100vw" />
          </div>
        </div>
      )}

      {mode === "grid4" && (
        <div className={`grid grid-cols-2 gap-3 @3xl/hero:gap-6 ${banners.length >= 4 ? "@3xl/hero:grid-cols-4" : banners.length === 3 ? "@3xl/hero:grid-cols-3" : ""}`}>
          {banners.map((b, i) => {
            // An odd one out on phones spans the full width instead of leaving a hole.
            const wide = banners.length % 2 === 1 && i === banners.length - 1;
            return (
              <div
                key={b.id}
                className={wide ? "col-span-2 aspect-[2/1] @3xl/hero:col-span-1 @3xl/hero:aspect-square" : banners.length === 2 ? "aspect-square @3xl/hero:aspect-[16/9]" : "aspect-square"}
              >
                <BannerTile banner={b} variant="small" sizes="(min-width: 768px) 25vw, 50vw" priority={priority && i < 2} />
              </div>
            );
          })}
        </div>
      )}

      {mode === "slider" && <HeroSlider banners={banners} autoplay={autoplay} priority={priority} />}
    </section>
  );
}
