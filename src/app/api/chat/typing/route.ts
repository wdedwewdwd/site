import { allowTyping, findCustomerConversation, getChatIdentity, publishTyping } from "@/lib/chat";
import { isSameOrigin } from "@/lib/sse";

/** "Customer is typing…" signal for staff. Best-effort and in-memory only. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const conversation = await findCustomerConversation(await getChatIdentity());
  if (conversation?.status === "OPEN" && allowTyping(`c:${conversation.id}`)) publishTyping(conversation.id, false);
  return new Response(null, { status: 204 });
}
