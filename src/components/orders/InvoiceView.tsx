import { Fragment } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { faDigits, toman } from "@/lib/format";
import type { Invoice, InvoiceLine, InvoiceTone } from "@/lib/invoice";

const TONES: Record<InvoiceTone, string> = {
  green: "bg-success-soft text-success",
  red: "bg-brand-soft text-brand",
  amber: "bg-warning-soft text-warning",
  gray: "bg-surface text-muted",
};

function Lines({ rows }: { rows: InvoiceLine[] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[13px] leading-6">
      {rows.map((r) => (
        <Fragment key={r.label}>
          <dt className="whitespace-nowrap text-muted">{r.label}:</dt>
          <dd className={`break-words ${r.ltr ? "text-right" : ""}`} dir={r.ltr ? "ltr" : undefined}>
            {r.value}
          </dd>
        </Fragment>
      ))}
    </dl>
  );
}

function Box({ title, rows }: { title: string; rows: InvoiceLine[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line p-4">
      <h3 className="flex items-center gap-2 text-sm font-black">
        <span className="h-3.5 w-1 rounded-full bg-brand" aria-hidden />
        {title}
      </h3>
      <Lines rows={rows} />
    </section>
  );
}

/** The customer's invoice on the site; the PDF (`lib/invoice-pdf.ts`) shows the same `Invoice`. */
export function InvoiceView({ invoice: inv }: { invoice: Invoice }) {
  return (
    <article className="card relative overflow-hidden p-4 sm:p-6 lg:p-8" aria-label={`${inv.title} شماره ${inv.number}`}>
      {inv.stamp && (
        // Over everything and see-through, like the PDF's stamp. Opacity on the whole stamp (not a see-through colour)
        // keeps joined letters from showing darker where they overlap.
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden opacity-[0.14]">
          <span className="-rotate-[28deg] whitespace-nowrap rounded-[2rem] border-[6px] border-brand px-10 py-1 text-[64px] font-black text-brand sm:text-[110px]">
            {inv.stamp}
          </span>
        </div>
      )}

      <header className="grid gap-5 border-b-2 border-ink pb-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-night">
            <LogoMark className="h-6 w-10" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-lg font-black">{inv.seller.name}</span>
            <span className="text-right text-[11px] text-muted" dir="ltr">{inv.seller.latinName}</span>
            <span className="text-right text-[11px] text-muted" dir="ltr">{inv.seller.website}</span>
          </span>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-center">
          <h2 className="text-2xl font-black">{inv.title}</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${TONES[inv.status.tone]}`}>{inv.status.label}</span>
        </div>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 self-center rounded-xl border border-line px-4 py-2.5 text-xs sm:justify-self-end">
          <dt className="text-muted">شماره {inv.title}:</dt>
          <dd className="font-black">{inv.number}</dd>
          <dt className="text-muted">تاریخ صدور:</dt>
          <dd className="font-bold">{inv.issued}</dd>
        </dl>
      </header>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Box title="مشخصات فروشنده" rows={[{ label: "نام فروشگاه", value: inv.seller.name }, ...inv.seller.lines]} />
        <Box title="مشخصات خریدار" rows={inv.buyer} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {inv.meta.map((m) => (
          <div key={m.label} className="flex flex-col gap-1 bg-canvas p-3">
            <dt className="text-[11px] text-muted">{m.label}</dt>
            <dd className="text-[13px] font-extrabold">{m.value}</dd>
          </div>
        ))}
      </dl>

      {/* Items: a table from tablets up, one card per item on phones. */}
      <div className="mt-5 hidden overflow-hidden rounded-xl border border-line md:block">
        <table className="w-full text-[13px]">
          <thead className="bg-surface text-xs">
            <tr>
              <th className="w-12 px-3 py-3 text-center font-extrabold">ردیف</th>
              <th className="px-3 py-3 text-right font-extrabold">شرح کالا</th>
              <th className="px-3 py-3 text-center font-extrabold">کد کالا</th>
              <th className="px-3 py-3 text-center font-extrabold">تعداد</th>
              <th className="px-3 py-3 text-center font-extrabold">مبلغ واحد (تومان)</th>
              <th className="px-3 py-3 text-center font-extrabold">مبلغ کل (تومان)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {inv.items.map((item, i) => (
              <tr key={i} className="even:bg-canvas">
                <td className="px-3 py-3 text-center text-muted">{faDigits(i + 1)}</td>
                <td className="px-3 py-3 leading-6">{item.name}</td>
                <td className="px-3 py-3 text-center" dir="ltr">{item.sku}</td>
                <td className="px-3 py-3 text-center">{faDigits(item.quantity)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-center">{toman(item.unitPrice)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-center font-extrabold">{toman(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line md:hidden">
        {inv.items.map((item, i) => (
          <li key={i} className="flex flex-col gap-1.5 p-3 text-[13px]">
            <span className="flex gap-2 leading-6">
              <span className="text-muted">{faDigits(i + 1)}.</span>
              <span className="font-bold">{item.name}</span>
            </span>
            <span className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span>
                کد کالا: <span dir="ltr">{item.sku}</span>
              </span>
              <span>
                {faDigits(item.quantity)} × {toman(item.unitPrice)}
              </span>
            </span>
            <span className="self-end text-sm font-black">{toman(item.total)} تومان</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-line bg-canvas p-4">
            <h3 className="text-xs text-muted">مبلغ به حروف</h3>
            <p className="mt-1.5 text-sm font-black leading-7">{inv.total.words}</p>
          </section>
          {inv.customerNote && (
            <section className="rounded-xl border border-line p-4">
              <h3 className="text-xs text-muted">توضیحات سفارش</h3>
              <p className="mt-1.5 text-[13px] leading-7">{inv.customerNote}</p>
            </section>
          )}
        </div>
        <dl className="overflow-hidden rounded-xl border border-line text-[13px]">
          {inv.sums.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
              <dt className="text-muted">{s.label}</dt>
              <dd className={`whitespace-nowrap font-extrabold ${s.discount ? "text-brand" : ""}`}>{s.value}</dd>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3.5 text-white">
            <dt className="font-bold">{inv.total.label}</dt>
            <dd className="whitespace-nowrap text-base font-black">{inv.total.value}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Box title="اطلاعات پرداخت" rows={inv.payment} />
        <Box title="اطلاعات ارسال" rows={inv.shipment} />
      </div>

      <ul className="mt-5 flex flex-col gap-1.5 text-xs leading-6 text-muted">
        {inv.notes.map((note) => (
          <li key={note} className="flex gap-2">
            <span className="mt-2.5 size-1 shrink-0 rounded-full bg-muted" aria-hidden />
            {note}
          </li>
        ))}
      </ul>
    </article>
  );
}
