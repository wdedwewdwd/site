import { requireUser } from "@/lib/auth/session";
import { TicketForm } from "@/components/support/TicketForm";
import { PageBar } from "@/components/layout/PageBar";

export default async function NewTicketPage({ searchParams }: PageProps<"/profile/support/new">) {
  await requireUser("/profile/support/new");
  const order = (await searchParams).order;
  return (
    <>
      <PageBar title="ثبت تیکت" backHref="/profile/support" crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/support", label: "پشتیبانی" }]} />
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <h1 className="sr-only text-lg font-black md:not-sr-only">ثبت تیکت پشتیبانی</h1>
      <TicketForm orderRef={typeof order === "string" && /^\d{1,10}$/.test(order) ? order : undefined} />
    </div>
    </>
  );
}
