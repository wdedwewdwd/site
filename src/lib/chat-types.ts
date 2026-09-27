/** Shapes shared by the chat API routes, server actions and client components. */

export type ChatStatusValue = "OPEN" | "CLOSED";

export type ChatMessageDTO = {
  id: string;
  conversationId: string;
  fromStaff: boolean;
  system: boolean;
  body: string;
  image: string | null;
  createdAt: string;
  /** Staff view only: which colleague wrote a reply. */
  authorName: string | null;
};

export type CustomerChatState = {
  status: ChatStatusValue;
  /** When support last read the conversation ("seen" ticks). */
  staffReadAt: string | null;
  unread: number;
  online: boolean;
};

export type CustomerChatSnapshot = {
  me: { loggedIn: boolean; name: string | null };
  online: boolean;
  conversation: (CustomerChatState & { number: number }) | null;
  messages: ChatMessageDTO[];
};

export type StaffConversationDTO = {
  id: string;
  number: number;
  name: string;
  phone: string | null;
  userId: string | null;
  isGuest: boolean;
  status: ChatStatusValue;
  staffUnread: number;
  customerReadAt: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  startedFrom: string | null;
  createdAt: string;
};

export type StaffCustomerInfo = {
  orders: { number: number; status: string; statusLabel: string; total: number; createdAt: string }[];
  orderCount: number;
  totalSpent: number;
  memberSince: string | null;
};

export type ChatActionResult =
  | { ok: true; message: ChatMessageDTO }
  | { ok: false; error: string; needsContact?: boolean };

export const CHAT_MAX_IMAGE_BYTES = 4 * 1024 * 1024;
