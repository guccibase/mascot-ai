"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  MascotEditPanel,
  MascotPartsPanel,
} from "@/components/mascot-edit-panel";
import { AppAssetsPanel } from "@/components/app-assets-panel";
import { GESTURE_PRESETS } from "@/lib/gesture-presets";
import { DEFAULT_MASCOT_MODEL } from "@/lib/mascot-model-options";
import { applyPartVisibility, extractPartsFromMascot } from "@/lib/mascot-parts";
import { MAX_STUDIO_GESTURES } from "@/lib/refine-pack";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import { estimateTokens } from "@/lib/token-pricing";
import { packHasLiveSignal, packSignalPartKey } from "@/lib/mascot-pack";
import { useAffordability } from "@/lib/use-affordability";
import {
  bakeGestureExport,
  rampColor,
  mixHex,
  rgba,
  zoneForSignal,
  normalizeSignal,
  SPARK_PATHS,
  computeSignalBars,
  applyNmChipsLiveSignal,
  setSignalPaint,
  type SparkKind,
} from "@/lib/studio-utils";
import type {
  GeneratedGesture,
  GeneratedMascot,
  GestureRequest,
  MascotModelId,
  ThemeSwatch,
} from "@/lib/types";
import type { Id } from "../../convex/_generated/dataModel";
import { trackEvent, trackGenerationFailure } from "@/lib/analytics";
import { zipSync, strToU8 } from "fflate";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useMascotUndo,
  useResetUndoOnMascotIdChange,
} from "@/hooks/use-mascot-undo";
import { isReferenceId } from "@/lib/reference-image-client";
import {
  resolveStudioFeatures,
  type StudioCapabilities,
} from "@/lib/studio-capabilities";
import { usePreviewContentProtection } from "@/hooks/use-preview-content-protection";
import {
  downloadBlobFile,
  downloadPoseBytes,
  encodeAnimatedPair,
  encodePoseRaster,
  estimatePackRasterMegabytes,
  estimatePackRasterSeconds,
  supportsWebpEncode,
  type PoseExportFormat,
  type RasterScale,
} from "@/lib/export-animated";

export type { StudioCapabilities };

type Props = {
  mascot: GeneratedMascot;
  /** When true, fills the viewport like /studio/[slug] examples. */
  fullPage?: boolean;
  look?: string;
  model?: MascotModelId;
  /** Saved mascot id — required for persisted app asset packs. */
  mascotId?: Id<"mascots"> | null;
  onMascotChange?: (mascot: GeneratedMascot) => void;
  /**
   * Privileged features are opt-in (fail-closed). Pass
   * `OWNED_STUDIO_CAPABILITIES` for created/remixed/purchased library studios,
   * or a preview preset for marketplace / example surfaces.
   */
  capabilities?: StudioCapabilities;
};

type Spark = {
  key: string;
  kind: SparkKind;
  dx: number;
  dy: number;
  color: string;
  rot: number;
};

function useAnimatedNumber(target: number, speed = 0.14) {
  const [value, setValue] = useState(target);
  const vRef = useRef(target);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const cur = vRef.current;
      const next = cur + (target - cur) * speed;
      if (Math.abs(target - next) < 0.08) {
        vRef.current = target;
        setValue(target);
        return;
      }
      vRef.current = next;
      setValue(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return value;
}

function swatchBg(t: ThemeSwatch) {
  return `linear-gradient(135deg, ${t.top} 0 40%, ${t.mid} 40% 70%, ${t.base} 70% 100%)`;
}

function SignalWave({ score, ramp }: { score: number; ramp: string[] }) {
  const bars = computeSignalBars(score);
  return (
    <svg
      className="gs-signal-wave"
      width="120"
      height="36"
      viewBox="0 0 120 36"
      aria-hidden
      style={{ width: 120, height: 36, display: "block", flex: "0 0 auto" }}
    >
      {bars.map((b) => (
        <rect
          key={b.i}
          x={b.x}
          y={34 - b.h}
          width="7"
          height={b.h}
          rx="2.5"
          fill={b.color || rampColor(score, ramp)}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function applyLiveVars(
  svg: SVGSVGElement | null,
  theme: ThemeSwatch,
  accent: string,
  signal: number,
  glow: number,
  ramp: string[]
) {
  if (!svg) return;
  const features = theme.features ?? "#2A1A0C";
  const color = rampColor(signal, ramp);
  svg.style.setProperty("--ms-top", theme.top);
  svg.style.setProperty("--ms-mid", theme.mid);
  svg.style.setProperty("--ms-base", theme.base);
  svg.style.setProperty("--ms-core", theme.core);
  svg.style.setProperty("--ms-stage", theme.stage);
  svg.style.setProperty("--ms-features", features);
  svg.style.setProperty("--ms-accent", accent);
  svg.style.setProperty("--ms-signal", String(signal));
  svg.style.setProperty("--ms-signal-color", color);
  svg.style.setProperty("--ms-glow", String(glow));

  /* Lyra-style live fan: scale/tint children of .ms-signal-fan */
  const fan = svg.querySelector(".ms-signal-fan");
  if (fan) {
    const kids = Array.from(fan.children);
    const e = Math.max(0, Math.min(1, signal / 100));
    kids.forEach((node, i) => {
      const el = node as SVGElement;
      const t = kids.length <= 1 ? 0.5 : i / (kids.length - 1);
      const arch = 1 - Math.abs(t - 0.5) * 1.35;
      const spread = 0.55 + e * 0.7 * Math.max(0.3, arch);
      el.style.transformOrigin = "center bottom";
      el.style.transform = `scale(${spread.toFixed(3)})`;
      el.style.opacity = String(0.35 + e * 0.65);
      setSignalPaint(el, "fill", color, true);
      setSignalPaint(el, "stroke", color, true);
    });
  }

  svg.querySelectorAll(".ms-signal-tint").forEach((node) => {
    const el = node as SVGElement;
    setSignalPaint(el, "fill", color, true);
    setSignalPaint(el, "stroke", color, true);
  });

  const chipRoot = svg.querySelector(".nm-chips");
  if (chipRoot) applyNmChipsLiveSignal(chipRoot, signal, color);
}

/** Scope paint-server and event IDs so two inline copies cannot collide. */
function scopeInlineSvgIds(svg: SVGSVGElement, prefix: string) {
  const idMap = new Map<string, string>();
  const identified = [
    ...(svg.matches("[id]") ? [svg] : []),
    ...svg.querySelectorAll<SVGElement>("[id]"),
  ];

  for (const element of identified) {
    const oldId = element.id;
    if (!oldId) continue;
    const nextId = `${prefix}-${oldId}`;
    idMap.set(oldId, nextId);
    element.id = nextId;
  }
  if (idMap.size === 0) return;

  const allElements = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  for (const element of allElements) {
    for (const attribute of [...element.attributes]) {
      if (attribute.name === "id") continue;
      let value = attribute.value;
      for (const [oldId, nextId] of idMap) {
        value = value
          .replaceAll(`url(#${oldId})`, `url(#${nextId})`)
          .replaceAll(`url("#${oldId}")`, `url("#${nextId}")`)
          .replaceAll(`url('#${oldId}')`, `url('#${nextId}')`);
        if (
          (attribute.name === "href" ||
            attribute.name === "xlink:href") &&
          value === `#${oldId}`
        ) {
          value = `#${nextId}`;
        }
        if (
          attribute.name === "aria-labelledby" ||
          attribute.name === "aria-describedby"
        ) {
          value = value
            .split(/\s+/)
            .map((token) => (token === oldId ? nextId : token))
            .join(" ");
        }
        if (attribute.name === "begin" || attribute.name === "end") {
          value = value.replaceAll(`${oldId}.`, `${nextId}.`);
        }
      }
      if (value !== attribute.value) {
        element.setAttribute(attribute.name, value);
      }
    }
  }
}

export function GeneratedStudio({
  mascot,
  fullPage = true,
  look,
  model,
  mascotId = null,
  onMascotChange,
  capabilities,
}: Props) {
  const { canExport, canEdit, canToggleParts, canAppAssets } =
    resolveStudioFeatures({
      capabilities,
      mascotId,
      hasMascotChangeHandler: Boolean(onMascotChange),
    });
  const previewProtected = !canExport;
  usePreviewContentProtection(previewProtected);
  const svgInstanceId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const parts = useMemo(() => extractPartsFromMascot(mascot), [mascot]);
  const themeKeys = Object.keys(mascot.themes);
  const firstKey = themeKeys[0] ?? "primary";
  const firstTheme = mascot.themes[firstKey]!;

  const [themeKey, setThemeKey] = useState(firstKey);
  const [custom, setCustom] = useState<ThemeSwatch>({
    ...firstTheme,
    name: "Custom",
  });
  const [glow, setGlow] = useState(0.45);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [selectedGestureKey, setSelectedGestureKey] = useState(
    mascot.gestures[0]?.key ?? "idle"
  );
  const [signal, setSignal] = useState(() =>
    normalizeSignal(mascot.instrument.defaultValue)
  );
  const signalAnim = useAnimatedNumber(signal);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<PoseExportFormat>("svg");
  const [exportScale, setExportScale] = useState<RasterScale>("1x");
  const [exportBusy, setExportBusy] = useState(false);
  /** Fail closed until capability probe resolves — avoids pack/WebP races. */
  const [webpExportOk, setWebpExportOk] = useState(false);
  const exportAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supportsWebpEncode().then((ok) => {
      if (!cancelled) setWebpExportOk(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!webpExportOk && exportFormat === "webp") setExportFormat("apng");
  }, [webpExportOk, exportFormat]);

  useEffect(() => {
    return () => {
      exportAbortRef.current?.abort();
    };
  }, []);
  const [addingGesture, setAddingGesture] = useState(false);
  const [showAddGesture, setShowAddGesture] = useState(false);
  const [customGestureLabel, setCustomGestureLabel] = useState("");
  const [customGestureTip, setCustomGestureTip] = useState("");
  const [referenceId, setReferenceId] = useState<string | undefined>();
  const currentMascotRef = useRef(mascot);
  const aiMutationRef = useRef(false);
  const aiMutationMascotRef = useRef<GeneratedMascot | null>(null);
  const [aiMutationBusy, setAiMutationBusy] = useState(false);

  useEffect(() => {
    currentMascotRef.current = mascot;
  }, [mascot]);

  const beginAiMutation = useCallback(() => {
    if (aiMutationRef.current) return false;
    aiMutationRef.current = true;
    aiMutationMascotRef.current = currentMascotRef.current;
    setAiMutationBusy(true);
    return true;
  }, []);

  const endAiMutation = useCallback(() => {
    aiMutationRef.current = false;
    aiMutationMascotRef.current = null;
    setAiMutationBusy(false);
  }, []);

  const isAiMutationCurrent = useCallback(
    () => aiMutationMascotRef.current === currentMascotRef.current,
    []
  );

  const refineHistoryLengthRef = useRef(0);
  const [undoGeneration, setUndoGeneration] = useState(0);
  const [refineHistoryRestoreLength, setRefineHistoryRestoreLength] = useState(0);

  const { pushSnapshot, undo, canUndo, undoDepth, clear: clearUndo } =
    useMascotUndo(
      useCallback(
        ({ mascot: restored, refineHistoryLength }) => {
          setRefineHistoryRestoreLength(refineHistoryLength);
          setUndoGeneration((g) => g + 1);
          onMascotChange?.(restored);
          toast.success("Reverted to previous version");
        },
        [onMascotChange]
      )
    );

  useResetUndoOnMascotIdChange(mascotId, clearUndo);

  const applyMascotChange = useCallback(
    (
      next: GeneratedMascot,
      options?: { refineHistoryLength?: number }
    ) => {
      const historyLength =
        options?.refineHistoryLength ?? refineHistoryLengthRef.current;
      const saved = pushSnapshot(mascot, historyLength);
      if (!saved) {
        toast.warning(
          "This pack is too large to save a revert point — undo may be unavailable"
        );
      }
      onMascotChange?.(next);
    },
    [mascot, onMascotChange, pushSnapshot]
  );

  const handleUndo = useCallback(() => {
    if (!onMascotChange) return;
    if (aiMutationRef.current) {
      toast.error("Wait for the current AI change to finish");
      return;
    }
    if (!undo()) {
      toast.error("Nothing to revert");
    }
  }, [onMascotChange, undo]);

  useEffect(() => {
    if (!canEdit || !canUndo) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "z" || event.shiftKey) return;
      if (!(event.metaKey || event.ctrlKey)) return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      event.preventDefault();
      handleUndo();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canEdit, canUndo, handleUndo]);
  const [enabledParts, setEnabledParts] = useState<Set<string>>(
    () => new Set(parts.map((p) => p.key))
  );
  const partKeysSig = parts.map((p) => p.key).join("|");
  const knownPartKeysRef = useRef("");

  useEffect(() => {
    const keys = parts.map((p) => p.key);
    const prevKnown = new Set(
      knownPartKeysRef.current.split("|").filter(Boolean)
    );
    setEnabledParts((prev) => {
      const next = new Set<string>();
      if (prevKnown.size === 0) {
        for (const k of keys) next.add(k);
      } else {
        for (const k of keys) {
          if (prevKnown.has(k)) {
            if (prev.has(k)) next.add(k);
          } else {
            next.add(k);
          }
        }
      }
      return next;
    });
    knownPartKeysRef.current = partKeysSig;
  }, [partKeysSig, parts]);

  const togglePart = (key: string) => {
    setEnabledParts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const svgHostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const eyesRefs = useRef<SVGGElement[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const theme = themeKey === "custom" ? custom : mascot.themes[themeKey]!;
  const gestureKey = mascot.gestures.some(
    (gesture) => gesture.key === selectedGestureKey
  )
    ? selectedGestureKey
    : (mascot.gestures[0]?.key ?? "idle");
  const active: GeneratedGesture =
    mascot.gestures.find((g) => g.key === gestureKey) ?? mascot.gestures[0]!;
  const instrument = mascot.instrument;
  /**
   * Snapshot packs (and studios that only expose a glow) declare no signal
   * control. The ramp still colours sparks, chrome and exports; the slider and
   * its readouts are simply not offered, so a marketplace preview shows the
   * same controls as the copy a buyer receives.
   */
  // Never show a Signal slider the artwork can't answer — stale marketplace
  // packs sometimes shipped a non-hidden instrument without `.ms-signal-*`.
  const signalPartKey = useMemo(
    () => packSignalPartKey(mascot.gestures),
    [mascot.gestures]
  );
  const showSignal =
    !instrument.hidden &&
    packHasLiveSignal(mascot.gestures) &&
    (signalPartKey === null || enabledParts.has(signalPartKey));
  const accent = mascot.accent;
  const zone = zoneForSignal(signal);
  const signalColor = rampColor(signalAnim, instrument.ramp);

  const categories = useMemo(() => {
    const cats: string[] = [];
    for (const g of mascot.gestures) {
      if (!cats.includes(g.cat)) cats.push(g.cat);
    }
    return cats;
  }, [mascot.gestures]);

  /**
   * The hold `/api/generate/gesture` will place. Quoted here so the control is
   * refused before the request rather than after a 402.
   */
  const gestureReservation = useMemo(
    () => {
      if (!canEdit) return 0;
      return estimateTokens(
        {
          kind: "gesture",
          payloadChars: mascot.gestures.reduce(
            (total, g) => total + g.svg.length + 120,
            0
          ),
          referenceImages: isReferenceId(referenceId) ? 1 : 0,
        },
        model ?? DEFAULT_MASCOT_MODEL
      ).max;
    },
    [canEdit, mascot.gestures, model, referenceId]
  );
  const { blocked: gestureBlocked } = useAffordability(
    gestureReservation,
    canEdit
  );

  const availablePresets = useMemo(() => {
    const have = new Set(mascot.gestures.map((g) => g.key));
    return GESTURE_PRESETS.filter((p) => !have.has(p.key));
  }, [mascot.gestures]);

  const slug = useMemo(
    () => mascot.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mascot",
    [mascot.name]
  );

  const exportOpts = useCallback(
    (key: string) => ({
      gestureKey: key,
      theme,
      accent,
      signal,
      glow,
      ramp: instrument.ramp,
      enabledParts,
      paused,
    }),
    [theme, accent, signal, glow, instrument.ramp, enabledParts, paused]
  );

  /* mount / remount SVG for the active gesture */
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || !active?.svg) return;
    host.innerHTML = sanitizeSvg(active.svg);
    const svg = host.querySelector("svg") as SVGSVGElement | null;
    svgRef.current = svg;
    if (svg) scopeInlineSvgIds(svg, `${svgInstanceId}-${gestureKey}`);
    eyesRefs.current = [
      ...host.querySelectorAll<SVGGElement>(
        ".ms-eyes, .bd-pupils, .bt-pupils, .nm-pupils, .hm-pupils"
      ),
    ];
    if (!svg) return;
    svg.setAttribute("width", "420");
    svg.setAttribute("height", "520");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
  }, [active?.key, active?.svg, gestureKey, svgInstanceId]); // theme/signal/parts applied separately

  useEffect(() => {
    applyLiveVars(
      svgRef.current,
      theme,
      accent,
      signalAnim,
      glow,
      instrument.ramp
    );
  }, [theme, accent, signalAnim, glow, instrument.ramp, active?.svg]);

  useEffect(() => {
    applyPartVisibility(svgRef.current, enabledParts);
  }, [enabledParts, active?.svg, gestureKey]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialPauseTimer = m.matches
      ? window.setTimeout(() => setPaused(true), 0)
      : undefined;
    const onC = (e: MediaQueryListEvent) => e.matches && setPaused(true);
    m.addEventListener?.("change", onC);
    return () => {
      if (initialPauseTimer !== undefined) {
        window.clearTimeout(initialPauseTimer);
      }
      m.removeEventListener?.("change", onC);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (paused) svg.pauseAnimations();
      else svg.unpauseAnimations();
    } catch {
      /* noop */
    }
    if (paused) svg.setAttribute("data-paused", "1");
    else svg.removeAttribute("data-paused");
  }, [paused, gestureKey, active?.svg]);

  const pickGesture = (g: GeneratedGesture) => {
    setSelectedGestureKey(g.key);
    if (typeof g.signal === "number") setSignal(normalizeSignal(g.signal));
  };

  const onTrack = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const svg = svgRef.current;
      const eyes = eyesRefs.current;
      if (!svg || eyes.length === 0 || paused || !active.track) return;
      const r = svg.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * 420;
      const sy = ((e.clientY - r.top) / r.height) * 520;
      const dx = sx - 210;
      const dy = sy - 262;
      const len = Math.hypot(dx, dy) || 1;
      const m = Math.min(len / 46, 1) * 3.8;
      const transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
      for (const eye of eyes) eye.style.setProperty("transform", transform);
    },
    [paused, active.track]
  );

  useEffect(() => {
    for (const eye of eyesRefs.current) {
      eye.style.setProperty("transform", "translate(0,0)");
    }
  }, [gestureKey]);

  const delight = useCallback(() => {
    const burst: Spark[] = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const d = 55 + Math.random() * 70;
      const kinds: SparkKind[] = ["star", "note", "dot", "drop"];
      return {
        key: Math.random().toString(36).slice(2),
        kind: kinds[i % kinds.length]!,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 28,
        color: rampColor(20 + Math.random() * 80, instrument.ramp),
        rot: Math.random() * 360,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(
      () =>
        setSparks((s) => s.filter((k) => !burst.some((b) => b.key === k.key))),
      1000
    );
  }, [instrument.ramp]);
  const triggerDelight = useCallback(() => {
    if (!paused) delight();
  }, [delight, paused]);

  useEffect(() => {
    if (!active.delight || paused) return;
    const initialBurstTimer = window.setTimeout(delight, 0);
    const interval = window.setInterval(delight, 1600);
    return () => {
      window.clearTimeout(initialBurstTimer);
      window.clearInterval(interval);
    };
  }, [active.delight, paused, delight, gestureKey]);

  const buildExport = useCallback(() => {
    return bakeGestureExport(active.svg, exportOpts(gestureKey));
  }, [active.svg, exportOpts, gestureKey]);

  const downloadPose = async () => {
    if (!canExport) {
      toast.error("Purchase this mascot to download files");
      return;
    }
    if (exportBusy) return;
    const filenameBase = `${slug}-${gestureKey}-${Math.round(signal)}`;
    const svgMarkup = buildExport();

    if (exportFormat === "svg") {
      downloadBlobFile(svgMarkup, `${filenameBase}.svg`, "image/svg+xml");
      trackEvent("mascot_downloaded", { kind: "pose", gestures: 1 });
      trackEvent("mascot_export_detail", { format: "svg", scale: exportScale });
      return;
    }

    if (exportFormat === "webp" && !webpExportOk) {
      toast.error("This browser cannot encode WebP — use APNG instead");
      return;
    }

    if (exportScale === "2x") {
      const ok = window.confirm(
        `High-res ${exportFormat.toUpperCase()} export (2× / 840×1040) may take longer and use more memory.\n\nContinue?`
      );
      if (!ok) return;
    }

    // Animated rasters always capture motion, even if the stage is paused.
    const animatedMarkup = bakeGestureExport(active.svg, {
      ...exportOpts(gestureKey),
      paused: false,
    });

    setExportBusy(true);
    const abort = new AbortController();
    exportAbortRef.current = abort;
    const toastId = toast.loading(
      `Rendering ${exportFormat.toUpperCase()} (${exportScale})…`
    );
    try {
      const bytes = await encodePoseRaster(animatedMarkup, exportFormat, {
        scale: exportScale,
        signal: abort.signal,
        onProgress: (progress, label) => {
          toast.loading(label, {
            id: toastId,
            description: `${Math.round(progress * 100)}%`,
          });
        },
      });
      downloadPoseBytes({
        format: exportFormat,
        filenameBase,
        bytes,
      });
      trackEvent("mascot_downloaded", { kind: "pose", gestures: 1 });
      trackEvent("mascot_export_detail", {
        format: exportFormat,
        scale: exportScale,
      });
      toast.success(`Downloaded ${exportFormat.toUpperCase()}`, { id: toastId });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.message("Download cancelled", { id: toastId });
      } else {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "Animated export failed",
          { id: toastId }
        );
      }
    } finally {
      exportAbortRef.current = null;
      setExportBusy(false);
    }
  };

  const downloadPack = async () => {
    if (!canExport) {
      toast.error("Purchase this mascot to download files");
      return;
    }
    if (exportBusy) return;

    const poseCount = mascot.gestures.length;
    // Pack follows the pose format picker: SVG-only by default (fast); rasters
    // only when APNG/WebP is selected — avoids always encoding every pose.
    const includeApng = exportFormat === "apng" || exportFormat === "webp";
    const includeWebp = exportFormat === "webp" && webpExportOk;
    const includeRaster = includeApng || includeWebp;
    const formatLabel = includeWebp
      ? "SVG + APNG + WebP"
      : includeApng
        ? "SVG + APNG"
        : "SVG";
    if (includeRaster) {
      const etaSec = estimatePackRasterSeconds(
        poseCount,
        exportScale,
        includeWebp
      );
      const etaMb = estimatePackRasterMegabytes(
        poseCount,
        exportScale,
        includeWebp
      );
      if (exportScale === "2x") {
        const ok = window.confirm(
          `High-res pack export (~${etaMb} MB, about ${etaSec}s on this device).\n\nContinue with 2× ${formatLabel} for all ${poseCount} poses?`
        );
        if (!ok) return;
      } else if (poseCount >= 12) {
        const ok = window.confirm(
          `Pack export includes ${formatLabel} for ${poseCount} poses (~${etaMb} MB, about ${etaSec}s).\n\nContinue?`
        );
        if (!ok) return;
      }
    }

    setExportBusy(true);
    const abort = new AbortController();
    exportAbortRef.current = abort;
    const toastId = toast.loading(`Building pack (${formatLabel})…`);

    try {
      const files: Record<string, Uint8Array> = {};
      const gestureMeta: Array<Record<string, unknown>> = [];

      for (let i = 0; i < mascot.gestures.length; i++) {
        if (abort.signal.aborted) {
          throw new DOMException("Animated export aborted", "AbortError");
        }
        const g = mascot.gestures[i]!;
        // Pack SVG respects stage pause; rasters always capture live motion.
        const svgMarkup = bakeGestureExport(g.svg, exportOpts(g.key));
        files[`gestures/${g.key}.svg`] = strToU8(svgMarkup);

        const meta: Record<string, unknown> = {
          key: g.key,
          label: g.label,
          cat: g.cat,
          tip: g.tip,
          use: g.use,
          track: g.track,
          delight: g.delight,
          signal: g.signal,
          file: `gestures/${g.key}.svg`,
        };

        if (includeRaster) {
          const rasterMarkup = bakeGestureExport(g.svg, {
            ...exportOpts(g.key),
            paused: false,
          });
          const pair = await encodeAnimatedPair(rasterMarkup, {
            scale: exportScale,
            signal: abort.signal,
            includeWebp,
            onProgress: (progress, label) => {
              const overall = (i + progress) / poseCount;
              toast.loading(`${g.key}: ${label}`, {
                id: toastId,
                description: `Pose ${i + 1}/${poseCount} · ${Math.round(overall * 100)}%`,
              });
            },
          });
          files[`animated/apng/${g.key}.png`] = pair.apng;
          meta.motion = pair.hasMotion;
          meta.apng = `animated/apng/${g.key}.png`;
          if (pair.webp) {
            files[`animated/webp/${g.key}.webp`] = pair.webp;
            meta.webp = `animated/webp/${g.key}.webp`;
          }
        }

        gestureMeta.push(meta);
      }

      const formats = [
        "svg",
        ...(includeApng ? (["apng"] as const) : []),
        ...(includeWebp ? (["webp"] as const) : []),
      ];
      files["pack.json"] = strToU8(
        JSON.stringify(
          {
            name: mascot.name,
            tagline: mascot.tagline,
            product: mascot.product,
            accent: mascot.accent,
            glowLabel: mascot.glowLabel,
            instrument: mascot.instrument,
            themes: mascot.themes,
            parts: parts.filter((part) => enabledParts.has(part.key)),
            gestures: gestureMeta,
            formats,
            rasterScale: includeRaster ? exportScale : undefined,
            exportedAt: new Date().toISOString(),
            exportSignal: Math.round(signal),
            exportTheme: themeKey,
          },
          null,
          2
        )
      );

      const zipped = zipSync(files, { level: 6 });
      downloadBlobFile(
        zipped,
        `${slug}-studio-pack.zip`,
        "application/zip"
      );
      trackEvent("mascot_downloaded", {
        kind: "pack",
        gestures: poseCount,
      });
      trackEvent("mascot_export_detail", {
        format: `pack-${formats.join("-")}`,
        scale: includeRaster ? exportScale : "1x",
      });
      toast.success(
        `Pack downloaded (${poseCount} poses · ${formatLabel})`,
        { id: toastId }
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.message("Pack download cancelled", { id: toastId });
      } else {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "Pack export failed",
          { id: toastId }
        );
      }
    } finally {
      exportAbortRef.current = null;
      setExportBusy(false);
    }
  };

  const copySVG = async () => {
    if (!canExport) {
      toast.error("Purchase this mascot to copy files");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildExport());
      setCopied(true);
      later(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const addGesture = async (req: GestureRequest) => {
    if (!canEdit || !onMascotChange) {
      toast.error("Gesture editing isn’t available here");
      return;
    }
    if (mascot.gestures.some((g) => g.key === req.key)) {
      toast.error("That gesture is already in the studio");
      return;
    }
    if (mascot.gestures.length >= MAX_STUDIO_GESTURES) {
      toast.error(`Studio is limited to ${MAX_STUDIO_GESTURES} gestures`);
      return;
    }
    if (gestureBlocked) {
      toast.error("Adding a gesture needs tokens. Top up to continue.");
      return;
    }
    if (!beginAiMutation()) {
      toast.error("Wait for the current AI change to finish");
      return;
    }

    setAddingGesture(true);
    let errorCode: string | undefined;
    try {
      trackEvent("generate_started", {
        action: "gesture",
        model: model ?? "auto",
      });
      const res = await fetch("/api/generate/gesture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mascot,
          gesture: req,
          look,
          model,
          referenceId: isReferenceId(referenceId) ? referenceId : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        mascot?: GeneratedMascot;
        gesture?: GeneratedGesture;
      };
      if (!isAiMutationCurrent()) return;

      if (!res.ok || !data.mascot || !data.gesture) {
        errorCode = data.code;
        throw new Error(data.error || "Couldn’t add that gesture");
      }
      applyMascotChange(data.mascot);
      setSelectedGestureKey(data.gesture.key);
      if (typeof data.gesture.signal === "number") {
        setSignal(normalizeSignal(data.gesture.signal));
      }
      setShowAddGesture(false);
      setCustomGestureLabel("");
      setCustomGestureTip("");
      trackEvent("generate_completed", {
        action: "gesture",
        model: model ?? "auto",
      });
      toast.success(`${data.gesture.label} added to the studio`);
    } catch (err) {
      if (!isAiMutationCurrent()) return;

      trackGenerationFailure("gesture", errorCode);
      toast.error(err instanceof Error ? err.message : "Add gesture failed");
    } finally {
      setAddingGesture(false);
      endAiMutation();
    }
  };

  const addCustomGesture = () => {
    const label = customGestureLabel.trim();
    if (!label) {
      toast.error("Give the gesture a name");
      return;
    }
    const key = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 32);
    if (!key) {
      toast.error("Use letters or numbers in the name");
      return;
    }
    void addGesture({
      key,
      label,
      cat: "Custom",
      tip: customGestureTip.trim() || `${label} performance for your app.`,
      use: "Custom moment",
    });
  };

  const shellCss = `
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
    .gs-root{min-height:${fullPage ? "100vh" : "auto"};background:#101526;color:#F5EDE0;font-family:'Manrope',sans-serif;
      background-image:radial-gradient(1100px 520px at 50% -170px, ${rgba(accent, 0.16)}, transparent 60%),
        radial-gradient(720px 400px at 88% 110%, ${rgba(theme.base, 0.1)}, transparent 60%);}
    .gs-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
    .gs-card{background:rgba(255,246,230,.045);border:1px solid ${rgba(accent, 0.16)};
      border-radius:20px;backdrop-filter:blur(8px)}
    .gs-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${accent};font-weight:600}
    .gs-pill{border:1px solid ${rgba(accent, 0.28)};border-radius:999px;padding:7px 13px;
      font-size:12.5px;font-weight:600;color:#F5EDE0;background:transparent;cursor:pointer;
      transition:background .15s,border-color .15s,color .15s}
    .gs-pill:hover{border-color:${rgba(accent, 0.55)}}
    .gs-pill.on{background:${accent};color:#1a1408;border-color:${accent}}
    .gs-swatch{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;
      box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
    .gs-swatch.on{border-color:#fff;box-shadow:0 0 0 2px ${rgba(accent, 0.55)}}
    .gs-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#3A3548;outline:none}
    .gs-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
      background:${accent};cursor:pointer;border:2px solid #1a1408}
    .gs-btn{border:none;border-radius:14px;padding:12px 16px;font-weight:700;font-size:13.5px;
      cursor:pointer;background:${accent};color:#1a1408}
    .gs-btn.ghost{background:transparent;border:1px solid ${rgba(accent, 0.35)};color:#F5EDE0}
    .gs-checker{background-color:#0c1322;background-image:
      linear-gradient(45deg,#152038 25%,transparent 25%),linear-gradient(-45deg,#152038 25%,transparent 25%),
      linear-gradient(45deg,transparent 75%,#152038 75%),linear-gradient(-45deg,transparent 75%,#152038 75%);
      background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
    .gs-spark{position:absolute;width:15px;height:15px;margin:-7px;pointer-events:none;
      animation:gs-pop 1s ease-out forwards}
    @keyframes gs-pop{0%{opacity:1;transform:translate(0,0) scale(1)}
      100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
    @media (prefers-reduced-motion:reduce){.gs-spark{display:none;animation:none}}
    .gs-preview-protected [data-mascot-stage] svg,.gs-preview-protected [data-mascot-stage] svg *{
      user-select:none;-webkit-user-select:none;-webkit-user-drag:none}
  `;

  const stageBg = transparent
    ? "rgba(255,255,255,.02)"
    : `radial-gradient(640px 430px at 50% 120%, ${rgba(signalColor, 0.22)}, transparent 62%), ${theme.stage}`;

  return (
    <div
      className={`gs-root${previewProtected ? " gs-preview-protected" : ""}`}
      data-preview-protected={previewProtected ? "" : undefined}
      onContextMenu={
        previewProtected ? (event) => event.preventDefault() : undefined
      }
    >
      <style>{shellCss}</style>

      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2 pt-8">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: rgba(accent, 0.13),
            border: `1px solid ${rgba(accent, 0.4)}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
            {[-2, -1, 0, 1, 2].map((k) => (
              <path
                key={k}
                d="M0,0 L0,-15"
                stroke={rampColor(50 + k * 12, instrument.ramp)}
                strokeWidth="3"
                strokeLinecap="round"
                transform={`translate(20,32) rotate(${k * 26})`}
              />
            ))}
            <circle cx="20" cy="33" r="4.5" fill="#F1EADB" />
          </svg>
        </div>
        <div>
          <h1 className="gs-display" style={{ fontSize: 24, fontWeight: 640 }}>
            {mascot.name}{" "}
            <span style={{ color: accent }}>·</span>{" "}
            {mascot.product || "Your app"}
          </h1>
          <p style={{ fontSize: 13, color: "#B5AC9A" }}>{mascot.tagline}</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_400px]">
        {/* ---------- stage ---------- */}
        <section className="gs-card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="gs-eyebrow">Stage</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className={`gs-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)}
                aria-pressed={transparent}
              >
                Transparent
              </button>
              <button
                type="button"
                className={`gs-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)}
                aria-pressed={!transparent}
              >
                In-app
              </button>
            </div>
          </div>

          <div
            data-mascot-stage
            className={`relative overflow-hidden rounded-2xl ${transparent ? "gs-checker" : ""}`}
            style={{ background: stageBg, minHeight: 440 }}
            role="button"
            tabIndex={0}
            aria-label={`Interactive ${mascot.name} stage. Activate for sparks.`}
            aria-disabled={paused}
            onPointerMove={onTrack}
            onPointerDown={triggerDelight}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                triggerDelight();
              }
            }}
          >
            {previewProtected ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden"
              >
                {/* Preview watermark — visible in saves/screenshots, not in normal browsing */}
                <span
                  className="gs-display select-none text-[clamp(3rem,18vw,7rem)] font-bold uppercase tracking-[0.35em] text-white/[0.07]"
                  style={{ transform: "rotate(-24deg)" }}
                >
                  Preview
                </span>
              </div>
            ) : null}
            <div
              className="mx-auto"
              style={{ maxWidth: 350, padding: "10px 10px 0" }}
            >
              <div ref={svgHostRef} />
            </div>

            {sparks.map((s) => (
              <span
                key={s.key}
                className="gs-spark"
                style={
                  {
                    left: "50%",
                    top: "52%",
                    "--dx": `${s.dx}px`,
                    "--dy": `${s.dy}px`,
                  } as CSSProperties
                }
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="-8 -8 16 16"
                  style={{ transform: `rotate(${s.rot}deg)` }}
                >
                  <path d={SPARK_PATHS[s.kind]} fill={s.color} />
                </svg>
              </span>
            ))}

            {showSignal && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 8,
                  display: "flex",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                <SignalWave score={signalAnim} ramp={instrument.ramp} />
              </div>
            )}
          </div>

          <p style={{ fontSize: 12.5, color: "#B5AC9A", textAlign: "center" }}>
            {showSignal && (
              <>
                drag {instrument.label}. Strip &amp; accents share one ramp
                &nbsp;·&nbsp;{" "}
              </>
            )}
            tap for bounce &amp; sparks &nbsp;·&nbsp;
            {active.track
              ? "eyes follow your cursor"
              : "this pose locks gaze"}
          </p>

          {canToggleParts && (
            <MascotPartsPanel
              parts={parts}
              enabledParts={enabledParts}
              onTogglePart={togglePart}
              accent={accent}
            />
          )}

          {canEdit && (
            <MascotEditPanel
              mascot={{ ...mascot, parts }}
              look={look}
              model={model}
              enabledParts={enabledParts}
              onMascotChange={applyMascotChange}
              referenceId={referenceId}
              onReferenceIdChange={setReferenceId}
              mutationBusy={aiMutationBusy}
              onMutationStart={beginAiMutation}
              onMutationEnd={endAiMutation}
              isMutationCurrent={isAiMutationCurrent}
              canUndo={canUndo}
              undoDepth={undoDepth}
              onUndo={handleUndo}
              undoGeneration={undoGeneration}
              restoreHistoryLength={refineHistoryRestoreLength}
              onRefineHistoryLengthChange={(length) => {
                refineHistoryLengthRef.current = length;
              }}
              mascotId={mascotId}
              accent={accent}
            />
          )}
        </section>

        {/* ---------- controls ---------- */}
        <section className="gs-card flex flex-col gap-6 p-5 sm:p-6">
          {showSignal && (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="gs-eyebrow">{instrument.label}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: signalColor,
                }}
              >
                {Math.round(signal)} · {zone}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={signal}
              aria-label={instrument.label}
              className="gs-range w-full"
              onChange={(e) => setSignal(parseInt(e.target.value, 10))}
              style={{
                background: `linear-gradient(90deg, ${instrument.ramp.join(",")})`,
              }}
            />
            <div
              className="flex justify-between"
              style={{ fontSize: 10.5, color: "#8D8472", marginTop: 5 }}
            >
              <span>{instrument.lowLabel}</span>
              <span>{instrument.midLabel}</span>
              <span>{instrument.highLabel}</span>
            </div>
            <p
              style={{
                fontSize: 11.5,
                color: "#8D8472",
                marginTop: 7,
                lineHeight: 1.5,
              }}
            >
              {instrument.description}
            </p>
          </div>
          )}

          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="gs-eyebrow">Gesture</span>
              <span style={{ fontSize: 11, color: "#8D8472" }}>
                {mascot.gestures.length} poses
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <div key={cat}>
                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: ".16em",
                      color: "#8D8472",
                      textTransform: "uppercase",
                      margin: "4px 0 6px 2px",
                    }}
                  >
                    {cat}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {mascot.gestures
                      .filter((gg) => gg.cat === cat)
                      .map((gg) => (
                        <button
                          key={gg.key}
                          type="button"
                          title={gg.tip}
                          className={`gs-pill ${gestureKey === gg.key ? "on" : ""}`}
                          onClick={() => pickGesture(gg)}
                          aria-pressed={gestureKey === gg.key}
                        >
                          {gg.label}
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                padding: "11px 13px",
                borderRadius: 12,
                background: "rgba(255,246,230,.045)",
                border: `1px solid ${rgba(accent, 0.16)}`,
              }}
            >
              <div className="gs-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {active.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>
                {active.tip}
              </p>
            </div>

            {canEdit && mascot.gestures.length < MAX_STUDIO_GESTURES && (
              <div className="mt-4">
                <button
                  type="button"
                  className={`gs-pill ${showAddGesture ? "on" : ""}`}
                  disabled={addingGesture || aiMutationBusy || gestureBlocked}
                  onClick={() => setShowAddGesture((v) => !v)}
                  aria-expanded={showAddGesture}
                  title={
                    gestureBlocked
                      ? "Generating a new pose needs tokens"
                      : undefined
                  }
                >
                  <Plus className="mr-1 inline size-3.5" />
                  Add gesture
                </button>

                {showAddGesture && (
                  <div
                    className="mt-3 space-y-3 rounded-xl border p-3"
                    style={{
                      borderColor: `${accent}33`,
                      background: "rgba(0,0,0,.18)",
                    }}
                  >
                    {addingGesture ? (
                      <p
                        className="flex items-center gap-2"
                        style={{ fontSize: 12.5, color: "#C6BCA7" }}
                      >
                        <Loader2 className="size-4 animate-spin" style={{ color: accent }} />
                        Drawing the new pose into this studio…
                      </p>
                    ) : (
                      <>
                        {isReferenceId(referenceId) && (
                          <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.45 }}>
                            Using your visual reference from the edit panel for this
                            new pose.
                          </p>
                        )}
                        {availablePresets.length > 0 && (
                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                letterSpacing: ".16em",
                                color: "#8D8472",
                                textTransform: "uppercase",
                                marginBottom: 6,
                              }}
                            >
                              Presets
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {availablePresets.map((p) => (
                                <button
                                  key={p.key}
                                  type="button"
                                  title={p.tip}
                                  className="gs-pill"
                                  disabled={aiMutationBusy}
                                  onClick={() => void addGesture(p)}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: 10,
                              letterSpacing: ".16em",
                              color: "#8D8472",
                              textTransform: "uppercase",
                              marginBottom: 6,
                            }}
                          >
                            Custom
                          </div>
                          <div className="flex flex-col gap-2">
                            <input
                              value={customGestureLabel}
                              onChange={(e) =>
                                setCustomGestureLabel(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addCustomGesture();
                                }
                              }}
                              placeholder="Gesture name, e.g. High five"
                              className="gs-range rounded-xl border px-3 py-2 text-sm"
                              style={{
                                height: "auto",
                                background: "rgba(255,255,255,.04)",
                                borderColor: `${accent}40`,
                                color: "#F5EDE0",
                              }}
                            />
                            <input
                              value={customGestureTip}
                              onChange={(e) =>
                                setCustomGestureTip(e.target.value)
                              }
                              placeholder="Optional tip, what this pose means"
                              className="gs-range rounded-xl border px-3 py-2 text-sm"
                              style={{
                                height: "auto",
                                background: "rgba(255,255,255,.04)",
                                borderColor: `${accent}40`,
                                color: "#F5EDE0",
                              }}
                            />
                            <button
                              type="button"
                              className="gs-btn"
                              disabled={
                                aiMutationBusy || !customGestureLabel.trim()
                              }
                              onClick={addCustomGesture}
                            >
                              Generate &amp; add
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="gs-eyebrow mb-3">
              Theme{" "}
              <span
                style={{
                  color: "#8D8472",
                  textTransform: "none",
                  letterSpacing: 0,
                }}
              >
                {showSignal
                  ? "(plumage / body; the signal ramp stays product-fixed)"
                  : "(plumage / body)"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {themeKeys.map((k) => {
                const t = mascot.themes[k]!;
                return (
                  <button
                    key={k}
                    type="button"
                    title={t.name}
                    aria-label={t.name}
                    aria-pressed={themeKey === k}
                    className={`gs-swatch ${themeKey === k ? "on" : ""}`}
                    style={{ background: swatchBg(t) }}
                    onClick={() => setThemeKey(k)}
                  />
                );
              })}
              <button
                type="button"
                title="Custom"
                aria-label="Custom theme"
                aria-pressed={themeKey === "custom"}
                className={`gs-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom),
                  display: "grid",
                  placeItems: "center",
                  color: "#251603",
                  fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}
              >
                +
              </button>
            </div>
            {themeKey === "custom" && (
              <div className="mt-3 flex flex-wrap gap-4">
                {(
                  [
                    ["top", "Crown"],
                    ["mid", "Mid"],
                    ["base", "Base"],
                    ["core", "Core"],
                  ] as const
                ).map(([k, label]) => (
                  <label
                    key={k}
                    style={{ fontSize: 12, color: "#C6BCA7" }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="color"
                      value={custom[k]}
                      onChange={(e) =>
                        setCustom((c) => ({
                          ...c,
                          [k]: e.target.value,
                          stage:
                            k === "base"
                              ? mixHex(e.target.value, "#0B1020", 0.55)
                              : c.stage,
                        }))
                      }
                      style={{
                        width: 30,
                        height: 30,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="gs-eyebrow">
                {mascot.glowLabel || "Spotlight"}
              </span>
              <span style={{ fontSize: 12, color: "#C6BCA7" }}>
                {Math.round(glow * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={glow}
              aria-label={mascot.glowLabel || "Spotlight"}
              className="gs-range w-full"
              style={{ background: "#3A3548" }}
              onChange={(e) => setGlow(parseFloat(e.target.value))}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="gs-eyebrow">Motion</span>
            <button
              type="button"
              className={`gs-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}
              aria-pressed={!paused}
            >
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {canExport ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="gs-eyebrow">Pose format</span>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {(
                      [
                        ["svg", "SVG"],
                        ["apng", "APNG"],
                        ["webp", "WebP"],
                      ] as const
                    ).map(([value, label]) => {
                      const disabled =
                        exportBusy || (value === "webp" && !webpExportOk);
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`gs-pill ${exportFormat === value ? "on" : ""}`}
                          aria-pressed={exportFormat === value}
                          disabled={disabled}
                          title={
                            value === "webp" && !webpExportOk
                              ? "WebP encode not supported in this browser"
                              : undefined
                          }
                          onClick={() => setExportFormat(value)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="gs-eyebrow">Raster size</span>
                  <button
                    type="button"
                    className={`gs-pill ${exportScale === "2x" ? "on" : ""}`}
                    aria-pressed={exportScale === "2x"}
                    disabled={exportBusy || exportFormat === "svg"}
                    onClick={() =>
                      setExportScale((s) => (s === "1x" ? "2x" : "1x"))
                    }
                  >
                    {exportScale === "2x" ? "High res (2×)" : "Studio (1×)"}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="gs-btn flex-1"
                    disabled={exportBusy}
                    onClick={() => void downloadPose()}
                  >
                    {exportBusy ? (
                      <span className="inline-flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        Exporting…
                      </span>
                    ) : (
                      `Download ${exportFormat.toUpperCase()}`
                    )}
                  </button>
                  <button
                    type="button"
                    className="gs-btn ghost flex-1"
                    disabled={exportBusy}
                    onClick={() => void downloadPack()}
                  >
                    Download pack
                  </button>
                </div>
                {exportBusy && (
                  <button
                    type="button"
                    className="gs-btn ghost w-full"
                    onClick={() => exportAbortRef.current?.abort()}
                  >
                    Cancel export
                  </button>
                )}
                <button
                  type="button"
                  className="gs-btn ghost w-full"
                  disabled={exportBusy}
                  onClick={copySVG}
                >
                  {copied ? "Copied ✓" : "Copy pose SVG"}
                </button>
                <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.5 }}>
                  Pose downloads the selected gesture as SVG, APNG, or animated
                  WebP at the current{" "}
                  {(showSignal
                    ? instrument.label
                    : mascot.glowLabel || "glow"
                  ).toLowerCase()}
                  . Pack zips every pose as SVG by default; choose APNG or WebP
                  above to include matching animated rasters, plus{" "}
                  <code style={{ color: "#C6BCA7" }}>pack.json</code>. Rasters
                  bake motion in your browser (loop up to ~6s).
                  {!webpExportOk
                    ? " WebP encode is unavailable in this browser."
                    : null}
                </p>
              </>
            ) : (
              <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.5 }}>
                Preview only — remix or buy to own to save, copy, and download
                files.
              </p>
            )}
          </div>

          {canAppAssets && (
            <AppAssetsPanel
              mascotId={mascotId ?? null}
              mascotName={mascot.name}
              model={model}
            />
          )}
        </section>
      </main>
    </div>
  );
}
