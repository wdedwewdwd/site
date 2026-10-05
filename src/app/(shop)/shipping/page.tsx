import type { Metadata } from "next";
import { ContentPage } from "@/components/ui/ContentPage";
import { toman } from "@/lib/format";
import { getShippingConfig } from "@/lib/settings";

export const metadata: Metadata = { title: "رویه ارسال سفارش" };

export default async function ShippingPage() {
  const config = await getShippingConfig();
  const methods = config.order.filter((k) => config.methods[k].enabled).map((k) => config.methods[k]);
  return (
    <ContentPage title="رویه ارسال سفارش">
      <p>سفارش‌ها پس از تأیید پرداخت، در روزهای کاری کنترل کیفی، بسته‌بندی و ارسال می‌شوند.</p>
      <h2>روش‌های ارسال</h2>
      <ul>
        {methods.map((s) => (
          <li key={s.title}>
            <b>{s.title}</b>{s.description && <>: {s.description}</>} —{" "}
            {s.pricing === "collect"
              ? "پس‌کرایه (هزینه هنگام تحویل پرداخت می‌شود)"
              : s.pricing === "free"
                ? "رایگان"
                : `هزینه ${toman(s.price)} تومان${s.freeOver !== null ? `؛ رایگان برای خریدهای بالای ${toman(s.freeOver)} تومان` : ""}`}
            {s.tehranOnly && "؛ فقط داخل استان تهران"}
          </li>
        ))}
      </ul>
      <h2>پیگیری مرسوله</h2>
      <p>پس از ارسال، کد رهگیری مرسوله از طریق پیامک و بخش «سفارش‌های من» در حساب کاربری در اختیار شما قرار می‌گیرد.</p>
      <h2>هنگام تحویل</h2>
      <p>لطفاً پیش از امضای رسید، سلامت ظاهری بسته را بررسی کنید و در صورت آسیب‌دیدگی، مراتب را در رسید مأمور ثبت و به پشتیبانی اطلاع دهید.</p>
    </ContentPage>
  );
}
