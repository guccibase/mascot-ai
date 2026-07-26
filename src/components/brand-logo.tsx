import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  /** Hide the wordmark (icon only). */
  markOnly?: boolean;
  /** Optional tagline next to the wordmark (desktop). */
  tagline?: string;
  size?: "sm" | "md" | "lg";
};

const markSize = {
  sm: "size-7",
  md: "size-8",
  lg: "size-10",
} as const;

const wordSize = {
  sm: "text-xl",
  md: "text-2xl sm:text-[1.75rem]",
  lg: "text-3xl",
} as const;

/** Gold mascot face used as the MascotAI brand mark. */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <g transform="translate(64 70)">
        <circle cx="-38" cy="-8" r="11" fill="#F5B34F" />
        <circle cx="38" cy="-8" r="11" fill="#F5B34F" />
        <circle cx="0" cy="0" r="42" fill="#F5B34F" />
        <line
          x1="0"
          y1="-42"
          x2="0"
          y2="-58"
          stroke="#F5B34F"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="0" cy="-62" r="6.5" fill="#F5B34F" />
        <ellipse cx="-14" cy="-4" rx="11" ry="14" fill="#F7F3EA" />
        <ellipse cx="14" cy="-4" rx="11" ry="14" fill="#F7F3EA" />
        <circle cx="-14" cy="-2" r="5.5" fill="#12141C" />
        <circle cx="14" cy="-2" r="5.5" fill="#12141C" />
        <path
          d="M-12 14 Q0 24 12 14"
          stroke="#12141C"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M28 -28 L30.2 -22.5 L36 -20.5 L30.2 -18.5 L28 -13 L25.8 -18.5 L20 -20.5 L25.8 -22.5 Z"
          fill="#F7F3EA"
        />
      </g>
    </svg>
  );
}

/**
 * MascotAI wordmark + gold mascot mark used across marketing and auth surfaces.
 */
export function BrandLogo({
  className,
  markOnly = false,
  tagline,
  size = "md",
}: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markSize[size]} />
      {!markOnly ? (
        <span className="inline-flex items-baseline gap-2">
          <span
            className={cn(
              "font-[family-name:var(--font-display)] tracking-tight",
              wordSize[size]
            )}
          >
            Mascot
            <span className="text-[var(--brand-accent)]">AI</span>
          </span>
          {tagline ? (
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--brand-muted)] sm:inline">
              {tagline}
            </span>
          ) : null}
        </span>
      ) : (
        <span className="sr-only">MascotAI</span>
      )}
    </span>
  );
}
