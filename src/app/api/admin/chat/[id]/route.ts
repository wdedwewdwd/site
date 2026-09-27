import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth/session";
import { conversationUserSelect, messageAuthorSelect, messageDTO, staffConversationDTO } from "@/lib/chat";
import { idSchema } from "@/lib/validation";
import { ORDER_STATUS } from "@/lib/shop";
import type { StaffCustomerInfo } from "@/lib/chat-types";

const COUNTED = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

/** One conversation for the staff panel: messages plus a short purchase history of the customer. */
export async function GET(_req: Request, ctx: RouteContext<"/api/admin/chat/[id]">) {
  if (!(await getStaff(["ADMIN", "SUPPORT"]))) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return new Response(null, { status: 404 });

  const conversation = await db.chatConversation.findUnique({ where: { id }, include: { user: conversationUserSelect } });
  if (!conversation) return new Response(null, { status: 404 });
  const messages = await db.chatMessage.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { author: messageAuthorSelect },
  });

  let customer: StaffCustomerInfo | null = null;
  if (conversation.userId) {
    const [orders, stats, user] = await Promise.all([
      db.order.findMany({
        where: { userId: conversation.userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { number: true, status: true, total: true, createdAt: true },
      }),
      db.order.aggregate({ where: { userId: conversation.userId, status: { in: [...COUNTED] } }, _count: true, _sum: { total: true } }),
      db.user.findUnique({ where: { id: conversation.userId }, select: { createdAt: true } }),
    ]);
    customer = {
      orders: orders.map((o) => ({ number: o.number, status: o.status, statusLabel: ORDER_STATUS[o.status].label, total: o.total, createdAt: o.createdAt.toISOString() })),
      orderCount: stats._count,
      totalSpent: stats._sum.total ?? 0,
      memberSince: user?.createdAt.toISOString() ?? null,
    };
  }

  return Response.json(
    { conversation: staffConversationDTO(conversation), messages: messages.reverse().map((m) => messageDTO(m, true)), customer },
    { headers: { "Cache-Control": "no-store" } },
  );
}
