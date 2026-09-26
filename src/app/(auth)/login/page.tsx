import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, safeNext } from "@/lib/auth/session";
import { LoginFlow } from "@/components/auth/LoginFlow";

export const metadata: Metadata = { title: "ورود / ثبت‌نام", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : "/");
  const reauth = sp.reauth === "1";
  if (!reauth && (await getUser())) redirect(next);
  return <LoginFlow next={next} reauth={reauth} />;
}
