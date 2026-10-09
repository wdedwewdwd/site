import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireStaff } from "@/lib/auth/session";
import { tehranToday } from "@/lib/jalali";
import { PRESETS, parseReportParams } from "@/lib/reports";
import { liveVisitors, trafficReport, type TrafficReport } from "@/lib/analytics";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ReportShell } from "@/components/admin/reports/ReportShell";
import { HourPanel } from "@/components/admin/reports/HourPanel";
import { BarList, num, StatTile } from "@/components/admin/reports/ReportBlocks";
import { TrafficPanel } from "@/components/admin/analytics/TrafficPanel";
import { LiveVisitors } from "@/components/admin/analytics/LiveVisitors";

export const metadata = { title: "آمار بازدید" };

const GRANULARITY_LABEL = { day: "روزانه", week: "هفتگی", month: "ماهانه" } as const;
const dec = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });
const one = (n: number) => dec.format(n);

/** "۴۵" ثانیه or "۲:۱۵" دقیقه. */
function duration(ms: number) {
  const s = Math.round(ms / 1000);
  if (s < 60) return { value: num(s), unit: "ثانیه" };
  return { value: `${num(Math.floor(s / 60))}:${num(s % 60).padStart(2, "۰")}`, unit: "دقیقه" };
}

export default async function AnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const { from, to, granularity, preset } = parseReportParams(await searchParams);
  const [r, live] = await Promise.all([trafficReport(from, to, granularity), liveVisitors()]);
  const { totals: t, previous: p } = r;
  const avg = duration(t.avgDur);

  return (
    <>
      <PageHeader title="آمار بازدید سایت" />
      <HelpBox
        items={[
          "این صفحه نشان می‌دهد چند نفر به سایت آمده‌اند، از کجا آمده‌اند، چه صفحه‌ها و محصولاتی را دیده‌اند و چند نفرشان خرید کرده‌اند. بازه را مثل گزارش فروش از دکمه تقویم انتخاب کنید (شمسی، به وقت تهران).",
          "«بازدیدکننده» یعنی یک نفر (یک مرورگر)، حتی اگر چند بار بیاید. «ورود به سایت» هر بار آمدن است (بعد از ۳۰ دقیقه بی‌کاری، ورود جدید حساب می‌شود). «بازدید صفحه» هر صفحه‌ای است که باز شده.",
          "«نرخ پرش» درصد ورودهایی است که فقط یک صفحه دیده‌اند و رفته‌اند (کمتر بهتر است). «نرخ تبدیل» یعنی از هر ۱۰۰ ورود به سایت، چند سفارش ثبت شده است.",
          "«مسیر خرید» نشان می‌دهد بازدیدکنندگان تا کجای خرید پیش رفته‌اند و بیشترین ریزش کجاست؛ مثلاً اگر خیلی‌ها سبد خرید را می‌بینند ولی سفارش نمی‌دهند، هزینه ارسال یا مراحل خرید را بررسی کنید.",
          "«جستجوهای بازدیدکنندگان» می‌گوید مشتری‌ها دنبال چه قطعه‌ای بوده‌اند؛ اگر چیزی زیاد جستجو شده و در فروشگاه نیست، فرصت خوبی برای اضافه کردن است.",
          "آمار شما و همکارانتان (مدیر و پشتیبان) و ربات‌های جستجوگر حساب نمی‌شود. اطلاعات فقط روی سرور خود فروشگاه می‌ماند و به هیچ سرویس دیگری فرستاده نمی‌شود. آمار از روزی که این بخش راه‌اندازی شد جمع می‌شود.",
        ]}
      />

      <ReportShell
        from={from}
        to={to}
        today={tehranToday()}
        granularity={granularity}
        preset={preset}
        presets={PRESETS}
        exportPath="/api/admin/reports/traffic"
        label="گزارش بازدید"
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="بازدیدکننده" value={num(t.visitors)} unit="نفر" current={t.visitors} previous={p.visitors} />
          <StatTile label="ورود به سایت" value={num(t.sessions)} unit="بار" current={t.sessions} previous={p.sessions} />
          <StatTile label="بازدید صفحه" value={num(t.views)} unit="صفحه" current={t.views} previous={p.views} />
          <StatTile
            label="بازدیدکننده جدید"
            value={num(t.newVisitors)}
            unit="نفر"
            current={t.newVisitors}
            previous={p.newVisitors}
            hint={t.visitors ? `${num(Math.round((t.newVisitors / t.visitors) * 100))}٪ بار اولشان بود` : undefined}
          />
          <StatTile label="صفحه در هر ورود" value={one(t.pagesPerSession)} unit="صفحه" current={t.pagesPerSession} previous={p.pagesPerSession} />
          <StatTile label="میانگین زمان حضور" value={avg.value} unit={avg.unit} current={t.avgDur} previous={p.avgDur} />
          <StatTile label="نرخ پرش" value={one(t.bounceRate)} unit="٪" current={t.bounceRate} previous={p.bounceRate} upIsGood={false} hint="ورودهایی که فقط یک صفحه دیدند" />
          <StatTile
            label="نرخ تبدیل به سفارش"
            value={one(t.conversion)}
            unit="٪"
            current={t.conversion}
            previous={p.conversion}
            hint={`${num(t.orders)} سفارش از ${num(t.sessions)} ورود`}
          />
        </div>

        <TrafficPanel series={r.series} granularityLabel={GRANULARITY_LABEL[granularity]} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Funnel f={r.funnel} />
          <LiveVisitors initial={live} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <HourPanel
            title="زمان بازدید (به وقت تهران)"
            unit="بازدید"
            hours={r.hours}
            weekdays={r.weekdays}
          />
          <BarList
            title="بازدیدکنندگان از کجا آمده‌اند"
            hint="بر اساس هر ورود به سایت"
            unit="ورود"
            rows={r.channels.map((c) => ({ key: c.key, label: c.label, value: c.sessions }))}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <TopPages pages={r.pages} />
          <TopProducts products={r.products} />
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <EntryPages entries={r.entries} />
          <Searches searches={r.searches} />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
          <BarList title="نوع دستگاه" unit="ورود" rows={r.devices.map((d) => ({ key: d.key, label: d.label, value: d.sessions }))} />
          <BarList title="سیستم‌عامل" unit="ورود" rows={r.os.map((d) => ({ key: d.key, label: d.label, value: d.sessions }))} />
          <BarList title="مرورگر" unit="ورود" rows={r.browsers.map((d) => ({ key: d.key, label: d.label, value: d.sessions }))} />
          <BarList title="سایت‌های معرفی‌کننده" unit="ورود" empty="ورودی از سایت دیگری نبوده است." rows={r.referrers.map((x) => ({ key: x.host, label: x.host, value: x.sessions }))} />
        </div>
      </ReportShell>
    </>
  );
}

function Card({ id, title, hint, children }: { id: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-5" aria-labelledby={id}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-base font-black">{title}</h2>
        {hint && <p className="text-[11px] text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Empty({ text = "در این بازه داده‌ای ثبت نشده است." }: { text?: string }) {
  return <p className="py-8 text-center text-sm text-muted">{text}</p>;
}

const th = "py-2 text-right font-bold";
const td = "py-2.5";

function Funnel({ f }: { f: TrafficReport["funnel"] }) {
  const steps = [
    { label: "ورود به سایت", value: f.sessions },
    { label: "دیدن صفحه محصول", value: f.product },
    { label: "رفتن به سبد خرید", value: f.cart },
    { label: "شروع تکمیل خرید", value: f.checkout },
    { label: "ثبت سفارش", value: f.orders },
  ];
  const base = Math.max(1, f.sessions);
  return (
    <Card id="funnel" title="مسیر خرید بازدیدکنندگان" hint="از هر ۱۰۰ ورود به سایت، چند تا به هر مرحله رسیده‌اند">
      {f.sessions === 0 ? (
        <Empty />
      ) : (
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => {
            const prev = i > 0 ? steps[i - 1].value : 0;
            const drop = i > 0 && prev > 0 ? Math.max(0, Math.round(((prev - s.value) / prev) * 100)) : null;
            const pct = (s.value / base) * 100;
            return (
              <li key={s.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2 font-bold">
                    <span className="grid size-5 place-items-center rounded-full bg-ink text-[10px] text-white">{num(i + 1)}</span>
                    {s.label}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    <b className="text-ink">{num(s.value)}</b> · {one(pct)}٪
                  </span>
                </div>
                <span className="h-2.5 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${s.value ? Math.max(1.5, Math.min(100, pct)) : 0}%` }} />
                </span>
                {drop !== null && drop > 0 && <span className="text-[11px] text-muted">{num(drop)}٪ از مرحله قبل ادامه ندادند</span>}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}

function TopPages({ pages }: { pages: TrafficReport["pages"] }) {
  return (
    <Card id="top-pages" title="پربازدیدترین صفحه‌ها">
      {pages.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className={th}>صفحه</th>
                <th className={th}>بازدید</th>
                <th className={th}>بازدیدکننده</th>
                <th className={th}>میانگین زمان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
              {pages.map((p) => {
                const d = duration(p.avgMs);
                return (
                  <tr key={p.path}>
                    <td className={`${td} max-w-60`}>
                      <PageName label={p.label} href={p.href} />
                    </td>
                    <td className={`${td} font-bold`}>{num(p.views)}</td>
                    <td className={td}>{num(p.visitors)}</td>
                    <td className={`${td} text-muted`}>{p.avgMs ? `${d.value} ${d.unit}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TopProducts({ products }: { products: TrafficReport["products"] }) {
  return (
    <Card id="top-products" title="پربازدیدترین محصولات" hint="فروش = تعداد فروخته‌شده همین محصول در همین بازه">
      {products.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[440px] text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className={th}>#</th>
                <th className={th}>محصول</th>
                <th className={th}>بازدید</th>
                <th className={th}>بازدیدکننده</th>
                <th className={th}>فروش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
              {products.map((p, i) => (
                <tr key={p.id}>
                  <td className={`${td} text-muted`}>{num(i + 1)}</td>
                  <td className={`${td} max-w-60 font-bold`}>
                    {p.exists ? (
                      <Link href={`/admin/products/${p.id}`} className="line-clamp-2 hover:text-brand">{p.name}</Link>
                    ) : (
                      <span className="text-muted">{p.name}</span>
                    )}
                  </td>
                  <td className={`${td} font-bold`}>{num(p.views)}</td>
                  <td className={td}>{num(p.visitors)}</td>
                  <td className={`${td} ${p.sold ? "font-bold text-success" : "text-muted"}`}>{num(p.sold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function EntryPages({ entries }: { entries: TrafficReport["entries"] }) {
  return (
    <Card id="entries" title="صفحه‌های ورود" hint="اولین صفحه‌ای که بازدیدکنندگان با آن وارد سایت شده‌اند">
      {entries.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-[13px]">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className={th}>صفحه</th>
                <th className={th}>ورود</th>
                <th className={th}>نرخ پرش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" style={{ fontVariantNumeric: "tabular-nums" }}>
              {entries.map((e) => (
                <tr key={e.path}>
                  <td className={`${td} max-w-64`}>
                    <PageName label={e.label} href={e.href} />
                  </td>
                  <td className={`${td} font-bold`}>{num(e.sessions)}</td>
                  <td className={`${td} ${e.bounceRate >= 70 ? "text-brand" : "text-muted"}`}>{one(e.bounceRate)}٪</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Searches({ searches }: { searches: TrafficReport["searches"] }) {
  return (
    <Card id="searches" title="جستجوهای بازدیدکنندگان" hint="عبارت‌هایی که در کادر جستجوی سایت نوشته‌اند؛ برای دیدن نتیجه روی هرکدام بزنید">
      {searches.length === 0 ? (
        <Empty text="در این بازه جستجویی ثبت نشده است." />
      ) : (
        <ul className="flex flex-wrap gap-2">
          {searches.map((s) => (
            <li key={s.term}>
              <a
                href={`/search?q=${encodeURIComponent(s.term)}`}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[13px] hover:border-brand hover:bg-brand-soft/40"
              >
                <span className="font-bold">{s.term}</span>
                <span className="rounded-full bg-surface px-2 text-[11px] text-muted">{num(s.views)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PageName({ label, href }: { label: string; href: string | null }) {
  if (!href) return <span className="line-clamp-1 font-bold">{label}</span>;
  return (
    <a href={href} target="_blank" rel="noopener" className="group flex items-center gap-1.5 font-bold hover:text-brand">
      <span className="line-clamp-1">{label}</span>
      <ExternalLink className="size-3 shrink-0 text-subtle opacity-0 group-hover:opacity-100" aria-hidden />
    </a>
  );
}
