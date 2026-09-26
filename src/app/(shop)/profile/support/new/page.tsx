import { requireUser } from "@/lib/auth/session";
import { TicketForm } from "@/components/support/TicketForm";

export default async function NewTicketPage({ searchParams }: PageProps<"/profile/support/new">) {
  await requireUser("/profile/support/new");
  const order = (await searchParams).order;
  return (
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <h1 className="text-lg font-black">ثبت تیکت پشتیبانی</h1>
      <TicketForm orderRef={typeof order === "string" && /^\d{1,10}$/.test(order) ? order : undefined} />
    </div>
  );
}
