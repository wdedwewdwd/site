/**
 * Shop contact details and social links, editable in the admin panel (Settings table).
 * Parsing/formatting is shared by the admin form (live preview) and the server (validation).
 */
import { faDigits } from "./format";
import { normalizePhone, toEnDigits } from "./validation";

/** Settings keys, and the values used until the admin changes them. "" means intentionally empty. */
export const CONTACT_DEFAULTS = {
  contact_phone: "02133947270",
  contact_mobile: "09122054839",
  contact_hours: "۷ روز هفته، ۲۴ ساعته",
  contact_email: "",
  contact_address: "تهران، خیابان امیرکبیر، پاساژ کاشانی، طبقه همکف، پلاک ۱۱۰",
  contact_postal: "",
  social_instagram: "",
  social_telegram: "",
  social_whatsapp: "",
} as const;
export type ContactKey = keyof typeof CONTACT_DEFAULTS;
export const CONTACT_KEYS = Object.keys(CONTACT_DEFAULTS) as ContactKey[];

const WHATSAPP_GREETING = "سلام، از سایت آریزون یدک پیام می‌دهم.";

// ─── Parsers (return the canonical stored value, or null when invalid) ───

/** Iranian landline or mobile, stored as 11 digits starting with 0 (e.g. 02133947270). */
export function parsePhone(input: string) {
  let p = toEnDigits(input).replace(/[\s\-()]/g, "");
  if (p.startsWith("+98")) p = "0" + p.slice(3);
  else if (p.startsWith("0098")) p = "0" + p.slice(4);
  return /^0\d{10}$/.test(p) ? p : null;
}

/** Instagram username from "@name", "name" or a profile link. */
export function parseInstagram(input: string) {
  const v = input.trim().replace(/^https?:\/\/(www\.)?(instagram\.com|instagr\.am)\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z0-9._]{1,30}$/.test(v) ? v : null;
}

/** Telegram username from "@name", "name" or a t.me link. */
export function parseTelegram(input: string) {
  const v = input.trim().replace(/^https?:\/\/(www\.)?(t\.me|telegram\.me)\//i, "").replace(/^@/, "").split(/[/?#]/)[0];
  return /^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v) ? v : null;
}

/** WhatsApp number in international form (989121234567) from a mobile number or a wa.me link. */
export function parseWhatsapp(input: string) {
  const text = toEnDigits(input.trim());
  const link = text.match(/(?:wa\.me\/|phone=)\+?(\d{10,15})/i);
  if (link) return link[1];
  const iran = normalizePhone(text);
  if (iran) return "98" + iran.slice(1);
  const intl = text.replace(/[\s\-()]/g, "").match(/^(?:\+|00)(\d{10,15})$/);
  return intl ? intl[1] : null;
}

// ─── Display helpers ───

/** 02133947270 → "۰۲۱-۳۳۹۴۷۲۷۰"; mobiles stay as one block. */
export const formatPhone = (digits: string) => faDigits(digits.startsWith("09") ? digits : `${digits.slice(0, 3)}-${digits.slice(3)}`);

export const instagramUrl = (u: string) => `https://instagram.com/${u}`;
export const telegramUrl = (u: string) => `https://t.me/${u}`;
export const whatsappUrl = (n: string) => `https://wa.me/${n}?text=${encodeURIComponent(WHATSAPP_GREETING)}`;
const whatsappDisplay = (n: string) => (n.startsWith("98") ? formatPhone("0" + n.slice(2)) : faDigits("+" + n));

export type ContactInfo = {
  phone: string;
  phoneDisplay: string;
  mobile: string | null;
  mobileDisplay: string | null;
  hours: string;
  email: string | null;
  address: string;
  postalCode: string | null;
  /** Address with the postal code when one is set. */
  addressLine: string;
  instagram: string | null;
  instagramUrl: string | null;
  telegram: string | null;
  telegramUrl: string | null;
  whatsapp: string | null;
  whatsappUrl: string | null;
  whatsappDisplay: string | null;
};

/** Builds the contact details from stored settings (missing keys fall back to the defaults). */
export function resolveContact(raw: Partial<Record<string, string>>): ContactInfo {
  const get = (k: ContactKey) => (raw[k] ?? CONTACT_DEFAULTS[k]).trim();
  const phone = parsePhone(get("contact_phone")) ?? CONTACT_DEFAULTS.contact_phone;
  const mobile = parsePhone(get("contact_mobile"));
  const postal = get("contact_postal") || null;
  const address = get("contact_address") || CONTACT_DEFAULTS.contact_address;
  const instagram = get("social_instagram") ? parseInstagram(get("social_instagram")) : null;
  const telegram = get("social_telegram") ? parseTelegram(get("social_telegram")) : null;
  const whatsapp = get("social_whatsapp") ? parseWhatsapp(get("social_whatsapp")) : null;
  return {
    phone,
    phoneDisplay: formatPhone(phone),
    mobile,
    mobileDisplay: mobile ? formatPhone(mobile) : null,
    hours: get("contact_hours") || CONTACT_DEFAULTS.contact_hours,
    email: get("contact_email") || null,
    address,
    postalCode: postal ? faDigits(postal) : null,
    addressLine: postal ? `${address} — کد پستی: ${faDigits(postal)}` : address,
    instagram,
    instagramUrl: instagram ? instagramUrl(instagram) : null,
    telegram,
    telegramUrl: telegram ? telegramUrl(telegram) : null,
    whatsapp,
    whatsappUrl: whatsapp ? whatsappUrl(whatsapp) : null,
    whatsappDisplay: whatsapp ? whatsappDisplay(whatsapp) : null,
  };
}
