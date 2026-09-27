/**
 * Jalali (Solar Hijri) calendar and Tehran-time helpers.
 * Conversion follows the well-known jalaali-js algorithm (Borkowski's leap-year breaks).
 * Pure functions, safe on both server and client.
 */

const BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
const div = (a: number, b: number) => ~~(a / b);
const mod = (a: number, b: number) => a - ~~(a / b) * b;

function jalCal(jy: number) {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  if (jy < jp || jy >= BREAKS[BREAKS.length - 1]) throw new RangeError(`Invalid Jalali year ${jy}`);
  for (let i = 1; i < BREAKS.length; i++) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  const d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  let k = jdn - g2d(gy, 3, r.march);
  if (k >= 0) {
    if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export type JDate = { jy: number; jm: number; jd: number };

export const toJalali = (gy: number, gm: number, gd: number): JDate => d2j(g2d(gy, gm, gd));
export const toGregorian = ({ jy, jm, jd }: JDate) => d2g(j2d(jy, jm, jd));
export const isLeapJalaliYear = (jy: number) => jalCal(jy).leap === 0;
export const jalaliMonthLength = (jy: number, jm: number) => (jm <= 6 ? 31 : jm <= 11 ? 30 : isLeapJalaliYear(jy) ? 30 : 29);

/** Day-number arithmetic keeps date math exact across month and year boundaries. */
export const jalaliDayNumber = (d: JDate) => j2d(d.jy, d.jm, d.jd);
export const fromDayNumber = (n: number) => d2j(n);
export const addDays = (d: JDate, days: number) => d2j(j2d(d.jy, d.jm, d.jd) + days);
export const compareJ = (a: JDate, b: JDate) => jalaliDayNumber(a) - jalaliDayNumber(b);
/** 0 = Saturday … 6 = Friday (the Iranian week starts on Saturday). */
export const weekdayIndex = (d: JDate) => mod(jalaliDayNumber(d) + 2, 7);

export const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
export const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const fa = (n: number | string) => String(n).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)]);
const pad = (n: number) => String(n).padStart(2, "0");

/** "1405-07-01" (ASCII, for URLs). */
export const jKey = (d: JDate) => `${d.jy}-${pad(d.jm)}-${pad(d.jd)}`;
export function parseJKey(s: string | undefined | null): JDate | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const d = { jy: Number(m[1]), jm: Number(m[2]), jd: Number(m[3]) };
  if (d.jy < 1350 || d.jy > 1500 || d.jm < 1 || d.jm > 12 || d.jd < 1 || d.jd > jalaliMonthLength(d.jy, d.jm)) return null;
  return d;
}

/** "۵ مهر" */
export const jDayMonth = (d: JDate) => `${fa(d.jd)} ${MONTHS[d.jm - 1]}`;
/** "۵ مهر ۱۴۰۵" */
export const jLong = (d: JDate) => `${fa(d.jd)} ${MONTHS[d.jm - 1]} ${fa(d.jy)}`;
/** "شنبه ۵ مهر ۱۴۰۵" */
export const jFull = (d: JDate) => `${WEEKDAYS[weekdayIndex(d)]} ${jLong(d)}`;
/** "۱۴۰۵/۰۷/۰۵" */
export const jNumeric = (d: JDate) => fa(`${d.jy}/${pad(d.jm)}/${pad(d.jd)}`);

// ─── Tehran time ─────────────────────────────────────────────

export const TEHRAN_TZ = "Asia/Tehran";
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TEHRAN_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

/** Wall-clock date and time in Tehran for an instant. */
export function tehranParts(date: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { gy: Number(p.year), gm: Number(p.month), gd: Number(p.day), hour: Number(p.hour) % 24, minute: Number(p.minute) };
}

/** The Jalali date of an instant, as seen in Tehran. */
export function tehranJDate(date: Date): JDate {
  const p = tehranParts(date);
  return toJalali(p.gy, p.gm, p.gd);
}

/** Today's Jalali date in Tehran. */
export const tehranToday = () => tehranJDate(new Date());

/** The UTC instant at which a Jalali day starts in Tehran (00:00 local time). */
export function tehranDayStart(d: JDate): Date {
  const g = toGregorian(d);
  const guess = Date.UTC(g.gy, g.gm - 1, g.gd);
  // Offset = Tehran wall time minus UTC, measured at that moment (handles any past DST rules).
  const p = tehranParts(new Date(guess));
  const offset = Date.UTC(p.gy, p.gm - 1, p.gd, p.hour, p.minute) - guess;
  return new Date(guess - offset);
}

export { fa as faNum };
