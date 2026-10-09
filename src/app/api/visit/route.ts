import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { clientIp } from "@/lib/request";
import { idSchema } from "@/lib/validation";
import { isBot, recordLeave, recordView } from "@/lib/visit-track";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("view"),
    path: z.string().max(300),
    q: z.string().max(200).optional(),
    ref: z.string().max(1000).optional(),
    src: z.string().max(100).optional(),
  }),
  z.object({ t: z.literal("leave"), id: idSchema, ms: z.number().int().min(0).max(86_400_000) }),
]);

// Per-IP cap in memory (the site runs as one process): enough for real browsing, useless for inflating stats.
const hits = new Map<string, { n: number; reset: number }>();
function allowed(ip: string) {
  const now = Date.now();
  if (hits.size > 20_000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return true;
  }
  return ++h.n <= 90;
}

const none = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/** Page views and time-on-page from the storefront's VisitTracker. Always answers quickly and quietly. */
export async function POST(req: Request) {
  // Only this site's own pages report visits.
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return none();
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return none();
  if (Number(req.headers.get("content-length") ?? 0) > 4096) return none();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return none();
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !allowed(await clientIp())) return none();
  const d = parsed.data;

  try {
    if (d.t === "leave") {
      await recordLeave(d.id, d.ms);
      return none();
    }
    // Staff browsing their own shop would skew the numbers.
    const user = (await getSession())?.user;
    if (user && user.role !== "CUSTOMER") return none();
    const id = await recordView({
      path: d.path,
      search: d.q,
      referrer: d.ref,
      source: d.src,
      ua,
      ownHost: req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "",
      userId: user?.id,
    });
    return id ? Response.json({ id }, { headers: { "Cache-Control": "no-store" } }) : none();
  } catch {
    // Statistics must never break the shop.
    return none();
  }
}
