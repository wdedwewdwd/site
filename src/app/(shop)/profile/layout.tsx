import type { Metadata } from "next";
import { UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { faDigits } from "@/lib/format";
import { ProfileNav } from "@/components/profile/ProfileNav";

export const metadata: Metadata = { title: "حساب کاربری", robots: { index: false, follow: false } };

export default async function ProfileLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/profile");
  const [openOrders, unread] = await Promise.all([
    db.order.count({ where: { userId: user.id, status: { in: ["PAID", "PROCESSING", "SHIPPED"] } } }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div className="container-page grid gap-6 py-6 md:py-8 lg:grid-cols-[1fr_260px]">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">{children}</div>
      <aside className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1">
        <div className="card flex items-center justify-between p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-black">{name || "کاربر آریزون یدک"}</p>
            <p className="text-xs text-muted" dir="ltr">{faDigits(user.phone)}</p>
          </div>
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
            <UserRound className="size-6" />
          </span>
        </div>
        <ProfileNav openOrders={openOrders} unread={unread} />
      </aside>
    </div>
  );
}
