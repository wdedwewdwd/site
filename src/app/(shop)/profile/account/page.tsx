import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { AccountForm } from "@/components/profile/AccountForm";
import { PageBar } from "@/components/layout/PageBar";

export default async function AccountPage() {
  const user = await requireUser("/profile/account");
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <>
      <PageBar title="اطلاعات حساب" backHref="/profile" crumbs={[{ href: "/profile", label: "حساب کاربری" }]} />
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="sr-only text-lg font-black md:not-sr-only">ویرایش اطلاعات حساب کاربری</h1>
      </div>
      <AccountForm
        phone={me.phone}
        defaults={{ firstName: me.firstName ?? "", lastName: me.lastName ?? "", email: me.email ?? "", nationalCode: me.nationalCode ?? "" }}
      />
    </div>
    </>
  );
}
