import { normalize } from "./search";

/**
 * The two Iranian carmakers the home page starts from. A car model in the shared car list belongs to a
 * maker by its «سازنده» text or by its well-known model names, so the owner never has to set it by hand.
 */
export const MAKERS = {
  ikco: {
    name: "ایران خودرو",
    latin: "IKCO",
    logo: "/brand/makers/ikco.webp",
    color: "#0b6fb8",
    soft: "#e8f2fb",
    hint: "پژو، سمند، دنا، رانا، سورن",
    makeWords: ["ایران خودرو", "ایرانخودرو", "ایکو", "ikco"],
    modelWords: ["پژو", "سمند", "سورن", "دنا", "رانا", "پارس", "تارا", "هایما", "ری را", "آریسان", "روآ", "206", "207", "405", "2008", "301", "peugeot"],
  },
  saipa: {
    name: "سایپا",
    latin: "SAIPA",
    logo: "/brand/makers/saipa.svg",
    color: "#e57819",
    soft: "#fdf1e6",
    hint: "پراید، تیبا، ساینا، کوییک، شاهین",
    makeWords: ["سایپا", "saipa", "پارس خودرو", "زامیاد"],
    modelWords: ["پراید", "تیبا", "ساینا", "کوییک", "کوئیک", "شاهین", "نسیم", "صبا", "ریو", "زامیاد", "سهند", "اطلس", "131", "132", "111", "141", "151", "pride", "tiba"],
  },
} as const;

export type MakerKey = keyof typeof MAKERS;
export const MAKER_KEYS = Object.keys(MAKERS) as MakerKey[];
export const isMakerKey = (v: unknown): v is MakerKey => typeof v === "string" && v in MAKERS;

const words = (list: readonly string[]) => list.map((w) => ` ${normalize(w)} `);
const RULES = MAKER_KEYS.map((key) => ({ key, make: words(MAKERS[key].makeWords), model: words(MAKERS[key].modelWords) }));

/** Which maker builds this car; null for other brands (e.g. foreign cars) or when it is unclear. */
export function carMaker(make: string, name: string): MakerKey | null {
  const m = ` ${normalize(make)} `;
  const all = ` ${normalize(`${make} ${name}`)} `;
  // The «سازنده» field decides first («سایپا»، «ایران خودرو»), then the model name («پژو ۲۰۶»، «تیبا»).
  const byMake = RULES.filter((r) => r.make.some((w) => m.includes(w)));
  if (byMake.length === 1) return byMake[0].key;
  const byModel = RULES.filter((r) => r.model.some((w) => all.includes(w)) || r.make.some((w) => all.includes(w)));
  return byModel.length === 1 ? byModel[0].key : null;
}
