import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "@/app/actions/admin/misc";
import { faDateTime } from "@/lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const metadata = { title: "تنظیمات" };

export default async function SettingsPage() {
  await requireStaff(["ADMIN"]);
  const [settings, logs] = await Promise.all([
    getSettings(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { actor: { select: { phone: true, firstName: true, lastName: true } } } }),
  ]);
  return (
    <>
      <PageHeader title="تنظیمات" />
      <section className="card mb-6 p-5">
        <h2 className="mb-1 text-base font-black">نماد اعتماد الکترونیکی (اینماد)</h2>
        <p className="mb-4 text-xs leading-6 text-muted">
          پس از دریافت نماد، شناسه (id) و کد (Code) را از کد HTML ارائه‌شده در پنل اینماد کپی کنید. نماد به‌طور خودکار در فوتر همه صفحات نمایش داده می‌شود.
        </p>
        <ActionForm action={saveSettings} submitLabel="ذخیره تنظیمات" className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs font-bold">شناسه اینماد (id)<input name="enamad_id" defaultValue={settings.enamad_id ?? ""} dir="ltr" className="input py-2" /></label>
            <label className="flex flex-col gap-1 text-xs font-bold">کد اینماد (Code)<input name="enamad_code" defaultValue={settings.enamad_code ?? ""} dir="ltr" className="input py-2" /></label>
          </div>
        </ActionForm>
      </section>

      <section className="card mb-6 p-5">
        <h2 className="mb-4 text-base font-black">کد ورود ثابت من</h2>
        <ChangePasswordForm />
      </section>

      <section className="card overflow-x-auto">
        <h2 className="p-5 text-base font-black">گزارش فعالیت‌های مدیریتی (۳۰ مورد اخیر)</h2>
        <table className="w-full min-w-[640px] text-[13px]">
          <thead className="bg-canvas text-muted">
            <tr>
              <th className="px-4 py-3 text-right font-bold">زمان</th>
              <th className="px-4 py-3 text-right font-bold">کاربر</th>
              <th className="px-4 py-3 text-right font-bold">عملیات</th>
              <th className="px-4 py-3 text-right font-bold">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 text-muted">{faDateTime(l.createdAt)}</td>
                <td className="px-4 py-2.5">{l.actor ? [l.actor.firstName, l.actor.lastName].filter(Boolean).join(" ") || l.actor.phone : "—"}</td>
                <td className="px-4 py-2.5" dir="ltr">{l.action}{l.entity ? ` · ${l.entity}` : ""}</td>
                <td className="px-4 py-2.5 text-muted" dir="ltr">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
