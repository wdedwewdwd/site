import "server-only";
import { headers } from "next/headers";
import { env } from "./env";

/** Best-effort client IP. Only trusts forwarding headers when behind a known proxy. */
export async function clientIp() {
  const h = await headers();
  if (env.TRUST_PROXY === "true") {
    // The host's proxy appends the real client address as the LAST forwarded-for entry; anything before it
    // (and an X-Real-IP header the proxy does not overwrite) could have been sent by the client itself.
    const xff = h.get("x-forwarded-for");
    const last = xff?.split(",").pop()?.trim();
    if (last) return last.slice(0, 64);
    const real = h.get("x-real-ip");
    if (real) return real.trim().slice(0, 64);
  }
  return "unknown";
}

export async function userAgent() {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 256);
}
