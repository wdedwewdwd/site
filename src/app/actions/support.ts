"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { idSchema, text } from "@/lib/validation";
import { TICKET_CATEGORIES } from "@/lib/shop";

export type TicketState = { ok: boolean; error?: string; errors?: Record<string, string> } | null;

const ticketSchema = z.object({
  subject: text(100, 5),
  category: z.enum(TICKET_CATEGORIES),
  orderRef: z.union([z.literal(""), z.string().regex(/^\d{1,10}$/, "شماره سفارش معتبر نیست")]),
  body: text(3000, 10),
});

export async function createTicket(_: TicketState, formData: FormData): Promise<TicketState> {
  const user = await requireUser("/support");
  const parsed = ticketSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors };
  }
  const rl = await rateLimit(`ticket:${user.id}`, 5, 3600);
  if (!rl.ok) return { ok: false, error: "تعداد تیکت‌های شما در یک ساعت گذشته زیاد است." };

  const { body, orderRef, ...rest } = parsed.data;
  const ticket = await db.ticket.create({
    data: { ...rest, orderRef: orderRef || null, userId: user.id, messages: { create: { body, authorId: user.id } } },
  });
  redirect(`/support/${ticket.number}`);
}

const replySchema = z.object({ ticketId: idSchema, body: text(3000, 2) });

export async function replyTicket(_: TicketState, formData: FormData): Promise<TicketState> {
  const user = await requireUser("/support");
  const parsed = replySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "متن پیام را وارد کنید." };
  const rl = await rateLimit(`ticket-reply:${user.id}`, 30, 3600);
  if (!rl.ok) return { ok: false, error: "تعداد پیام‌ها زیاد است؛ کمی بعد تلاش کنید." };

  const ticket = await db.ticket.findFirst({ where: { id: parsed.data.ticketId, userId: user.id } });
  if (!ticket) return { ok: false, error: "تیکت یافت نشد." };
  if (ticket.status === "CLOSED") return { ok: false, error: "این تیکت بسته شده است." };

  await db.$transaction([
    db.ticketMessage.create({ data: { ticketId: ticket.id, body: parsed.data.body, authorId: user.id } }),
    db.ticket.update({ where: { id: ticket.id }, data: { status: "OPEN" } }),
  ]);
  revalidatePath(`/support/${ticket.number}`);
  return { ok: true };
}
