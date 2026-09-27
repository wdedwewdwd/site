import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth/session";
import {
  STAFF_CHANNEL,
  chatBus,
  conversationUserSelect,
  messageAuthorSelect,
  messageDTO,
  staffConversationDTO,
  staffStreamClosed,
  staffStreamOpened,
  staffUnreadTotal,
} from "@/lib/chat";
import { parseCursor, sseResponse, waitForEvent } from "@/lib/sse";

const STREAM_MS = 5 * 60 * 1000;
const POLL_MS = 4000;

/**
 * One live stream per open admin tab: changed conversations, new messages in any conversation,
 * customer typing, and the unread total for the menu badge. While it is open, support shows as online.
 */
export async function GET(request: Request) {
  if (!(await getStaff(["ADMIN", "SUPPORT"]))) return new Response(null, { status: 401 });
  let cursor = parseCursor(request);

  return sseResponse(request.signal, async (io) => {
    staffStreamOpened();
    const sentMessages = new Set<string>();
    const sentConversations = new Map<string, number>();
    let lastUnread = -1;
    const onBus = (e: { type: string; conversationId?: string }) => {
      if (e.type === "typing" && e.conversationId) io.send("typing", { conversationId: e.conversationId });
    };
    chatBus.on(STAFF_CHANNEL, onBus);
    try {
      const deadline = Date.now() + STREAM_MS;
      while (!io.closed && Date.now() < deadline) {
        const since = new Date(cursor.getTime() - 3000);
        const [conversations, messages] = await Promise.all([
          db.chatConversation.findMany({ where: { updatedAt: { gt: since } }, orderBy: { updatedAt: "asc" }, take: 200, include: { user: conversationUserSelect } }),
          db.chatMessage.findMany({ where: { createdAt: { gt: since } }, orderBy: { createdAt: "asc" }, take: 200, include: { author: messageAuthorSelect } }),
        ]);
        let changed = false;
        for (const c of conversations) {
          if (sentConversations.get(c.id) === c.updatedAt.getTime()) continue;
          sentConversations.set(c.id, c.updatedAt.getTime());
          if (c.updatedAt > cursor) cursor = c.updatedAt;
          io.send("conversation", staffConversationDTO(c), cursor.toISOString());
          changed = true;
        }
        for (const m of messages) {
          if (sentMessages.has(m.id)) continue;
          sentMessages.add(m.id);
          if (m.createdAt > cursor) cursor = m.createdAt;
          io.send("message", messageDTO(m, true), cursor.toISOString());
        }
        if (changed || lastUnread < 0) {
          const unread = await staffUnreadTotal();
          if (unread !== lastUnread) {
            lastUnread = unread;
            io.send("unread", { total: unread }, cursor.toISOString());
          }
        }
        await waitForEvent(chatBus, STAFF_CHANNEL, POLL_MS, request.signal);
      }
    } finally {
      chatBus.off(STAFF_CHANNEL, onBus);
      staffStreamClosed();
    }
  });
}
