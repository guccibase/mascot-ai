import Image from "next/image";
import { isSvgAsset } from "@/lib/blog-utils";
import { cn } from "@/lib/utils";

/** Shared cover renderer — SVG via <img>, raster via next/image. */
export function BlogCoverImage({
  src,
  alt,
  priority = false,
  className,
  sizes,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes: string;
}) {
  if (isSvgAsset(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- SVG covers
      <img
        src={src}
        alt={alt}
        className={cn("h-full w-full object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      className={cn("object-cover", className)}
      sizes={sizes}
    />
  );
}
