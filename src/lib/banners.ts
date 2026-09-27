import "server-only";
import { cache } from "react";
import { db } from "./db";
import { getSettings } from "./settings";
import { layoutCapacity, parseAutoplay, parseLayout, type BannerDTO } from "./banners-shared";

export const bannerSelect = {
  id: true,
  image: true,
  mobileImage: true,
  title: true,
  subtitle: true,
  badge: true,
  buttonLabel: true,
  href: true,
  showText: true,
  isActive: true,
} as const;

export const getHeroSettings = cache(async () => {
  const s = await getSettings();
  return { layout: parseLayout(s.hero_layout), autoplay: parseAutoplay(s.hero_autoplay) };
});

/** Active banners for the homepage, already limited to what the chosen layout can show. */
export async function getHomeBanners() {
  const { layout, autoplay } = await getHeroSettings();
  const banners: BannerDTO[] = await db.banner.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    take: layoutCapacity(layout),
    select: bannerSelect,
  });
  return { layout, autoplay, banners };
}
