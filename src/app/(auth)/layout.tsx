import { BackButton } from "@/components/layout/BackButton";
import { NavigationTracker } from "@/components/layout/navigation";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative grid min-h-dvh place-items-center bg-canvas px-4 py-16">
      <div className="absolute left-3 top-3 md:left-6 md:top-6">
        <BackButton fallback="/" className="bg-white shadow-sm ring-1 ring-line" />
      </div>
      {children}
      <NavigationTracker />
    </main>
  );
}
