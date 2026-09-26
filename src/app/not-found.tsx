import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas p-4">
      <div className="card flex max-w-md flex-col items-center gap-4 px-6 py-12 text-center">
        <SearchX className="size-14 text-brand" />
        <h1 className="text-xl font-black">صفحه مورد نظر پیدا نشد</h1>
        <p className="text-sm text-muted">ممکن است آدرس اشتباه وارد شده باشد یا این صفحه حذف شده باشد.</p>
        <div className="flex gap-3">
          <Link href="/" className="btn-primary">صفحه اصلی</Link>
          <Link href="/categories" className="btn-ghost">دسته‌بندی قطعات</Link>
        </div>
      </div>
    </main>
  );
}
