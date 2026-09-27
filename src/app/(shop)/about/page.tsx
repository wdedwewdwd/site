import type { Metadata } from "next";
import { ContentPage } from "@/components/ui/ContentPage";
import { SITE, SITE_ADDRESS } from "@/lib/shop";

export const metadata: Metadata = { title: "درباره ما" };

export default function AboutPage() {
  return (
    <ContentPage title="درباره ما">
      <p>
        {SITE.name} یک فروشگاه اینترنتی تخصصی در زمینه تأمین و فروش قطعات یدکی خودروهای داخلی و خارجی است. هدف ما این است که
        خرید قطعه مناسب، اصل و با قیمت منصفانه برای همه مالکان خودرو و تعمیرکاران در سراسر ایران ساده، سریع و مطمئن باشد.
      </p>
      <h2>چرا آریزون یدک؟</h2>
      <ul>
        <li>ضمانت اصالت کالا و ارائه فاکتور رسمی برای تمام سفارش‌ها</li>
        <li>نمایش خودروهای سازگار و کد فنی (OEM) هر قطعه برای انتخاب بدون خطا</li>
        <li>ارسال سریع در تهران و ارسال با پست پیشتاز به سراسر کشور</li>
        <li>۷ روز ضمانت بازگشت کالا طبق قانون تجارت الکترونیکی</li>
        <li>پشتیبانی کارشناسی پیش و پس از خرید</li>
      </ul>
      <h2>اطلاعات تماس</h2>
      <p>
        نشانی: {SITE_ADDRESS}
        <br />
        تلفن ثابت: <span dir="ltr">{SITE.supportPhone}</span> — موبایل: <span dir="ltr">{SITE.supportMobile}</span> ({SITE.supportHours})
        {SITE.email && <><br />ایمیل: <span dir="ltr">{SITE.email}</span></>}
      </p>
    </ContentPage>
  );
}
