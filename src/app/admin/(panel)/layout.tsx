import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";
import { Toaster } from "@/components/ui/Toaster";
import { NavigationTracker } from "@/components/layout/navigation";

export const metadata: Metadata = { title: { default: "پنل مدیریت", template: "%s | پنل مدیریت" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff(["ADMIN", "SUPPORT"]);
  const [orders, tickets] = await Promise.all([
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.ticket.count({ where: { status: "OPEN" } }),
  ]);
  const name = [staff.firstName, staff.lastName].filter(Boolean).join(" ") || staff.phone;

  return (
    <div className="flex min-h-dvh flex-col bg-canvas lg:flex-row">
      <AdminNav name={name} role={staff.role} badges={{ orders, tickets }} />
      <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      <Toaster />
      <NavigationTracker />
    </div>
  );
}
