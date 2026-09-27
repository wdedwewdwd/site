import Link from "next/link";
import { BellRing } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/app/actions/profile";
import { faDateTime } from "@/lib/format";
import { PageBar } from "@/components/layout/PageBar";

export default async function NotificationsPage() {
  const user = await requireUser("/profile/notifications");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  const hasUnread = items.some((n) => !n.readAt);

  return (
    <>
      <PageBar title="اعلان‌ها" backHref="/profile" crumbs={[{ href: "/profile", label: "حساب کاربری" }]} />
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h1 className="sr-only text-lg font-black md:not-sr-only">اعلان‌ها</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="text-xs font-bold text-brand hover:underline">خوانده شدن همه</button>
          </form>
        )}
      </div>
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <BellRing className="size-10 text-subtle" />
          <p className="text-sm text-muted">اعلان جدیدی ندارید.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            const body = (
              <>
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-extrabold">
                    {!n.readAt && <span className="size-2 rounded-full bg-brand" aria-label="خوانده نشده" />}
                    {n.title}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{faDateTime(n.createdAt)}</span>
                </span>
                <span className="text-[13px] leading-7 text-muted">{n.body}</span>
              </>
            );
            const cls = `flex flex-col gap-1.5 rounded-card border p-4 ${n.readAt ? "border-line" : "border-brand/30 bg-brand-soft/40"}`;
            return (
              <li key={n.id}>
                {n.href?.startsWith("/") && !n.href.startsWith("//") ? <Link href={n.href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </>
  );
}
