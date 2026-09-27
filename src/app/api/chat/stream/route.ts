import { db } from "@/lib/db";
import { chatBus, convChannel, customerStateDTO, findCustomerConversation, getChatIdentity, messageDTO } from "@/lib/chat";
import { parseCursor, sseResponse, waitForEvent } from "@/lib/sse";

const STREAM_MS = 5 * 60 * 1000;
const POLL_MS = 4000;

/** Live updates for the visitor's own conversation: new messages, typing, read/closed state. */
export async function GET(request: Request) {
  const conversation = await findCustomerConversation(await getChatIdentity());
  // 204 tells EventSource to stop reconnecting: there is nothing to follow yet.
  if (!conversation) return new Response(null, { status: 204 });
  const channel = convChannel(conversation.id);
  let cursor = parseCursor(request);

  return sseResponse(request.signal, async (io) => {
    const sent = new Set<string>();
    let lastState = "";
    const onBus = (e: { type: string }) => {
      if (e.type === "typing") io.send("typing", {});
    };
    chatBus.on(channel, onBus);
    try {
      const deadline = Date.now() + STREAM_MS;
      while (!io.closed && Date.now() < deadline) {
        const [messages, state] = await Promise.all([
          db.chatMessage.findMany({
            // A small overlap covers rows committed out of order; duplicates are skipped by id.
            where: { conversationId: conversation.id, createdAt: { gt: new Date(cursor.getTime() - 3000) } },
            orderBy: { createdAt: "asc" },
            take: 100,
          }),
          db.chatConversation.findUnique({ where: { id: conversation.id }, select: { status: true, staffReadAt: true, customerUnread: true } }),
        ]);
        if (!state) {
          io.send("state", { status: "CLOSED", staffReadAt: null, unread: 0, online: false });
          break;
        }
        for (const m of messages) {
          if (sent.has(m.id)) continue;
          sent.add(m.id);
          if (m.createdAt > cursor) cursor = m.createdAt;
          io.send("message", messageDTO(m, false), cursor.toISOString());
        }
        const s = JSON.stringify(customerStateDTO(state));
        if (s !== lastState) {
          lastState = s;
          io.send("state", JSON.parse(s));
        }
        await waitForEvent(chatBus, channel, POLL_MS, request.signal);
      }
    } finally {
      chatBus.off(channel, onBus);
    }
  });
}
