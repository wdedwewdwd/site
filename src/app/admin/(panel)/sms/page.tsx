import { Suspense } from "react";
import { requireStaff } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { accessibleLines, accountBalance } from "@/lib/iranpayamak";
import { getSmsConfig } from "@/lib/sms-settings";
import { faDigits, toman } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { SmsSettingsForm } from "@/components/admin/SmsSettingsForm";

export const metadata = { title: "سامانه پیامک" };

/** Live account details from Faraz SMS; streamed in so a slow provider never blocks the page. */
async function AccountInfo() {
  // Reads the key itself, so it is never passed around as a prop.
  const { apiKey } = await getSmsConfig();
  if (!apiKey) return null;
  const [balance, lines] = await Promise.all([accountBalance(apiKey), accessibleLines(apiKey)]);
  if (!balance.ok) return <p className="text-xs font-bold text-brand">{balance.error}</p>;
  return (
    <div className="flex flex-col gap-1 text-xs text-muted">
      <p>
        اتصال برقرار است. موجودی حساب:{" "}
        <b className="text-ink">{balance.data.amount !== null ? `${toman(balance.data.amount)} تومان` : "نامشخص"}</b>
        {balance.data.count !== null && <> (حدود {faDigits(balance.data.count)} پیامک)</>}
      </p>
      {lines.ok && lines.data.length > 0 && (
        <p>
          خطوط حساب شما: {lines.data.map((l) => <bdi key={l} dir="ltr" className="mx-1 font-mono font-bold text-ink">{l}</bdi>)}
        </p>
      )}
    </div>
  );
}

export default async function SmsSettingsPage() {
  const admin = await requireStaff(["ADMIN"]);
  const config = await getSmsConfig();
  const fallback = env.SMS_PROVIDER === "console" ? "کدهای ورود فعلاً فقط در گزارش سرور ثبت می‌شوند و برای مشتری پیامک نمی‌شوند." : "کدهای ورود فعلاً با تنظیمات سرور (کاوه‌نگار) فرستاده می‌شوند.";

  return (
    <>
      <PageHeader title="سامانه پیامک (ورود با کد)" />
      <HelpBox
        open={!config.active}
        items={[
          "مشتری‌ها با شماره موبایل و یک کد ۶ رقمی وارد سایت می‌شوند؛ این صفحه آن کد را از طریق «فراز اس‌ام‌اس / ایران پیامک» برایشان پیامک می‌کند. مدیران و پشتیبان‌ها با کد ثابت خودشان وارد می‌شوند و به پیامک نیاز ندارند.",
          "۱. در پنل فراز اس‌ام‌اس به «وب‌سرویس» بروید، یک کلید API بسازید و آن را کپی کنید.",
          <>
            ۲. در بخش «ارسال پترن» یک پترن تازه بسازید با دسته‌ی «کد تأیید (OTP)» و متغیری به نام <bdi dir="ltr">code</bdi> (نوع عدد، طول ۶)، با متنی مثل: «کد ورود شما به آریزون یدک: <bdi dir="ltr">%code%</bdi> — این کد را به کسی ندهید.» صبر کنید تا پترن تأیید شود و «کد پترن» آن را کپی کنید.
          </>,
          "۳. در «مدیریت خطوط» شماره خطی را که پترن با آن ارسال می‌شود ببینید (بعد از ذخیره‌ی کلید، خطوط حساب شما همین‌جا هم نشان داده می‌شود).",
          "۴. کلید API، کد پترن، نام متغیر و شماره خط را این‌جا وارد و ذخیره کنید، بعد یک «پیامک آزمایشی» به موبایل خودتان بفرستید. اگر کد رسید، «ورود با پیامک» را روشن کنید.",
          "کلید API رمزنگاری‌شده ذخیره می‌شود و دیگر نمایش داده نمی‌شود؛ برای عوض کردنش کلید تازه را وارد کنید. با هر تغییر در تنظیمات، ورود با پیامک تا یک آزمایش موفق دوباره خاموش می‌ماند.",
          "حواستان به موجودی حساب پیامک باشد؛ اگر تمام شود، مشتری‌ها کد ورود دریافت نمی‌کنند.",
        ]}
      />
      <SmsSettingsForm
        initial={{ pattern: config.pattern, variable: config.variable, line: config.line }}
        hasKey={!!config.apiKey}
        keyUnreadable={config.keyUnreadable}
        tested={config.tested}
        active={config.active}
        fallback={fallback}
        adminPhone={admin.phone}
        account={
          config.apiKey ? (
            <Suspense fallback={<p className="text-xs text-muted">در حال بررسی حساب پیامک…</p>}>
              <AccountInfo />
            </Suspense>
          ) : null
        }
      />
    </>
  );
}
