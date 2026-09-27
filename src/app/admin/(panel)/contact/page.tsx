import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { CONTACT_DEFAULTS, CONTACT_KEYS, parseWhatsapp, type ContactKey } from "@/lib/contact-shared";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { ContactForm } from "@/components/admin/ContactForm";

export const metadata = { title: "اطلاعات تماس و شبکه‌ها" };

export default async function ContactSettingsPage() {
  await requireStaff(["ADMIN"]);
  const settings = await getSettings();
  const initial = Object.fromEntries(CONTACT_KEYS.map((k) => [k, settings[k] ?? CONTACT_DEFAULTS[k]])) as Record<ContactKey, string>;
  // Show Iranian WhatsApp numbers the way people type them (09…), not in international form.
  const wa = parseWhatsapp(initial.social_whatsapp);
  if (wa?.startsWith("98")) initial.social_whatsapp = "0" + wa.slice(2);
  if (initial.social_instagram) initial.social_instagram = "@" + initial.social_instagram;
  if (initial.social_telegram) initial.social_telegram = "@" + initial.social_telegram;

  return (
    <>
      <PageHeader title="اطلاعات تماس و شبکه‌ها" />
      <HelpBox
        items={[
          "هر چیزی که اینجا ذخیره کنید، بلافاصله در همه جای سایت عوض می‌شود: نوار بالای سایت، فوتر، صفحه «تماس با ما» و «درباره ما»، منوی دکمه قرمز «پشتیبانی»، فاکتورها و برچسب‌های ارسال.",
          "«تلفن پشتیبانی» همان شماره‌ای است که مشتری با زدن «تماس تلفنی» در منوی پشتیبانی مستقیم با آن تماس می‌گیرد. می‌توانید شماره ثابت یا موبایل بگذارید.",
          "برای اینستاگرام و تلگرام کافی است آیدی را با @ بنویسید یا لینک صفحه را کپی کنید. برای واتساپ شماره موبایلی را بنویسید که واتساپ روی آن فعال است. زیر هر فیلد، دکمه «آزمایش» لینک را باز می‌کند تا مطمئن شوید درست است.",
          "هر شبکه‌ای که خالی باشد، در سایت نمایش داده نمی‌شود. ستون کناری پیش‌نمایش منوی پشتیبانی را نشان می‌دهد.",
          "در بخش «گزینه‌های منوی پشتیبانی» با کلید کنار هر گزینه (تماس تلفنی، گفتگوی آنلاین، واتساپ، تلگرام، اینستاگرام) تعیین کنید کدام‌ها در منوی دکمه «پشتیبانی» دیده شوند، سپس «ذخیره اطلاعات تماس» را بزنید.",
          "نشانی، کد پستی و ایمیل باید دقیقاً همانی باشد که در اینماد ثبت می‌کنید.",
        ]}
      />
      <ContactForm initial={initial} />
    </>
  );
}
