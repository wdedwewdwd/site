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
    <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-6 md:py-8 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">{children}</div>
      {/* Desktop side column. Phones get the same card and menu on the profile home page (inner pages have a back button). */}
      <aside className="hidden flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:flex">
        <div className="card flex items-center justify-between p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-black">{name || "کاربر آریزون یدک"}</p>
            <p className="self-start text-xs text-muted" dir="ltr">{faDigits(user.phone)}</p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft text-lg font-black text-brand">
            {user.firstName?.trim() ? user.firstName.trim().charAt(0) : <UserRound className="size-6" />}
          </span>
        </div>
        <ProfileNav openOrders={openOrders} unread={unread} />
      </aside>
    </div>
  );
}
