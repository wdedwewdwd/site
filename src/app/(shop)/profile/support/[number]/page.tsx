import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDateTime, faDigits } from "@/lib/format";
import { replyTicket } from "@/app/actions/support";
import { ReplyForm } from "@/components/support/ReplyForm";
import { TICKET_STATUS } from "@/lib/shop";
import { PageBar } from "@/components/layout/PageBar";

export default async function TicketPage({ params }: PageProps<"/profile/support/[number]">) {
  const user = await requireUser("/profile/support");
  const number = Number((await params).number);
  if (!Number.isSafeInteger(number) || number < 1) notFound();
  const ticket = await db.ticket.findFirst({
    where: { number, userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!ticket) notFound();

  return (
    <>
      <PageBar title={`تیکت #${faDigits(ticket.number)}`} backHref="/profile/support" crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/support", label: "پشتیبانی" }]} />
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="sr-only text-lg font-black md:not-sr-only">{ticket.subject}</h1>
          <p className="text-xs text-muted">
            تیکت #{faDigits(ticket.number)} · {ticket.category}
            {ticket.orderRef && <> · سفارش #{faDigits(ticket.orderRef)}</>}
          </p>
        </div>
        <span className={`rounded-md px-2.5 py-1 text-[11px] font-bold ${TICKET_STATUS[ticket.status].cls}`}>{TICKET_STATUS[ticket.status].label}</span>
      </div>
      <ol className="flex flex-col gap-3">
        {ticket.messages.map((m) => (
          <li key={m.id} className={`flex max-w-[85%] flex-col gap-2 rounded-2xl p-4 ${m.fromStaff ? "mr-auto bg-surface" : "ml-auto bg-brand-soft"}`}>
            <span className="text-xs font-bold">{m.fromStaff ? "پشتیبان آریزون یدک" : "شما"}</span>
            <p className="whitespace-pre-line text-sm leading-7">{m.body}</p>
            <span className="text-[11px] text-muted">{faDateTime(m.createdAt)}</span>
          </li>
        ))}
      </ol>
      {ticket.status !== "CLOSED" && <ReplyForm ticketId={ticket.id} action={replyTicket} />}
    </div>
    </>
  );
}
