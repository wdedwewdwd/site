"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { phoneSchema, text } from "@/lib/validation";
import {
  CHAT_MAX_BODY,
  addChatMessage,
  findCustomerConversation,
  getChatIdentity,
  issueGuestKey,
  messageDTO,
  publishChange,
} from "@/lib/chat";
import { saveChatImage } from "@/lib/uploads";
import type { ChatActionResult } from "@/lib/chat-types";

const bodySchema = text(CHAT_MAX_BODY, 0);
const contactSchema = z.object({
  name: text(60, 2),
  phone: phoneSchema,
});

const tooMany = (sec: number) => ({ ok: false as const, error: `تعداد پیام‌ها زیاد است؛ ${sec > 60 ? "چند دقیقه" : "چند ثانیه"} دیگر دوباره تلاش کنید.` });

/** Page the customer started the chat from (same-site path only). */
function startedFrom(value: FormDataEntryValue | null) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v.slice(0, 200) : null;
}

/**
 * Sends a customer message. Starts a new conversation when there is none (or the last one was closed);
 * guests must give a name and mobile number first so support can call them back.
 */
export async function sendChatMessage(formData: FormData): Promise<ChatActionResult> {
  const identity = await getChatIdentity();
  const body = bodySchema.safeParse(formData.get("body") ?? "");
  if (!body.success) return { ok: false, error: `متن پیام حداکثر ${CHAT_MAX_BODY.toLocaleString("fa-IR")} کاراکتر است.` };
  const file = formData.get("image");
  const image = file instanceof File && file.size > 0 ? file : null;
  if (!body.data && !image) return { ok: false, error: "متن پیام را بنویسید." };

  const ip = await clientIp();
  const ipLimit = await rateLimit(`chat-ip:${ip}`, 60, 60);
  if (!ipLimit.ok) return tooMany(ipLimit.retryAfterSec);

  let conversation = await findCustomerConversation(identity);
  if (!conversation || conversation.status === "CLOSED") {
    let guest: { guestName: string; guestPhone: string } | null = null;
    if (!identity.user) {
      // A returning guest keeps the contact details from their previous chat.
      const contact = conversation?.guestName && conversation.guestPhone
        ? { success: true as const, data: { name: conversation.guestName, phone: conversation.guestPhone } }
        : contactSchema.safeParse({ name: formData.get("name") ?? "", phone: formData.get("phone") ?? "" });
      if (!contact.success) {
        const issue = contact.error.issues[0];
        return { ok: false, needsContact: true, error: issue?.path[0] === "name" ? "نام خود را وارد کنید." : (issue?.message ?? "شماره موبایل معتبر نیست") };
      }
      guest = { guestName: contact.data.name, guestPhone: contact.data.phone };
    }
    const startLimit = await rateLimit(`chat-start:${identity.user?.id ?? ip}`, 5, 3600);
    if (!startLimit.ok) return { ok: false, error: "تعداد گفتگوهای جدید زیاد است؛ کمی بعد دوباره تلاش کنید." };

    conversation = await db.chatConversation.create({
      data: {
        userId: identity.user?.id ?? null,
        guestKeyHash: identity.user ? null : await issueGuestKey(),
        ...guest,
        startedFrom: startedFrom(formData.get("page")),
      },
    });
  }

  const limit = await rateLimit(`chat-msg:${conversation.id}`, 20, 60);
  if (!limit.ok) return tooMany(limit.retryAfterSec);

  let imageName: string | null = null;
  if (image) {
    const imageLimit = await rateLimit(`chat-img:${conversation.id}`, 15, 3600);
    if (!imageLimit.ok) return { ok: false, error: "تعداد تصاویر ارسالی زیاد است؛ کمی بعد دوباره تلاش کنید." };
    const saved = await saveChatImage(image);
    if (!saved.ok) return { ok: false, error: saved.error };
    imageName = saved.name;
  }

  const message = await addChatMessage({
    conversationId: conversation.id,
    fromStaff: false,
    authorId: identity.user?.id ?? null,
    body: body.data,
    image: imageName,
  });
  return { ok: true, message: messageDTO(message, false) };
}

/** Marks support's replies as read by the customer (drives the "seen" ticks in the admin panel). */
export async function markChatRead() {
  const conversation = await findCustomerConversation(await getChatIdentity());
  if (!conversation || conversation.customerUnread === 0) return;
  await db.chatConversation.update({ where: { id: conversation.id }, data: { customerUnread: 0, customerReadAt: new Date() } });
  publishChange(conversation.id);
}
