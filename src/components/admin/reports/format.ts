const nf = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const toFa = (n: number) => nf.format(n).replace(/٬/g, ",");

/** Short axis/figure labels: ۲۵۰ هزار · ۱٫۲ میلیون · ۳ میلیارد. */
export function compactNumber(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return `${toFa(n / 1e9)} میلیارد`;
  if (a >= 1e6) return `${toFa(n / 1e6)} میلیون`;
  if (a >= 1e3) return `${toFa(n / 1e3)} هزار`;
  return toFa(n);
}

/** Percent change vs a previous value; null when there is no baseline. */
export function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
