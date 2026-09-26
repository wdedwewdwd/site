import type { Metadata } from "next";
import { ContentPage } from "@/components/ui/ContentPage";
import { toman } from "@/lib/format";
import { SHIPPING } from "@/lib/shop";

export const metadata: Metadata = { title: "رویه ارسال سفارش" };

export default function ShippingPage() {
  return (
    <ContentPage title="رویه ارسال سفارش">
      <p>سفارش‌ها پس از تأیید پرداخت، در روزهای کاری کنترل کیفی، بسته‌بندی و ارسال می‌شوند.</p>
      <h2>روش‌های ارسال</h2>
      <ul>
        {Object.values(SHIPPING).map((s) => (
          <li key={s.title}>
            <b>{s.title}</b>: {s.description} — هزینه {toman(s.price)} تومان
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
