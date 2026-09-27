import { requireUser, safeNext } from "@/lib/auth/session";
import { AddressForm } from "@/components/profile/AddressForm";
import { PageBar } from "@/components/layout/PageBar";

export default async function NewAddressPage({ searchParams }: PageProps<"/profile/addresses/new">) {
  const user = await requireUser("/profile/addresses/new");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? safeNext(sp.next) : undefined;
  return (
    <>
      <PageBar title="افزودن آدرس" backHref={next ?? "/profile/addresses"} crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/addresses", label: "آدرس‌های من" }]} />
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <h1 className="sr-only text-lg font-black md:not-sr-only">افزودن آدرس جدید</h1>
      <AddressForm next={next} defaultName={[user.firstName, user.lastName].filter(Boolean).join(" ")} defaultPhone={user.phone} />
    </div>
    </>
  );
}
