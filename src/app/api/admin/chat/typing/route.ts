import { db } from "@/lib/db";
import { getStaff } from "@/lib/auth/session";
import { allowTyping, publishTyping } from "@/lib/chat";
import { isSameOrigin } from "@/lib/sse";
import { idSchema } from "@/lib/validation";

/** "Support is typing…" signal shown to the customer. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const staff = await getStaff(["ADMIN", "SUPPORT"]);
  if (!staff) return new Response(null, { status: 401 });
  const id = idSchema.safeParse(new URL(request.url).searchParams.get("c"));
  if (!id.success) return new Response(null, { status: 400 });
  if (!allowTyping(`s:${staff.id}:${id.data}`)) return new Response(null, { status: 204 });
  const exists = await db.chatConversation.count({ where: { id: id.data, status: "OPEN" } });
  if (exists) publishTyping(id.data, true);
  return new Response(null, { status: 204 });
}
