import "server-only";
import { env } from "./env";

/**
 * Minimal client for the Faraz SMS / Iran Payamak REST API (https://docs.iranpayamak.com). Authenticated
 * with the panel's API key in the `Api-Key` header; responses are `{ status: "success" | "error", data,
 * message | messages }`.
 */

const BASE = env.IRANPAYAMAK_BASE_URL?.replace(/\/$/, "") ?? "https://api.iranpayamak.com";

export type IpResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Turns the provider's message field (string, list or object) into one readable line. */
function messageOf(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  const m = b.messages ?? b.message ?? b.errors;
  if (typeof m === "string") return m;
  if (Array.isArray(m)) return m.filter((x) => typeof x === "string").join("، ");
  if (m && typeof m === "object") return Object.values(m).flat().filter((x) => typeof x === "string").join("، ");
  return "";
}

async function call(apiKey: string, method: "GET" | "POST", path: string, body?: unknown): Promise<IpResult<unknown>> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: { "Api-Key": apiKey, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.name === "TimeoutError" ? "سامانه پیامک پاسخ نداد (۱۰ ثانیه)." : "اتصال به سامانه پیامک برقرار نشد." };
  }
  const json: unknown = await res.json().catch(() => null);
  const status = json && typeof json === "object" ? (json as { status?: unknown }).status : undefined;
  if (res.status === 401 || res.status === 403) return { ok: false, error: "کلید API پذیرفته نشد؛ آن را از بخش «وب‌سرویس» پنل دوباره کپی کنید." };
  if (!res.ok || status === "error") {
    const msg = messageOf(json);
    return { ok: false, error: `خطای سامانه پیامک (${res.status})${msg ? `: ${msg.slice(0, 200)}` : ""}` };
  }
  return { ok: true, data: json && typeof json === "object" ? (json as { data?: unknown }).data : null };
}

/** Sends an approved pattern (e.g. the login code) to one mobile number (format 09xxxxxxxxx). */
export async function sendPattern(apiKey: string, p: { pattern: string; variable: string; value: string; line: string; phone: string }): Promise<IpResult<null>> {
  const r = await call(apiKey, "POST", "/ws/v1/sms/pattern", {
    code: p.pattern,
    attributes: { [p.variable]: p.value },
    recipient: p.phone,
    line_number: p.line,
    number_format: "english",
  });
  return r.ok ? { ok: true, data: null } : r;
}

/** Account credit in toman and roughly how many messages it covers. */
export async function accountBalance(apiKey: string): Promise<IpResult<{ amount: number | null; count: number | null }>> {
  const r = await call(apiKey, "GET", "/ws/v1/account/balance");
  if (!r.ok) return r;
  const d = (r.data ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && /^\d+(\.\d+)?$/.test(v) ? Number(v) : null);
  return { ok: true, data: { amount: num(d.balanceAmount ?? d.balance_amount ?? d.amount), count: num(d.balanceCount ?? d.balance_count ?? d.count) } };
}

/** Sender line numbers the account may use (the response shape is not documented, so any number-like field counts). */
export async function accessibleLines(apiKey: string): Promise<IpResult<string[]>> {
  const r = await call(apiKey, "GET", "/ws/v1/lines/accessible");
  if (!r.ok) return r;
  const found = new Set<string>();
  const walk = (v: unknown, keyName = "") => {
    if (typeof v === "string" || typeof v === "number") {
      const s = String(v).replace(/^\+98/, "98");
      if (/^\d{4,20}$/.test(s) && (keyName === "" || /number|line/i.test(keyName))) found.add(s);
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, keyName));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(r.data);
  return { ok: true, data: [...found].slice(0, 20) };
}
