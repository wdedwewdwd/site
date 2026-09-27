import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BottomNav } from "@/components/layout/BottomNav";
import { Toaster } from "@/components/ui/Toaster";
import { MobileFooterGate, NavigationTracker } from "@/components/layout/navigation";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getCartCount } from "@/lib/cart";
import { getContact } from "@/lib/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const [cartCount, contact] = await Promise.all([getCartCount(), getContact()]);
  const support = {
    phone: contact.phone,
    phoneDisplay: contact.phoneDisplay,
    hours: contact.hours,
    instagram: contact.instagram,
    instagramUrl: contact.instagramUrl,
    whatsappUrl: contact.whatsappUrl,
    whatsappDisplay: contact.whatsappDisplay,
    telegram: contact.telegram,
    telegramUrl: contact.telegramUrl,
    supportChannels: contact.supportChannels,
  };
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        رفتن به محتوای اصلی
      </a>
      <SiteHeader />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <MobileFooterGate>
        <SiteFooter />
      </MobileFooterGate>
      <BottomNav cartCount={cartCount} />
      <Suspense fallback={null}>
        <ChatWidget support={support} />
      </Suspense>
      <Toaster />
      <NavigationTracker />
    </>
  );
}
