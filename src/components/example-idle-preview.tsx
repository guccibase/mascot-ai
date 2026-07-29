"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadPublicExampleIdlePreview,
  type PublicExampleSlug,
} from "@/lib/public-example-idle-preview";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { cn } from "@/lib/utils";

type Props = {
  slug: PublicExampleSlug;
  accent: string;
  stage: string;
  className?: string;
  minHeightClassName?: string;
  maxWidthClassName?: string;
};

/**
 * Lightweight idle SVG stage for public examples (onboarding + home cards).
 * Loads slim idle-preview JSON, sanitizes, and respects reduced motion.
 */
export function ExampleIdlePreview({
  slug,
  accent,
  stage,
  className,
  minHeightClassName = "min-h-[168px] sm:min-h-[188px]",
  maxWidthClassName = "max-w-[140px]",
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    void loadPublicExampleIdlePreview(slug)
      .then((markup) => {
        if (cancelled) return;
        if (!markup) {
          setStatus("error");
          return;
        }
        const host = hostRef.current;
        if (!host) {
          setStatus("error");
          return;
        }
        host.innerHTML = sanitizeSvg(markup);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
  }, [slug]);

  useEffect(() => {
    if (status !== "ready") return;
    const host = hostRef.current;
    const root = host?.querySelector("svg");
    if (!root) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (media.matches) {
        root.setAttribute("data-paused", "1");
        if ("pauseAnimations" in root) {
          (root as SVGSVGElement).pauseAnimations();
        }
      } else {
        root.removeAttribute("data-paused");
        if ("unpauseAnimations" in root) {
          (root as SVGSVGElement).unpauseAnimations();
        }
      }
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [status, slug]);

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
      <div
        ref={hostRef}
        className={cn(
          "w-full [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-h-[150px] [&_svg]:w-full",
          maxWidthClassName,
          status === "ready" ? "block" : "hidden"
        )}
        aria-hidden={status !== "ready"}
      />
      {status === "loading" ? (
        <div
          className="size-16 animate-pulse rounded-full bg-white/10"
          aria-hidden
        />
      ) : null}
      {status === "error" ? (
        <p className="text-center text-xs text-white/45">Preview unavailable</p>
      ) : null}
    </div>
  );
}
