import { requireStaff } from "@/lib/auth/session";
import { getShippingConfig } from "@/lib/settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";

export const metadata = { title: "روش‌های ارسال" };

export default async function ShippingSettingsPage() {
  await requireStaff(["ADMIN"]);
  const config = await getShippingConfig();

  return (
    <>
      <PageHeader title="روش‌های ارسال" />
      <HelpBox
        items={[
          "روش‌هایی که اینجا فعال کنید در صفحه پرداخت به مشتری نشان داده می‌شوند؛ با کلید «فعال / غیرفعال» هر روش را روشن یا خاموش کنید. حداقل یک روش باید فعال بماند.",
          "عنوان و توضیح هر روش همانی است که مشتری می‌بیند؛ زمان تحویل یا شرایط را در توضیح بنویسید.",
          "«هزینه ثابت»: مشتری مبلغ را همراه سفارش پرداخت می‌کند. می‌توانید تعیین کنید بالای یک مبلغ خرید، ارسال رایگان شود.",
          "«پس‌کرایه»: مشتری هنگام خرید چیزی برای ارسال نمی‌پردازد و کرایه را هنگام تحویل به تیپاکس یا باربری می‌دهد. «رایگان»: هزینه ارسال با فروشگاه است.",
          "«فقط برای آدرس‌های استان تهران» برای پیک مناسب است؛ مشتریان شهرهای دیگر آن روش را غیرفعال می‌بینند.",
          "«تحویل حضوری» نیازی به آدرس ندارد؛ مشتری نشانی فروشگاه را (از «اطلاعات تماس و شبکه‌ها») می‌بیند و شما بعد از آماده شدن سفارش با او تماس می‌گیرید.",
          "با فلش‌های بالا و پایین، ترتیب نمایش روش‌ها در صفحه پرداخت را تغییر دهید؛ اولین روش مجاز به‌صورت پیش‌فرض انتخاب می‌شود. تغییرات روی سفارش‌های قبلی اثری ندارد.",
        ]}
      />
      <ShippingSettingsForm initial={config} />
    </>
  );
}
