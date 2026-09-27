import "server-only";
import { EventEmitter } from "node:events";
import { cookies } from "next/headers";
import { db } from "./db";
import { env, isProd } from "./env";
import { hmac, randomToken } from "./crypto";
import { getUser } from "./auth/session";
import type { ChatConversation, ChatMessage } from "@/generated/prisma/client";
import type { ChatMessageDTO, CustomerChatState, StaffConversationDTO } from "./chat-types";

/** Guests (not signed in) are recognised by a random httpOnly cookie; only its HMAC is stored. */
export const CHAT_GUEST_COOKIE = isProd ? "__Host-ay_chat" : "ay_chat";
const GUEST_COOKIE_DAYS = 90;
export const CHAT_MAX_BODY = 2000;

// ─── In-process event bus ───────────────────────────────────
// Wakes open SSE streams instantly. Streams also re-check the database every few seconds,
// so messages still arrive (slightly later) if the app ever runs on several instances.

type BusEvent = { type: "wake" } | { type: "typing"; conversationId: string };

const g = globalThis as unknown as { __chatBus?: EventEmitter; __chatPresence?: { streams: number; lastSeen: number } };
export const chatBus: EventEmitter =
  g.__chatBus ??
  (g.__chatBus = (() => {
    const e = new EventEmitter();
    e.setMaxListeners(0);
    return e;
  })());

export const convChannel = (conversationId: string) => `conv:${conversationId}`;
export const STAFF_CHANNEL = "staff";

export function publishChange(conversationId: string) {
  chatBus.emit(convChannel(conversationId), { type: "wake" } satisfies BusEvent);
  chatBus.emit(STAFF_CHANNEL, { type: "wake" } satisfies BusEvent);
}

export function publishTyping(conversationId: string, fromStaff: boolean) {
  chatBus.emit(fromStaff ? convChannel(conversationId) : STAFF_CHANNEL, { type: "typing", conversationId } satisfies BusEvent);
}

// ─── Staff presence ─────────────────────────────────────────
// Support counts as online while any staff member has the admin panel open (it keeps a live stream).

const presence = g.__chatPresence ?? (g.__chatPresence = { streams: 0, lastSeen: 0 });

export function staffStreamOpened() {
  presence.streams++;
  presence.lastSeen = Date.now();
}
export function staffStreamClosed() {
  presence.streams = Math.max(0, presence.streams - 1);
  presence.lastSeen = Date.now();
}
export const isStaffOnline = () => presence.streams > 0 || Date.now() - presence.lastSeen < 60_000;

// ─── Customer identity ──────────────────────────────────────

const hashGuestToken = (token: string) => hmac(env.SESSION_SECRET, `chat-guest:${token}`);

export async function getChatIdentity() {
  const user = await getUser();
  const token = (await cookies()).get(CHAT_GUEST_COOKIE)?.value;
  const guestHash = token && token.length <= 128 ? hashGuestToken(token) : null;
  return { user, guestHash };
}
export type ChatIdentity = Awaited<ReturnType<typeof getChatIdentity>>;

/** Issues a fresh guest cookie and returns the hash to store on the new conversation. */
export async function issueGuestKey() {
  const token = randomToken(32);
  (await cookies()).set(CHAT_GUEST_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: GUEST_COOKIE_DAYS * 24 * 60 * 60,
  });
  return hashGuestToken(token);
}

/** The customer's latest conversation (open, or the last closed one so its history stays visible). */
export async function findCustomerConversation({ user, guestHash }: ChatIdentity) {
  const guest = guestHash ? await db.chatConversation.findUnique({ where: { guestKeyHash: guestHash } }) : null;
  if (!user) return guest;

  const own = await db.chatConversation.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  // A chat started as a guest moves into the account once the customer signs in on the same browser.
  if (guest && !guest.userId && (!own || guest.createdAt > own.createdAt)) {
    return db.chatConversation.update({ where: { id: guest.id }, data: { userId: user.id, guestKeyHash: null } });
  }
  return own;
}

// ─── Messages ───────────────────────────────────────────────

type MessageRow = ChatMessage & { author?: { firstName: string | null; lastName: string | null } | null };

export const chatImageUrl = (name: string) => `/api/chat/media/${name}`;

/** Customers only ever see "support"; staff also see which colleague wrote each reply. */
export function messageDTO(m: MessageRow, forStaff: boolean): ChatMessageDTO {
  const authorName = forStaff && m.fromStaff && m.author ? [m.author.firstName, m.author.lastName].filter(Boolean).join(" ") || null : null;
  return {
    id: m.id,
    conversationId: m.conversationId,
    fromStaff: m.fromStaff,
    system: m.system,
    body: m.body,
    image: m.image ? chatImageUrl(m.image) : null,
    createdAt: m.createdAt.toISOString(),
    authorName,
  };
}

export function customerStateDTO(c: Pick<ChatConversation, "status" | "staffReadAt" | "customerUnread">): CustomerChatState {
  return { status: c.status, staffReadAt: c.staffReadAt?.toISOString() ?? null, unread: c.customerUnread, online: isStaffOnline() };
}

type ConversationRow = ChatConversation & { user: { firstName: string | null; lastName: string | null; phone: string } | null };

export function staffConversationDTO(c: ConversationRow): StaffConversationDTO {
  const userName = c.user ? [c.user.firstName, c.user.lastName].filter(Boolean).join(" ") : "";
  return {
    id: c.id,
    number: c.number,
    name: userName || c.guestName || c.user?.phone || "مهمان",
    phone: c.user?.phone ?? c.guestPhone,
    userId: c.userId,
    isGuest: !c.userId,
    status: c.status,
    staffUnread: c.staffUnread,
    customerReadAt: c.customerReadAt?.toISOString() ?? null,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt.toISOString(),
    startedFrom: c.startedFrom,
    createdAt: c.createdAt.toISOString(),
  };
}

export const conversationUserSelect = { select: { firstName: true, lastName: true, phone: true } } as const;
export const messageAuthorSelect = { select: { firstName: true, lastName: true } } as const;

/** Stores a message, updates the conversation's unread counters and preview, and wakes live streams. */
export async function addChatMessage(input: {
  conversationId: string;
  fromStaff: boolean;
  authorId: string | null;
  body: string;
  image?: string | null;
  system?: boolean;
}) {
  const now = new Date();
  const preview = input.body ? input.body.slice(0, 140) : input.image ? "📷 تصویر" : "";
  const counters = input.system
    ? {}
    : input.fromStaff
      ? { customerUnread: { increment: 1 }, staffUnread: 0, staffReadAt: now }
      : { staffUnread: { increment: 1 }, customerUnread: 0, customerReadAt: now };

  const [message] = await db.$transaction([
    db.chatMessage.create({
      data: {
        conversationId: input.conversationId,
        fromStaff: input.fromStaff,
        system: input.system ?? false,
        authorId: input.authorId,
        body: input.body,
        image: input.image ?? null,
        createdAt: now,
      },
      include: { author: messageAuthorSelect },
    }),
    db.chatConversation.update({
      where: { id: input.conversationId },
      data: { lastMessage: preview, lastMessageAt: now, ...counters },
    }),
  ]);
  publishChange(input.conversationId);
  return message;
}

export const staffUnreadTotal = () => db.chatConversation.count({ where: { status: "OPEN", staffUnread: { gt: 0 } } });

// ─── Typing throttle ────────────────────────────────────────

const typingSeen = new Map<string, number>();
/** At most one typing event per sender every 2 seconds (in memory; typing is best-effort). */
export function allowTyping(key: string) {
  const now = Date.now();
  if ((typingSeen.get(key) ?? 0) > now - 2000) return false;
  typingSeen.set(key, now);
  if (typingSeen.size > 5000) for (const [k, t] of typingSeen) if (t < now - 10_000) typingSeen.delete(k);
  return true;
}
