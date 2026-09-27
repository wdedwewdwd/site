import { db } from "@/lib/db";
import { customerStateDTO, findCustomerConversation, getChatIdentity, isStaffOnline, messageDTO } from "@/lib/chat";
import type { CustomerChatSnapshot } from "@/lib/chat-types";

/** The visitor's own chat: conversation state and its latest messages. */
export async function GET() {
  const identity = await getChatIdentity();
  const conversation = await findCustomerConversation(identity);
  const messages = conversation
    ? await db.chatMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "desc" }, take: 150 })
    : [];
  const name = identity.user ? [identity.user.firstName, identity.user.lastName].filter(Boolean).join(" ") || null : null;

  const body: CustomerChatSnapshot = {
    me: { loggedIn: !!identity.user, name },
    online: isStaffOnline(),
    conversation: conversation ? { ...customerStateDTO(conversation), number: conversation.number } : null,
    messages: messages.reverse().map((m) => messageDTO(m, false)),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
