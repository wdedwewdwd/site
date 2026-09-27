"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Counts client-side navigations inside the site. When it's zero the visitor landed here
// directly (new tab, search result, shared link), so "back" must not leave the site.
let internalNavigations = 0;
let lastPath: string | null = null;

export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastPath !== null && lastPath !== pathname) internalNavigations++;
    lastPath = pathname;
  }, [pathname]);
  return null;
}

export const canGoBackInSite = () => internalNavigations > 0;

/** Renders its children only on the given paths (used for the home-only mobile header). */
export function OnlyOnPaths({ paths, children }: { paths: string[]; children: React.ReactNode }) {
  const pathname = usePathname();
  return paths.includes(pathname) ? <>{children}</> : null;
}

/**
 * On phones the footer is shown on the home page only; other pages get a spacer instead so their
 * content stays clear of the fixed bottom navigation. Desktop always shows the footer.
 */
export function MobileFooterGate({ children }: { children: React.ReactNode }) {
  if (usePathname() === "/") return <>{children}</>;
  return (
    <>
      <div className="h-[calc(6rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden />
      <div className="hidden md:block">{children}</div>
    </>
  );
}
