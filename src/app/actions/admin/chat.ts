"use server";

import { rm } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { idSchema, text } from "@/lib/validation";
import { CHAT_MAX_BODY, addChatMessage, messageDTO, publishChange } from "@/lib/chat";
import { CHAT_IMAGE_NAME, UPLOAD_DIR, saveChatImage } from "@/lib/uploads";
import type { ChatActionResult } from "@/lib/chat-types";

const bodySchema = text(CHAT_MAX_BODY, 0);

export async function staffSendChat(formData: FormData): Promise<ChatActionResult> {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const id = idSchema.safeParse(formData.get("conversationId"));
  const body = bodySchema.safeParse(formData.get("body") ?? "");
  if (!id.success) return { ok: false, error: "گفتگو یافت نشد." };
  if (!body.success) return { ok: false, error: `متن پیام حداکثر ${CHAT_MAX_BODY.toLocaleString("fa-IR")} کاراکتر است.` };
  const file = formData.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  if (!body.data && !image) return { ok: false, error: "متن پیام را بنویسید." };

  const conversation = await db.chatConversation.findUnique({ where: { id: id.data } });
  if (!conversation) return { ok: false, error: "گفتگو یافت نشد." };
  if (conversation.status === "CLOSED") return { ok: false, error: "این گفتگو بسته شده است؛ برای پاسخ، ابتدا آن را دوباره باز کنید." };

  const limit = await rateLimit(`staff-chat:${staff.id}`, 60, 60);
  if (!limit.ok) return { ok: false, error: "تعداد پیام‌ها زیاد است؛ چند ثانیه صبر کنید." };

  let imageName: string | null = null;
  if (image) {
    const saved = await saveChatImage(image);
    if (!saved.ok) return { ok: false, error: saved.error };
    imageName = saved.name;
  }

  const message = await addChatMessage({ conversationId: conversation.id, fromStaff: true, authorId: staff.id, body: body.data, image: imageName });
  // Signed-in customers also get a site notification for the first unread reply.
  if (conversation.userId && conversation.customerUnread === 0) {
    await db.notification.create({
      data: { userId: conversation.userId, title: "پاسخ پشتیبانی در گفتگوی آنلاین", body: body.data.slice(0, 120) || "یک تصویر برای شما ارسال شد.", href: "/contact?chat=1" },
    });
  }
  return { ok: true, message: messageDTO(message, true) };
}

export async function staffMarkChatRead(conversationId: string) {
  await requireStaff(["ADMIN", "SUPPORT"]);
  if (!idSchema.safeParse(conversationId).success) return;
  const { count } = await db.chatConversation.updateMany({
    where: { id: conversationId, staffUnread: { gt: 0 } },
    data: { staffUnread: 0, staffReadAt: new Date() },
  });
  if (count) publishChange(conversationId);
}

export async function staffSetChatStatus(conversationId: string, status: "OPEN" | "CLOSED") {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  if (!idSchema.safeParse(conversationId).success || !["OPEN", "CLOSED"].includes(status)) return { ok: false };
  const conversation = await db.chatConversation.findUnique({ where: { id: conversationId } });
  if (!conversation || conversation.status === status) return { ok: false };

  await db.chatConversation.update({
    where: { id: conversationId },
    data: status === "CLOSED" ? { status, closedAt: new Date(), staffUnread: 0 } : { status, closedAt: null },
  });
  await addChatMessage({
    conversationId,
    fromStaff: true,
    authorId: staff.id,
    system: true,
    body: status === "CLOSED" ? "این گفتگو توسط پشتیبانی بسته شد. برای سؤال جدید کافی است دوباره پیام بدهید." : "گفتگو دوباره باز شد.",
  });
  await audit(staff.id, status === "CLOSED" ? "chat.close" : "chat.reopen", "ChatConversation", conversationId);
  return { ok: true };
}

/** Permanently deletes a conversation and its photos (e.g. spam). Admins only. */
export async function deleteChatConversation(conversationId: string) {
  const admin = await requireStaff(["ADMIN"]);
  if (!idSchema.safeParse(conversationId).success) return { ok: false };
  const images = await db.chatMessage.findMany({ where: { conversationId, image: { not: null } }, select: { image: true } });
  const deleted = await db.chatConversation.deleteMany({ where: { id: conversationId } });
  if (!deleted.count) return { ok: false };
  const dir = path.join(UPLOAD_DIR, "chat");
  for (const { image } of images) if (image && CHAT_IMAGE_NAME.test(image)) await rm(path.join(dir, image), { force: true });
  publishChange(conversationId);
  await audit(admin.id, "chat.delete", "ChatConversation", conversationId);
  return { ok: true };
}
