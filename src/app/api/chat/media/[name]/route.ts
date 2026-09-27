import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth/session";
import { getChatIdentity } from "@/lib/chat";
import { CHAT_IMAGE_NAME, UPLOAD_DIR } from "@/lib/uploads";

const notFound = () => new Response("Not found", { status: 404 });

/** Chat photos are private: only staff and the customer who owns the conversation can open them. */
export async function GET(_req: Request, ctx: RouteContext<"/api/chat/media/[name]">) {
  const { name } = await ctx.params;
  if (!CHAT_IMAGE_NAME.test(name)) return notFound();

  const message = await db.chatMessage.findFirst({
    where: { image: name },
    select: { conversation: { select: { userId: true, guestKeyHash: true } } },
  });
  if (!message) return notFound();

  const staff = await getStaff(["ADMIN", "SUPPORT"]);
  if (!staff) {
    const { user, guestHash } = await getChatIdentity();
    const { userId, guestKeyHash } = message.conversation;
    const owns = (user && userId === user.id) || (guestHash && guestKeyHash === guestHash);
    if (!owns) return notFound();
  }

  const dir = path.join(UPLOAD_DIR, "chat");
  const full = path.join(dir, name);
  if (!full.startsWith(dir + path.sep)) return notFound();
  try {
    const data = await readFile(full);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; sandbox",
      },
    });
  } catch {
    return notFound();
  }
}
