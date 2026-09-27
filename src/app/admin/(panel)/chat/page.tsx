import { requireStaff } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { getContact } from "@/lib/settings";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { StaffChatInbox } from "@/components/admin/chat/StaffChatInbox";

export const metadata = { title: "گفتگوی آنلاین" };

export default async function AdminChatPage({ searchParams }: PageProps<"/admin/chat">) {
  const [staff, contact] = await Promise.all([requireStaff(["ADMIN", "SUPPORT"]), getContact()]);
  const c = (await searchParams).c;
  const initialId = typeof c === "string" && idSchema.safeParse(c).success ? c : null;

  return (
    <>
      <PageHeader title="گفتگوی آنلاین" />
      <HelpBox
        items={[
          "مشتری‌ها از دکمه قرمز «گفتگوی آنلاین» در همه صفحات سایت (و صفحه «تماس با ما») پیام می‌دهند. پیام‌ها همین‌جا و بدون نیاز به رفرش، لحظه‌ای نمایش داده می‌شوند.",
          "وقتی پیام جدیدی برسد صدای زنگ پخش می‌شود و عدد قرمز کنار «گفتگوی آنلاین» در منو بالا می‌رود. صدا را از پایین فهرست گفتگوها روشن یا خاموش کنید. با «فعال‌سازی اعلان» حتی وقتی در تب دیگری هستید اعلان ویندوز/گوشی می‌گیرید.",
          "تا وقتی پنل مدیریت در مرورگر شما باز است، مشتری وضعیت پشتیبانی را «آنلاین» می‌بیند؛ در غیر این صورت پیغام «پیام بگذارید» نشان داده می‌شود.",
          "مشتری مهمان (بدون ثبت‌نام) قبل از شروع گفتگو نام و موبایل خود را وارد می‌کند. با دکمه سبز بالای گفتگو می‌توانید مستقیم با او تماس بگیرید. برای مشتری عضو، سابقه سفارش‌ها در ستون «اطلاعات مشتری» دیده می‌شود.",
          "با دکمه تصویر می‌توانید عکس بفرستید و با دکمه «پاسخ‌های آماده» جمله‌های پرتکرار را سریع وارد کنید. تیک آبی دوتایی یعنی مشتری پیام شما را دیده است.",
          "پس از پایان کار، «بستن گفتگو» را بزنید. اگر مشتری دوباره پیام بدهد، گفتگوی تازه‌ای شروع می‌شود. گفتگوهای مزاحم را مدیر ارشد می‌تواند با دکمه سطل زباله برای همیشه حذف کند.",
        ]}
      />
      <StaffChatInbox initialId={initialId} isAdmin={staff.role === "ADMIN"} supportPhone={contact.phoneDisplay} />
    </>
  );
}
