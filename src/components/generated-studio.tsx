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
import type { GeneratedGesture, GeneratedMascot, ThemeSwatch } from "@/lib/types";
import {
  SPARK_PATHS,
  computeSignalBars,
  mixHex,
  rampColor,
  rgba,
  zoneForSignal,
  type SparkKind,
} from "@/lib/studio-utils";

type Props = {
  mascot: GeneratedMascot;
  /** When true, fills the viewport like /studio/[slug] examples. */
  fullPage?: boolean;
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

export function GeneratedStudio({ mascot, fullPage = true }: Props) {
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
  const [signal, setSignal] = useState(mascot.instrument.defaultValue);
  const signalAnim = useAnimatedNumber(signal);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [copied, setCopied] = useState(false);

  const svgHostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);
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

  /* mount / remount SVG for the active gesture */
  useEffect(() => {
    const host = svgHostRef.current;
    if (!host || !active?.svg) return;
    host.innerHTML = active.svg;
    const svg = host.querySelector("svg") as SVGSVGElement | null;
    svgRef.current = svg;
    eyesRef.current = host.querySelector(".ms-eyes") as SVGGElement | null;
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
    }
  }, [active?.svg, active?.key]); // theme/signal applied separately

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
  }, [paused, gestureKey, active?.svg]);

  const pickGesture = (g: GeneratedGesture) => {
    setGestureKey(g.key);
    if (typeof g.signal === "number") setSignal(g.signal);
  };

  const onTrack = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes || paused || !active.track) return;
      const r = svg.getBoundingClientRect();
      const sx = ((e.clientX - r.left) / r.width) * 420;
      const sy = ((e.clientY - r.top) / r.height) * 520;
      let dx = sx - 210;
      let dy = sy - 262;
      const len = Math.hypot(dx, dy) || 1;
      const m = Math.min(len / 46, 1) * 3.8;
      eyes.style.transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
    },
    [paused, active.track]
  );

  useEffect(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
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
    const svg = svgRef.current;
    if (!svg) return "";
    const node = svg.cloneNode(true) as SVGSVGElement;
    node.setAttribute("class", `ms-root ms-g-${gestureKey}`);
    node.setAttribute("width", "420");
    node.setAttribute("height", "520");
    node.removeAttribute("data-paused");
    const eyes = node.querySelector(".ms-eyes") as SVGGElement | null;
    if (eyes) eyes.style.transform = "";
    // bake current CSS vars into style for portability
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
  }, [gestureKey, theme, accent, signal, glow, instrument.ramp]);

  const downloadSVG = () => {
    const blob = new Blob([buildExport()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug = mascot.name.toLowerCase().replace(/\s+/g, "-");
    a.download = `${slug}-${gestureKey}-${Math.round(signal)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
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
            drag {instrument.label} — strip &amp; accents share one ramp
            &nbsp;·&nbsp; tap — bounce &amp; sparks &nbsp;·&nbsp;
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
                — plumage / body; the signal ramp stays product-fixed
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

          <div className="flex gap-3">
            <button type="button" className="gs-btn flex-1" onClick={downloadSVG}>
              Download SVG
            </button>
            <button type="button" className="gs-btn ghost flex-1" onClick={copySVG}>
              {copied ? "Copied ✓" : "Copy SVG code"}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.5 }}>
            Exports the selected pose at the current {instrument.label.toLowerCase()}{" "}
            — filename carries both, one file per app state.
          </p>
        </section>
      </main>
    </div>
  );
}
