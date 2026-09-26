import "server-only";
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1),
    APP_URL: z.url(),
    // Both secrets must be long random values (e.g. `openssl rand -base64 32`).
    SESSION_SECRET: z.string().min(32),
    OTP_PEPPER: z.string().min(32),

    SMS_PROVIDER: z.enum(["console", "kavenegar"]).default("console"),
    // Temporary pre-launch escape hatch: print login codes to the server log in production.
    ALLOW_CONSOLE_SMS: z.enum(["true", "false"]).default("false"),
    KAVENEGAR_API_KEY: z.string().optional(),
    KAVENEGAR_OTP_TEMPLATE: z.string().optional(),

    // "none" = online payment disabled (cash on delivery only), e.g. before the gateway is approved.
    PAYMENT_PROVIDER: z.enum(["mock", "zarinpal", "none"]).default("mock"),
    ZARINPAL_MERCHANT_ID: z.string().optional(),
    ZARINPAL_SANDBOX: z.enum(["true", "false"]).default("false"),

    // Comma-separated phone numbers that are granted ADMIN on first login.
    ADMIN_PHONES: z.string().default(""),
    // Set to "true" only behind a trusted reverse proxy (Railway, Liara, ...).
    TRUST_PROXY: z.enum(["true", "false"]).default("true"),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    if (env.SMS_PROVIDER === "console" && env.ALLOW_CONSOLE_SMS !== "true")
      ctx.addIssue({ code: "custom", path: ["SMS_PROVIDER"], message: "console SMS is not allowed in production" });
    if (env.PAYMENT_PROVIDER === "mock")
      ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "mock payments are not allowed in production" });
    if (env.SMS_PROVIDER === "kavenegar" && (!env.KAVENEGAR_API_KEY || !env.KAVENEGAR_OTP_TEMPLATE))
      ctx.addIssue({ code: "custom", path: ["KAVENEGAR_API_KEY"], message: "Kavenegar credentials are required" });
    if (env.PAYMENT_PROVIDER === "zarinpal" && !env.ZARINPAL_MERCHANT_ID)
      ctx.addIssue({ code: "custom", path: ["ZARINPAL_MERCHANT_ID"], message: "Zarinpal merchant id is required" });
    if (!env.APP_URL.startsWith("https://"))
      ctx.addIssue({ code: "custom", path: ["APP_URL"], message: "APP_URL must be https in production" });
  });

function load() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // Never print values — only which keys are wrong.
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ");
    throw new Error(`Invalid environment configuration:\n  ${issues}`);
  }
  return parsed.data;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";
