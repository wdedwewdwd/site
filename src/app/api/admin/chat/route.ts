import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth/session";
import { conversationUserSelect, staffConversationDTO, staffUnreadTotal } from "@/lib/chat";
import { normalizePhone, toEnDigits } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

/** Staff inbox: conversations filtered by status and an optional search (name, mobile or #number). */
export async function GET(request: Request) {
  if (!(await getStaff(["ADMIN", "SUPPORT"]))) return new Response(null, { status: 401 });
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const q = toEnDigits((params.get("q") ?? "").trim()).slice(0, 60);

  const where: Prisma.ChatConversationWhereInput = {};
  if (status === "open") where.status = "OPEN";
  else if (status === "closed") where.status = "CLOSED";
  else if (status === "unread") Object.assign(where, { status: "OPEN", staffUnread: { gt: 0 } });
  if (q) {
    const number = /^#?\d{1,9}$/.test(q) ? Number(q.replace("#", "")) : null;
    const phone = normalizePhone(q);
    where.OR = [
      ...(number ? [{ number }] : []),
      ...(phone ? [{ guestPhone: phone }, { user: { phone } }] : [{ guestPhone: { contains: q } }, { user: { phone: { contains: q } } }]),
      { guestName: { contains: q, mode: "insensitive" } },
      { user: { firstName: { contains: q, mode: "insensitive" } } },
      { user: { lastName: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, unread] = await Promise.all([
    db.chatConversation.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: 100, include: { user: conversationUserSelect } }),
    staffUnreadTotal(),
  ]);
  return Response.json({ conversations: rows.map(staffConversationDTO), unread }, { headers: { "Cache-Control": "no-store" } });
}
