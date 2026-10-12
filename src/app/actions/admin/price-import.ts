"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { planPriceImport, type PriceChange, type PriceProblem } from "@/lib/price-import";
import { readFirstSheet, XlsxReadError } from "@/lib/xlsx-read";

export type PriceImportState =
  | null
  | { ok: false; error: string }
  | { ok: true; stage: "preview"; fileName: string; changes: PriceChange[]; problems: PriceProblem[]; unchanged: number; digest: string }
  | { ok: true; stage: "done"; updated: number; skipped: number };

const MAX_FILE = 8 * 1024 * 1024;
const formSchema = z.object({
  step: z.enum(["preview", "apply"]),
  digest: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});

class Stale extends Error {}

/**
 * Bulk price update from the exported Excel file. "preview" only reads and compares; "apply" reads the same
 * file again and writes the changes only if they are exactly what the preview showed (same digest) and no
 * price was edited in between. Problem rows are never applied.
 */
export async function priceImportAction(_: PriceImportState, formData: FormData): Promise<PriceImportState> {
  const admin = await requireStaff(["ADMIN"]);
  const parsed = formSchema.safeParse({ step: formData.get("step"), digest: formData.get("digest") || undefined });
  if (!parsed.success) return { ok: false, error: "درخواست معتبر نیست." };
  const { step, digest } = parsed.data;
  const rl = await rateLimit(`products:price-import:${admin.id}`, 40, 3600);
  if (!rl.ok) return { ok: false, error: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "فایل اکسل را انتخاب کنید." };
  if (file.size > MAX_FILE) return { ok: false, error: "حجم فایل بیش از ۸ مگابایت است." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  // .xlsx files are ZIP archives ("PK\x03\x04"); an old .xls or a CSV is rejected with a clear message.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    return { ok: false, error: "فقط فایل اکسل با پسوند .xlsx پذیرفته می‌شود (در اکسل: Save As → Excel Workbook)." };
  }

  let plan: Awaited<ReturnType<typeof planPriceImport>>;
  try {
    plan = await planPriceImport(readFirstSheet(bytes));
  } catch (e) {
    return { ok: false, error: e instanceof XlsxReadError ? e.message : "فایل خوانده نشد؛ دوباره از اکسل ذخیره کنید و امتحان کنید." };
  }
  if ("error" in plan) return { ok: false, error: plan.error };

  if (step === "preview") {
    return { ok: true, stage: "preview", fileName: file.name.slice(0, 120), changes: plan.changes, problems: plan.problems.slice(0, 300), unchanged: plan.unchanged, digest: plan.digest };
  }

  if (digest !== plan.digest) return { ok: false, error: "فایل یا قیمت‌ها از زمان بررسی تغییر کرده‌اند؛ دوباره «بررسی فایل» را بزنید." };
  if (plan.changes.length === 0) return { ok: false, error: "تغییری برای اعمال نیست." };
  const changes = plan.changes;
  try {
    await db.$transaction(
      async (tx) => {
        for (const c of changes) {
          // Only if the price is still the one the preview showed (nobody edited it meanwhile).
          const r = await tx.product.updateMany({ where: { id: c.id, price: c.from }, data: { price: c.to } });
          if (r.count !== 1) throw new Stale();
        }
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    if (e instanceof Stale) return { ok: false, error: "قیمت بعضی محصولات در همین فاصله تغییر کرده است؛ هیچ قیمتی عوض نشد. دوباره «بررسی فایل» را بزنید." };
    throw e;
  }
  await audit(admin.id, "product.price_import", "Product", undefined, {
    count: changes.length,
    file: file.name.slice(0, 120),
    changes: changes.map((c) => ({ sku: c.sku, from: c.from, to: c.to })),
  });
  revalidatePath("/", "layout");
  return { ok: true, stage: "done", updated: changes.length, skipped: plan.problems.length };
}
