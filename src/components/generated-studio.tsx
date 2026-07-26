"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MascotEditPanel } from "@/components/mascot-edit-panel";
import { AppAssetsPanel } from "@/components/app-assets-panel";
import { GESTURE_PRESETS } from "@/lib/gesture-presets";
import { applyPartVisibility, extractPartsFromMascot } from "@/lib/mascot-parts";
import { sanitizeSvg } from "@/lib/sanitize-svg";
import {
  bakeGestureExport,
  rampColor,
  mixHex,
  rgba,
  zoneForSignal,
  normalizeSignal,
  SPARK_PATHS,
  computeSignalBars,
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
import { Loader2, Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  useMascotUndo,
  useResetUndoOnIdentityChange,
} from "@/hooks/use-mascot-undo";
import { isReferenceId } from "@/lib/reference-image-client";

type Props = {
  mascot: GeneratedMascot;
  /** When true, fills the viewport like /studio/[slug] examples. */
  fullPage?: boolean;
  look?: string;
  model?: MascotModelId;
  /** Saved mascot id — required for persisted app asset packs. */
  mascotId?: Id<"mascots"> | null;
  onMascotChange?: (mascot: GeneratedMascot) => void;
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
    <svg width="120" height="36" viewBox="0 0 120 36" aria-hidden>
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
      if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
        el.setAttribute("fill", color);
      }
      if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
        el.setAttribute("stroke", color);
      }
    });
  }

  svg.querySelectorAll(".ms-signal-tint").forEach((node) => {
    const el = node as SVGElement;
    if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
      el.setAttribute("fill", color);
    }
    if (el.getAttribute("stroke") && el.getAttribute("stroke") !== "none") {
      el.setAttribute("stroke", color);
    }
  });
}

export function GeneratedStudio({
  mascot,
  fullPage = true,
  look,
  model,
  mascotId = null,
  onMascotChange,
}: Props) {
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
  const [gestureKey, setGestureKey] = useState(
    mascot.gestures[0]?.key ?? "idle"
  );
  const [signal, setSignal] = useState(() =>
    normalizeSignal(mascot.instrument.defaultValue)
  );
  const signalAnim = useAnimatedNumber(signal);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [copied, setCopied] = useState(false);
  const [addingGesture, setAddingGesture] = useState(false);
  const [showAddGesture, setShowAddGesture] = useState(false);
  const [customGestureLabel, setCustomGestureLabel] = useState("");
  const [customGestureTip, setCustomGestureTip] = useState("");
  const [referenceId, setReferenceId] = useState<string | undefined>();

  const { pushSnapshot, undo, canUndo, clear: clearUndo } = useMascotUndo(
    useCallback(
      (restored) => {
        onMascotChange?.(restored);
        toast.success("Reverted to previous version");
      },
      [onMascotChange]
    )
  );

  useResetUndoOnIdentityChange(mascot, clearUndo);

  const applyMascotChange = useCallback(
    (next: GeneratedMascot) => {
      pushSnapshot(mascot);
      onMascotChange?.(next);
    },
    [mascot, onMascotChange, pushSnapshot]
  );

  const handleUndo = useCallback(() => {
    if (!onMascotChange) return;
    if (!undo()) {
      toast.error("Nothing to revert");
    }
  }, [onMascotChange, undo]);
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

  useEffect(() => {
    if (mascot.gestures.some((g) => g.key === gestureKey)) return;
    setGestureKey(mascot.gestures[0]?.key ?? "idle");
  }, [mascot.gestures, gestureKey]);

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
  const active: GeneratedGesture =
    mascot.gestures.find((g) => g.key === gestureKey) ?? mascot.gestures[0]!;
  const instrument = mascot.instrument;
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
    }),
    [theme, accent, signal, glow, instrument.ramp]
  );

  /* mount / remount SVG for the active gesture */
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || !active?.svg) return;
    host.innerHTML = sanitizeSvg(active.svg);
    const svg = host.querySelector("svg") as SVGSVGElement | null;
    svgRef.current = svg;
    eyesRefs.current = [
      ...host.querySelectorAll<SVGGElement>(".ms-eyes, .bd-pupils"),
    ];
    if (svg) {
      svg.setAttribute("width", "420");
      svg.setAttribute("height", "520");
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.display = "block";
      applyLiveVars(
        svg,
        theme,
        accent,
        signalAnim,
        glow,
        instrument.ramp
      );
      applyPartVisibility(svg, enabledParts);
    }
  }, [active?.svg, active?.key]); // theme/signal/parts applied separately

  useEffect(() => {
    applyLiveVars(
      svgRef.current,
      theme,
      accent,
      signalAnim,
      glow,
      instrument.ramp
    );
  }, [theme, accent, signalAnim, glow, instrument.ramp]);

  useEffect(() => {
    applyPartVisibility(svgRef.current, enabledParts);
  }, [enabledParts, active?.svg, gestureKey]);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches) setPaused(true);
    const onC = (e: MediaQueryListEvent) => e.matches && setPaused(true);
    m.addEventListener?.("change", onC);
    return () => m.removeEventListener?.("change", onC);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      paused ? svg.pauseAnimations() : svg.unpauseAnimations();
    } catch {
      /* noop */
    }
    if (paused) svg.setAttribute("data-paused", "1");
    else svg.removeAttribute("data-paused");
  }, [paused, gestureKey, active?.svg]);

  const pickGesture = (g: GeneratedGesture) => {
    setGestureKey(g.key);
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
      let dx = sx - 210;
      let dy = sy - 262;
      const len = Math.hypot(dx, dy) || 1;
      const m = Math.min(len / 46, 1) * 3.8;
      const transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
      for (const eye of eyes) eye.style.transform = transform;
    },
    [paused, active.track]
  );

  useEffect(() => {
    for (const eye of eyesRefs.current) eye.style.transform = "translate(0,0)";
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

  useEffect(() => {
    if (!active.delight || paused) return;
    delight();
    const iv = setInterval(delight, 1600);
    return () => clearInterval(iv);
  }, [active.delight, paused, delight, gestureKey]);

  const buildExport = useCallback(() => {
    // Prefer live DOM (respects current hidden parts); fall back to baked string
    const svg = svgRef.current;
    if (svg) {
      const node = svg.cloneNode(true) as SVGSVGElement;
      node.setAttribute("class", `ms-root ms-g-${gestureKey}`);
      node.setAttribute("width", "420");
      node.setAttribute("height", "520");
      node.removeAttribute("data-paused");
      node.querySelectorAll(".ms-eyes, .bd-pupils").forEach((el) => {
        (el as SVGGElement).style.transform = "";
      });
      node.querySelectorAll('[data-ms-hidden="1"]').forEach((el) => el.remove());
      const baked = [
        `--ms-top:${theme.top}`,
        `--ms-mid:${theme.mid}`,
        `--ms-base:${theme.base}`,
        `--ms-core:${theme.core}`,
        `--ms-features:${theme.features ?? "#2A1A0C"}`,
        `--ms-accent:${accent}`,
        `--ms-signal:${Math.round(signal)}`,
        `--ms-signal-color:${rampColor(signal, instrument.ramp)}`,
        `--ms-glow:${glow}`,
      ].join(";");
      node.setAttribute("style", baked);
      return (
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new XMLSerializer().serializeToString(node)
      );
    }
    return bakeGestureExport(active.svg, exportOpts(gestureKey));
  }, [
    gestureKey,
    theme,
    accent,
    signal,
    glow,
    instrument.ramp,
    active.svg,
    exportOpts,
  ]);

  const downloadPose = () => {
    const blob = new Blob([buildExport()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-${gestureKey}-${Math.round(signal)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("mascot_downloaded", { kind: "pose", gestures: 1 });
  };

  const downloadPack = () => {
    const files: Record<string, Uint8Array> = {};
    for (const g of mascot.gestures) {
      const markup =
        g.key === gestureKey
          ? buildExport()
          : bakeGestureExport(g.svg, exportOpts(g.key));
      files[`gestures/${g.key}.svg`] = strToU8(markup);
    }
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
          parts: mascot.parts,
          gestures: mascot.gestures.map((g) => ({
            key: g.key,
            label: g.label,
            cat: g.cat,
            tip: g.tip,
            use: g.use,
            track: g.track,
            delight: g.delight,
            signal: g.signal,
            file: `gestures/${g.key}.svg`,
          })),
          exportedAt: new Date().toISOString(),
          exportSignal: Math.round(signal),
          exportTheme: themeKey,
        },
        null,
        2
      )
    );
    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-studio-pack.zip`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("mascot_downloaded", {
      kind: "pack",
      gestures: mascot.gestures.length,
    });
    toast.success(`Pack downloaded (${mascot.gestures.length} poses)`);
  };

  const copySVG = async () => {
    try {
      await navigator.clipboard.writeText(buildExport());
      setCopied(true);
      later(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const addGesture = async (req: GestureRequest) => {
    if (!onMascotChange) {
      toast.error("Gesture editing isn’t available here");
      return;
    }
    if (mascot.gestures.some((g) => g.key === req.key)) {
      toast.error("That gesture is already in the studio");
      return;
    }
    if (mascot.gestures.length >= 12) {
      toast.error("Studio is limited to 12 gestures");
      return;
    }
    setAddingGesture(true);
    trackEvent("generate_started", { action: "gesture", model: model ?? "auto" });
    let errorCode: string | undefined;
    try {
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
      if (!res.ok || !data.mascot || !data.gesture) {
        errorCode = data.code;
        throw new Error(data.error || "Couldn’t add that gesture");
      }
      applyMascotChange(data.mascot);
      setGestureKey(data.gesture.key);
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
      trackGenerationFailure("gesture", errorCode);
      toast.error(err instanceof Error ? err.message : "Add gesture failed");
    } finally {
      setAddingGesture(false);
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
  `;

  const stageBg = transparent
    ? "rgba(255,255,255,.02)"
    : `radial-gradient(640px 430px at 50% 120%, ${rgba(signalColor, 0.22)}, transparent 62%), ${theme.stage}`;

  return (
    <div className="gs-root">
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
            <span className="gs-eyebrow">Stage</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={`gs-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)}
              >
                Transparent
              </button>
              <button
                type="button"
                className={`gs-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)}
              >
                In-app
              </button>
            </div>
          </div>

          <div
            className={`relative overflow-hidden rounded-2xl ${transparent ? "gs-checker" : ""}`}
            style={{ background: stageBg, minHeight: 440 }}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
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
          </div>

          <p style={{ fontSize: 12.5, color: "#B5AC9A", textAlign: "center" }}>
            drag {instrument.label}. Strip &amp; accents share one ramp
            &nbsp;·&nbsp; tap for bounce &amp; sparks &nbsp;·&nbsp;
            {active.track
              ? "eyes follow your cursor"
              : "this pose locks gaze"}
          </p>
        </section>

        {/* ---------- controls ---------- */}
        <section className="gs-card flex flex-col gap-6 p-5 sm:p-6">
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

            {onMascotChange && (
              <div className="mt-4">
                <button
                  type="button"
                  className={`gs-pill ${showAddGesture ? "on" : ""}`}
                  disabled={addingGesture}
                  onClick={() => setShowAddGesture((v) => !v)}
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
                              disabled={!customGestureLabel.trim()}
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
                (plumage / body; the signal ramp stays product-fixed)
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
                    className={`gs-swatch ${themeKey === k ? "on" : ""}`}
                    style={{ background: swatchBg(t) }}
                    onClick={() => setThemeKey(k)}
                  />
                );
              })}
              <button
                type="button"
                title="Custom"
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
            >
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {onMascotChange && canUndo && (
              <button
                type="button"
                className="gs-btn ghost w-full inline-flex items-center justify-center gap-2"
                onClick={handleUndo}
              >
                <Undo2 className="size-4" />
                Revert last AI change
              </button>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                className="gs-btn flex-1"
                onClick={downloadPose}
              >
                Download pose
              </button>
              <button
                type="button"
                className="gs-btn ghost flex-1"
                onClick={downloadPack}
              >
                Download pack
              </button>
            </div>
            <button
              type="button"
              className="gs-btn ghost w-full"
              onClick={copySVG}
            >
              {copied ? "Copied ✓" : "Copy pose SVG"}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.5 }}>
            Pose exports the selected gesture at the current{" "}
            {instrument.label.toLowerCase()}. Pack is a zip of every pose plus{" "}
            <code style={{ color: "#C6BCA7" }}>pack.json</code>.
          </p>

          <AppAssetsPanel
            mascotId={mascotId ?? null}
            mascotName={mascot.name}
            model={model}
          />
        </section>

        <div className="lg:col-span-2">
          <MascotEditPanel
            mascot={{ ...mascot, parts }}
            look={look}
            model={model}
            enabledParts={enabledParts}
            onTogglePart={togglePart}
            onMascotChange={applyMascotChange}
            referenceId={referenceId}
            onReferenceIdChange={setReferenceId}
            accent={accent}
          />
        </div>
      </main>
    </div>
  );
}
