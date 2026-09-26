const nf = new Intl.NumberFormat("fa-IR");

/** 320000 → "۳۲۰,۰۰۰" (matches the design's grouping). */
export function toman(value: number) {
  return nf.format(value).replace(/٬/g, ",");
}

/** Converts ASCII digits in any string/number to Persian digits. */
export function faDigits(value: string | number) {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function rating(value: number) {
  return faDigits(value.toFixed(1));
}

export function discountPercent(price: number, compareAt?: number | null) {
  if (!compareAt || compareAt <= price) return 0;
  return Math.round(((compareAt - price) / compareAt) * 100);
}

const dateFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "long", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export const faDate = (d: Date) => dateFmt.format(d);
export const faDateTime = (d: Date) => dateTimeFmt.format(d);

export function maskPhone(phone: string) {
  return faDigits(phone.slice(0, 4) + "***" + phone.slice(7));
}
