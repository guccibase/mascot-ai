"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MascotPartsPanel } from "@/components/mascot-edit-panel";
import { useStudioPartToggles } from "@/hooks/use-studio-part-toggles";
import { SOL_PARTS } from "@/lib/legacy-example-parts";

/* ============================================================
   SOL: the sunrise blob. A drop of dawn light with a face,
   the alarm app's buddy orb itself, given eyes.

   The brief's stated risk: blob mascots are the most common
   shape in tech, so execution has to carry it. Sol's answer is
   to express everything as LIGHT rather than as a generic
   blob:

   · silhouette: a soft orb whose outline breathes
   · the outline is alive: SMIL morphs the body path itself
   · a bright sun-core nucleus floats inside the drop
   · it casts a pool of light on the ground, never a shadow
   · a shimmer periodically sweeps across the surface
   · emotions are photonic. Listening ripples light outward,
     alarm is a flare, night is a banked ember, celebration
     splits into a prism rainbow, sadness drips light, and
     dizziness flickers like a failing bulb
   · the studio glow slider doubles as the app's wake-light
     brightness, so mascot and interface are one object

   Engineering (carried over from Fanous & Bud):
   · shape-critical animation is SMIL only, which keeps us out
     of the CSS transform-box / transform-origin traps
   · CSS animations are origin-free (opacity, translate)
   · every gesture is a whole performance: body shape, core,
     eyes, brows, mouth, gaze, brightness, tint and a prop
   ============================================================ */

/* ---------- color helpers ---------- */
const hx = (h) => {
  const s = h.replace("#", "");
  const v = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => {
  const [r1, g1, b1] = hx(a), [r2, g2, b2] = hx(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
const dark = (c, t) => mix(c, "#160D06", t);
const light = (c, t) => mix(c, "#FFFBEF", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---------- themes: times of dawn ---------- */
const THEMES = {
  daybreak: { name: "Daybreak",   top: "#FFE9AE", mid: "#FFB35C", base: "#F4744E", core: "#FFF6CF", stage: "#232B47" },
  blushing: { name: "Blush Dawn", top: "#FFDCC6", mid: "#FF9E7E", base: "#E85C6B", core: "#FFF1E2", stage: "#3A2547" },
  golden:   { name: "Gold Noon",  top: "#FFF2B8", mid: "#FFC148", base: "#F09A2E", core: "#FFFBE0", stage: "#274058" },
  ember:    { name: "Ember Eve",  top: "#FFC98F", mid: "#F08B4B", base: "#D95749", core: "#FFE9B8", stage: "#201A38" },
  polar:    { name: "Polar Dawn", top: "#FFE8CB", mid: "#F6A96B", base: "#E9836A", core: "#FFF4DE", stage: "#2E4A5C" },
};
const derive = (t) => ({
  ...t,
  features: "#4A2611",
  blush: mix(t.base, "#FFFFFF", 0.38),
  pool: t.mid,
  rim: light(t.top, 0.45),
  deep: dark(t.base, 0.18),
});

/* ---------- studio shell CSS ---------- */
const AMBER = "#F5B34F";
const SHELL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  .ss-root{min-height:100vh;background:#101526;color:#F5EDE0;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px, rgba(245,179,79,.16), transparent 60%),
      radial-gradient(720px 400px at 88% 110%, rgba(244,116,78,.10), transparent 60%);}
  .ss-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
  .ss-card{background:rgba(255,246,230,.045);border:1px solid rgba(245,179,79,.16);
    border-radius:20px;backdrop-filter:blur(8px)}
  .ss-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${AMBER}}
  .ss-pill{border:1px solid rgba(245,179,79,.28);border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#F5EDE0;background:transparent;cursor:pointer;
    transition:all .16s ease;line-height:1}
  .ss-pill:hover{border-color:${AMBER};transform:translateY(-1px)}
  .ss-pill.on{background:${AMBER};color:#2A1704;border-color:${AMBER}}
  .ss-btn{border-radius:12px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;
    border:1px solid rgba(245,179,79,.35);color:#2A1704;background:${AMBER};transition:all .16s}
  .ss-btn:hover{filter:brightness(1.07)}
  .ss-btn.ghost{background:transparent;color:#F5EDE0}
  .ss-swatch{width:38px;height:38px;border-radius:12px;cursor:pointer;border:2px solid transparent;
    transition:transform .15s ease}
  .ss-swatch:hover{transform:scale(1.1)}
  .ss-swatch.on{border-color:#FFF6E4}
  .ss-checker{background-image:linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(-45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,rgba(255,255,255,.05) 75%),
    linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.05) 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .ss-range{accent-color:${AMBER}}
  .ss-spark{position:absolute;pointer-events:none;animation:ss-spark .95s ease-out forwards}
  @keyframes ss-spark{0%{opacity:0;transform:translate(0,0) scale(.4)}
    18%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
`;

/* ---------- mascot CSS (origin-free animations only) ---------- */
const SVG_CSS = `
  .sd-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .sd-g-flare{--gf:1.9}
  .sd-g-sunrise{--gf:1.55}
  .sd-g-celebrate{--gf:1.4}
  .sd-g-love{--gf:1.25}
  .sd-g-grumpy{--gf:.55}
  .sd-g-snooze{--gf:.35}
  .sd-g-sleepy{--gf:.45}
  .sd-g-sad{--gf:.5}
  .sd-g-night{--gf:.2}
  .sd-float{animation:sd-float 4s ease-in-out infinite}
  .sd-g-night .sd-float{animation-duration:8s}
  .sd-g-sleepy .sd-float{animation-duration:6.4s}
  .sd-g-flare .sd-float{animation:none}
  .sd-g-celebrate .sd-float{animation-duration:2s}
  .sd-poolO{animation:sd-poolO 4s ease-in-out infinite}
  .sd-glow{animation:sd-glow 3.2s ease-in-out infinite}
  .sd-g-flare .sd-glow{animation-duration:.8s}
  .sd-wave-on .sd-glow{animation-duration:1.5s}
  .sd-gleam{animation:sd-gleam 6.5s ease-in-out infinite}
  .sd-wave-on .sd-gleam{animation-duration:2.2s}
  .sd-eyes{transition:transform .12s ease-out}
  .sd-pop{animation:sd-pop .3s ease-out}
  .sd-flicker{animation:sd-flicker 1.7s linear infinite}
  .sd-ripple{animation:sd-ripple 1.6s ease-out infinite}
  .sd-zzz{animation:sd-zzz 3.2s ease-in-out infinite}
  .sd-rise{animation:sd-rise 2.6s ease-out infinite}
  .sd-fall{animation:sd-fall 2.8s linear infinite}
  .sd-twinkle{animation:sd-twinkle 1.4s ease-in-out infinite}
  .sd-drip{animation:sd-drip 2.6s ease-in infinite}
  .sd-ray{animation:sd-ray 2.4s ease-in-out infinite}
  .sd-tick{animation:sd-tick .5s ease-out infinite}
  .sd-cloud{animation:sd-cloud 6s ease-in-out infinite}
  .sd-note{animation:sd-note 2.2s ease-out infinite}
  .sd-svg[data-paused] *{animation-play-state:paused !important}
  @keyframes sd-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes sd-poolO{0%,100%{opacity:.85}50%{opacity:.5}}
  @keyframes sd-glow{0%,100%{opacity:calc(var(--g,.5)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.5)*var(--gf,1))}}
  @keyframes sd-gleam{0%,30%,100%{transform:translateX(-96px);opacity:0}9%{opacity:.5}20%{transform:translateX(96px);opacity:0}}
  @keyframes sd-pop{from{opacity:0}to{opacity:1}}
  @keyframes sd-flicker{0%,100%{opacity:1}7%{opacity:.5}11%{opacity:1}39%{opacity:.55}44%{opacity:1}71%{opacity:.7}76%{opacity:1}}
  @keyframes sd-ripple{0%{opacity:.8}70%{opacity:0}100%{opacity:0}}
  @keyframes sd-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes sd-rise{0%{transform:translateY(12px);opacity:0}22%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
  @keyframes sd-fall{0%{transform:translateY(-24px);opacity:0}12%{opacity:1}82%{opacity:.9}100%{transform:translateY(150px);opacity:0}}
  @keyframes sd-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes sd-drip{0%{opacity:0;transform:translateY(0) scale(.7)}16%{opacity:1;transform:translateY(6px) scale(1)}
    82%{opacity:.9}100%{opacity:0;transform:translateY(58px) scale(.9)}}
  @keyframes sd-ray{0%,100%{opacity:.15;transform:translateY(4px)}50%{opacity:.85;transform:translateY(-4px)}}
  @keyframes sd-tick{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
  @keyframes sd-cloud{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}
  @keyframes sd-note{0%{opacity:0;transform:translate(0,6px)}20%{opacity:1}100%{opacity:0;transform:translate(16px,-34px)}}
`;

/* ============================================================
   THE BODY: a drop of light that breathes.
   Two body kinds, each morphing between compatible frames
   (identical command structure: M + 6 cubics + Z) via SMIL.
   "base" is the buoyant orb;
   "sag"  is the melted, settled orb for low-energy states.
   ============================================================ */
const BODY = {
  base: {
    d: "M210,442 C169.3,442 131.6,418.4 111.3,380 C90.9,341.6 90.9,294.4 111.3,256 C131.6,217.6 169.3,194 210,194 C250.7,194 288.4,217.6 308.7,256 C329.1,294.4 329.1,341.6 308.7,380 C288.4,418.4 250.7,442 210,442 Z",
    values:
      "M210,442 C169.3,442 131.6,418.4 111.3,380 C90.9,341.6 90.9,294.4 111.3,256 C131.6,217.6 169.3,194 210,194 C250.7,194 288.4,217.6 308.7,256 C329.1,294.4 329.1,341.6 308.7,380 C288.4,418.4 250.7,442 210,442 Z;" +
      "M210,439 C167.8,439 128.9,416.3 107.8,379.5 C86.7,342.7 86.7,297.3 107.8,260.5 C128.9,223.7 167.8,201 210,201 C252.2,201 291.1,223.7 312.2,260.5 C333.3,297.3 333.3,342.7 312.2,379.5 C291.1,416.3 252.2,439 210,439 Z;" +
      "M210,442 C169.3,442 131.6,418.4 111.3,380 C90.9,341.6 90.9,294.4 111.3,256 C131.6,217.6 169.3,194 210,194 C250.7,194 288.4,217.6 308.7,256 C329.1,294.4 329.1,341.6 308.7,380 C288.4,418.4 250.7,442 210,442 Z",
  },
  sag: {
    d: "M210,442 C166.1,442 125.5,421 103.5,387 C81.5,353 81.5,311 103.5,277 C125.5,243 166.1,222 210,222 C253.9,222 294.5,243 316.5,277 C338.5,311 338.5,353 316.5,387 C294.5,421 253.9,442 210,442 Z",
    values:
      "M210,442 C166.1,442 125.5,421 103.5,387 C81.5,353 81.5,311 103.5,277 C125.5,243 166.1,222 210,222 C253.9,222 294.5,243 316.5,277 C338.5,311 338.5,353 316.5,387 C294.5,421 253.9,442 210,442 Z;" +
      "M210,440 C165,440 123.4,419.8 100.9,387 C78.4,354.2 78.4,313.8 100.9,281 C123.4,248.2 165,228 210,228 C255,228 296.6,248.2 319.1,281 C341.6,313.8 341.6,354.2 319.1,387 C296.6,419.8 255,440 210,440 Z;" +
      "M210,442 C166.1,442 125.5,421 103.5,387 C81.5,353 81.5,311 103.5,277 C125.5,243 166.1,222 210,222 C253.9,222 294.5,243 316.5,277 C338.5,311 338.5,353 316.5,387 C294.5,421 253.9,442 210,442 Z",
  },
};
/* static, slightly inset drop used as the shimmer clip */
const CLIP_D =
  "M210,435 C171.8,435 136.4,412.7 117.3,376.5 C98.2,340.3 98.2,295.7 117.3,259.5 C136.4,223.3 171.8,201 210,201 C248.2,201 283.6,223.3 302.7,259.5 C321.8,295.7 321.8,340.3 302.7,376.5 C283.6,412.7 248.2,435 210,435 Z";

/* ============================================================
   GESTURE LIBRARY: 15 light-native poses for an alarm app
   ============================================================ */
const GESTURES = [
  /* ------------- core ------------- */
  {
    key: "idle", label: "Idle", cat: "Core", use: "Home screen · the orb itself",
    tip: "It breathes, blinks and shimmers, and the eyes follow your cursor.",
    body: "base", core: [322, 58],
    eyeL: "open", eyeR: "open", mouth: "smile", track: true,
  },
  {
    key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Eyes creased shut, easy grin, and the light ticks up a notch.",
    body: "base", core: [318, 62],
    eyeL: "arch", eyeR: "arch", mouth: "grin",
  },
  {
    key: "thinking", label: "Thinking", cat: "Core", use: "AI planning your morning",
    tip: "Gaze drifts up while motes of light tick around the crown.",
    body: "base", core: [322, 58],
    eyeL: "open", eyeR: "open", brow: "oneUp", mouth: "flat",
    look: [4, -6], prop: "sparks",
  },
  {
    key: "listening", label: "Listening", cat: "Core", use: "Voice command",
    tip: "Rings of light ripple outward from the body as it hears you.",
    body: "base", core: [322, 58],
    eyeL: "open", eyeR: "open", mouth: "tiny", prop: "ripples",
  },
  {
    key: "talking", label: "Talking", cat: "Core", use: "AI reply · morning briefing",
    tip: "Mouth caught mid-word, with light arcs carrying off to the side.",
    body: "base", core: [322, 58],
    eyeL: "open", eyeR: "open", brow: "up", mouth: "open", prop: "speech",
  },

  /* ------------- alarm ------------- */
  {
    key: "flare", label: "Alarm!", cat: "Alarm", use: "Alarm firing",
    tip: "The core swells white-hot. Rays burst and the whole drop rattles.",
    body: "base", core: [316, 76], shake: true,
    eyeL: "wide", eyeR: "wide", brow: "up", mouth: "o", prop: "flareFx",
  },
  {
    key: "sunrise", label: "Sunrise", cat: "Alarm", use: "Wake-up moment",
    tip: "Its inner sun lifts to the crown, rays fanning out while a cloud drifts by.",
    body: "base", core: [296, 64],
    eyeL: "arch", eyeR: "arch", mouth: "smile", prop: "sunFx",
  },
  {
    key: "snooze", label: "Snooze", cat: "Alarm", use: "Snooze pressed",
    tip: "The core sinks and dims. Lids at half mast, one soft Z.",
    body: "sag", core: [350, 44], tint: "#3A3560", tintO: 0.22,
    eyeL: "half", eyeR: "half", mouth: "tiny", prop: "zzz",
  },
  {
    key: "sleepy", label: "Sleepy", cat: "Alarm", use: "Wind-down reminder",
    tip: "Sags like it's melting, light low, one Z drifting off the crown.",
    body: "sag", core: [344, 46],
    eyeL: "half", eyeR: "half", mouth: "tiny", prop: "zzz",
  },
  {
    key: "night", label: "Night", cat: "Alarm", use: "Sleep mode",
    tip: "Nearly out. Just a small warm coal low in the drop, crescent and stars above.",
    body: "sag", core: [362, 32], tint: "#2E2A55", tintO: 0.4,
    eyeL: "sleep", eyeR: "sleep", mouth: "tiny", prop: "nightFx",
  },

  /* ------------- moods ------------- */
  {
    key: "celebrate", label: "Celebrate", cat: "Moods", use: "On-time streak",
    tip: "Star-eyed, splitting its own light into a little rainbow.",
    body: "base", core: [314, 64],
    eyeL: "star", eyeR: "star", mouth: "bigGrin", prop: "prism",
  },
  {
    key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too-early alarm",
    tip: "A brownout: reddened, dimmed and flickering, flat lids over a frown.",
    body: "base", core: [334, 48], tint: "#C2503C", tintO: 0.2, flicker: true,
    eyeL: "half", eyeR: "half", brow: "angry", mouth: "frown", prop: "fizz",
  },
  {
    key: "sad", label: "Sad", cat: "Moods", use: "Overslept, gently",
    tip: "Peaked brows and a single drip of light falling. Dimmed, never shaming.",
    body: "sag", core: [340, 46], tint: "#5A4A72", tintO: 0.16,
    eyeL: "sad", eyeR: "sad", brow: "sad", mouth: "frown", prop: "drip",
  },
  {
    key: "dizzy", label: "Dizzy", cat: "Moods", use: "Third snooze in a row",
    tip: "Light stutters like a faulty bulb. Spiral eyes, sparks orbiting the crown.",
    body: "base", core: [322, 54], flicker: true,
    eyeL: "spiral", eyeR: "spiral", mouth: "o", prop: "orbit",
  },
  {
    key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart eyes, and small hearts of light floating away.",
    body: "base", core: [318, 60],
    eyeL: "heart", eyeR: "heart", mouth: "smile", prop: "hearts",
  },
];
const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Alarm", "Moods"];

/* ---------- face ---------- */
const EYE_L_X = 170, EYE_R_X = 250, EYE_Y = 300;
const HEART_D = "M0,12 C-16,1 -18,-9 -9.5,-14.5 C-4,-18 0,-13 0,-8.5 C0,-13 4,-18 9.5,-14.5 C18,-9 16,1 0,12 Z";

function Eye({ kind, x, p }) {
  const at = `translate(${x},${EYE_Y})`;
  const line = { fill: "none", stroke: p.features, strokeWidth: 9, strokeLinecap: "round" };
  if (kind === "arch") return <path d="M-15.5,4 Q0,-14.5 15.4,3.8" transform={at} {...line} />;
  if (kind === "sleep") return <path d="M-15.5,-4 Q0,14 15.4,-4" transform={at} {...line} />;
  if (kind === "star")
    return <path transform={at} fill={p.features}
      d="M0,-18 L4.4,-4.4 L18,0 L4.4,4.4 L0,18 L-4.4,4.4 L-18,0 L-4.4,-4.4 Z" />;
  if (kind === "heart") return <path transform={at} fill={p.features} d={HEART_D} />;
  if (kind === "spiral")
    return (
      <path transform={at} {...line} strokeWidth="6.5"
        d="M2,1 q5,-4 4,2 q-1.5,7 -9,6 q-9,-1.5 -8,-11 q1.5,-11.5 13,-10.5 q13,1.5 12,14" />
    );
  if (kind === "sad")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="1" rx="10.5" ry="13.5" fill={p.features} />
        <circle cx="-3.4" cy="-3.6" r="2.8" fill={p.core} opacity=".95" />
      </g>
    );
  if (kind === "half")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="12" ry="16.5" fill={p.features} />
        <rect x="-15" y="-20" width="30" height="17" fill={p.mid} />
        <path d="M-13,-3.5 L13,-3.5" stroke={p.features} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  const wide = kind === "wide";
  return (
    <g transform={at}>
      {kind === "open" && (
        <>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1 1;1 0.06;1 1;1 1" keyTimes="0;0.9;0.923;0.946;1"
            dur="5.2s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="sd-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      <ellipse cx="0" cy="0" rx={wide ? 14.5 : 12.5} ry={wide ? 21.5 : 17.5} fill={p.features} />
      <circle cx="-3.8" cy="-5.4" r={wide ? 4.4 : 3.8} fill={p.core} opacity=".95" />
      <circle cx="3.4" cy="3.4" r="1.7" fill={p.core} opacity=".55" />
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    up:    ["M148,270 Q166,259 186,268", "M234,268 Q254,259 272,270"],
    sad:   ["M149,277 Q160,267 185,265", "M235,265 Q260,267 271,277"],
    angry: ["M149,262 Q166,268 187,280", "M233,280 Q254,268 271,262"],
    oneUp: ["M150,274 Q167,270 186,274", "M234,270 Q252,258 270,266"],
  }[kind];
  return (
    <g fill="none" stroke={p.features} strokeWidth="7" strokeLinecap="round">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p }) {
  const s = { fill: "none", stroke: p.features, strokeWidth: 8, strokeLinecap: "round" };
  if (kind === "smile")
    return (
      <>
        <path d="M186,336 Q210,360 234,336.4" {...s}>
          <animate attributeName="opacity" values="1;0;0;1" keyTimes="0;0.05;0.88;1"
            begin="sd-hit.click" dur="1s" fill="remove" />
        </path>
        <path d="M184,335 Q210,365 236,335.5 Q210,344 184,335 Z" fill={p.features} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.88;1"
            begin="sd-hit.click" dur="1s" fill="remove" />
        </path>
      </>
    );
  if (kind === "grin") return <path d="M184,335 Q210,365 236,335.5 Q210,344 184,335 Z" fill={p.features} />;
  if (kind === "bigGrin")
    return (
      <g>
        <path d="M178,332 Q210,376 242,332.5 Q210,344 178,332 Z" fill={p.features} />
        <path d="M196,368 Q210,377 224,368 Q210,364 196,368 Z" fill={p.blush} opacity=".9" />
      </g>
    );
  if (kind === "open")
    return (
      <g>
        <ellipse cx="210" cy="346" rx="16" ry="19" fill={p.features} />
        <path d="M200,358 Q210,351 220,358 Q210,366 200,358 Z" fill={p.blush} opacity=".85" />
      </g>
    );
  if (kind === "o") return <ellipse cx="210" cy="345" rx="10" ry="13" fill={p.features} />;
  if (kind === "flat") return <path d="M195,342 Q210,347 225,342" {...s} />;
  if (kind === "frown") return <path d="M188,350 Q210,330 232,350" {...s} />;
  if (kind === "tiny") return <path d="M202,343 Q210,349 218,343" {...s} />;
  return null;
}

/* ---------- props: light doing the talking ---------- */
const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path className={cls} fill={fill}
      style={delay ? { animationDelay: delay } : undefined}
      d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" />
  </g>
);
const Crescent = ({ p, x, y, s = 0.85 }) => (
  <path d="M24,6 A15,15 0 1,0 24,34 A11.5,11.5 0 1,1 24,6 Z" fill={p.top} opacity=".92"
    transform={`translate(${x},${y}) scale(${s})`} />
);

function Props({ g, p }) {
  switch (g.prop) {
    case "sparks":
      return (
        <g>
          <circle cx="256" cy="188" r="4.5" fill={p.core} opacity=".9" />
          <circle cx="276" cy="162" r="6.5" fill={p.core} opacity=".9" />
          <Star4 x={310} y={120} s={1.5} fill={p.top} cls="sd-twinkle" />
          <Star4 x={340} y={152} s={1} fill={p.core} cls="sd-twinkle" delay=".35s" />
          <Star4 x={288} y={88} s={0.8} fill={p.base} cls="sd-twinkle" delay=".7s" />
        </g>
      );
    case "ripples":
      /* light rippling outward; SMIL animates the radius itself */
      return (
        <g fill="none" stroke={p.top} strokeWidth="4">
          <circle className="sd-ripple" cx="210" cy="308" r="140">
            <animate attributeName="r" values="140;192" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle className="sd-ripple" cx="210" cy="308" r="140"
            style={{ animationDelay: ".8s" }}>
            <animate attributeName="r" values="140;192" dur="1.6s" begin="0.8s"
              repeatCount="indefinite" />
          </circle>
        </g>
      );
    case "speech":
      return (
        <g fill="none" stroke={p.top} strokeLinecap="round">
          <path className="sd-tick" d="M268,306 Q278,322 268,338" strokeWidth="5" />
          <path className="sd-tick" d="M286,296 Q302,322 286,348" strokeWidth="5"
            style={{ animationDelay: ".2s" }} />
          <circle cx="312" cy="322" r="3.4" fill={p.top} className="sd-twinkle" />
        </g>
      );
    case "flareFx":
      return (
        <g stroke={p.core} strokeLinecap="round" fill="none">
          {[[210, 118, 210, 84], [130, 150, 104, 126], [290, 150, 316, 126],
            [88, 236, 56, 226], [332, 236, 364, 226], [104, 330, 72, 342],
            [316, 330, 348, 342]].map(([a, b, c, d], i) => (
            <path key={i} className="sd-tick" d={`M${a},${b} L${c},${d}`} strokeWidth="7"
              style={{ animationDelay: `${(i % 3) * 0.12}s` }} />
          ))}
          <path className="sd-tick" d="M162,96 L150,74" strokeWidth="6" stroke={p.base} />
          <path className="sd-tick" d="M258,96 L270,74" strokeWidth="6" stroke={p.base}
            style={{ animationDelay: ".1s" }} />
        </g>
      );
    case "sunFx":
      return (
        <g>
          <g stroke={p.top} strokeWidth="5.5" strokeLinecap="round" fill="none">
            {[[210, 128, 210, 96], [156, 148, 134, 124], [264, 148, 286, 124],
              [122, 200, 94, 188], [298, 200, 326, 188]].map(([a, b, c, d], i) => (
              <path key={i} className="sd-ray" d={`M${a},${b} L${c},${d}`}
                style={{ animationDelay: `${(i % 3) * 0.25}s` }} />
            ))}
          </g>
          <g className="sd-cloud" fill={p.core} opacity=".92">
            <ellipse cx="336" cy="92" rx="30" ry="13" />
            <circle cx="320" cy="82" r="12" /><circle cx="344" cy="78" r="15" />
          </g>
        </g>
      );
    case "zzz":
      return (
        <g fill="none" stroke={p.top} strokeLinecap="round" strokeLinejoin="round">
          <path className="sd-zzz" d="M282,132 L300,132 L282,150 L300,150" strokeWidth="5" />
          <path className="sd-zzz" d="M312,100 L326,100 L312,114 L326,114" strokeWidth="4.5"
            style={{ animationDelay: ".7s" }} />
        </g>
      );
    case "nightFx":
      return (
        <g>
          <Crescent p={p} x={62} y={46} />
          <Star4 x={138} y={64} s={0.8} fill={p.core} cls="sd-twinkle" />
          <Star4 x={332} y={72} s={1} fill={p.core} cls="sd-twinkle" delay=".5s" />
          <Star4 x={296} y={40} s={0.7} fill={p.top} cls="sd-twinkle" delay="1s" />
          <g fill="none" stroke={p.top} strokeLinecap="round" strokeLinejoin="round">
            <path className="sd-zzz" d="M286,126 L304,126 L286,144 L304,144" strokeWidth="5" />
            <path className="sd-zzz" d="M316,94 L330,94 L316,108 L330,108" strokeWidth="4.5"
              style={{ animationDelay: ".6s" }} />
          </g>
        </g>
      );
    case "prism":
      /* Sol splits its own light into a rainbow */
      return (
        <g>
          <g fill="none" strokeLinecap="round" strokeWidth="9">
            <path d="M136,152 A74,74 0 0 1 284,152" stroke="#F2694B" />
            <path d="M148,154 A62,62 0 0 1 272,154" stroke="#FFC148" />
            <path d="M160,156 A50,50 0 0 1 260,156" stroke="#8FD0A8" />
            <path d="M172,158 A38,38 0 0 1 248,158" stroke="#8FB4E8" />
          </g>
          <Star4 x={116} y={124} s={1.1} fill={p.core} cls="sd-twinkle" />
          <Star4 x={306} y={120} s={1.2} fill={p.top} cls="sd-twinkle" delay=".4s" />
          <Star4 x={210} y={78} s={0.9} fill={p.core} cls="sd-twinkle" delay=".8s" />
        </g>
      );
    case "fizz":
      return (
        <g stroke={p.deep} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".8">
          <path className="sd-tick" d="M132,150 L142,160 L132,170" />
          <path className="sd-tick" d="M292,144 L282,154 L292,164"
            style={{ animationDelay: ".25s" }} />
        </g>
      );
    case "drip":
      /* a drop of light, not a tear */
      return (
        <g transform="translate(152,306)">
          <path className="sd-drip" fill={p.core} opacity=".95"
            stroke={p.top} strokeWidth="2.5"
            d="M0,-12 Q8.5,-2 8.5,4 A8.5,8.5 0 1,1 -8.5,4 Q-8.5,-2 0,-12 Z" />
        </g>
      );
    case "orbit":
      return (
        <g transform="translate(210,150)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="2.4s" repeatCount="indefinite" />
          <Star4 x={48} y={0} fill={p.top} s={1.1} />
          <Star4 x={-24} y={-42} fill={p.base} s={0.9} />
          <Star4 x={-24} y={42} fill={p.core} s={0.9} />
        </g>
      );
    case "hearts":
      return (
        <g>
          <g transform="translate(306,178) scale(1.25)">
            <path className="sd-rise" d={HEART_D} fill={p.base} />
          </g>
          <g transform="translate(118,158) scale(0.8)">
            <path className="sd-rise" d={HEART_D} fill={p.top} opacity=".85"
              style={{ animationDelay: ".9s" }} />
          </g>
        </g>
      );
    default:
      return null;
  }
}

/* ---------- the drop of dawn ---------- */
function SolSVG({ p, glow, paused, waving, gesture, svgRef, eyesRef }) {
  const g = byKey(gesture);
  const body = BODY[g.body] || BODY.base;
  const [coreY, coreR] = g.core || [322, 58];
  const look = g.look || [0, 0];

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Sol the sunrise blob: ${g.label}`}
      className={`sd-svg sd-g-${gesture} ${waving ? "sd-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title>Sol, the sunrise blob</title>
      <style>{SVG_CSS}</style>

      <defs>
        <filter id="sd-grain" x="-25%" y="-15%" width="150%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="gg" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="gg" />
          </feMerge>
        </filter>
        <linearGradient id="sd-bodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset=".52" stopColor={p.mid} />
          <stop offset="1" stopColor={p.base} />
        </linearGradient>
        <radialGradient id="sd-coreG" cx="50%" cy="42%" r="62%">
          <stop offset="0" stopColor={p.core} />
          <stop offset=".72" stopColor={p.core} stopOpacity=".85" />
          <stop offset="1" stopColor={p.core} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sd-haloG" cx="50%" cy="48%" r="58%">
          <stop offset="0" stopColor={p.mid} stopOpacity=".9" />
          <stop offset="1" stopColor={p.mid} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sd-poolG" cx="50%" cy="50%" r="52%">
          <stop offset="0" stopColor={p.pool} stopOpacity=".85" />
          <stop offset="1" stopColor={p.pool} stopOpacity="0" />
        </radialGradient>
        <clipPath id="sd-clip">
          <path d={CLIP_D} />
        </clipPath>
      </defs>

      {/* Sol casts a warm pool of light on the ground, never a shadow */}
      <g data-ms-part="pool" transform="translate(210,466)">
        <ellipse className="sd-poolO" cx="0" cy="0" rx="108" ry="12" fill="url(#sd-poolG)" />
        <ellipse cx="0" cy="0" rx="46" ry="5" fill={p.core} opacity=".35" />
      </g>

      <g className="sd-float">
        {/* squash-bounce pivots at the ground */}
        <g transform="translate(210,466)">
          {g.shake && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-2 0;2 0;-2 0" dur="0.11s" repeatCount="indefinite" />
          )}
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin="sd-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 8;0 -14;0 3;0 0" keyTimes="0;0.26;0.56;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="sd-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.07 0.9;0.95 1.07;1.02 0.97;1 1" keyTimes="0;0.26;0.56;0.8;1" />
          <g transform="translate(-210,-466)">
            <g className={g.flicker ? "sd-flicker" : undefined}>
              <g id="sd-hit" filter="url(#sd-grain)">
                {/* breathing halo */}
                <ellipse data-ms-part="halo" className="sd-glow ms-glow-halo" cx="210" cy="300" rx="164" ry="158"
                  fill="url(#sd-haloG)" />

                {/* the drop itself; its outline is alive */}
                <path data-ms-part="body" key={`body-${g.body}`} d={body.d} fill="url(#sd-bodyG)">
                  <animate attributeName="d" values={body.values} dur="7s"
                    repeatCount="indefinite" />
                </path>

                {/* the sun-core nucleus */}
                <g data-ms-part="core" key={`core-${g.key}`} className="sd-pop">
                  <circle cx="210" cy={coreY} r={coreR} fill="url(#sd-coreG)" />
                  <circle cx={210 - coreR * 0.28} cy={coreY - coreR * 0.34} r={coreR * 0.16}
                    fill={p.core} opacity=".9" />
                </g>

                {/* mood wash over the light */}
                {g.tint && (
                  <path key={`tint-${g.key}`} d={body.d} fill={g.tint} opacity={g.tintO || 0.2}>
                    <animate attributeName="d" values={body.values} dur="7s"
                      repeatCount="indefinite" />
                  </path>
                )}

                {/* shimmer sweeping the surface */}
                <g data-ms-part="gleam" clipPath="url(#sd-clip)">
                  <ellipse className="sd-gleam" cx="210" cy="300" rx="13" ry="132"
                    fill={p.rim} opacity="0" />
                </g>

                {/* blush */}
                <g data-ms-part="blush">
                  <circle cx="138" cy="326" r="11" fill={p.blush} opacity=".6" />
                  <circle cx="282" cy="326" r="11" fill={p.blush} opacity=".6" />
                </g>

                {/* face: the eyes group drifts toward your cursor */}
                <g className="sd-eyes ms-eyes" ref={eyesRef}>
                  <g key={g.key} className="sd-pop" transform={`translate(${look[0]},${look[1]})`}>
                    <g data-ms-part="brows">
                      <Brows kind={g.brow} p={p} />
                    </g>
                    <g data-ms-part="eyes">
                      <Eye kind={g.eyeL} x={EYE_L_X} p={p} />
                      <Eye kind={g.eyeR} x={EYE_R_X} p={p} />
                    </g>
                  </g>
                </g>
                <g data-ms-part="mouth" key={`m-${g.key}`} className="sd-pop">
                  <Mouth kind={g.mouth} p={p} />
                </g>

                {/* the prop that removes all doubt */}
                <g data-ms-part="props" key={`p-${g.key}`} className="sd-pop">
                  <Props g={g} p={p} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ---------- tap-burst shapes (overlay, never exported) ---------- */
const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  drop: "M0,7 Q-5,-1 0,-7 Q5,-1 0,7 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};

/* ============================================================
   POSE SOURCE
   Lets the build snapshot every pose exactly as the studio draws
   it at its defaults, so the remix pipeline edits real markup
   instead of guessing at it. Read by scripts, never by the app.
   ============================================================ */
export const POSE_SOURCE = {
  slug: "sol",
  /** Snapshot palette + no signal slider: Sol drives everything from light. */
  meta: {
    accent: THEMES.daybreak.mid,
    stage: THEMES.daybreak.stage,
    glowLabel: "Wake light",
    themes: { ...THEMES },
    instrument: null,
  },
  poses: GESTURES.map((g) => ({
    key: g.key,
    label: g.label,
    cat: g.cat,
    tip: g.tip,
    use: g.use,
    track: !!g.track,
    signal: 62,
  })),
  renderPose: (key) => (
    <SolSVG p={derive(THEMES.daybreak)} glow={0.5} waving={false} gesture={key} />
  ),
};

/* ============================================================
   STUDIO SHELL
   ============================================================ */
export default function SolStudio() {
  const [themeKey, setThemeKey] = useState("daybreak");
  const [custom, setCustom] = useState({ ...THEMES.daybreak, name: "Custom" });
  const [glow, setGlow] = useState(0.5);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [waving, setWaving] = useState(false);
  const [gesture, setGesture] = useState("idle");
  const [sparks, setSparks] = useState([]);
  const svgRef = useRef(null);
  const eyesRef = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const theme = themeKey === "custom" ? custom : THEMES[themeKey];
  const p = useMemo(() => derive(theme), [theme]);
  const activeG = byKey(gesture);
  const { parts, enabledParts, togglePart } = useStudioPartToggles(
    SOL_PARTS,
    svgRef,
    [gesture, glow, themeKey, waving, paused]
  );

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches) setPaused(true);
    const onC = (e) => e.matches && setPaused(true);
    m.addEventListener?.("change", onC);
    return () => m.removeEventListener?.("change", onC);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try { paused ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) { /* noop */ }
  }, [paused, gesture]);

  /* eye drift toward the cursor */
  const onTrack = useCallback((e) => {
    const svg = svgRef.current, eyes = eyesRef.current;
    if (!svg || !eyes || paused || !activeG.track) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 420;
    const sy = ((e.clientY - r.top) / r.height) * 520;
    let dx = sx - 210, dy = sy - 312;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len / 44, 1) * 5;
    eyes.style.transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
  }, [paused, activeG]);
  useEffect(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
  }, [gesture]);

  /* tap burst: motes of light */
  const delight = useCallback(() => {
    const burst = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const d = 60 + Math.random() * 70;
      return {
        key: Math.random().toString(36).slice(2),
        kind: i % 3 === 0 ? "star" : i % 3 === 1 ? "drop" : "dot",
        dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20,
        color: [p.core, p.top, p.mid, p.base][i % 4],
        rot: Math.random() * 360,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(() => setSparks((s) => s.filter((k) => !burst.some((b) => b.key === k.key))), 1000);
  }, [p]);

  useEffect(() => {
    if (!["celebrate", "flare"].includes(gesture) || paused) return;
    delight();
    const iv = setInterval(delight, 1500);
    return () => clearInterval(iv);
  }, [gesture, paused, delight]);

  const swatchBg = (t) =>
    `linear-gradient(180deg, ${t.top} 0 34%, ${t.mid} 34% 68%, ${t.base} 68% 100%)`;

  return (
    <div className="ss-root">
      <style>{SHELL_CSS}</style>

      <header className="max-w-6xl mx-auto px-5 pt-4 pb-2 flex items-center gap-4 sm:pt-6">
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: rgba(AMBER, 0.14),
          border: `1px solid ${rgba(AMBER, 0.4)}`, display: "grid", placeItems: "center",
        }}>
          {/* mini drop mark */}
          <svg viewBox="0 0 40 40" width="30" height="30">
            <circle cx="20" cy="23" r="11" fill={AMBER} />
            <circle cx="20" cy="25" r="4.5" fill="#FFF3D3" />
            <path d="M20,8 L20,3 M10,13 L6,9 M30,13 L34,9" stroke={AMBER} strokeWidth="2.6"
              strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <div>
          <h1 className="ss-display" style={{ fontSize: 24, fontWeight: 600 }}>
            Sol <span style={{ color: AMBER }}>·</span> Sunrise Blob
          </h1>
          <p style={{ fontSize: 13, color: "#BCAD97" }}>
            A living drop of dawn light: the alarm orb itself, given eyes
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ---------- stage ---------- */}
        <section className="ss-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="ss-eyebrow">Stage</span>
            <div className="flex gap-2">
              <button className={`ss-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)}>Transparent</button>
              <button className={`ss-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)}>In-app</button>
            </div>
          </div>

          <div
            className={`relative rounded-2xl overflow-hidden ${transparent ? "ss-checker" : ""}`}
            style={{
              background: transparent
                ? "rgba(255,255,255,.02)"
                : `radial-gradient(660px 440px at 50% 120%, ${rgba(theme.base, 0.35)}, transparent 62%), ${theme.stage}`,
              minHeight: 430,
            }}
            onMouseEnter={() => activeG.track && setWaving(true)}
            onMouseLeave={() => setWaving(false)}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 360, padding: "14px 10px 4px" }}>
              <SolSVG
                p={p} glow={glow} paused={paused} waving={waving}
                gesture={gesture} svgRef={svgRef} eyesRef={eyesRef}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="ss-spark"
                style={{
                  left: "50%", top: "50%",
                  "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
                }}>
                <svg width="16" height="16" viewBox="-8 -8 16 16"
                  style={{ transform: `rotate(${s.rot}deg)` }}>
                  <path d={SPARK_PATHS[s.kind]} fill={s.color} />
                </svg>
              </span>
            ))}
          </div>

          <p style={{ fontSize: 12.5, color: "#BCAD97", textAlign: "center" }}>
            hover to shimmer faster &nbsp;·&nbsp; tap for a bounce &amp; motes of light &nbsp;·&nbsp;
            its eyes drift toward your cursor
          </p>

          <MascotPartsPanel
            parts={parts}
            enabledParts={enabledParts}
            onTogglePart={togglePart}
            accent={AMBER}
            pillClassName="ss-pill"
            eyebrowClassName="ss-eyebrow"
          />
        </section>

        {/* ---------- controls ---------- */}
        <section className="ss-card p-5 sm:p-6 flex flex-col gap-6">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="ss-eyebrow">Gesture</span>
              <span style={{ fontSize: 11, color: "#8C7F6B" }}>{GESTURES.length} poses</span>
            </div>
            <div className="flex flex-col gap-2">
              {CATS.map((cat) => (
                <div key={cat}>
                  <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8C7F6B",
                    textTransform: "uppercase", margin: "4px 0 6px 2px" }}>{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.filter((gg) => gg.cat === cat).map((gg) => (
                      <button
                        key={gg.key}
                        title={gg.tip}
                        className={`ss-pill ${gesture === gg.key ? "on" : ""}`}
                        onClick={() => setGesture(gg.key)}
                      >
                        {gg.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12, padding: "11px 13px", borderRadius: 12,
              background: "rgba(255,246,230,.045)", border: `1px solid ${rgba(AMBER, 0.16)}`,
            }}>
              <div className="ss-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#CBBCA5", lineHeight: 1.5 }}>{activeG.tip}</p>
            </div>
          </div>

          <div>
            <div className="ss-eyebrow mb-3">Theme</div>
            <div className="flex flex-wrap gap-2 items-center">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={t.name}
                  className={`ss-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button title="Custom"
                className={`ss-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#2A1704", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="flex gap-4 mt-3">
                {[["top", "Crown"], ["base", "Base"], ["core", "Core"]].map(([k, label]) => (
                  <label key={k} style={{ fontSize: 12, color: "#CBBCA5" }}
                    className="flex items-center gap-2">
                    <input type="color" value={custom[k]}
                      onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                      style={{ width: 30, height: 30, border: "none", background: "none",
                        cursor: "pointer" }} />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="ss-eyebrow">Wake light</span>
              <span style={{ fontSize: 12, color: "#CBBCA5" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={glow}
              className="ss-range w-full"
              onChange={(e) => setGlow(parseFloat(e.target.value))} />
            <p style={{ fontSize: 11, color: "#8C7F6B", marginTop: 5 }}>
              Doubles as the app's wake-light brightness, so mascot and interface are one object.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="ss-eyebrow">Motion</span>
            <button className={`ss-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <p style={{ fontSize: 11.5, color: "#8C7F6B", lineHeight: 1.5 }}>
            Examples are for browsing. Build your own to download and export.
          </p>
        </section>
      </main>
    </div>
  );
}
