import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, safeNext } from "@/lib/auth/session";
import { needsProfile } from "@/lib/auth/profile-gate";
import { WelcomeForm } from "@/components/auth/WelcomeForm";

export const metadata: Metadata = { title: "تکمیل ثبت‌نام", robots: { index: false } };

/** Last sign-up step: a new customer enters their name before using the shop (see lib/auth/profile-gate). */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : "/");
  const user = await requireUser(`/welcome?next=${encodeURIComponent(next)}`);
  if (!needsProfile(user)) redirect(`/api/auth/profile-gate?next=${encodeURIComponent(next)}`);
  const me = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, nationalCode: true } });

  return (
    <WelcomeForm
      phone={user.phone}
      next={next}
      defaults={{ firstName: user.firstName ?? "", lastName: user.lastName ?? "", email: me.email ?? "", nationalCode: me.nationalCode ?? "" }}
    />
  );
}
