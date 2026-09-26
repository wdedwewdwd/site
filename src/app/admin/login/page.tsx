import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, safeNext } from "@/lib/auth/session";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";

export const metadata: Metadata = { title: "ورود مدیر", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : "/admin");
  const reauth = sp.reauth === "1";
  const session = await getSession();
  if (!reauth && session && (session.user.role === "ADMIN" || session.user.role === "SUPPORT")) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <AdminLoginForm next={next.startsWith("/admin") ? next : "/admin"} reauth={reauth} />
    </main>
  );
}
