"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/*
 * LANTERN FAMILY FACTORY — Fanous-craft lamps with distinct chassis per app.

 * Shade=mushroom table lamp · Watt=Edison bulb · Arc=anglepoise desk lamp
 * Shared gesture / arm / studio engine. Each variant swaps body, hang, base, eyes, and accessory.
 * Studio shell mirrors GeneratedStudio (stage left, controls right, elements under stage).
 */

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
const dark = (c, t) => mix(c, "#0A1218", t);
const light = (c, t) => mix(c, "#F4FFFB", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---------- per-lantern themes + identity ---------- */
const LANTERN_VARIANTS = {
  shade: {
    slug: "shade", name: "Shade",
    tagline: "Soft mushroom lamp who dims the day into sleep",
    product: "Sleep Wind-down App", brand: "#9B8CDB", defaultTheme: "dusk",
    chassis: "mushroom", eyeStyle: "oval",
    /* Mitten arms read as odd extras on a soft table lamp — omit like Arc. */
    omitElements: ["arms"],
    elementLabels: {
      hang: "Shade knob", bands: "Shade trim", glass: "Shade glow",
      base: "Lamp base", flame: "Warm core", brows: "Brows", blush: "Blush", eyes: "Eyes",
      halo: "Halo glow", shadow: "Shadow", props: "Pose props", accessory: "Moon charm",
      thrusters: "Lift glow",
    },
    themes: {
      dusk: { name: "Lavender Dusk", body: "#9B8CDB", panel: "#2A2440", led: "#E8E0FF", accent: "#F0C878", stage: "#1A1628" },
      cloud: { name: "Cloud Night", body: "#A8B8D8", panel: "#242C40", led: "#F4F0FF", accent: "#B8D0F0", stage: "#161C28" },
      plum: { name: "Plum Quiet", body: "#B878A8", panel: "#2A1828", led: "#FFE8F4", accent: "#F0C0A0", stage: "#221820" },
      sage: { name: "Sage Sleep", body: "#7AA898", panel: "#1A2820", led: "#E8F8F0", accent: "#E8C878", stage: "#14201C" },
      ember: { name: "Ember Dim", body: "#D09070", panel: "#2A1C14", led: "#FFF0E0", accent: "#F0A868", stage: "#221814" },
    },
  },
  watt: {
    slug: "watt", name: "Watt",
    tagline: "Edison bulb who sparks every half-formed idea",
    product: "Idea Capture App", brand: "#E8A84A", defaultTheme: "amber",
    chassis: "bulb", eyeStyle: "round",
    elementLabels: {
      hang: "Tip pip", bands: "Screw threads", arms: "Arms", glass: "Glass bulb",
      base: "Screw base", flame: "Filament", brows: "Brows", blush: "Blush", eyes: "Eyes",
      halo: "Halo glow", shadow: "Shadow", props: "Pose props", accessory: "Idea spark",
      thrusters: "Lift glow",
    },
    themes: {
      amber: { name: "Warm Amber", body: "#F4D890", panel: "#3A2818", led: "#FFF6D8", accent: "#E87840", stage: "#241810" },
      cream: { name: "Cream Notion", body: "#FFF0D4", panel: "#3A3020", led: "#FFFAF0", accent: "#E8A050", stage: "#221C14" },
      tungsten: { name: "Tungsten", body: "#F0C070", panel: "#342010", led: "#FFE8B0", accent: "#F0B050", stage: "#1E1610" },
      citrus: { name: "Citrus Spark", body: "#F8DC70", panel: "#3A2810", led: "#FFF8C8", accent: "#E86050", stage: "#241A10" },
      rose: { name: "Rose Idea", body: "#F8C8B8", panel: "#3A2420", led: "#FFF4EC", accent: "#E87080", stage: "#241818" },
    },
  },
  arc: {
    slug: "arc", name: "Arc",
    tagline: "Desk lamp who bends every study session into focus",
    product: "Study Focus App", brand: "#5B8FD9", defaultTheme: "steel",
    chassis: "desk", eyeStyle: "hud",
    /* Desk lamp already has a spring arm — mitten hands read as odd extras. */
    omitElements: ["arms"],
    elementLabels: {
      hang: "Shade tip", bands: "Arm joints", glass: "Shade face",
      base: "Weighted base", flame: "Task beam", brows: "Brows", blush: "Blush", eyes: "Eyes",
      halo: "Halo glow", shadow: "Shadow", props: "Pose props", accessory: "Sticky note",
      thrusters: "Lift glow",
    },
    themes: {
      steel: { name: "Focus Steel", body: "#6A7A90", panel: "#1A2028", led: "#E8F0FF", accent: "#5B8FD9", stage: "#141820" },
      mint: { name: "Mint Desk", body: "#5AA890", panel: "#142420", led: "#E0FFF4", accent: "#F0C060", stage: "#121C18" },
      graphite: { name: "Graphite", body: "#4A5060", panel: "#181C24", led: "#E8ECF4", accent: "#6AB0E8", stage: "#12141A" },
      coral: { name: "Coral Task", body: "#E07868", panel: "#281818", led: "#FFE8E0", accent: "#5B8FD9", stage: "#1A1414" },
      violet: { name: "Violet Cram", body: "#7A6AB8", panel: "#1C1830", led: "#F0E8FF", accent: "#E8B060", stage: "#161428" },
    },
  },
};

const derive = (t) => ({
  ...t,
  bodyDark: dark(t.body, 0.28),
  bodyLight: light(t.body, 0.22),
  limb: dark(t.body, 0.12),
  joint: dark(t.body, 0.42),
  wheel: dark(t.panel, 0.18),
  screen: t.panel,
  screenLight: light(t.panel, 0.14),
  /* Fanous face stack: soft glass fill + ochre rim + feature ink */
  face: mix(t.panel, t.led, 0.22),
  faceEdge: dark(t.accent, 0.12),
  features: dark(t.body, 0.35),
  blush: mix(t.led, "#E4573D", 0.45),
  glowC: light(t.led, 0.12),
  dim: rgba(t.led, 0.35),
  brass: t.accent,
  glass: t.led,
});

/* ---------- flame is fire, not theme paint ---------- */
const FLAME = { outer: "#FF9A3C", mid: "#FFD166", core: "#FFF6E0", smoke: "#DCE8E4" };

/* Studio shell mirrors GeneratedStudio: stage left, one controls card right. */
const shellCss = (brand) => `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  .lb-root{min-height:100vh;background:#101820;color:#E8F4F0;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px,${rgba(brand, 0.15)},transparent 60%),
      radial-gradient(720px 400px at 88% 110%,${rgba(brand, 0.10)},transparent 60%)}
  .lb-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
  .lb-card{background:rgba(232,244,240,.045);border:1px solid ${rgba(brand, 0.16)};
    border-radius:20px;backdrop-filter:blur(8px)}
  .lb-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${brand};font-weight:600}
  .lb-pill{border:1px solid ${rgba(brand, 0.28)};border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#E8F4F0;background:transparent;cursor:pointer;
    transition:background .15s,border-color .15s,color .15s;line-height:1}
  .lb-pill:hover{border-color:${rgba(brand, 0.55)}}
  .lb-pill.on{background:${brand};color:#0A1814;border-color:${brand}}
  .lb-pill:focus-visible,.lb-swatch:focus-visible{outline:2px solid #DFFFF4;outline-offset:3px}
  .lb-tiny{border:1px solid ${rgba(brand, 0.26)};border-radius:999px;padding:5px 10px;
    font-size:11.5px;font-weight:600;color:#9BB5AE;background:transparent;cursor:pointer;
    transition:border-color .15s,color .15s}
  .lb-tiny:hover{border-color:${brand};color:#E8F4F0}
  .lb-swatch{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .lb-swatch.on{border-color:#fff;box-shadow:0 0 0 2px ${rgba(brand, 0.55)}}
  .lb-checker{background-color:#0c1322;background-image:
    linear-gradient(45deg,#152038 25%,transparent 25%),linear-gradient(-45deg,#152038 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#152038 75%),linear-gradient(-45deg,transparent 75%,#152038 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .lb-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#2A3540;outline:none;cursor:pointer}
  .lb-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
    background:${brand};cursor:pointer;border:2px solid #0A1814}
  .lb-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:${brand};cursor:pointer;border:2px solid #0A1814}
  .lb-spark{position:absolute;width:15px;height:15px;margin:-7px;pointer-events:none;
    animation:lb-spark .95s ease-out forwards}
  @keyframes lb-spark{0%{opacity:1;transform:translate(0,0) scale(1)}
    100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
`;

const SVG_CSS = `
  .ln-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .ln-g-alarm{--gf:1.75}
  .ln-g-celebrate{--gf:1.4}
  .ln-g-success{--gf:1.35}
  .ln-g-flying{--gf:1.5}
  .ln-g-proud{--gf:1.3}
  .ln-g-love{--gf:1.25}
  .ln-g-grumpy{--gf:.7}
  .ln-g-sad{--gf:.6}
  .ln-g-crying{--gf:.5}
  .ln-g-sleepy{--gf:.42}
  .ln-g-empty{--gf:.55}
  .ln-float{animation:ln-float 3.7s ease-in-out infinite}
  .ln-g-sleepy .ln-float{animation-duration:6s}
  .ln-g-alarm .ln-float{animation:none}
  .ln-g-celebrate .ln-float{animation-duration:1.85s}
  .ln-g-dancing .ln-float{animation-duration:1.4s}
  .ln-g-running .ln-float{animation:ln-runBounce .28s ease-in-out infinite}
  .ln-g-flying .ln-float{animation:ln-soar 1.6s ease-in-out infinite}
  .ln-shadowO{animation:ln-shadowO 3.7s ease-in-out infinite}
  .ln-g-running .ln-shadowO{animation:ln-runShadow .28s ease-in-out infinite}
  .ln-g-flying .ln-shadowO{opacity:.1;animation:none;transform:scaleX(.72)}
  .ln-glow{animation:ln-glow 3.1s ease-in-out infinite}
  .ln-g-alarm .ln-glow{animation-duration:.85s}
  .ln-wave-on .ln-glow{animation-duration:1.5s}
  .ln-pop{animation:ln-pop .28s ease-out}
  .ln-pupils{transition:transform .12s ease-out}
  .ln-ring{animation:ln-ring 1.15s ease-out infinite}
  .ln-scan{animation:ln-scan 2.4s ease-in-out infinite}
  .ln-zzz{animation:ln-zzz 3.2s ease-in-out infinite}
  .ln-rise{animation:ln-rise 2.5s ease-out infinite}
  .ln-fall{animation:ln-fall 2.8s linear infinite}
  .ln-twinkle{animation:ln-twinkle 1.4s ease-in-out infinite}
  .ln-tear{animation:ln-tear 2.8s ease-in infinite}
  .ln-eq{animation:ln-eq 1s ease-in-out infinite}
  .ln-type{animation:ln-type .52s steps(2) infinite}
  .ln-dot{animation:ln-dot 1.2s ease-in-out infinite}
  .ln-smoke{animation:ln-smoke 1.9s ease-out infinite}
  .ln-streak{animation:ln-streak .7s linear infinite}
  .ln-whoosh{animation:ln-whoosh .28s linear infinite}
  .ln-dust{animation:ln-dust .48s ease-out infinite}
  .ln-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes ln-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes ln-soar{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}
  @keyframes ln-runBounce{0%,100%{transform:translate(10px,4px)}25%{transform:translate(-4px,-14px)}50%{transform:translate(12px,2px)}75%{transform:translate(-2px,-16px)}}
  @keyframes ln-runShadow{0%,100%{opacity:.28;transform:translateX(-16px) scaleX(1.25)}50%{opacity:.12;transform:translateX(10px) scaleX(.65)}}
  @keyframes ln-shadowO{0%,100%{opacity:.22}50%{opacity:.12}}
  @keyframes ln-whoosh{0%{transform:translateX(18px);opacity:0}28%{opacity:.95}100%{transform:translateX(-56px);opacity:0}}
  @keyframes ln-dust{0%{transform:translate(0,0) scale(1);opacity:0}18%{opacity:.75}100%{transform:translate(-40px,8px) scale(.6);opacity:0}}
  @keyframes ln-glow{0%,100%{opacity:calc(var(--g,.45)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.45)*var(--gf,1))}}
  @keyframes ln-pop{from{opacity:0}to{opacity:1}}
  @keyframes ln-ring{0%,74%,100%{opacity:0}18%{opacity:.95}55%{opacity:0}}
  @keyframes ln-scan{0%,100%{opacity:.1;transform:translateY(-2px)}50%{opacity:.5;transform:translateY(74px)}}
  @keyframes ln-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes ln-rise{0%{opacity:.42;transform:translateY(10px)}24%{opacity:1}100%{opacity:0;transform:translateY(-42px)}}
  @keyframes ln-fall{0%{opacity:.3;transform:translateY(-20px)}12%{opacity:1}84%{opacity:.9}100%{opacity:.2;transform:translateY(145px)}}
  @keyframes ln-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes ln-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes ln-eq{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes ln-type{0%,100%{opacity:1}50%{opacity:.2}}
  @keyframes ln-dot{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes ln-smoke{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:.55}100%{opacity:0;transform:translate(0,48px) scale(1.3)}}
  @keyframes ln-streak{0%{opacity:0;transform:translate(0,0)}28%{opacity:.85}100%{opacity:0;transform:translate(0,36px)}}
  @media (prefers-reduced-motion:reduce){.ln-svg *{animation:none!important;transition:none!important}}
`;

/* ============================================================
   BODY GEOMETRY
   Chassis-specific glass/base/hang · face around y 210–250
   Base / feet land near y 440–460 · shoulders attach on the body edge.
   ============================================================ */
const SH_L = [152, 328], SH_R = [268, 328];
const mir = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${-parseFloat(x)},${y}`);
/** Endpoint of an arm path, used to seat the mitten hand. */
const endOf = (d) => {
  const pairs = d.match(/-?[\d.]+,-?[\d.]+/g);
  const [x, y] = pairs[pairs.length - 1].split(",");
  return [parseFloat(x), parseFloat(y)];
};

const A = {
  /* Fanous-length sausages — short enough that round tips read as mittens */
  rest: "M0,0 Q-18,26 -28,54",
  droop: "M0,0 Q-10,30 -18,58",
  tuck: "M0,0 Q10,22 22,38",
  out: "M0,0 Q-42,-6 -74,-4",
  up: "M0,0 Q-36,-28 -28,-68",
  high: "M0,0 Q-40,-36 -34,-82",
  /* Wave: tip clears the chassis — far out, not buried in the body edge */
  upWide: "M0,0 Q-52,-18 -72,-56",
  point: "M0,0 Q-44,0 -78,2",
  chin: "M0,0 Q-14,-22 30,-40",
  onFace: "M0,0 Q-18,-32 34,-58",
  palm: "M0,0 Q-24,-40 40,-74",
  write: "M0,0 Q-20,36 32,62",
  /* Clap: open (hands apart) ↔ shut (hands meet at center chest) */
  clapOpenL: "M0,0 Q-28,8 18,2",
  clapShutL: "M0,0 Q-6,20 56,16",
  clapOpenR: "M0,0 Q28,8 -18,2",
  clapShutR: "M0,0 Q6,20 -56,16",
  clapL: "M0,0 Q-6,20 56,16",
  clapR: "M0,0 Q6,20 -56,16",
  shrug: "M0,0 Q-34,-14 -50,2",
  /* Raised arm for thumbs — tip lands near Fanous fingerAt */
  thumb: "M0,0 Q-36,-30 -28,-70",
  down: "M0,0 Q-14,28 -20,56",
  /* Sprint: fists stay on the flanks — high = forward, low = back */
  runFwd: "M0,0 Q-18,-14 -20,14",
  runBack: "M0,0 Q-20,48 -22,78",
  runMid: "M0,0 Q-20,16 -22,48",
  /* Vertical launch: fists punched straight toward the sky */
  flyUp: "M0,0 Q-12,-52 -6,-92",
};

const GESTURES = [
  /* Core */
  { key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Soft bob and blink while the glow-eyes follow your cursor.",
    armL: A.rest, armR: mir(A.rest), eye: "open", mouth: "smile", track: true,
    handL: "mitt", handR: "mitt" },
  { key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "One open palm lifts high and flaps a friendly hello.",
    armL: A.down, armR: mir(A.upWide), wave: true, eye: "open", mouth: "grin", brow: "up",
    handL: "mitt", handR: "palm" },
  { key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased eyes and a warm lit grin.",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin", handL: "palm", handR: "palm" },
  { key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "Hand to chin, gaze drifting up while a little spark of an idea ticks over.",
    armL: A.chin, armR: mir(A.rest), eye: "open", mouth: "flat", brow: "oneUp",
    look: [3, -6], prop: "think", handL: "fist", handR: "mitt" },
  { key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with soft focus while the audio bars breathe.",
    armL: A.rest, armR: mir(A.rest), bow: 5, eye: "open", mouth: "tiny", prop: "eq" },
  { key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with soft speech arcs carrying off the glow.",
    armL: A.out, armR: mir(A.rest), eye: "open", mouth: "talk", brow: "up", prop: "speech",
    handL: "palm", handR: "mitt" },
  { key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "One arm out, open palm directing attention to the next page.",
    armL: A.rest, armR: mir(A.point), eye: "open", mouth: "smile", brow: "up",
    look: [6, -2], prop: "point", handL: "mitt", handR: "palm" },
  { key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Both hands on a floating keyboard while the caret blinks.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 5], prop: "keyboard",
    handL: "fist", handR: "fist" },

  /* Moods */
  { key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Arms up and bright confetti raining after a finished chapter.",
    armL: A.high, armR: mir(A.high), eye: "arch", mouth: "grin", prop: "confetti",
    handL: "fist", handR: "fist" },
  { key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Hearts in both eyes and more drifting off the warm glow.",
    armL: A.rest, armR: mir(A.rest), eye: "heart", mouth: "smile", prop: "hearts" },
  { key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Soft eyes and a gentle droop. Never mean about it.",
    armL: A.droop, armR: mir(A.droop), eye: "open", mouth: "frown", brow: "sad", look: [0, 4] },
  { key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Soft tears down the glass — bigger sorrow than sad.",
    armL: A.droop, armR: mir(A.droop), eye: "cry", mouth: "frown", brow: "sad", prop: "tears" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, flat mouth. Someone dimmed the room again.",
    armL: A.rest, armR: mir(A.rest), bow: 3, eye: "flat", mouth: "frown", brow: "angry", prop: "steam",
    handL: "fist", handR: "fist" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a soft Z drifting off the top tip.",
    armL: A.droop, armR: mir(A.droop), eye: "half", mouth: "tiny", prop: "zzz" },
  { key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up, glow bright, a badge earned for steady focus.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "badge",
    handL: "fist", handR: "fist" },
  { key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile and one bead of light-sweat. Soft fail, no shame.",
    armL: A.rest, armR: mir(A.up), eye: "open", mouth: "wry", brow: "oneUp", look: [-3, 2], prop: "oops",
    handL: "mitt", handR: "palm" },
  { key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Wide bright eyes and a small jump of delight.",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "spark",
    handL: "palm", handR: "palm" },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "Hand to the mouth, a heart blown toward the reader.",
    armL: A.chin, armR: mir(A.rest), eye: "arch", mouth: "kiss", brow: "up",
    look: [6, -2], prop: "kissHeart", handL: "palm", handR: "mitt" },
  { key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "Palm flat on the glass over a very classic misstep.",
    armL: A.palm, armR: mir(A.droop), eye: "flat", mouth: "wry", brow: "sad",
    handL: "palm", handR: "mitt" },
  { key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "Arms swinging and body swaying after a good session.",
    armL: A.high, armR: mir(A.out), sway: true, eye: "arch", mouth: "grin", prop: "notes",
    handL: "palm", handR: "palm" },

  /* Action */
  { key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes, ringing energy, whole lamp rattling. Deadline ping.",
    armL: A.out, armR: mir(A.out), shake: true, eye: "wide", mouth: "o", brow: "up", prop: "alarm",
    handL: "palm", handR: "palm" },
  { key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Both arms open and a warm face. You've got this — one more try.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "encourage",
    handL: "palm", handR: "palm" },
  { key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "Magnifier out while soft light sweeps for the right page.",
    armL: A.chin, armR: mir(A.out), eye: "open", mouth: "flat", brow: "oneUp",
    look: [7, -3], prop: "search", handL: "fist", handR: "palm" },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "A real thumbs-up — fist with a short fat thumb, clear approval.",
    armL: A.down, armR: mir(A.thumb), eye: "arch", mouth: "grin",
    handL: "mitt", handR: "thumb", fingerAt: [28, -70] },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Gentle disapproval — thumb down, try another approach.",
    armL: A.down, armR: mir(A.down), eye: "flat", mouth: "frown", brow: "sad",
    handL: "mitt", handR: "thumbDown", fingerAt: [24, 58] },
  { key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Shoulders up, unsure which path to take.",
    armL: A.shrug, armR: mir(A.shrug), eye: "open", mouth: "flat", brow: "oneUp", prop: "question",
    handL: "palm", handR: "palm" },
  { key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Focused busy posture with soft dials turning beside the head.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 3], prop: "gears",
    handL: "fist", handR: "fist" },
  { key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Full sprint — leaned forward, fists pumping, dust kicking up from the base.",
    armL: A.runMid, armR: mir(A.runMid), lean: 18, look: [12, -3],
    eye: "wide", mouth: "o", brow: "up", gait: "run", prop: "speed",
    handL: "fist", handR: "fist" },
  { key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Shooting straight up — chin tipped to the sky, fists leading, lift glow blooming below.",
    armL: A.flyUp, armR: mir(A.flyUp), lift: -56,
    eye: "wide", mouth: "o", brow: "up", look: [0, -18], skyward: true,
    gazeY: -7, prop: "rocket", boost: true, handL: "fist", handR: "fist" },
  { key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "Open palm raised and waiting for yours.",
    armL: A.rest, armR: mir(A.high), eye: "arch", mouth: "grin", prop: "highFive",
    handL: "mitt", handR: "palm" },
  { key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Hands meeting mid-clap for a well-finished session.",
    armL: A.clapL, armR: A.clapR, eye: "arch", mouth: "grin", brow: "up",
    clap: true, prop: "clap", handL: "palm", handR: "palm" },

  /* Feedback */
  { key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Uneven eyes, crooked mouth, question mark hovering.",
    armL: A.chin, armR: mir(A.shrug), bow: -3, eye: "uneven", mouth: "wry", brow: "oneUp",
    prop: "question", handL: "fist", handR: "palm" },
  { key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "Clear win pose with a bright check stamped beside him.",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin", prop: "success",
    handL: "fist", handR: "fist" },
  { key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert — concerned, not scary.",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "error",
    handL: "palm", handR: "palm" },
  { key: "empty", label: "Empty", cat: "Feedback", use: "Empty state",
    tip: "Gentle “nothing here yet” — ready when you are.",
    armL: A.droop, armR: mir(A.droop), eye: "open", mouth: "tiny", brow: "sad", prop: "empty" },
  { key: "loading", label: "Loading", cat: "Feedback", use: "In progress",
    tip: "Soft wait with a spinner turning beside the head.",
    armL: A.rest, armR: mir(A.rest), eye: "open", mouth: "flat", prop: "loading" },
  { key: "waiting", label: "Waiting", cat: "Feedback", use: "Queued · hold on",
    tip: "Patient pause, eyes soft, three dots breathing.",
    armL: A.rest, armR: mir(A.rest), eye: "half", mouth: "tiny", prop: "waiting" },
];

const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Moods", "Action", "Feedback"];
/** Studio-only element toggles. Every part can be removed or added back. */
const ELEMENTS = [
  { key: "hang", label: "Hanger", category: "Body" },
  { key: "bands", label: "Bands", category: "Body" },
  { key: "arms", label: "Arms", category: "Body" },
  { key: "glass", label: "Glass", category: "Body" },
  { key: "base", label: "Base", category: "Body" },
  { key: "flame", label: "Inner light", category: "Face" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "eyes", label: "Eyes", category: "Face" },
  { key: "halo", label: "Halo glow", category: "Stage" },
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "props", label: "Pose props", category: "Stage" },
  { key: "accessory", label: "Accessory", category: "Stage" },
  { key: "thrusters", label: "Lift glow", category: "Stage" },
];
const ELEMENT_CATEGORIES = ["Body", "Face", "Stage"];
const ALL_PARTS = Object.fromEntries(ELEMENTS.map((e) => [e.key, true]));
const allParts = (on) => Object.fromEntries(ELEMENTS.map((e) => [e.key, on]));
const elementsFor = (cfg) =>
  ELEMENTS.filter((el) => !(cfg.omitElements || []).includes(el.key)).map((el) => ({
    ...el,
    label: cfg.elementLabels?.[el.key] || el.label,
  }));

const EYE_L_X = 180, EYE_R_X = 240, EYE_Y = 228;
const HEART_D = "M0,8 C-10,0 -11,-7 -4.5,-9 C-1.5,-10 0,-6.5 0,-4.5 C0,-6.5 1.5,-10 4.5,-9 C11,-7 10,0 0,8 Z";

/* ---------- face ---------- */
/* eyeStyle: oval (mushroom) · round (bulb) · hud (desk)
   gazeY: negative shifts pupils up (flight / skyward look). */
function Eye({ kind, x, p, track, eyeRef, style = "round", gazeY = 0, hitId = "ln-hit" }) {
  // lantern aliases: oval→soft rounds, round→bean ovals; hud stays native
  const styleMap = { oval: "soft", round: "bean", soft: "soft", visor: "visor", bean: "bean", hud: "hud" };
  style = styleMap[style] || style;
  const at = `translate(${x},${EYE_Y})`;
  const pupilAt = gazeY ? `translate(0,${gazeY})` : undefined;
  const line = { fill: "none", stroke: p.features, strokeWidth: 7.5, strokeLinecap: "round" };
  if (kind === "arch") return <path d="M-14,4 Q0,-11 14,4" transform={at} {...line} />;
  if (kind === "flat") return <path d="M-14,0 L14,0" transform={at} {...line} />;
  if (kind === "heart") return <path transform={`${at} scale(0.95)`} fill={p.features} d={HEART_D} />;
  if (kind === "half") {
    if (style === "hud") {
      return (
        <g transform={at}>
          <rect x="-11" y="-2" width="22" height="12" rx="2" fill={p.led} />
          <path d="M-12,-4 L12,-4" stroke={p.dim} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    }
    if (style === "bean") {
      return (
        <g transform={at}>
          <ellipse cx="0" cy="4" rx="14" ry="6" fill={p.led} />
          <path d="M-14,-1 L14,-1" stroke={p.dim} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );
    }
    return (
      <g transform={at}>
        <ellipse cx="0" cy="3" rx="11" ry="7" fill={p.led} />
        <path d="M-12,-2 L12,-2" stroke={p.dim} strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "cry") {
    if (style === "hud") {
      return (
        <g transform={at}>
          <rect x="-10" y="-14" width="20" height="26" rx="3" fill={p.led} />
          <rect x="-4" y="-8" width="6" height="6" rx="1" fill={p.screen} opacity=".55" />
          <path d="M-12,6 Q0,14 12,6" fill="none" stroke={p.accent} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    if (style === "visor") {
      return (
        <g transform={at}>
          <circle cx="0" cy="0" r="14" fill={p.led} />
          <circle cx="0" cy="0" r="7" fill={p.screen} opacity=".55" />
          <path d="M-13,6 Q0,14 13,6" fill="none" stroke={p.accent} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    if (style === "bean") {
      return (
        <g transform={at}>
          <ellipse cx="0" cy="0" rx="15" ry="10" fill={p.led} />
          <ellipse cx="-3" cy="-2" rx="4" ry="3" fill={p.screen} opacity=".5" />
          <path d="M-14,5 Q0,13 14,5" fill="none" stroke={p.accent} strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="11" ry="14" fill={p.led} />
        <circle cx="-3" cy="-4" r="3" fill={p.screen} opacity=".5" />
        <path d="M-13,4 Q0,12 13,4" fill="none" stroke={p.accent} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }

  const uneven = kind === "uneven";
  const wide = kind === "wide";
  const blink = kind === "open";

  return (
    <g transform={at}>
      {blink && (
        <>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.9;0.925;0.95;1"
            dur="5.4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin={`${hitId}.click`} dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      {style === "hud" && (() => {
        /* Soft rounded HUD tiles — still rectangular, never sharp cubes */
        const w = uneven ? (x < 210 ? 16 : 22) : wide ? 24 : 20;
        const h = uneven ? (x < 210 ? 20 : 28) : wide ? 28 : 24;
        return (
          <>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="8" fill={p.led} />
            <g ref={track ? eyeRef : undefined} className="ln-pupils" transform={pupilAt}>
              <rect x="-4" y="-5" width="7" height="7" rx="3" fill={p.screen} opacity=".75" />
              <circle cx="3" cy="3" r="1.6" fill="#ffffff" opacity=".85" />
            </g>
          </>
        );
      })()}
      {style === "soft" && (() => {
        /* Shade — soft round Fanous eyes */
        const r = uneven ? (x < 210 ? 12 : 16) : wide ? 17 : 15.5;
        return (
          <>
            <circle cx="0" cy="0" r={r} fill={p.led} />
            <g ref={track ? eyeRef : undefined} className="ln-pupils" transform={pupilAt}>
              <circle cx="-4" cy="-5" r={wide ? 4.6 : 3.9} fill="#ffffff" opacity=".9" />
              <circle cx="3.5" cy="3.5" r="1.8" fill={p.screen} opacity=".45" />
            </g>
          </>
        );
      })()}
      {style === "visor" && (() => {
        const r = uneven ? (x < 210 ? 11 : 15) : wide ? 16 : 13.5;
        return (
          <>
            <circle cx="0" cy="0" r={r} fill={p.led} opacity=".95" />
            <circle cx="0" cy="0" r={r * 0.62} fill={p.screen} opacity=".55" />
            <circle cx="0" cy="0" r={r * 0.95} fill="none" stroke={p.accent} strokeWidth="1.8" opacity=".45" />
            <g ref={track ? eyeRef : undefined} className="ln-pupils" transform={pupilAt}>
              <circle cx="0" cy="0" r={wide ? 4.2 : 3.4} fill={p.led} />
              <circle cx="2.5" cy="-2.5" r="1.4" fill="#ffffff" opacity=".8" />
            </g>
          </>
        );
      })()}
      {style === "bean" && (() => {
        /* Watt — Fanous tall ovals in dark feature ink (cream glass needs contrast) */
        const rx = uneven ? (x < 210 ? 10 : 13) : wide ? 14 : 12;
        const ry = uneven ? (x < 210 ? 15 : 20) : wide ? 21 : 18;
        return (
          <>
            <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={p.features} />
            <g ref={track ? eyeRef : undefined} className="ln-pupils" transform={pupilAt}>
              <circle cx="-3.5" cy="-6" r={wide ? 3.8 : 3.2} fill="#ffffff" opacity=".9" />
            </g>
          </>
        );
      })()}
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return <g data-ms-part="brows" />;
  const d = {
    up: ["M160,196 Q178,186 196,194", "M224,194 Q244,186 260,196"],
    sad: ["M161,204 Q172,194 196,192", "M224,192 Q248,194 259,204"],
    angry: ["M161,190 Q178,196 197,206", "M223,206 Q242,196 259,190"],
    oneUp: ["M162,202 Q178,198 196,202", "M224,196 Q242,184 258,192"],
  }[kind];
  return (
    <g data-ms-part="brows" fill="none" stroke={p.features} strokeWidth="7" strokeLinecap="round" opacity=".9">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p }) {
  const line = { fill: "none", stroke: p.features, strokeWidth: 8, strokeLinecap: "round" };
  if (kind === "grin")
    return <path className="ln-pop" d="M183,248 Q210,278 237,248 Q210,258 183,248 Z" fill={p.features} />;
  if (kind === "frown") return <path className="ln-pop" d="M187,262 Q210,240 233,262" {...line} />;
  if (kind === "o") return <ellipse className="ln-pop" cx="210" cy="254" rx="11" ry="14" fill={p.features} />;
  if (kind === "talk")
    return (
      <ellipse className="ln-pop" cx="210" cy="254" rx="11" ry="14" fill={p.features}>
        <animate attributeName="ry" values="14;7;14;9;14" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
    );
  if (kind === "tiny") return <path className="ln-pop" d="M198,254 Q210,260 222,254" {...line} strokeWidth="6" />;
  if (kind === "flat") return <path className="ln-pop" d="M192,254 Q210,258 228,254" {...line} strokeWidth="7" />;
  if (kind === "wry") return <path className="ln-pop" d="M188,252 Q206,268 234,246" {...line} />;
  if (kind === "kiss")
    return (
      <g className="ln-pop" fill={p.features}>
        <path d="M200,250 Q210,242 220,250 Q210,262 200,250 Z" />
      </g>
    );
  /* smile — Fanous-weight soft curve */
  return <path className="ln-pop" d="M186,250 Q210,274 234,250" {...line} />;
}

/* ---------- limbs ---------- */
/*
  Fanous rule: the mitt IS the arm tip (fat round-capped stroke).
  Special digits (thumb) are a separate fist+digit overlay — never a pad,
  never a brass cuff disc, never a HUD rectangle.
*/
function ThumbHand({ p, down = false }) {
  const fill = p.body;
  return (
    <g transform={`rotate(${down ? 168 : -12}) scale(1.15)`}>
      <rect x="-20" y="-13" width="41" height="28" rx="13" fill={fill} />
      <path d="M13,-8 Q21,-23 15,-34" fill="none" stroke={fill}
        strokeWidth="14.5" strokeLinecap="round" />
    </g>
  );
}

function HandShape({ chassis, p, kind = "mitt", side = "L" }) {
  const flip = side === "R" && kind !== "thumb" && kind !== "thumbDown"
    ? "scale(-1,1)"
    : undefined;
  /* Same body paint as Fanous mittens — silhouette carries the read */
  const fill = p.body;

  let shape;
  if (kind === "thumb") {
    shape = <ThumbHand p={p} />;
  } else if (kind === "thumbDown") {
    shape = <ThumbHand p={p} down />;
  } else if (kind === "fist") {
    shape = (
      <g>
        <ellipse cx="0" cy="2" rx="19" ry="18" fill={fill} />
        <path d="M-11,-2 H11 M-11,5 H11 M-9,11 H9" stroke={p.bodyDark}
          strokeWidth="2.4" strokeLinecap="round" opacity=".32" />
      </g>
    );
  } else if (kind === "palm") {
    /* Open waving mitt — fingers always read upward in screen space */
    shape = (
      <g>
        <ellipse cx="0" cy="8" rx="18" ry="16" fill={fill} />
        <ellipse cx="-12" cy="-10" rx="8" ry="14" fill={fill} />
        <ellipse cx="0" cy="-14" rx="8.5" ry="16" fill={fill} />
        <ellipse cx="12" cy="-10" rx="8" ry="14" fill={fill} />
        {chassis === "desk" && (
          <path d="M-12,-6 V8 M0,-10 V10 M12,-6 V8" stroke={p.accent}
            strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
        )}
      </g>
    );
  } else {
    /* Resting mitt — three soft lobes that always peek past the arm tip */
    shape = (
      <g>
        <ellipse cx="0" cy="6" rx="18" ry="15" fill={fill} />
        <ellipse cx="-11" cy="-6" rx="8" ry="11" fill={fill} />
        <ellipse cx="0" cy="-8" rx="8.5" ry="12" fill={fill} />
        <ellipse cx="11" cy="-6" rx="8" ry="11" fill={fill} />
        {chassis === "bulb" && (
          <ellipse cx="-2" cy="4" rx="6" ry="4.5" fill={p.accent} opacity=".3" />
        )}
        {chassis === "desk" && (
          <path d="M-8,0 H8 M-8,6 H8" stroke={p.accent}
            strokeWidth="2" strokeLinecap="round" opacity=".45" />
        )}
      </g>
    );
  }

  return <g transform={flip}>{shape}</g>;
}

/** Push the mitt a few px past the stroke tip so fingers aren't swallowed. */
function tipBeyond(d, pad = 8) {
  const [ex, ey] = endOf(d);
  const len = Math.hypot(ex, ey) || 1;
  return [ex + (ex / len) * pad, ey + (ey / len) * pad];
}

function Arm({
  d, shoulder, p, anim, animKey, morph, chassis = "mushroom",
  hand = "mitt", side = "L", fingerAt = null,
}) {
  const isThumb = hand === "thumb" || hand === "thumbDown";
  const [, tipY] = endOf(d);
  const [handX, handY] = isThumb && fingerAt ? fingerAt : tipBeyond(d, hand === "palm" ? 10 : 8);
  /* Average morph tip Y so clap open/shut doesn't freeze the wrong finger direction. */
  const tipSamples = morph
    ? morph.values.split(";").map((frame) => endOf(frame.trim())[1])
    : [tipY];
  const tipYForFlip = tipSamples.reduce((a, b) => a + b, 0) / tipSamples.length;
  const hangFlip = !isThumb && tipYForFlip > 12 ? "rotate(180)" : undefined;
  const morphEnds = morph
    ? morph.values.split(";").map((frame) => tipBeyond(frame.trim(), 8))
    : null;
  const handTx = !isThumb && morphEnds
    ? morphEnds.map((pt) => `${pt[0]} ${pt[1]}`).join(";")
    : null;
  return (
    <g transform={`translate(${shoulder.join(",")})`}>
      {anim && (
        <animateTransform key={animKey} attributeName="transform" type="rotate" additive="sum"
          values={anim.values} dur={anim.dur} repeatCount="indefinite" />
      )}
      {/* Fanous mitten arms — same body paint, ~39-wide round caps */}
      <path d={d} fill="none" stroke={p.body} strokeWidth="38" strokeLinecap="round">
        {morph && (
          <animate key={`${animKey}-d`} attributeName="d" values={morph.values}
            dur={morph.dur} repeatCount="indefinite" />
        )}
      </path>
      <path d={d} fill="none" stroke={p.bodyLight} strokeWidth="12" strokeLinecap="round" opacity=".28">
        {morph && (
          <animate key={`${animKey}-hi`} attributeName="d" values={morph.values}
            dur={morph.dur} repeatCount="indefinite" />
        )}
      </path>
      <g transform={`translate(${handX},${handY})`}>
        {handTx && (
          <animateTransform attributeName="transform" type="translate"
            values={handTx} dur={morph.dur} repeatCount="indefinite" />
        )}
        <g transform={hangFlip}>
          <HandShape chassis={chassis} p={p} kind={hand} side={side} />
        </g>
      </g>
    </g>
  );
}

/** Warm lift glow under the base for flying. Soft=moonlight puffs (Shade); else light updraft. */
function Thrusters({ p, uid = "ln", soft = false }) {
  const bloomId = `${uid}-lift-bloom`;
  const puffId = `${uid}-lift-puff`;
  return (
    <g>
      <defs>
        <radialGradient id={bloomId} cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor={p.led} stopOpacity={soft ? ".55" : ".7"} />
          <stop offset=".45" stopColor={p.accent} stopOpacity={soft ? ".32" : ".45"} />
          <stop offset="1" stopColor={soft ? p.led : FLAME.outer} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={puffId} cx="50%" cy="30%" r="70%">
          <stop offset="0" stopColor={p.led} stopOpacity=".55" />
          <stop offset="1" stopColor={p.led} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="468" rx="128" ry="68" fill={`url(#${bloomId})`} opacity=".9" />
      <ellipse cx="210" cy="500" rx="110" ry="24" fill={`url(#${puffId})`} />
      {[[150, 448, 26, "0s"], [270, 452, 28, "0.16s"], [210, 470, 30, "0.32s"],
        [168, 488, 20, "0.5s"], [252, 490, 22, "0.68s"], [210, 504, 18, "0.86s"]].map(([x, y, r, delay], i) => (
        <circle key={i} className="ln-smoke" cx={x} cy={y} r={r} fill={`url(#${puffId})`}
          style={{ animationDelay: delay }} />
      ))}
      {/* Sleep lamp: soft moon-puffs only — no rocket cones */}
      {!soft && [[172, 430, "0s"], [248, 430, "0.1s"]].map(([x, y, begin], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1.2 1.65;0.9 1.1;1 1" dur="0.22s" begin={begin}
            repeatCount="indefinite" />
          <ellipse cx="0" cy="36" rx="36" ry="48" fill={p.accent} opacity=".28" />
          <path d="M-22,0 Q-14,40 0,86 Q14,40 22,0 Q0,22 -22,0 Z" fill={p.accent} opacity=".85" />
          <path d="M-12,0 Q-7,30 0,62 Q7,30 12,0 Q0,16 -12,0 Z" fill={p.led} opacity=".95" />
          <path d="M-5,0 Q-3,18 0,38 Q3,18 5,0 Z" fill={FLAME.core} opacity=".9" />
        </g>
      ))}
      {soft && [[180, 452, 22, "0s"], [240, 456, 20, "0.35s"], [210, 470, 26, "0.7s"]].map(
        ([x, y, r, delay], i) => (
          <circle key={`m${i}`} className="ln-smoke" cx={x} cy={y} r={r}
            fill={p.accent} opacity=".35" style={{ animationDelay: delay }} />
        )
      )}
    </g>
  );
}

const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path className={cls} fill={fill}
      style={delay ? { animationDelay: delay } : undefined}
      d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" />
  </g>
);

function Props({ g, p, soft = false }) {
  const accent = p.accent;
  switch (g.prop) {
    case "think":
      return (
        <g>
          <circle cx="292" cy="176" r="4.5" fill={p.led} opacity=".85" />
          <circle cx="310" cy="154" r="6.5" fill={accent} opacity=".85" />
          <Star4 x={334} y={122} s={1.4} fill={p.led} cls="ln-twinkle" />
          <Star4 x={304} y={108} s={0.85} fill={accent} cls="ln-twinkle" delay=".35s" />
        </g>
      );
    case "eq":
      return (
        <g fill={accent}>
          {[[56, 18], [72, 32], [88, 12], [324, 12], [340, 32], [356, 18]].map(([x, h], i) => (
            <rect key={i} className="ln-eq" x={x} y={230 - h} width="8" height={h * 2} rx="4"
              style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
          ))}
        </g>
      );
    case "speech":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round">
          <path className="ln-ring" d="M294,238 Q304,252 294,266" strokeWidth="4.5" />
          <path className="ln-ring" d="M312,228 Q328,252 312,276" strokeWidth="4.5"
            style={{ animationDelay: ".2s" }} />
          <text x="338" y="258" fill={p.led} fontSize="14" fontFamily="monospace"
            className="ln-twinkle">;</text>
        </g>
      );
    case "point":
      return (
        <g fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round">
          <path className="ln-ring" d="M358,312 L390,312" />
          <path d="M380,302 L390,312 L380,322" />
        </g>
      );
    case "keyboard":
      return (
        <g transform="translate(156,388)">
          <rect x="0" y="0" width="108" height="34" rx="8" fill={p.screen} stroke={accent} strokeWidth="2.5" />
          {[[10, 7], [26, 7], [42, 7], [58, 7], [74, 7], [90, 7],
            [18, 20], [34, 20], [50, 20], [66, 20], [82, 20]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="12" height="8" rx="2" fill={p.led}
              opacity={i === 5 ? 1 : 0.5} className={i === 5 ? "ln-type" : undefined} />
          ))}
        </g>
      );
    case "confetti":
      return (
        <g fontFamily="monospace" fontSize="17" fontWeight="700">
          {[[112, 82, 0, "<"], [250, 68, 0.4, ">"], [184, 54, 0.8, "{"],
            [316, 106, 1.2, "}"], [86, 126, 1.6, "/"], [342, 150, 2, ";"]].map(
            ([x, y, delay, glyph], i) => (
              <text key={i} className="ln-fall" x={x} y={y}
                fill={[p.led, accent, p.bodyLight][i % 3]}
                style={{ animationDelay: `${delay}s` }}>
                {glyph}
              </text>
            )
          )}
        </g>
      );
    case "hearts":
      return (
        <g>
          <g transform="translate(304,168) scale(1.5)">
            <path className="ln-rise" d={HEART_D} fill={p.blush} />
          </g>
          <g transform="translate(112,150) scale(1.1)">
            <path className="ln-rise" d={HEART_D} fill={p.led} opacity=".85"
              style={{ animationDelay: ".9s" }} />
          </g>
        </g>
      );
    case "tears":
      return (
        <g>
          <g transform="translate(166,246)">
            <path className="ln-tear" fill={p.accent} opacity=".9"
              d="M0,-11 Q7,-2 7,3 A7,7 0 1,1 -7,3 Q-7,-2 0,-11 Z" />
          </g>
          <g transform="translate(254,246)">
            <path className="ln-tear" fill={p.accent} opacity=".9"
              d="M0,-11 Q7,-2 7,3 A7,7 0 1,1 -7,3 Q-7,-2 0,-11 Z" style={{ animationDelay: ".4s" }} />
          </g>
        </g>
      );
    case "steam":
      return (
        <g fill={p.bodyLight} opacity=".5">
          <g transform="translate(308,176)">
            <circle className="ln-rise" r="9" />
          </g>
          <g transform="translate(322,162)">
            <circle className="ln-rise" r="6.5" style={{ animationDelay: ".5s" }} />
          </g>
        </g>
      );
    case "zzz":
      return (
        <g transform="translate(301,129)">
          <path className="ln-zzz" d="M-9,-9 L9,-9 L-9,9 L9,9" fill="none"
            stroke={p.led} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "badge":
      return (
        <g transform="translate(322,146)">
          <circle r="21" fill={accent} />
          <path d="M-8,1 L-2,8 L10,-7" fill="none" stroke={p.screen} strokeWidth="4.5"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "oops":
      return (
        <g>
          <text x="316" y="150" fontSize="28" fill={accent} fontWeight="700" fontFamily="monospace">!</text>
          <g transform="translate(158,196)">
            <ellipse className="ln-tear" cx="0" cy="0" rx="5" ry="8" fill={accent} opacity=".8" />
          </g>
        </g>
      );
    case "spark":
      return (
        <g stroke={p.led} strokeLinecap="round" strokeWidth="5">
          <path d="M126,124 L108,100" />
          <path d="M294,124 L312,100" />
          <path d="M210,110 L210,84" />
        </g>
      );
    case "kissHeart":
      return (
        <g>
          {/* Soft breath lines leave the mouth first */}
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".85">
            <path className="ln-ring" d="M226,252 Q248,244 268,248" strokeWidth="3.5" />
            <path className="ln-ring" d="M228,260 Q252,256 274,258" strokeWidth="2.5"
              style={{ animationDelay: ".18s" }} />
          </g>
          {/* Hearts float clear of the face — parent g keeps position under ln-rise */}
          <g transform="translate(272,248) scale(1.65)">
            <path className="ln-rise" d={HEART_D} fill="#FF6B8A" />
          </g>
          <g transform="translate(312,212) scale(1.2)">
            <path className="ln-rise" d={HEART_D} fill="#FF8AA8" opacity=".95"
              style={{ animationDelay: ".4s" }} />
          </g>
          <g transform="translate(348,178) scale(0.85)">
            <path className="ln-rise" d={HEART_D} fill={p.led}
              style={{ animationDelay: ".8s" }} />
          </g>
        </g>
      );
    case "notes":
      return (
        <g fill={accent}>
          <g transform="translate(320,150)">
            <g className="ln-rise">
              <ellipse cx="0" cy="0" rx="5.5" ry="4.2" transform="rotate(-18)" />
              <path d="M4,-1 L4,-19 Q11,-17 13,-11" fill="none" stroke={accent} strokeWidth="3"
                strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(96,138)">
            <g className="ln-rise" style={{ animationDelay: ".7s" }}>
              <ellipse cx="0" cy="0" rx="4.5" ry="3.4" transform="rotate(-18)" />
              <path d="M3.5,-1 L3.5,-15" fill="none" stroke={p.led} strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </g>
        </g>
      );
    case "alarm":
      return (
        <g fill="none" stroke={p.led} strokeLinecap="round">
          <path className="ln-ring" d="M112,204 Q92,232 112,260" strokeWidth="5" />
          <path className="ln-ring" d="M308,204 Q328,232 308,260" strokeWidth="5"
            style={{ animationDelay: ".16s" }} />
          <path d="M150,116 L136,94" strokeWidth="5" />
          <path d="M270,116 L284,94" strokeWidth="5" />
          <path d="M210,102 L210,78" strokeWidth="5" />
        </g>
      );
    case "encourage":
      return (
        <g>
          <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="4.5">
            <path className="ln-ring" d="M76,300 Q56,282 76,264" />
            <path className="ln-ring" d="M344,300 Q364,282 344,264" style={{ animationDelay: ".2s" }} />
          </g>
          <Star4 x={116} y={146} fill={p.led} cls="ln-twinkle" s={1.1} />
          <Star4 x={306} y={136} fill={accent} cls="ln-twinkle" delay=".4s" />
        </g>
      );
    case "search":
      return (
        <g transform="translate(342,300) rotate(-8)">
          <circle cx="0" cy="0" r="21" fill={rgba("#FFFFFF", 0.14)} stroke={accent} strokeWidth="5" />
          <path d="M-16,16 L-32,34" stroke={p.bodyDark} strokeWidth="7" strokeLinecap="round" />
        </g>
      );
    case "thumbsUp":
    case "thumbsDown":
      /* Digits live on the arm HandShape now — no floating orphan thumb props. */
      return null;
    case "question":
      return (
        <text x="308" y="150" fontSize="38" fill={p.led} fontWeight="700" fontFamily="monospace">?</text>
      );
    case "gears":
      return (
        <g>
          <g transform="translate(320,150)">
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="0;360" dur="2.4s" repeatCount="indefinite" />
            <circle r="14" fill="none" stroke={accent} strokeWidth="5" strokeDasharray="7 5" />
          </g>
          <g transform="translate(352,182)">
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="360;0" dur="1.8s" repeatCount="indefinite" />
            <circle r="9" fill="none" stroke={p.led} strokeWidth="4" strokeDasharray="4 4" />
          </g>
        </g>
      );
    case "speed":
      return (
        <g>
          {/* whoosh lines trailing behind the sprint */}
          <g fill="none" stroke={accent} strokeLinecap="round" opacity=".8">
            <path className="ln-whoosh" d="M78,250 L28,250" strokeWidth="5" />
            <path className="ln-whoosh" d="M74,286 L20,286" strokeWidth="6"
              style={{ animationDelay: ".07s", animationDuration: ".32s" }} />
            <path className="ln-whoosh" d="M80,322 L34,322" strokeWidth="4.5"
              style={{ animationDelay: ".13s", animationDuration: ".26s" }} />
            <path className="ln-whoosh" d="M70,358 L30,358" strokeWidth="3.5"
              style={{ animationDelay: ".19s", animationDuration: ".3s" }} />
          </g>
          {/* dust kicked up from the lamp base */}
          {[[158, 448], [192, 454], [242, 450], [278, 456]].map(([x, y], i) => (
            <ellipse key={i} className="ln-dust" cx={x} cy={y} rx="12" ry="4"
              fill={p.bodyLight} opacity=".5"
              style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </g>
      );
    case "rocket":
      return (
        <g>
          {/* Sleep lamp: stars only — no harsh speed streaks */}
          {!soft && (
            <g fill="none" stroke={accent} strokeLinecap="round">
              <path className="ln-streak" d="M118,300 L118,360" strokeWidth="5" opacity=".75" />
              <path className="ln-streak" d="M156,310 L156,372" strokeWidth="4" opacity=".6"
                style={{ animationDelay: ".16s" }} />
              <path className="ln-streak" d="M264,310 L264,372" strokeWidth="4" opacity=".6"
                style={{ animationDelay: ".28s" }} />
              <path className="ln-streak" d="M302,300 L302,360" strokeWidth="5" opacity=".75"
                style={{ animationDelay: ".4s" }} />
            </g>
          )}
          <Star4 x={150} y={120} fill={p.led} cls="ln-twinkle" s={1.1} />
          <Star4 x={270} y={110} fill={accent} cls="ln-twinkle" delay=".45s" />
          {soft && <Star4 x={210} y={96} fill={p.led} cls="ln-twinkle" s={0.75} delay=".2s" />}
        </g>
      );
    case "highFive":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="5">
          <path className="ln-ring" d="M300,238 Q320,218 340,238" />
          <path className="ln-ring" d="M306,216 Q326,192 346,216" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "clap":
      return (
        <g>
          {/* Impact burst at the clap point (center chest) */}
          <g transform="translate(210,344)">
            <g fill="none" stroke={accent} strokeLinecap="round">
              <path className="ln-ring" d="M-28,0 Q0,-22 28,0" strokeWidth="4.5" />
              <path className="ln-ring" d="M-36,6 Q0,-30 36,6" strokeWidth="3.5"
                style={{ animationDelay: ".18s" }} />
            </g>
            <Star4 x={0} y={-6} fill={p.led} cls="ln-twinkle" s={1.05} />
            <Star4 x={-22} y={8} fill={accent} cls="ln-twinkle" s={0.7} delay=".25s" />
            <Star4 x={22} y={8} fill={accent} cls="ln-twinkle" s={0.7} delay=".4s" />
          </g>
        </g>
      );
    case "success":
      return (
        <g transform="translate(322,150)">
          <circle r="23" fill={p.led} />
          <path d="M-10,0 L-3,8 L11,-8" fill="none" stroke={p.screen} strokeWidth="5"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "error":
      return (
        <g>
          <g transform="translate(322,150)">
            <circle r="21" fill={p.blush} opacity=".9" />
            <path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke={p.screen} strokeWidth="5" strokeLinecap="round" />
          </g>
          <path className="ln-ring" d="M112,204 Q92,232 112,260" fill="none" stroke={p.blush}
            strokeWidth="4.5" />
        </g>
      );
    case "empty":
      return (
        <g stroke={p.dim} strokeWidth="3" fill="none" opacity=".7">
          <rect x="296" y="140" width="52" height="40" rx="7" strokeDasharray="6 6" />
          <path d="M308,162 L336,162" strokeLinecap="round" opacity=".6" />
        </g>
      );
    case "loading":
      return (
        <g transform="translate(322,152)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="1.1s" repeatCount="indefinite" />
          <circle r="17" fill="none" stroke={p.led} strokeWidth="5" strokeDasharray="28 80"
            strokeLinecap="round" />
        </g>
      );
    case "waiting":
      return (
        <g fill={p.led}>
          {[0, 1, 2].map((i) => (
            <circle key={i} className="ln-dot" cx={302 + i * 16} cy="152" r="5"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/* ---------- lantern body parts ---------- */

/* ---------- distinct chassis pieces ---------- */

/* Fanous gold band — pure stadium with sheen */
function Band({ x, y, w, h, p }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={p.accent} />
      <rect x={x + 8} y={y + 2.5} width={w - 16} height={Math.max(2, h * 0.24)} rx={h * 0.12}
        fill="#ffffff" opacity=".35" />
      <rect x={x + 7} y={y + h - 4.5} width={w - 14} height="3" rx="1.5" fill="#000000" opacity=".16" />
    </g>
  );
}

function Hang({ chassis, p }) {
  if (chassis === "mushroom") {
    return (
      <g data-ms-part="hang">
        <circle cx="210" cy="98" r="12" fill={p.accent} />
        <circle cx="206" cy="94" r="3.2" fill="#ffffff" opacity=".7" />
      </g>
    );
  }
  if (chassis === "bulb") {
    return (
      <g data-ms-part="hang">
        <ellipse cx="210" cy="92" rx="12" ry="10" fill={p.accent} />
        <circle cx="206" cy="88" r="2.8" fill="#ffffff" opacity=".7" />
      </g>
    );
  }
  return (
    <g data-ms-part="hang">
      <ellipse cx="210" cy="118" rx="10" ry="8" fill={p.accent} />
      <circle cx="207" cy="115" r="2.4" fill="#ffffff" opacity=".65" />
    </g>
  );
}

function Bands({ chassis, p }) {
  if (chassis === "mushroom") {
    return (
      <g data-ms-part="bands">
        {/* Narrow stem-mouth trim — center only so it never shears the arm sockets */}
        <path d="M172,264 Q210,278 248,264" fill="none" stroke={p.accent}
          strokeWidth="11" strokeLinecap="round" />
        <path d="M184,263 Q210,272 236,263" fill="none" stroke="#ffffff"
          strokeWidth="2.8" strokeLinecap="round" opacity=".3" />
        {/* Stem collar */}
        <ellipse cx="210" cy="318" rx="26" ry="12" fill={p.accent} />
        <ellipse cx="204" cy="314" rx="9" ry="3.5" fill="#ffffff" opacity=".28" />
      </g>
    );
  }
  if (chassis === "bulb") {
    return (
      <g data-ms-part="bands">
        <ellipse cx="210" cy="384" rx="48" ry="12" fill={p.accent} />
        <path d="M166,374 Q210,362 254,374" fill="none" stroke={p.bodyDark} strokeWidth="4"
          strokeLinecap="round" opacity=".4" />
      </g>
    );
  }
  return (
    <g data-ms-part="bands">
      <circle cx="168" cy="286" r="12" fill={p.accent} />
      <circle cx="248" cy="252" r="12" fill={p.accent} />
      <circle cx="210" cy="360" r="14" fill={p.accent} />
      <circle cx="168" cy="286" r="4.5" fill={p.led} opacity=".55" />
      <circle cx="248" cy="252" r="4.5" fill={p.led} opacity=".55" />
      <circle cx="210" cy="360" r="5" fill={p.led} opacity=".55" />
    </g>
  );
}

function FlameInner({ chassis, p, gid }) {
  if (chassis === "bulb") {
    return (
      <g data-ms-part="flame">
        <path d="M210,298 Q210,318 210,330" stroke={p.accent} strokeWidth="3.5"
          strokeLinecap="round" opacity=".45" />
        <path className="ln-twinkle" d="M176,336 Q210,308 244,336" fill="none"
          stroke={p.accent} strokeWidth="5" strokeLinecap="round" />
        <path d="M186,348 Q210,322 234,348" fill="none" stroke={FLAME.mid} strokeWidth="3.5"
          strokeLinecap="round" opacity=".9" />
        <path d="M196,356 Q210,340 224,356" fill="none" stroke={FLAME.core} strokeWidth="2.8"
          strokeLinecap="round" opacity=".85" />
      </g>
    );
  }
  if (chassis === "desk") {
    return (
      <g data-ms-part="flame">
        <ellipse cx="210" cy="238" rx="44" ry="22" fill={`url(#${gid})`} opacity=".6" />
        <ellipse cx="210" cy="248" rx="56" ry="10" fill={p.accent} opacity=".55" />
      </g>
    );
  }
  if (chassis === "mushroom") {
    return (
      <g data-ms-part="flame">
        {/* Soft night glow behind the face window — no bright coin on the eyes */}
        <ellipse cx="210" cy="222" rx="52" ry="40" fill={`url(#${gid})`} opacity=".45" />
        <ellipse cx="210" cy="230" rx="28" ry="20" fill={p.led} opacity=".22" />
      </g>
    );
  }
  return null;
}

function Base({ chassis, p }) {
  if (chassis === "mushroom") {
    return (
      <g data-ms-part="base">
        <ellipse cx="210" cy="452" rx="82" ry="20" fill={p.bodyDark} />
        <ellipse cx="210" cy="442" rx="66" ry="16" fill={p.body} />
        <ellipse cx="210" cy="434" rx="48" ry="11" fill={p.accent} opacity=".9" />
        <ellipse cx="196" cy="430" rx="16" ry="5" fill="#ffffff" opacity=".28" />
      </g>
    );
  }
  if (chassis === "bulb") {
    return (
      <g data-ms-part="base">
        {/* Soft screw neck — rounded sides, not a hard frustum */}
        <path d="M170,382 C166,390 164,410 168,452 C176,458 244,458 252,452 C256,410 254,390 250,382 Z"
          fill={p.accent} />
        {[398, 412, 426, 440].map((y, i) => (
          <path key={i} d={`M172,${y} Q210,${y - 4} 248,${y}`} fill="none"
            stroke={p.bodyDark} strokeWidth="3.5" strokeLinecap="round" opacity=".55" />
        ))}
        <ellipse cx="210" cy="456" rx="40" ry="11" fill={p.bodyDark} />
        <ellipse cx="196" cy="392" rx="14" ry="5" fill="#ffffff" opacity=".22" />
      </g>
    );
  }
  return (
    <g data-ms-part="base">
      <ellipse cx="210" cy="456" rx="86" ry="18" fill={p.bodyDark} />
      <ellipse cx="210" cy="448" rx="70" ry="14" fill={p.body} />
      <ellipse cx="210" cy="440" rx="46" ry="10" fill={p.accent} opacity=".8" />
      <ellipse cx="196" cy="436" rx="14" ry="4" fill="#ffffff" opacity=".22" />
    </g>
  );
}

function GlassBody({ chassis, p, bodyGrad, glassGrad }) {
  if (chassis === "mushroom") {
    /* Shade — soft mushroom lamp; clear night-window face, no bar across eyes */
    return (
      <g data-ms-part="glass">
        {/* marker: shade-cap */}
        <path d="M90,206 C90,118 148,96 210,94 C272,96 330,118 330,206
          C330,228 286,258 210,266 C134,258 90,228 90,206 Z"
          fill={`url(#${bodyGrad})`} />
        <path d="M118,200 Q210,156 302,200" fill="none" stroke="#ffffff" strokeWidth="12"
          strokeLinecap="round" opacity=".16" />
        <ellipse cx="210" cy="198" rx="86" ry="58" fill={`url(#${glassGrad})`} opacity=".5" />
        {/* Soft night-window — rim stays light so it never reads as a face-cutting bar */}
        <ellipse cx="210" cy="220" rx="70" ry="54" fill={p.face} />
        <ellipse cx="210" cy="220" rx="70" ry="54" fill="none" stroke={p.faceEdge}
          strokeWidth="3.5" opacity=".75" />
        <ellipse cx="178" cy="200" rx="18" ry="12" fill="#ffffff" opacity=".2"
          transform="rotate(-12 178 200)" />
        {/* soft stem */}
        <path d="M188,258 C182,300 186,380 192,428 C198,438 222,438 228,428
          C234,380 238,300 232,258 C222,268 198,268 188,258 Z"
          fill={p.bodyDark} />
        <path d="M196,262 C192,300 196,380 200,422 C206,428 214,428 220,422
          C224,380 228,300 224,262 Z" fill={p.body} />
        <ellipse cx="204" cy="300" rx="6" ry="48" fill="#ffffff" opacity=".12" />
      </g>
    );
  }
  if (chassis === "bulb") {
    /* Watt — soft Edison pear with thick warm rim */
    return (
      <g data-ms-part="glass">
        {/* marker: watt-pear */}
        <path d="M210,96 C284,96 334,164 334,236 C334,304 288,356 258,386
          L162,386 C132,356 86,304 86,236 C86,164 136,96 210,96 Z"
          fill={`url(#${bodyGrad})`} stroke={p.faceEdge} strokeWidth="5.5" />
        <path d="M210,118 C266,118 306,170 306,232 C306,286 270,332 246,358
          L174,358 C150,332 114,286 114,232 C114,170 154,118 210,118 Z"
          fill={p.led} opacity=".2" />
        <path d="M130,178 Q168,128 220,118" fill="none" stroke="#ffffff" strokeWidth="16"
          strokeLinecap="round" opacity=".4" />
        <ellipse cx="158" cy="196" rx="30" ry="44" fill="#ffffff" opacity=".3" />
        <ellipse cx="210" cy="248" rx="72" ry="92" fill={p.led} opacity=".16" />
      </g>
    );
  }
  /* Arc — soft anglepoise shade (no hard trapezoid) */
  return (
    <g data-ms-part="glass">
      {/* marker: arc-shade */}
      <path d="M148,126 C168,112 252,112 272,126 C298,148 312,210 304,246
        C296,262 124,262 116,246 C108,210 122,148 148,126 Z"
        fill={`url(#${bodyGrad})`} stroke={p.bodyDark} strokeWidth="3" />
      <ellipse cx="210" cy="132" rx="58" ry="16" fill={p.bodyDark} opacity=".85" />
      <ellipse cx="210" cy="248" rx="96" ry="18" fill={p.accent} opacity=".88" />
      <ellipse cx="210" cy="242" rx="80" ry="12" fill={p.bodyDark} opacity=".3" />
      {/* soft stadium face */}
      <rect x="158" y="168" width="104" height="72" rx="34"
        fill={p.face} stroke={p.faceEdge} strokeWidth="5" />
      <ellipse cx="178" cy="188" rx="16" ry="10" fill="#ffffff" opacity=".2"
        transform="rotate(-12 178 188)" />
      {/* soft spring arm — thick round sausages */}
      <path d="M210,258 Q160,290 156,318" fill="none" stroke={p.body} strokeWidth="22" strokeLinecap="round" />
      <path d="M156,318 Q210,330 252,322" fill="none" stroke={p.body} strokeWidth="22" strokeLinecap="round" />
      <path d="M252,322 Q230,360 210,404" fill="none" stroke={p.body} strokeWidth="22" strokeLinecap="round" />
      <path d="M210,258 Q160,290 156,318" fill="none" stroke={p.bodyLight} strokeWidth="8"
        strokeLinecap="round" opacity=".3" />
      <path d="M168,278 Q196,262 224,278" fill="none" stroke={p.accent} strokeWidth="3.5"
        strokeLinecap="round" opacity=".7" />
      <path d="M172,304 Q210,288 248,308" fill="none" stroke={p.accent} strokeWidth="3"
        strokeLinecap="round" opacity=".5" />
    </g>
  );
}

function Accessory({ chassis, p }) {
  if (chassis === "mushroom") {
    return (
      <g data-ms-part="accessory" transform="translate(294,168)">
        {/* Moon charm seated on the hood shoulder — clear of the peak knob */}
        <path d="M0,-12 A14 14 0 1 0 0,12 A9 9 0 1 1 0,-12 Z" fill={p.led} stroke={p.accent} strokeWidth="3.2" />
        <circle cx="3.5" cy="-1.5" r="2.2" fill={p.accent} opacity=".55" />
      </g>
    );
  }
  if (chassis === "bulb") {
    return (
      <g data-ms-part="accessory" transform="translate(322,128)">
        <path className="ln-twinkle"
          d="M0,-12 Q3,-3 12,0 Q3,3 0,12 Q-3,3 -12,0 Q-3,-3 0,-12 Z" fill={p.accent} />
        <circle cx="0" cy="0" r="4" fill={p.led} />
      </g>
    );
  }
  return (
    <g data-ms-part="accessory" transform="translate(322,160)">
      <rect x="-16" y="-14" width="32" height="28" rx="10" fill={p.led} stroke={p.accent} strokeWidth="2.5" />
      <path d="M-8,-4 H8 M-8,4 H4" stroke={p.features} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  );
}

function shouldersFor(chassis) {
  /* Fanous tuck: shoulders sit inside the silhouette */
  /* Shade: under the hood flanks — clear of the narrow stem-mouth trim */
  if (chassis === "mushroom") return [[142, 238], [278, 238]];
  if (chassis === "bulb") return [[118, 300], [302, 300]];
  if (chassis === "desk") return [[132, 200], [288, 200]];
  return [[164, 248], [256, 248]];
}


function LanternSVG({ variant, p, glow, paused, waving, gesture, svgRef, eyeRef, parts = ALL_PARTS }) {
  const chassis = variant?.chassis || "mushroom";
  const eyeStyle = variant?.eyeStyle || "round";
  const g = byKey(gesture);
  const isWaving = (waving && !!g.track) || !!g.wave;
  const look = g.look || [0, 0];
  const lift = g.lift || 0;
  const skyward = !!g.skyward;
  const running = g.gait === "run";
  const clapping = !!g.clap;
  const swayAnim = { values: "-12;12;-12", dur: "1.2s" };
  const waveAnim = { values: "6;-30;6", dur: "0.7s" };
  const idleL = { values: "-2;2;-2", dur: "3.5s" };
  const idleR = { values: "2;-2;2", dur: "3.8s" };
  /* Keep fists locked skyward — no idle sway while launching.
     Running: path morph keeps fists on the hips; tiny rotate adds fore/aft.
     Clapping: hands snap together then open — no idle sway. */
  const runPumpL = { values: "8;-8;8", dur: "0.28s" };
  const runPumpR = { values: "-8;8;-8", dur: "0.28s" };
  const armBusy = g.boost || running || clapping;
  const armLAnim = armBusy ? (running ? runPumpL : null) : g.sway ? swayAnim : idleL;
  const armRAnim = armBusy ? (running ? runPumpR : null) : isWaving ? waveAnim : g.sway ? swayAnim : idleR;
  const runMorphL = running
    ? { values: `${A.runBack};${A.runFwd};${A.runBack}`, dur: "0.28s" }
    : null;
  const runMorphR = running
    ? { values: `${mir(A.runFwd)};${mir(A.runBack)};${mir(A.runFwd)}`, dur: "0.28s" }
    : null;
  /* Hold shut a beat so the clap reads, then open — opposite sides mirror. */
  const clapMorphL = clapping
    ? {
        values: `${A.clapOpenL};${A.clapShutL};${A.clapShutL};${A.clapOpenL}`,
        dur: "0.42s",
      }
    : null;
  const clapMorphR = clapping
    ? {
        values: `${A.clapOpenR};${A.clapShutR};${A.clapShutR};${A.clapOpenR}`,
        dur: "0.42s",
      }
    : null;
  const armMorphL = runMorphL || clapMorphL;
  const armMorphR = runMorphR || clapMorphR;

  /* Shade flying: fists go out-and-up so they don't punch through the face window */
  const shadeFlyL = "M0,0 Q-46,-34 -58,-76";
  const armPathL = chassis === "mushroom" && g.boost ? shadeFlyL : g.armL;
  const armPathR = chassis === "mushroom" && g.boost ? mir(shadeFlyL) : g.armR;

  const flying = !!g.boost;
  /* Face features ride high on the panel so he reads as looking up, not at the viewer. */
  /* Seat the face on each chassis' soft glass (Fanous face sits ~y228–294). */
  const faceLift = skyward
    ? -14
    : chassis === "mushroom"
      ? -6 /* seat eyes in the night-window, clear of hood-lip trim */
      : chassis === "desk"
        ? -36
        : 8; /* bulb */
  const mouthY = skyward ? -12 : 0;
  /* Pupils park at the top of each eye when launching skyward. */
  const gazeY = g.gazeY ?? (skyward ? -6 : 0);
  const uid = `${variant?.slug || chassis}-${g.key}`;
  const hitId = `ln-hit-${uid}`;
  /* Local blush Y inside the faceLift group (rides with eyes/mouth). */
  const blushCy = chassis === "mushroom" ? 248
    : chassis === "desk" ? 246
      : 260; /* bulb */

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-labelledby={`ln-title-${uid} ln-description-${uid}`}
      className={`ln-svg ln-g-${gesture} ${isWaving ? "ln-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title id={`ln-title-${uid}`}>{`${variant?.name || "Lantern"} — ${g.label}`}</title>
      <desc id={`ln-description-${uid}`}>{g.tip}</desc>
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id={`ln-glow-${uid}`} cx="50%" cy="46%" r="58%">
          <stop offset="0" stopColor={p.glowC} stopOpacity=".95" />
          <stop offset="1" stopColor={p.glowC} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ln-body-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bodyLight} />
          <stop offset="1" stopColor={p.body} />
        </linearGradient>
        <linearGradient id={`ln-screen-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.screenLight} />
          <stop offset="1" stopColor={p.screen} />
        </linearGradient>
      </defs>

      {parts.shadow && (
        <ellipse data-ms-part="shadow" className="ln-shadowO" cx="210" cy={flying ? 508 : 498}
          rx={flying ? 68 : 88} ry="9" fill="#000" opacity=".2" />
      )}

      <g transform={`translate(0,${lift})`}>
        <g className="ln-float">
        <g transform="translate(210,470)">
          {g.shake && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-2 0;2 0;-2 0" dur="0.11s" repeatCount="indefinite" />
          )}
          {g.sway && (
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="-3;3;-3" dur="1.1s" repeatCount="indefinite" />
          )}
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin={`${hitId}.click`} dur="0.6s" fill="remove"
            values="0 0;0 7;0 -12;0 3;0 0" keyTimes="0;0.24;0.54;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin={`${hitId}.click`} dur="0.6s" fill="remove"
            values="1 1;1.05 .93;.97 1.05;1.02 .98;1 1" keyTimes="0;0.24;0.54;0.8;1" />
          <g transform={`rotate(${g.bow || g.lean || 0})`}>
            <g transform="translate(-210,-470)">
              <g id={hitId}>
                {parts.halo && (
                  <ellipse data-ms-part="halo" className="ln-glow ms-glow-halo" cx="210" cy="280" rx="140" ry="124"
                    fill={`url(#ln-glow-${uid})`} />
                )}

                {/* lift glow sits behind the base while flying */}
                {flying && parts.thrusters && (
                  <g data-ms-part="thrusters">
                    <Thrusters p={p} uid={uid} soft={chassis === "mushroom"} />
                  </g>
                )}

                {parts.base && <Base chassis={chassis} p={p} />}
                {parts.glass && (
                  <GlassBody chassis={chassis} p={p} bodyGrad={`ln-body-${uid}`} glassGrad={`ln-screen-${uid}`} />
                )}
                {parts.flame && <FlameInner chassis={chassis} p={p} gid={`ln-glow-${uid}`} />}
                {parts.bands && <Bands chassis={chassis} p={p} />}
                {parts.hang && <Hang chassis={chassis} p={p} />}
                {parts.accessory && <Accessory chassis={chassis} p={p} />}

                {/* Face stack shares gaze/lift; eyes/brows/mouth/blush toggle independently */}
                <g key={g.key} className="ln-pop"
                  transform={`translate(${look[0]},${look[1] + faceLift})`}>
                  {parts.blush ? (
                    <g data-ms-part="blush" fill={p.blush} opacity=".45">
                      <ellipse cx="156" cy={blushCy} rx="10" ry="7" />
                      <ellipse cx="264" cy={blushCy} rx="10" ry="7" />
                    </g>
                  ) : (
                    <g data-ms-part="blush" />
                  )}
                  {parts.brows ? <Brows kind={g.brow} p={p} /> : <g data-ms-part="brows" />}
                  {parts.eyes ? (
                    <g className="ms-eyes" data-ms-part="eyes"
                      transform={`translate(0,${skyward ? -10 : 0})`}>
                      <Eye kind={g.eye} x={EYE_L_X} p={p} track={g.track} eyeRef={eyeRef?.l}
                        style={eyeStyle} gazeY={gazeY} hitId={hitId} />
                      <Eye kind={g.eye} x={EYE_R_X} p={p} track={g.track} eyeRef={eyeRef?.r}
                        style={eyeStyle} gazeY={gazeY} hitId={hitId} />
                    </g>
                  ) : (
                    <g data-ms-part="eyes" />
                  )}
                  <g transform={`translate(0,${mouthY})`}>
                    <Mouth kind={g.mouth} p={p} />
                  </g>
                </g>

                {parts.props && (
                  <g data-ms-part="props" key={`p-${g.key}`} className="ln-pop">
                    <Props g={g} p={p} soft={chassis === "mushroom"} />
                  </g>
                )}

                {/* Arms on top so raised mitts/thumbs never hide under glass.
                    Desk (Arc) and mushroom (Shade) skip mittens — lamp body is the limb. */}
                {parts.arms && chassis !== "desk" && chassis !== "mushroom" && (
                  <g data-ms-part="arms">
                    <Arm d={armPathL} shoulder={shouldersFor(chassis)[0]} p={p} anim={armLAnim}
                      morph={armMorphL} animKey={`l-${g.key}-${isWaving}`} chassis={chassis}
                      hand={g.handL || "mitt"} side="L"
                      fingerAt={g.handL === "thumb" || g.handL === "thumbDown" ? g.fingerAt : null} />
                    <Arm d={armPathR} shoulder={shouldersFor(chassis)[1]} p={p} anim={armRAnim}
                      morph={armMorphR} animKey={`r-${g.key}-${isWaving}`} chassis={chassis}
                      hand={g.handR || "mitt"} side="R"
                      fingerAt={g.handR === "thumb" || g.handR === "thumbDown" ? g.fingerAt : null} />
                  </g>
                )}
              </g>
            </g>
          </g>
        </g>
        </g>
      </g>
    </svg>
  );
}

const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  chip: "M-5,-5 L5,-5 L5,5 L-5,5 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};


export function createLanternPoseSource(slug) {
  const cfg = LANTERN_VARIANTS[slug];
  if (!cfg) throw new Error(`Unknown lantern mascot: ${slug}`);
  const themeKey = cfg.defaultTheme;
  const theme = cfg.themes[themeKey];
  return {
    slug,
    meta: {
      name: cfg.name,
      tagline: cfg.tagline,
      product: cfg.product,
      accent: cfg.brand,
      stage: theme.stage,
      glowLabel: "Lantern glow",
      themes: Object.fromEntries(
        Object.entries(cfg.themes).map(([key, t]) => [
          key,
          {
            name: t.name,
            top: t.led,
            mid: t.body,
            base: t.panel,
            core: t.accent,
            stage: t.stage,
            features: dark(t.panel, 0.4),
          },
        ])
      ),
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
      <LanternSVG
        variant={cfg}
        p={derive(theme)}
        glow={0.45}
        waving={false}
        gesture={key}
        eyeRef={{}}
      />
    ),
  };
}

export function LanternStudio({ slug }) {
  const cfg = LANTERN_VARIANTS[slug];
  if (!cfg) throw new Error(`Unknown lantern mascot: ${slug}`);
  const brand = cfg.brand;
  const themes = cfg.themes;
  const uiElements = elementsFor(cfg);

  const [themeKey, setThemeKey] = useState(cfg.defaultTheme);
  const [custom, setCustom] = useState({ ...themes[cfg.defaultTheme], name: "Custom" });
  const [glow, setGlow] = useState(0.45);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [waving, setWaving] = useState(false);
  const [gesture, setGesture] = useState("idle");
  const [parts, setParts] = useState(ALL_PARTS);
  const [sparks, setSparks] = useState([]);
  const svgRef = useRef(null);
  const pupilL = useRef(null);
  const pupilR = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const theme = themeKey === "custom" ? custom : themes[themeKey];
  const p = useMemo(() => derive(theme), [theme]);
  const activeG = byKey(gesture);
  const partsOn = uiElements.filter((e) => parts[e.key]).length;

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
    try { paused ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch { /* noop */ }
  }, [paused, gesture]);

  const onTrack = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg || paused || !activeG.track) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 420;
    const sy = ((e.clientY - r.top) / r.height) * 520;
    const dx = sx - 210, dy = sy - EYE_Y;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len / 40, 1) * 4;
    const t = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
    [pupilL, pupilR].forEach((ref) => { if (ref.current) ref.current.style.transform = t; });
  }, [paused, activeG]);

  useEffect(() => {
    [pupilL, pupilR].forEach((ref) => {
      if (ref.current) ref.current.style.transform = "translate(0,0)";
    });
  }, [gesture]);

  const delight = useCallback(() => {
    const burst = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const d = 58 + Math.random() * 68;
      return {
        key: Math.random().toString(36).slice(2),
        kind: i % 3 === 0 ? "star" : i % 3 === 1 ? "chip" : "dot",
        dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20,
        color: [p.led, p.accent, p.bodyLight][i % 3],
        rot: Math.random() * 360,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(() => setSparks((s) => s.filter((k) => !burst.some((b) => b.key === k.key))), 1000);
  }, [p]);

  useEffect(() => {
    if (!["celebrate", "success", "dancing"].includes(gesture) || paused) return;
    delight();
    const iv = setInterval(delight, 1500);
    return () => clearInterval(iv);
  }, [gesture, paused, delight]);

  const swatchBg = (t) =>
    `linear-gradient(135deg, ${t.body} 0 55%, ${t.led} 55% 78%, ${t.accent} 78% 100%)`;
  const stageBg = transparent
    ? undefined
    : `radial-gradient(640px 420px at 50% 118%, ${rgba(theme.body, 0.32)}, transparent 62%), ${theme.stage}`;

  return (
    <div className="lb-root">
      <style>{shellCss(brand)}</style>

      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2 pt-8">
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: rgba(brand, 0.13),
          border: `1px solid ${rgba(brand, 0.4)}`, display: "grid", placeItems: "center",
        }}>
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
            <rect x="8" y="12" width="24" height="20" rx="7" fill={brand} />
            <rect x="12" y="17" width="16" height="10" rx="3" fill={theme.panel} />
            <circle cx="17" cy="22" r="2" fill={theme.led} />
            <circle cx="23" cy="22" r="2" fill={theme.led} />
            <path d="M20,12 L20,6" stroke={brand} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="20" cy="5" r="2.4" fill={theme.led} />
          </svg>
        </div>
        <div>
          <h1 className="lb-display" style={{ fontSize: 24, fontWeight: 640 }}>
            {cfg.name} <span style={{ color: brand }}>·</span> {cfg.product}
          </h1>
          <p style={{ fontSize: 13, color: "#B5AC9A" }}>{cfg.tagline}</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_400px]">
        <section className="lb-card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="lb-eyebrow">Stage</h2>
            <div className="flex gap-2">
              <button type="button" className={`lb-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)} aria-pressed={transparent}>
                Transparent
              </button>
              <button type="button" className={`lb-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)} aria-pressed={!transparent}>
                In-app
              </button>
            </div>
          </div>

          <div
            data-mascot-stage
            className={`relative overflow-hidden rounded-2xl ${transparent ? "lb-checker" : ""}`}
            style={{ background: stageBg, minHeight: 440 }}
            onMouseEnter={() => activeG.track && setWaving(true)}
            onMouseLeave={() => setWaving(false)}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 350, padding: "10px 10px 0" }}>
              <LanternSVG
                variant={cfg}
                p={p} glow={glow} paused={paused} waving={waving}
                gesture={gesture} svgRef={svgRef} parts={parts}
                eyeRef={{ l: pupilL, r: pupilR }}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="lb-spark"
                style={{ left: "50%", top: "52%", "--dx": `${s.dx}px`, "--dy": `${s.dy}px` }}>
                <svg width="15" height="15" viewBox="-8 -8 16 16"
                  style={{ transform: `rotate(${s.rot}deg)` }}>
                  <path d={SPARK_PATHS[s.kind]} fill={s.color} />
                </svg>
              </span>
            ))}
          </div>

          <p style={{ fontSize: 12.5, color: "#B5AC9A", textAlign: "center" }}>
            tap for bounce &amp; sparks &nbsp;·&nbsp;
            {activeG.track ? "eyes follow your cursor" : "this pose locks gaze"}
          </p>

          <div className="mt-2 flex flex-col gap-5 border-t pt-5"
            style={{ borderColor: `${brand}29` }}>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="lb-eyebrow">Elements</h3>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: "#B5AC9A" }}>{partsOn}/{uiElements.length}</span>
                  <button type="button" className="lb-tiny" onClick={() => setParts(allParts(true))}>All</button>
                  <button type="button" className="lb-tiny" onClick={() => setParts(allParts(false))}>None</button>
                  <button type="button" className="lb-tiny" onClick={() => setParts(ALL_PARTS)}>Reset</button>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: "#B5AC9A", lineHeight: 1.5 }}>
                Toggle parts on/off instantly. Hidden parts stay available to add back.
              </p>
            </div>
            <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
              {ELEMENT_CATEGORIES.map((cat) => {
                const list = uiElements.filter((el) => el.category === cat);
                if (!list.length) return null;
                return (
                  <div key={cat}>
                    <div style={{
                      fontSize: 10, letterSpacing: ".16em", color: "#8D8472",
                      textTransform: "uppercase", marginBottom: 6,
                    }}>{cat}</div>
                    <div className="flex flex-wrap gap-2">
                      {list.map((el) => {
                        const on = parts[el.key];
                        return (
                          <button key={el.key} type="button"
                            className={`lb-pill ${on ? "on" : ""}`}
                            aria-pressed={on}
                            onClick={() => setParts((v) => ({ ...v, [el.key]: !v[el.key] }))}
                            style={!on ? { opacity: 0.55, textDecoration: "line-through" } : undefined}
                          >{el.label}</button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lb-card flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="lb-eyebrow">Gesture</span>
              <span style={{ fontSize: 11, color: "#8D8472" }}>{GESTURES.length} poses</span>
            </div>
            <div className="flex flex-col gap-2">
              {CATS.map((cat) => (
                <div key={cat}>
                  <div style={{
                    fontSize: 10, letterSpacing: ".16em", color: "#8D8472",
                    textTransform: "uppercase", margin: "4px 0 6px 2px",
                  }}>{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.filter((gg) => gg.cat === cat).map((gg) => (
                      <button key={gg.key} type="button" title={gg.tip}
                        className={`lb-pill ${gesture === gg.key ? "on" : ""}`}
                        onClick={() => setGesture(gg.key)}
                      >{gg.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12, padding: "11px 13px", borderRadius: 12,
              background: "rgba(255,246,230,.045)", border: `1px solid ${rgba(brand, 0.16)}`,
            }}>
              <div className="lb-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>
                {activeG.tip}
              </p>
            </div>
          </div>

          <div>
            <div className="lb-eyebrow mb-3">Theme</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(themes).map(([k, t]) => (
                <button key={k} type="button" title={t.name}
                  className={`lb-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button type="button" title="Custom"
                className={`lb-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#0A1814", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="mt-3 flex flex-wrap gap-4">
                {[["body", "Body"], ["panel", "Shade"], ["led", "Glass"], ["accent", "Accent"]].map(
                  ([k, label]) => (
                    <label key={k} className="flex items-center gap-2"
                      style={{ fontSize: 12, color: "#C6BCA7" }}>
                      <input type="color" value={custom[k]}
                        onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                        style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer" }} />
                      {label}
                    </label>
                  )
                )}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="lb-eyebrow">Lantern glow</span>
              <span style={{ fontSize: 12, color: "#C6BCA7" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={glow}
              className="lb-range w-full" style={{ background: "#2A3540" }}
              onChange={(e) => setGlow(Number(e.target.value))} />
          </div>

          <div className="flex items-center justify-between">
            <span className="lb-eyebrow">Motion</span>
            <button type="button" className={`lb-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export const LANTERN_SLUGS = Object.keys(LANTERN_VARIANTS);
