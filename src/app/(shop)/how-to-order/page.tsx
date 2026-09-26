import type { Metadata } from "next";
import { ContentPage } from "@/components/ui/ContentPage";

export const metadata: Metadata = { title: "نحوه ثبت سفارش" };

export default function HowToOrderPage() {
  return (
    <ContentPage title="نحوه ثبت سفارش">
      <ul>
        <li>قطعه مورد نظر را با جستجوی نام، برند یا کد فنی پیدا کنید یا از دسته‌بندی‌ها استفاده کنید.</li>
        <li>در صفحه محصول، بخش «خودروهای سازگار» را بررسی کنید تا از تناسب قطعه با خودروی خود مطمئن شوید.</li>
        <li>روی «افزودن به سبد خرید» بزنید و در صورت داشتن کد تخفیف، آن را در سبد خرید وارد کنید.</li>
        <li>با شماره موبایل خود وارد شوید؛ کد تأیید پیامک می‌شود.</li>
        <li>آدرس و روش ارسال را انتخاب کنید و سپس روش پرداخت را مشخص کنید.</li>
        <li>پس از پرداخت، وضعیت سفارش را از بخش «سفارش‌های من» پیگیری کنید.</li>
      </ul>
    </ContentPage>
  );
}
