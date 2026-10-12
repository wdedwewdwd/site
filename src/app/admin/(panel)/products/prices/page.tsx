import { requireStaff } from "@/lib/auth/session";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { PriceImportForm } from "@/components/admin/products/PriceImportForm";

export const metadata = { title: "به‌روزرسانی قیمت‌ها با اکسل" };

export default async function PriceImportPage() {
  await requireStaff(["ADMIN"]);
  return (
    <>
      <PageHeader title="به‌روزرسانی قیمت‌ها با اکسل" backHref="/admin/products" />
      <HelpBox
        open
        items={[
          "۱. در صفحه‌ی «محصولات» روی «دریافت خروجی» و بعد «فایل اکسل» بزنید.",
          "۲. فایل را در اکسل باز کنید و فقط در ستون زرد «قیمت جدید» قیمت‌ها را به تومان بنویسید. ردیف‌هایی که خالی بمانند تغییری نمی‌کنند. عدد را می‌توانید با کیبورد فارسی یا انگلیسی و با یا بدون جداکننده بنویسید (مثلاً ۱۲۵۰۰۰۰ یا ۱,۲۵۰,۰۰۰).",
          "۳. فایل را ذخیره کنید (همان قالب xlsx) و اینجا انتخاب کنید و «بررسی فایل» را بزنید.",
          "۴. فهرست تغییرات را ببینید: قیمت فعلی و قیمت جدید هر محصول. ردیف‌های مشکل‌دار (کد اشتباه، عدد نامعتبر، قیمت کمتر از ۱۰۰۰ تومان) جدا نشان داده می‌شوند و اعمال نمی‌شوند.",
          "۵. اگر همه‌چیز درست بود «اعمال تغییرات» را بزنید. تا قبل از این دکمه هیچ قیمتی در سایت عوض نمی‌شود. همه‌ی تغییرات با قیمت قبلی هر محصول در گزارش فعالیت‌ها ثبت می‌شود.",
        ]}
      />
      <PriceImportForm />
    </>
  );
}
