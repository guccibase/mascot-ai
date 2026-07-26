import type { MascotSlug } from "@/lib/mascots";
import { remixConfigFor } from "./examples.config";

/**
 * Additive ms- contract annotations so remixed examples render in
 * GeneratedStudio without renaming the example's own CSS classes.
 */
export function annotateStudioContract(svg: string, slug: MascotSlug): string {
  const cfg = remixConfigFor(slug);
  let out = svg;

  // Glow CSS variable. Examples use --g, the studio writes --ms-glow.
  out = out.replace(/var\(\s*--g\s*,/gi, "var(--ms-glow,");

  // Root class for theme variable injection.
  if (!/\bms-root\b/.test(out)) {
    out = out.replace(/<svg\b([^>]*)>/i, (full, attrs: string) => {
      if (/\bclass=/.test(attrs)) {
        return full.replace(/class=(["'])([^"']*)\1/, 'class="$2 ms-root"');
      }
      return `<svg class="ms-root"${attrs}>`;
    });
  }

  // Eye tracking group. Add ms-eyes alongside the example class.
  out = addClassAlongside(out, cfg.eyesClass, "ms-eyes");

  // Glow halo: ellipse or group.
  out = addClassAlongside(out, cfg.haloClass, "ms-glow-halo");

  if (cfg.instrumentClass) {
    out = addClassAlongside(out, cfg.instrumentClass, "ms-signal-fan");
  }

  // Lyra: tail feather container lives at TAIL_BASE without a class yet.
  if (slug === "lyra" && !out.includes("ms-signal-fan")) {
    out = out.replace(
      /(<g[^>]*transform=["']translate\(210,362\)[^"']*["'][^>]*)(>)/i,
      '$1 class="ms-signal-fan"$2'
    );
  }

  return out;
}

function addClassAlongside(
  svg: string,
  classPattern: RegExp,
  msClass: string
): string {
  return svg.replace(
    /(<(?:g|ellipse|circle|path)\b[^>]*class=(["'])([^"']*)\2[^>]*)(>)/gi,
    (full, open: string, quote: string, classes: string, close: string) => {
      if (!classPattern.test(classes) || classes.includes(msClass)) return full;
      const next = `${classes} ${msClass}`.trim();
      return open.replace(`${quote}${classes}${quote}`, `${quote}${next}${quote}`) + close;
    }
  );
}

/** Strip SMIL/CSS animation for static thumbnails. Keeps geometry. */
export function stripAnimationsForThumbnail(svg: string): string {
  let out = svg;
  out = out.replace(/<animate[^>]*\/>/gi, "");
  out = out.replace(/<animateTransform[^>]*\/>/gi, "");
  out = out.replace(/<animateMotion[^>]*\/>/gi, "");
  out = out.replace(/<set[^>]*\/>/gi, "");
  out = out.replace(/<animate[^>]*>[\s\S]*?<\/animate>/gi, "");
  out = out.replace(/<animateTransform[^>]*>[\s\S]*?<\/animateTransform>/gi, "");
  out = out.replace(/\sstyle=(["'])[^"']*animation[^"']*\1/gi, "");
  return out;
}
