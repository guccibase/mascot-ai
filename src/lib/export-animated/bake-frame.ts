/**
 * Snapshot a mounted SVG animation frame for raster export.
 *
 * SMIL: pause + setCurrentTime, read animated values → SVG attributes
 * CSS: pause + WAAPI/negative-delay seek → computed styles frozen onto clone
 * Clone: strip SMIL + <style>, apply frozen presentation, rasterize via <img>
 *
 * Critical: never pair source/clone by raw document order after removing
 * SMIL/<style> — those removals shift indexes and bake the wrong styles.
 */

const SMIL_SELECTOR = "animate, animateTransform, animateMotion, set";
const SKIP_TAGS = new Set([
  "style",
  "animate",
  "animatetransform",
  "animatemotion",
  "set",
  "mpath",
]);

export const SNAPSHOT_STYLE_KEYS = [
  "d",
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-opacity",
  "stroke-width",
  "opacity",
  "visibility",
  "filter",
] as const;

function isContentElement(el: Element): boolean {
  return !SKIP_TAGS.has(el.tagName.toLowerCase());
}

/** Document-order content elements (excludes SMIL + style). */
export function listTreeElements(root: Element): Element[] {
  const out: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let node = walker.currentNode as Element | null;
  while (node) {
    if (isContentElement(node)) out.push(node);
    node = walker.nextNode() as Element | null;
  }
  return out;
}

/** Convert CSS matrix() / matrix3d() into an SVG transform attribute value. */
export function cssTransformToSvgAttr(matrix: string): string | null {
  if (!matrix || matrix === "none") return null;

  const m2 = matrix.match(/^matrix\(([^)]+)\)$/);
  if (m2) {
    const parts = m2[1]!.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 6) return `matrix(${parts.join(" ")})`;
  }

  const m3 = matrix.match(/^matrix3d\(([^)]+)\)$/);
  if (m3) {
    const p = m3[1]!.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    // CSS matrix3d → 2D SVG matrix(a c e b d f) from columns 0/1/3 of the 4×4.
    if (p.length === 16) {
      return `matrix(${p[0]} ${p[1]} ${p[4]} ${p[5]} ${p[12]} ${p[13]})`;
    }
  }

  return null;
}

/** Elements with active CSS @keyframes (computed once per mounted SVG). */
export function findAnimatedCssElements(svg: SVGSVGElement): SVGElement[] {
  const out: SVGElement[] = [];
  for (const el of svg.querySelectorAll<SVGElement>("*")) {
    if (!isContentElement(el)) continue;
    const name = getComputedStyle(el).animationName;
    if (name && name !== "none") out.push(el);
  }
  return out;
}

function animationIterationIsInfinite(el: Element): boolean {
  const raw = getComputedStyle(el).animationIterationCount;
  if (!raw) return false;
  return raw.split(",").some((part) => part.trim() === "infinite");
}

/** Looping CSS animations only — safe to seek across the capture timeline. */
export function findInfiniteCssAnimatedElements(
  svg: SVGSVGElement
): SVGElement[] {
  return findAnimatedCssElements(svg).filter(animationIterationIsInfinite);
}

/**
 * Finish short entrance animations (e.g. `.pp-pop` from opacity:0) and freeze
 * them so frame 0 is not captured at the invisible `from` keyframe.
 */
export function finishOneShotCssAnimations(svg: SVGSVGElement): void {
  for (const el of findAnimatedCssElements(svg)) {
    if (animationIterationIsInfinite(el)) continue;
    const animations =
      typeof el.getAnimations === "function" ? el.getAnimations() : [];
    for (const animation of animations) {
      try {
        animation.finish();
      } catch {
        /* ignore */
      }
      try {
        animation.cancel();
      } catch {
        /* ignore */
      }
    }
    el.style.animation = "none";
  }
}

/**
 * Apply one cached getComputedStyle snapshot onto a clone element.
 * CSS transforms are written as SVG `transform` attributes (reliable for <img>).
 */
export function applyComputedSnapshot(
  target: Element,
  computed: CSSStyleDeclaration
): void {
  if (!(target instanceof SVGElement)) return;

  const cssTransform = computed.getPropertyValue("transform");
  const svgTransform = cssTransformToSvgAttr(cssTransform);
  if (svgTransform) {
    target.setAttribute("transform", svgTransform);
    target.style.removeProperty("transform");
  }

  const parts: string[] = [];
  for (const key of SNAPSHOT_STYLE_KEYS) {
    const value = computed.getPropertyValue(key);
    if (!value || value === "none" || value === "normal") continue;
    if (key === "opacity" && value === "1") continue;
    if (key === "visibility" && value === "visible") continue;
    parts.push(`${key}:${value}`);
  }
  if (parts.length > 0) {
    const prev = target.getAttribute("style");
    target.setAttribute("style", prev ? `${prev};${parts.join(";")}` : parts.join(";"));
  }
  target.style.animation = "none";
  target.style.transition = "none";
}

/**
 * Seek CSS @keyframes on pre-indexed elements.
 * Prefer Web Animations API (precise); fall back to negative animation-delay.
 */
export function seekCssAnimations(
  elements: readonly SVGElement[],
  timeSec: number
): void {
  const timeMs = Math.max(0, Math.round(timeSec * 1000));
  for (const el of elements) {
    const animations =
      typeof el.getAnimations === "function" ? el.getAnimations() : [];
    if (animations.length > 0) {
      for (const animation of animations) {
        try {
          animation.pause();
          animation.currentTime = timeMs;
        } catch {
          /* ignore */
        }
      }
      continue;
    }
    el.style.animationPlayState = "paused";
    el.style.animationDelay = `-${timeMs}ms`;
  }
}

function serializeTransformList(list: SVGTransformList): string {
  const parts: string[] = [];
  for (let i = 0; i < list.numberOfItems; i++) {
    const t = list.getItem(i);
    const m = t.matrix;
    parts.push(`matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`);
  }
  return parts.join(" ");
}

/**
 * Prefer SMIL animVal transform (includes additive animateTransform stacks)
 * over the CSS transform already applied from getComputedStyle.
 */
function bakeSmilOntoClone(
  source: SVGSVGElement,
  sourceEls: readonly Element[],
  cloneEls: readonly Element[]
): void {
  if (sourceEls.length !== cloneEls.length) return;

  const sourceIndex = new Map<Element, number>();
  for (let i = 0; i < sourceEls.length; i++) {
    sourceIndex.set(sourceEls[i]!, i);
  }

  for (const anim of source.querySelectorAll(SMIL_SELECTOR)) {
    const target = (anim as SVGAnimationElement).targetElement;
    if (!target) continue;
    const attr = anim.getAttribute("attributeName");
    if (!attr) continue;
    const idx = sourceIndex.get(target);
    if (idx == null) continue;
    const cloneTarget = cloneEls[idx];
    if (!cloneTarget) continue;

    if (attr === "transform" && target instanceof SVGGraphicsElement) {
      const list = target.transform?.animVal;
      if (list && list.numberOfItems > 0) {
        cloneTarget.setAttribute("transform", serializeTransformList(list));
        if (cloneTarget instanceof SVGElement) {
          cloneTarget.style.removeProperty("transform");
        }
      }
      continue;
    }

    const animated = (target as unknown as Record<string, unknown>)[attr] as
      | { animVal?: { value?: number; valueAsString?: string } }
      | undefined;
    const animVal = animated?.animVal;
    if (!animVal) continue;
    if (typeof animVal.valueAsString === "string" && animVal.valueAsString) {
      cloneTarget.setAttribute(attr, animVal.valueAsString);
    } else if (typeof animVal.value === "number" && Number.isFinite(animVal.value)) {
      cloneTarget.setAttribute(attr, String(animVal.value));
    }
  }
}

/** Remove @keyframes / animation declarations from shared pack CSS. */
export function stripAnimationCss(css: string): string {
  let out = css.replace(/@keyframes[\s\S]*?\}\s*/g, "");
  out = out.replace(
    /animation(?:-duration|-delay|-iteration-count|-timing-function|-direction|-fill-mode|-play-state|-name)?\s*:[^;{}]+;?/gi,
    ""
  );
  return out;
}

/** Batch-read computed styles once per content element. */
export function snapshotComputedStyles(
  svg: SVGSVGElement,
  sourceEls?: readonly Element[]
): CSSStyleDeclaration[] {
  svg.getBoundingClientRect();
  const els = sourceEls ?? listTreeElements(svg);
  return els.map((el) => getComputedStyle(el));
}

/** Return static SVG markup for the current timeline position. */
export function bakeSvgCurrentFrame(
  svg: SVGSVGElement,
  precomputed: CSSStyleDeclaration[],
  sourceEls?: readonly Element[]
): string {
  const sourceElements = sourceEls ?? listTreeElements(svg);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll(SMIL_SELECTOR).forEach((node) => node.remove());
  clone.querySelectorAll("style").forEach((node) => node.remove());

  const cloneEls = listTreeElements(clone);
  const n = Math.min(
    sourceElements.length,
    cloneEls.length,
    precomputed.length
  );
  for (let i = 0; i < n; i++) {
    applyComputedSnapshot(cloneEls[i]!, precomputed[i]!);
  }

  bakeSmilOntoClone(svg, sourceElements, cloneEls);

  if (!clone.getAttribute("xmlns")) {
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  return new XMLSerializer().serializeToString(clone);
}
