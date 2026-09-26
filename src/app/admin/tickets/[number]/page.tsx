import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { staffReply } from "@/app/actions/admin/misc";
import { faDateTime, faDigits } from "@/lib/format";
import { TICKET_STATUS } from "@/lib/shop";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "تیکت" };

export default async function AdminTicketPage({ params }: PageProps<"/admin/tickets/[number]">) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const ticket = await db.ticket.findUnique({
    where: { number },
    include: { user: { select: { firstName: true, lastName: true, phone: true } }, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  return (
    <>
      <PageHeader title={ticket.subject}>
        <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${TICKET_STATUS[ticket.status].cls}`}>{TICKET_STATUS[ticket.status].label}</span>
      </PageHeader>
      <div className="card flex flex-col gap-5 p-5">
        <p className="text-xs text-muted">
          #{faDigits(ticket.number)} · {ticket.category} · {[ticket.user.firstName, ticket.user.lastName].filter(Boolean).join(" ")} (<span dir="ltr">{faDigits(ticket.user.phone)}</span>)
          {ticket.orderRef && <> · سفارش #{faDigits(ticket.orderRef)}</>}
        </p>
        <ol className="flex flex-col gap-3">
          {ticket.messages.map((m) => (
            <li key={m.id} className={`flex max-w-[85%] flex-col gap-2 rounded-2xl p-4 ${m.fromStaff ? "mr-auto bg-brand-soft" : "ml-auto bg-surface"}`}>
              <span className="text-xs font-bold">{m.fromStaff ? "پشتیبان" : "مشتری"}</span>
              <p className="whitespace-pre-line text-sm leading-7">{m.body}</p>
              <span className="text-[11px] text-muted">{faDateTime(m.createdAt)}</span>
            </li>
          ))}
        </ol>
        {ticket.status !== "CLOSED" && (
          <ActionForm action={staffReply} submitLabel="ارسال پاسخ" className="flex flex-col gap-3" resetOnSuccess>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea name="body" rows={4} maxLength={3000} required placeholder="پاسخ به مشتری..." aria-label="پاسخ" className="input resize-y" />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="close" className="accent-brand" /> بستن تیکت پس از ارسال</label>
          </ActionForm>
        )}
      </div>
    </>
  );
}
