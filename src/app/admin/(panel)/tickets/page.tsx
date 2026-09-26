import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDateTime, faDigits } from "@/lib/format";
import { TICKET_STATUS } from "@/lib/shop";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";

export const metadata = { title: "تیکت‌های پشتیبانی" };

export default async function AdminTicketsPage() {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const tickets = await db.ticket.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    take: 100,
    include: { user: { select: { firstName: true, lastName: true, phone: true } } },
  });
  return (
    <>
      <PageHeader title="تیکت‌های پشتیبانی" />
      <HelpBox
        items={[
          "درخواست‌های پشتیبانی و شکایات مشتری‌ها اینجا ثبت می‌شود. تیکت‌های «در انتظار پاسخ» بالاتر نمایش داده می‌شوند.",
          "روی هر تیکت بزنید، پاسخ را بنویسید و ارسال کنید؛ مشتری اعلان دریافت می‌کند.",
          "اگر مشکل حل شد، هنگام ارسال پاسخ تیک «بستن تیکت» را بزنید.",
        ]}
      />
      <div className="card divide-y divide-line">
        {tickets.length === 0 && <p className="p-8 text-center text-sm text-muted">تیکتی وجود ندارد.</p>}
        {tickets.map((t) => (
          <Link key={t.id} href={`/admin/tickets/${t.number}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-canvas">
            <span className="flex flex-col gap-1">
              <span className="text-sm font-extrabold">{t.subject}</span>
              <span className="text-xs text-muted">
                #{faDigits(t.number)} · {t.category} · {[t.user.firstName, t.user.lastName].filter(Boolean).join(" ") || faDigits(t.user.phone)} · {faDateTime(t.updatedAt)}
              </span>
            </span>
            <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${TICKET_STATUS[t.status].cls}`}>{TICKET_STATUS[t.status].label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
