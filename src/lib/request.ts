import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

/** Best-effort client IP. Only trusts forwarding headers when behind a known proxy. */
export async function clientIp() {
  const h = await headers();
  if (env.TRUST_PROXY === "true") {
    const real = h.get("x-real-ip");
    if (real) return real.trim().slice(0, 64);
    // Clients can prepend fake entries; the last hop was added by our own proxy.
    const xff = h.get("x-forwarded-for");
    if (xff) return (xff.split(",").pop() ?? "").trim().slice(0, 64) || "unknown";
  }
  return "unknown";
}

export async function userAgent() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 256);
}
