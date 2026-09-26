import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { env, isProd } from "@/lib/env";
import { toman } from "@/lib/format";

export const metadata = { title: "درگاه آزمایشی", robots: { index: false } };

/** Development-only stand-in for the bank gateway. Disabled in production. */
export default async function MockGatewayPage({ searchParams }: PageProps<"/payment/mock">) {
  if (isProd || env.PAYMENT_PROVIDER !== "mock") notFound();
  const authority = String((await searchParams).authority ?? "");
  const payment = await db.payment.findUnique({ where: { authority }, select: { amount: true, order: { select: { number: true } } } });
  if (!payment) notFound();

  const back = (status: string) => `/payment/callback?Authority=${encodeURIComponent(authority)}&Status=${status}`;
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-4">
      <div className="card flex w-full max-w-sm flex-col gap-4 p-6 text-center">
        <p className="rounded-lg bg-warning-soft p-2 text-xs font-bold text-warning">درگاه آزمایشی — فقط در محیط توسعه</p>
        <h1 className="text-lg font-black">پرداخت سفارش #{payment.order.number}</h1>
        <p className="text-2xl font-black">{toman(payment.amount)} تومان</p>
        <a href={back("OK")} className="btn-primary">پرداخت موفق</a>
        <a href={back("NOK")} className="btn-ghost">انصراف از پرداخت</a>
      </div>
    </main>
  );
}
