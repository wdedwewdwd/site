import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { AddressForm } from "@/components/profile/AddressForm";
import { PageBar } from "@/components/layout/PageBar";

export default async function EditAddressPage({ params }: PageProps<"/profile/addresses/[id]">) {
  const user = await requireUser("/profile/addresses");
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const address = await db.address.findFirst({ where: { id, userId: user.id } });
  if (!address) notFound();
  return (
    <>
      <PageBar title="ویرایش آدرس" backHref="/profile/addresses" crumbs={[{ href: "/profile", label: "حساب کاربری" }, { href: "/profile/addresses", label: "آدرس‌های من" }]} />
    <div className="card flex flex-col gap-6 p-5 md:p-6">
      <h1 className="sr-only text-lg font-black md:not-sr-only">ویرایش آدرس</h1>
      <AddressForm address={address} />
    </div>
    </>
  );
}
