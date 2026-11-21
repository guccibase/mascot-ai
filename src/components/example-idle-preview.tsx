import type { PublicExampleSlug } from "@/lib/mascots";
import { cn } from "@/lib/utils";

type Props = {
  slug: PublicExampleSlug;
  accent: string;
  stage: string;
  className?: string;
  minHeightClassName?: string;
  maxWidthClassName?: string;
};

export function ExampleIdlePreview({
  slug,
  accent,
  stage,
  className,
  minHeightClassName = "min-h-[168px] sm:min-h-[188px]",
  maxWidthClassName = "max-w-[140px]",
}: Props) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[1rem] border border-white/10 p-3",
        minHeightClassName,
        className
      )}
      style={{
        background: `
          radial-gradient(90% 70% at 70% 0%, ${accent}33, transparent 55%),
          linear-gradient(160deg, ${stage} 0%, #0b1020 75%)
        `,
      }}
    >
      <picture className={cn("block w-full", maxWidthClassName)}>
        <source
          media="(prefers-reduced-motion: reduce)"
          srcSet={`/previews/${slug}-still.svg`}
        />
        <img
          src={`/previews/${slug}.svg`}
          width={420}
          height={520}
          loading="lazy"
          decoding="async"
          alt=""
          className="mx-auto h-auto max-h-[150px] w-full object-contain"
        />
      </picture>
    </div>
  );
}
