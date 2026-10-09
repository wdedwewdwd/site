import { requireStaff } from "@/lib/auth/session";
import { liveVisitors } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/** Online-now numbers for the admin visit statistics page (polled every few seconds). */
export async function GET() {
  await requireStaff(["ADMIN", "SUPPORT"]);
  return Response.json(await liveVisitors(), { headers: { "Cache-Control": "no-store" } });
}
