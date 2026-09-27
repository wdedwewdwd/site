import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { faDate, faDigits } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { HelpBox } from "@/components/admin/HelpBox";
import { UserControls } from "@/components/admin/UserControls";

export const metadata = { title: "مشتریان" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  const admin = await requireStaff(["ADMIN"]);
  const q = String((await searchParams).q ?? "").trim().slice(0, 50);
  const users = await db.user.findMany({
    where: q ? { OR: [{ phone: { contains: q } }, { firstName: { contains: q } }, { lastName: { contains: q } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { orders: true } } },
  });

  return (
    <>
      <PageHeader title="مشتریان">
        <form role="search"><input name="q" defaultValue={q} placeholder="نام یا شماره موبایل" className="input w-60 bg-white py-2.5" /></form>
      </PageHeader>
      <HelpBox
        items={[
          "فهرست همه کاربرانی که در سایت ثبت‌نام کرده‌اند، همراه با تعداد سفارش‌هایشان.",
          "دکمه «فعال / مسدود»: کاربر مسدود نمی‌تواند وارد سایت شود و از همه دستگاه‌ها خارج می‌شود.",
          "برای دادن دسترسی پنل به کسی (مدیر یا پشتیبان)، به «تنظیمات ← مدیران و پشتیبان‌ها» بروید و شماره، نام و کد ورودش را اضافه کنید.",
        ]}
      />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">نام</th>
              <th className="px-4 py-3 text-right font-bold">موبایل</th>
              <th className="px-4 py-3 text-right font-bold">سفارش‌ها</th>
              <th className="px-4 py-3 text-right font-bold">عضویت</th>
              <th className="px-4 py-3 text-right font-bold">وضعیت</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-canvas">
                <td className="px-4 py-3 font-bold">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-3" dir="ltr">{faDigits(u.phone)}</td>
                <td className="px-4 py-3">{faDigits(u._count.orders)}</td>
                <td className="px-4 py-3 text-muted">{faDate(u.createdAt)}</td>
                <td className="px-4 py-3"><UserControls id={u.id} active={u.isActive} role={u.role} self={u.id === admin.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
