"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";

// Never render error.message: in production it could leak internals.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-canvas p-4">
      <div className="card flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <WifiOff className="size-14 text-brand" />
        <h1 className="text-xl font-black">خطایی رخ داد</h1>
        <p className="text-sm text-muted">ارتباط با سرور برقرار نشد یا مشکلی پیش آمد. لطفاً دوباره تلاش کنید.</p>
        <div className="flex gap-3">
          <button type="button" onClick={reset} className="btn-primary">تلاش مجدد</button>
          <Link href="/" className="btn-ghost">صفحه اصلی</Link>
        </div>
      </div>
    </main>
  );
}
