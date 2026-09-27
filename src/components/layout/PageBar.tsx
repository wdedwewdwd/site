import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { BackButton } from "./BackButton";

type Crumb = { href?: string; label: string };

type Props = {
  /** Shown centered in the mobile header and as the last breadcrumb on desktop. */
  title: string;
  /** Shorter title for the mobile header (defaults to `title`). */
  mobileTitle?: string;
  /** Parent page used when there is no in-site history to go back to. */
  backHref: string;
  /** Breadcrumb trail between "خانه" and the current page (desktop). */
  crumbs?: Crumb[];
  /** Always navigate to backHref (never browser history). */
  forceBack?: boolean;
  /** Optional buttons shown next to the back button on mobile (e.g. share, wishlist). */
  actions?: React.ReactNode;
};

/**
 * Page header for inner pages.
 * Mobile: the 56px app bar from the design — back arrow on the left, centered title, balancing slot on the right.
 * Desktop: breadcrumbs with a "بازگشت" button at the far end.
 * Place it as the first child of a page container that uses `py-6` on mobile.
 */
export function PageBar({ title, mobileTitle, backHref, crumbs = [], forceBack, actions }: Props) {
  return (
    <>
      <div className="sticky top-0 z-30 -mx-4 -mt-6 mb-1 border-b border-white/[0.08] bg-night text-white md:hidden">
        <div className="relative flex h-14 items-center justify-between px-4">
          {/* Right (start in RTL): balancing slot so the title stays centered */}
          <span className="size-10 shrink-0" aria-hidden />
          <p className={`absolute truncate text-center text-lg font-black ${actions ? "inset-x-24" : "inset-x-16"}`} aria-hidden>
            {mobileTitle ?? title}
          </p>
          <div className="flex items-center gap-1">
            {actions}
            <BackButton fallback={backHref} force={forceBack} tone="dark" />
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-4 md:flex">
        <Breadcrumbs items={[...crumbs, { label: title }]} />
        <BackButton fallback={backHref} force={forceBack} variant="pill" />
      </div>
    </>
  );
}
