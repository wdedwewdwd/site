import { requireUser, safeNext } from "@/lib/auth/session";
import { AddressForm } from "@/components/profile/AddressForm";

export default async function NewAddressPage({ searchParams }: PageProps<"/profile/addresses/new">) {
  const user = await requireUser("/profile/addresses/new");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next) : undefined;
  return (
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <h1 className="text-lg font-black">افزودن آدرس جدید</h1>
      <AddressForm next={next} defaultName={[user.firstName, user.lastName].filter(Boolean).join(" ")} defaultPhone={user.phone} />
    </div>
  );
}
