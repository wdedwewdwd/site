import Image from "next/image";
import { CategoryIcon } from "./CategoryIcon";

/**
 * A category's cover photo filling its (positioned) parent box, or its line icon when it has no photo yet.
 * The photos share the product photos' studio backdrop, so `object-cover` crops only empty background.
 */
export function CategoryCover(props: { image?: string | null; icon: string | null; sizes: string; iconClassName?: string; className?: string }) {
  const { image, icon, sizes, iconClassName = "size-7", className = "" } = props;
  if (image) return <Image src={image} alt="" fill sizes={sizes} className={`object-cover ${className}`} />;
  return (
    <span className="absolute inset-0 grid place-items-center bg-brand-soft text-brand">
      <CategoryIcon name={icon} className={iconClassName} />
    </span>
  );
}
