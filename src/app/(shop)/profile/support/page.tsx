import Link from "next/link";
import { Headset, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDate, faDigits } from "@/lib/format";
import { SITE, TICKET_STATUS } from "@/lib/shop";
import { PageBar } from "@/components/layout/PageBar";


export default async function SupportPage() {
  const user = await requireUser("/profile/support");
  const tickets = await db.ticket.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 50 });

  return (
    <>
      <PageBar title="پشتیبانی" backHref="/profile" crumbs={[{ href: "/profile", label: "حساب کاربری" }]} />
    <div className="flex flex-col gap-5">
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand"><Headset className="size-6" /></span>
          <div className="flex flex-col gap-1">
            <h1 className="sr-only text-lg font-black md:not-sr-only">پشتیبانی</h1>
            <p className="text-xs text-muted">تلفن: {SITE.supportPhone} — {SITE.supportHours}</p>
          </div>
        </div>
        <Link href="/profile/support/new" className="btn-primary"><Plus className="size-4" /> ثبت تیکت جدید</Link>
      </section>

      <section className="card flex flex-col gap-3 p-5" aria-labelledby="tickets">
        <h2 id="tickets" className="text-base font-black">تیکت‌های من</h2>
        {tickets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">تیکتی ثبت نکرده‌اید.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((t) => (
              <li key={t.id}>
                <Link href={`/profile/support/${t.number}`} className="flex flex-wrap items-center justify-between gap-3 py-3 hover:bg-canvas">
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-extrabold">{t.subject}</span>
                    <span className="text-xs text-muted">#{faDigits(t.number)} · {t.category} · {faDate(t.updatedAt)}</span>
                  </span>
                  <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
    </>
  );
}
