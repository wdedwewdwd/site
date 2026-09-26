import { db } from "@/lib/db";
import { requireUser, safeNext } from "@/lib/auth/session";
import { AccountForm } from "@/components/profile/AccountForm";

export default async function AccountPage({ searchParams }: PageProps<"/profile/account">) {
  const user = await requireUser("/profile/account");
  const sp = await searchParams;
  const welcome = sp.welcome === "1";
  const next = welcome && typeof sp.next === "string" ? safeNext(sp.next) : undefined;
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id } });

  return (
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-black">{welcome ? "به آریزون یدک خوش آمدید!" : "ویرایش اطلاعات حساب کاربری"}</h1>
        {welcome && <p className="text-[13px] text-muted">لطفاً نام خود را برای تکمیل حساب کاربری وارد کنید.</p>}
      </div>
      <AccountForm
        phone={me.phone}
        next={next}
        defaults={{ firstName: me.firstName ?? "", lastName: me.lastName ?? "", email: me.email ?? "", nationalCode: me.nationalCode ?? "" }}
      />
    </div>
  );
}
