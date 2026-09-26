import "server-only";
import { env, isProd } from "./env";
import { randomToken } from "./crypto";

type StartResult = { ok: true; authority: string; redirectUrl: string } | { ok: false; error: string };
type VerifyResult = { ok: true; refId: string; cardPan?: string } | { ok: false; error: string };

const zarinpalBase = () =>
  env.ZARINPAL_SANDBOX === "true" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";

async function zarinpalCall(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${zarinpalBase()}/pg/v4/payment/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ merchant_id: env.ZARINPAL_MERCHANT_ID, ...body }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    data?: { code?: number; authority?: string; ref_id?: number; card_pan?: string };
    errors?: unknown;
  } | null;
  return json?.data ?? null;
}

/**
 * Starts a payment. `amountToman` is converted to Rial for the gateway,
 * which avoids any currency ambiguity between request and verify calls.
 */
export async function startPayment(opts: {
  amountToman: number;
  description: string;
  callbackUrl: string;
  mobile?: string;
}): Promise<StartResult> {
  if (env.PAYMENT_PROVIDER === "none") return { ok: false, error: "پرداخت آنلاین در حال حاضر فعال نیست." };
  if (env.PAYMENT_PROVIDER === "mock") {
    if (isProd) return { ok: false, error: "درگاه پرداخت پیکربندی نشده است." };
    const authority = `MOCK${randomToken(18)}`;
    const url = new URL("/payment/mock", env.APP_URL);
    url.searchParams.set("authority", authority);
    return { ok: true, authority, redirectUrl: url.toString() };
  }

  const data = await zarinpalCall("request.json", {
    amount: opts.amountToman * 10,
    callback_url: opts.callbackUrl,
    description: opts.description,
    metadata: opts.mobile ? { mobile: opts.mobile } : undefined,
  }).catch(() => null);

  if (data?.code !== 100 || !data.authority) return { ok: false, error: "اتصال به درگاه پرداخت ناموفق بود." };
  return { ok: true, authority: data.authority, redirectUrl: `${zarinpalBase()}/pg/StartPay/${data.authority}` };
}

/** Server-to-server verification. The amount comes from our database, never from the callback. */
export async function verifyPayment(authority: string, amountToman: number): Promise<VerifyResult> {
  if (env.PAYMENT_PROVIDER === "none") return { ok: false, error: "disabled" };
  if (env.PAYMENT_PROVIDER === "mock") {
    if (isProd) return { ok: false, error: "mock disabled" };
    return { ok: true, refId: `MOCK-${Date.now()}`, cardPan: "6037****1234" };
  }

  const data = await zarinpalCall("verify.json", { amount: amountToman * 10, authority }).catch(() => null);
  // 100 = verified now, 101 = already verified earlier (idempotent retry).
  if ((data?.code === 100 || data?.code === 101) && data.ref_id) {
    return { ok: true, refId: String(data.ref_id), cardPan: data.card_pan };
  }
  return { ok: false, error: "تراکنش توسط درگاه تأیید نشد." };
}

export const onlinePaymentEnabled = () => env.PAYMENT_PROVIDER !== "none";
