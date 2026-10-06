import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/Toaster";
import { NavigationTracker } from "@/components/layout/navigation";
import { StaffChatProvider } from "@/components/admin/chat/StaffChatProvider";
import { staffUnreadTotal } from "@/lib/chat";
import { NEEDS_ACTION } from "@/lib/order-flow";

export const metadata: Metadata = { title: { default: "پنل مدیریت", template: "%s | پنل مدیریت" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const [orders, tickets, chat, reviews, me] = await Promise.all([
    db.order.count({ where: { status: { in: NEEDS_ACTION } } }),
    db.ticket.count({ where: { status: "OPEN" } }),
    staffUnreadTotal(),
    db.review.count({ where: { approved: false } }),
    db.user.findUnique({ where: { id: staff.id }, select: { weakStaffCode: true } }),
  ]);
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.phone;

  return (
    <StaffChatProvider initialUnread={chat}>
      <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
        <AdminNav name={name} role={staff.role} badges={{ orders, tickets, chat, reviews }} />
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          {me?.weakStaffCode && (
            <Link href="/admin/settings#password" className="mb-5 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4 text-sm font-bold text-brand">
              <ShieldAlert className="size-5 shrink-0" aria-hidden />
              <span className="flex-1">کد ورود شما کمتر از ۶ رقم است و حدس زدنش آسان‌تر است. برای امنیت پنل، همین حالا آن را به یک کد ۶ رقمی تغییر دهید.</span>
              <span className="shrink-0 underline">تغییر کد</span>
            </Link>
          )}
          {children}
        </main>
        <Toaster />
        <NavigationTracker />
      </div>
    </StaffChatProvider>
  );
}
