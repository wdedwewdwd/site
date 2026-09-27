/** Homepage banner layouts: shared by the homepage, the admin manager and the server actions. */

export const HERO_LAYOUTS = ["single", "split", "grid4", "slider"] as const;
export type HeroLayout = (typeof HERO_LAYOUTS)[number];
export const DEFAULT_LAYOUT: HeroLayout = "split";

export const MAX_BANNERS = 20;
export const MAX_SLIDES = 10;
export const AUTOPLAY_CHOICES = [0, 4, 6, 8, 12] as const;
export const DEFAULT_AUTOPLAY = 6;

export type BannerDTO = {
  id: string;
  image: string;
  mobileImage: string | null;
  title: string | null;
  subtitle: string | null;
  badge: string | null;
  buttonLabel: string | null;
  href: string | null;
  showText: boolean;
  isActive: boolean;
};

type Slot = { name: string; desktop: string; mobile?: string };

export const LAYOUT_INFO: Record<HeroLayout, { label: string; description: string; slots: Slot[]; repeat?: boolean }> = {
  single: {
    label: "تک بنر",
    description: "یک بنر بزرگ در تمام عرض صفحه",
    slots: [{ name: "بنر اصلی", desktop: "۱۹۲۰ × ۵۶۰", mobile: "۱۰۸۰ × ۶۰۸" }],
  },
  split: {
    label: "دو بنر کنار هم",
    description: "یک بنر بزرگ و یک بنر کوچک کنار آن (طرح فعلی سایت)",
    slots: [
      { name: "بنر بزرگ", desktop: "۱۴۰۰ × ۶۰۰", mobile: "۱۰۸۰ × ۶۰۸" },
      { name: "بنر کوچک", desktop: "۶۰۰ × ۶۰۰", mobile: "۱۰۸۰ × ۵۴۰" },
    ],
  },
  grid4: {
    label: "چهار بنر",
    description: "چهار بنر مربعی در یک ردیف (در موبایل دو ردیف دوتایی)",
    slots: [1, 2, 3, 4].map((n) => ({ name: `خانه ${n.toLocaleString("fa-IR")}`, desktop: "۸۰۰ × ۸۰۰" })),
  },
  slider: {
    label: "اسلایدر (ورق‌زدنی)",
    description: "چند بنر که خودکار عوض می‌شوند و کاربر هم می‌تواند ورق بزند",
    slots: [{ name: "اسلاید", desktop: "۱۹۲۰ × ۵۶۰", mobile: "۱۰۸۰ × ۶۰۸" }],
    repeat: true,
  },
};

/** How many active banners a layout shows. */
export const layoutCapacity = (layout: HeroLayout) => (LAYOUT_INFO[layout].repeat ? MAX_SLIDES : LAYOUT_INFO[layout].slots.length);

/** Where the n-th active banner (0-based) appears in a layout, or null when the layout has no room for it. */
export function slotFor(layout: HeroLayout, index: number): Slot | null {
  const info = LAYOUT_INFO[layout];
  if (info.repeat) return index < MAX_SLIDES ? { ...info.slots[0], name: `${info.slots[0].name} ${(index + 1).toLocaleString("fa-IR")}` } : null;
  return info.slots[index] ?? null;
}

export const parseLayout = (v: string | undefined): HeroLayout => (HERO_LAYOUTS as readonly string[]).includes(v ?? "") ? (v as HeroLayout) : DEFAULT_LAYOUT;
export const parseAutoplay = (v: string | undefined) => {
  const n = Number(v);
  return v !== undefined && (AUTOPLAY_CHOICES as readonly number[]).includes(n) ? n : DEFAULT_AUTOPLAY;
};

export const isExternal = (href: string) => /^https:\/\//i.test(href);
/** Whether text is drawn over the image (off when the text is already part of the picture). */
export const showsText = (b: Pick<BannerDTO, "showText" | "title" | "subtitle" | "badge" | "buttonLabel">) =>
  b.showText && !!(b.title || b.subtitle || b.badge || b.buttonLabel);
