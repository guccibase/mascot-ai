"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { BUILD_NUMI } from "./octopus-bodies";

/* ============================================================
   OCTOPUS STUDIO — shared engine for Numi and sibling examples.
   createOctopusStudio(cfg) → { default: Studio, POSE_SOURCE }
   Each character supplies a body build (silhouette ≠ theme).
   ============================================================ */

/* ---------- colour helpers ---------- */
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
const dark = (c, t) => mix(c, "#0B0A16", t);
const light = (c, t) => mix(c, "#FFF7FB", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* Short, stable numbers keep the exported pose pack small and deterministic. */
const n1 = (v) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
};

const derive = (t) => ({
  ...t,
  bodyDark: dark(t.body, 0.26),
  bodyLight: light(t.body, 0.24),
  armDark: dark(t.body, 0.14),
  sucker: mix(t.belly, t.body, 0.22),
  spot: dark(t.body, 0.16),
  eyeWhite: light(t.belly, 0.55),
  pupil: dark(t.slate, 0.24),
  chalk: light(t.belly, 0.7),
  slateEdge: light(t.slate, 0.18),
  blush: mix(t.body, "#FF7E9C", 0.45),
  brass: mix(t.accent, "#FFD27A", 0.5),
  glowC: light(t.accent, 0.18),
});

const shellCss = (BRAND) => `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  .nu-root{min-height:100vh;background:#100E1B;color:#F0EAF8;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px, ${rgba(BRAND, .16)}, transparent 60%),
      radial-gradient(720px 400px at 88% 110%, ${rgba(BRAND, .10)}, transparent 60%);}
  .nu-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
  .nu-card{background:rgba(240,234,248,.045);border:1px solid ${rgba(BRAND, 0.16)};
    border-radius:20px;backdrop-filter:blur(8px)}
  .nu-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${BRAND};font-weight:600}
  .nu-pill{border:1px solid ${rgba(BRAND, 0.28)};border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#F0EAF8;background:transparent;cursor:pointer;
    transition:background .15s,border-color .15s,color .15s;line-height:1}
  .nu-pill:hover{border-color:${rgba(BRAND, 0.55)}}
  .nu-pill.on{background:${BRAND};color:#130F20;border-color:${BRAND}}
  .nu-pill:focus-visible,.nu-swatch:focus-visible{outline:2px solid #EFE2FF;outline-offset:3px}
  .nu-tiny{border:1px solid ${rgba(BRAND, 0.26)};border-radius:999px;padding:5px 10px;
    font-size:11.5px;font-weight:600;color:#B9AECD;background:transparent;cursor:pointer;
    transition:border-color .15s,color .15s}
  .nu-tiny:hover{border-color:${BRAND};color:#F0EAF8}
  .nu-swatch{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .nu-swatch.on{border-color:#fff;box-shadow:0 0 0 2px ${rgba(BRAND, 0.55)}}
  .nu-checker{background-color:#0c1322;background-image:
    linear-gradient(45deg,#152038 25%,transparent 25%),linear-gradient(-45deg,#152038 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#152038 75%),linear-gradient(-45deg,transparent 75%,#152038 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .nu-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#3A3548;outline:none;cursor:pointer}
  .nu-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
    background:${BRAND};cursor:pointer;border:2px solid #130F20}
  .nu-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:${BRAND};cursor:pointer;border:2px solid #130F20}
  .nu-spark{position:absolute;width:15px;height:15px;margin:-7px;pointer-events:none;
    animation:nu-spark .95s ease-out forwards}
  @keyframes nu-spark{0%{opacity:1;transform:translate(0,0) scale(1)}
    100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
`;


/* ---------- mascot CSS (origin-free animations only) ---------- */
const SVG_CSS = `
  .nm-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .nm-g-celebrate{--gf:1.45}
  .nm-g-alarm{--gf:1.7}
  .nm-g-success{--gf:1.35}
  .nm-g-love{--gf:1.25}
  .nm-g-proud{--gf:1.3}
  .nm-g-dancing{--gf:1.35}
  .nm-g-flying{--gf:1.55}
  .nm-g-grumpy{--gf:.65}
  .nm-g-sad{--gf:.55}
  .nm-g-crying{--gf:.5}
  .nm-g-sleepy{--gf:.4}
  .nm-g-error{--gf:.7}
  .nm-g-empty{--gf:.55}
  .nm-float{animation:nm-float 4.2s ease-in-out infinite}
  .nm-g-sleepy .nm-float{animation-duration:6.6s}
  .nm-g-alarm .nm-float{animation:none}
  .nm-g-celebrate .nm-float,.nm-g-dancing .nm-float{animation-duration:1.8s}
  .nm-g-running .nm-float{animation:nm-runBounce .36s ease-in-out infinite}
  .nm-g-swimming .nm-float{animation:nm-swimDrift 2.2s ease-in-out infinite}
  .nm-g-flying .nm-float{animation:nm-rocket 1.35s ease-in-out infinite}
  .nm-shadowO{animation:nm-shadowO 4.2s ease-in-out infinite}
  .nm-g-running .nm-shadowO{animation:nm-runShadow .36s ease-in-out infinite}
  .nm-g-swimming .nm-shadowO{animation:nm-swimShadow 2.2s ease-in-out infinite}
  .nm-g-flying .nm-shadowO{animation:nm-rocketShadow 1.35s ease-in-out infinite}
  .nm-bubble{animation:nm-bubble 2.4s ease-out infinite}
  .nm-dust{animation:nm-dust .55s ease-out infinite}
  .nm-whoosh{animation:nm-whoosh .3s linear infinite}
  .nm-glow{animation:nm-glow 3.2s ease-in-out infinite}
  .nm-g-alarm .nm-glow{animation-duration:.85s}
  .nm-g-flying .nm-glow{animation-duration:1.1s}
  .nm-pop{animation:nm-pop .3s ease-out}
  .nm-pupils{transition:transform .12s ease-out}
  .nm-chip{animation:nm-chip 2.6s ease-in-out infinite}
  .nm-scan{animation:nm-scan 2.2s ease-in-out infinite}
  .nm-ring{animation:nm-ring .9s ease-out infinite}
  .nm-zzz{animation:nm-zzz 3.2s ease-in-out infinite}
  .nm-rise{animation:nm-rise 2.6s ease-out infinite;opacity:.85}
  .nm-fall{animation:nm-fall 2.8s linear infinite}
  .nm-twinkle{animation:nm-twinkle 1.4s ease-in-out infinite}
  .nm-tear{animation:nm-tear 2.8s ease-in infinite}
  .nm-spin{animation:nm-spin 1.2s linear infinite}
  .nm-pulse{animation:nm-pulse 1.4s ease-in-out infinite}
  .nm-eq{animation:nm-eq 1s ease-in-out infinite}
  .nm-type{animation:nm-type .5s steps(2) infinite}
  .nm-flame{animation:nm-flame .28s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 0%}
  .nm-ember{animation:nm-ember 1.1s linear infinite}
  .nm-streak{animation:nm-streak .55s linear infinite}
  .nm-svg[data-paused] *{animation-play-state:paused !important}
  @keyframes nm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes nm-runBounce{0%,100%{transform:translate(6px,-2px)}25%{transform:translate(-2px,-16px)}50%{transform:translate(6px,-4px)}75%{transform:translate(-2px,-18px)}}
  @keyframes nm-swimDrift{0%,100%{transform:translate(-10px,-6px) rotate(-4deg)}50%{transform:translate(12px,-22px) rotate(3deg)}}
  @keyframes nm-rocket{0%,100%{transform:translateY(-22px)}50%{transform:translateY(-48px)}}
  @keyframes nm-shadowO{0%,100%{opacity:.24}50%{opacity:.11}}
  @keyframes nm-runShadow{0%,100%{opacity:.2;transform:translateX(6px) scaleX(.9)}50%{opacity:.1;transform:translateX(-2px) scaleX(.7)}}
  @keyframes nm-swimShadow{0%,100%{opacity:.1;transform:translateX(-8px) scaleX(.55)}50%{opacity:.06;transform:translateX(10px) scaleX(.45)}}
  @keyframes nm-rocketShadow{0%,100%{opacity:.12;transform:scaleX(.62)}50%{opacity:.05;transform:scaleX(.38)}}
  @keyframes nm-bubble{0%{transform:translate(0,10px) scale(.6);opacity:0}18%{opacity:.85}100%{transform:translate(var(--bx,8px),-70px) scale(1.1);opacity:0}}
  @keyframes nm-dust{0%{transform:translate(0,0);opacity:0}20%{opacity:.7}100%{transform:translate(var(--dx,-28px),6px);opacity:0}}
  @keyframes nm-whoosh{0%{transform:translateX(16px);opacity:0}25%{opacity:.9}100%{transform:translateX(-46px);opacity:0}}
  @keyframes nm-glow{0%,100%{opacity:calc(var(--g,.45)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.45)*var(--gf,1))}}
  @keyframes nm-pop{from{opacity:0}to{opacity:1}}
  @keyframes nm-chip{0%,100%{opacity:.62}50%{opacity:1}}
  @keyframes nm-scan{0%,100%{transform:translateY(-9px);opacity:.2}50%{transform:translateY(16px);opacity:.85}}
  @keyframes nm-ring{0%{opacity:0}15%{opacity:1}70%{opacity:0}100%{opacity:0}}
  @keyframes nm-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes nm-rise{0%{transform:translateY(12px);opacity:.55}22%{opacity:1}100%{transform:translateY(-48px);opacity:0}}
  @keyframes nm-fall{0%{transform:translateY(-24px);opacity:0}12%{opacity:1}82%{opacity:.9}100%{transform:translateY(152px);opacity:0}}
  @keyframes nm-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes nm-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes nm-spin{to{transform:rotate(360deg)}}
  @keyframes nm-pulse{0%,100%{opacity:.35;transform:scale(.92)}50%{opacity:1;transform:scale(1.05)}}
  @keyframes nm-eq{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes nm-type{0%,100%{opacity:1}50%{opacity:0}}
  @keyframes nm-flame{0%,100%{transform:scaleY(1) scaleX(1);opacity:.92}50%{transform:scaleY(1.22) scaleX(.86);opacity:1}}
  @keyframes nm-ember{0%{transform:translate(0,0);opacity:0}12%{opacity:.95}100%{transform:translate(var(--ex,6px),78px);opacity:0}}
  @keyframes nm-streak{0%{transform:translateY(-18px);opacity:0}20%{opacity:.85}100%{transform:translateY(70px);opacity:0}}
`;

/* ============================================================
   ARM GEOMETRY

   Eight sockets sit under the mantle rim, four per side. Every
   arm is a single quadratic starting at its socket, authored for
   the LEFT side; the right side is the exact mirror, so pairs
   stay level. Taper and sucker positions are computed from the
   curve, so an arm is never described twice.
   ============================================================ */
const mir = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${n1(-parseFloat(x))},${y}`);

const socketsR = (body) =>
  body.socketsL.map(([x, y]) => [body.midX * 2 - x, y]);

const scaleArmPath = (d, s) => {
  if (!s || s === 1) return d;
  const q = parseQ(d);
  return `M0,0 Q${n1(q.cx * s)},${n1(q.cy * s)} ${n1(q.ex * s)},${n1(q.ey * s)}`;
};

/** Parse "M0,0 Q cx,cy ex,ey" — the only arm path shape we author. */
const parseQ = (d) => {
  const m = d.match(/^M0,0\s*Q\s*(-?[\d.]+),(-?[\d.]+)\s+(-?[\d.]+),(-?[\d.]+)$/);
  if (!m) throw new Error(`Arm path must be a single quadratic from 0,0: ${d}`);
  return {
    cx: parseFloat(m[1]), cy: parseFloat(m[2]),
    ex: parseFloat(m[3]), ey: parseFloat(m[4]),
  };
};

/** Point on the quadratic at t (P0 is always the origin). */
const atQ = ({ cx, cy, ex, ey }, t) => {
  const u = 1 - t, a = 2 * u * t, b = t * t;
  return [a * cx + b * ex, a * cy + b * ey];
};

/** Leading t-fraction of the quadratic, via de Casteljau. */
const splitQ = (q, t) => {
  const [x, y] = atQ(q, t);
  return `M0,0 Q${n1(q.cx * t)},${n1(q.cy * t)} ${n1(x)},${n1(y)}`;
};

/** Endpoint of any M… arm path (quadratic or cubic). */
const tipOf = (d) => {
  const pairs = [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)];
  const last = pairs[pairs.length - 1];
  if (!last) return [0, 0];
  return [parseFloat(last[1]), parseFloat(last[2])];
};

const SUCKER_T = [0.36, 0.52, 0.66, 0.8];
const SUCKER_R = [3.5, 2.9, 2.3, 1.7];

/* Single-arm shapes, used to override one arm of an arrangement. */
const A = {
  up:    "M0,0 Q-54,-32 -60,-94",
  high:  "M0,0 Q-34,-52 -16,-112",
  point: "M0,0 Q-62,-4 -110,-14",
  out:   "M0,0 Q-62,8 -108,20",
  thumb: "M0,0 Q-50,-36 -44,-90",
  down:  "M0,0 Q-36,44 -30,110",
  clap:  "M0,0 Q-44,-16 -22,6",
  hold:  "M0,0 Q-4,34 -6,64",
  /* These reach across the mantle, so their gesture lists them in `front`. */
  chin:  "M0,0 Q4,-34 38,-30",
  face:  "M0,0 Q-6,-46 30,-58",
  peck:  "M0,0 Q-2,-40 26,-48",
};

/* Whole-body arrangements: four left-side paths, outer arm first. */
const ARMS = {
  drift: ["M0,0 Q-54,26 -70,86", "M0,0 Q-44,46 -52,104", "M0,0 Q-20,54 -26,110", "M0,0 Q-4,56 -4,112"],
  curl:  ["M0,0 Q-50,24 -40,78", "M0,0 Q-40,44 -28,96", "M0,0 Q-18,52 -12,102", "M0,0 Q-2,54 4,106"],
  wide:  ["M0,0 Q-66,8 -100,28", "M0,0 Q-58,30 -88,66", "M0,0 Q-30,50 -44,104", "M0,0 Q-6,56 -6,114"],
  droop: ["M0,0 Q-32,38 -34,94", "M0,0 Q-24,50 -24,106", "M0,0 Q-12,54 -12,110", "M0,0 Q-2,56 -2,112"],
  work:  ["M0,0 Q-52,22 -66,74", "M0,0 Q-46,40 -56,92", "M0,0 Q-26,44 -40,86", "M0,0 Q-8,44 -18,84"],
  lift:  ["M0,0 Q-56,-18 -74,-58", "M0,0 Q-50,10 -66,52", "M0,0 Q-22,48 -28,104", "M0,0 Q-4,54 -4,110"],
  swim:  ["M0,0 Q-46,-16 -84,-30", "M0,0 Q-42,14 -80,26", "M0,0 Q-26,40 -60,74", "M0,0 Q-8,50 -26,100"],
  /* Streamed straight down like rocket fins / thrusters. */
  rocket: ["M0,0 Q-34,52 -48,126", "M0,0 Q-24,56 -34,128", "M0,0 Q-12,58 -18,130", "M0,0 Q-2,58 -4,132"],
  /* Planted like legs for the run gait base pose. */
  run:   ["M0,0 Q-28,52 -22,118", "M0,0 Q-22,54 -18,120", "M0,0 Q-14,56 -12,122", "M0,0 Q-4,56 -4,122"],
  cheer: ["M0,0 Q-52,-38 -50,-98", "M0,0 Q-46,-14 -60,-50", "M0,0 Q-24,34 -32,90", "M0,0 Q-4,52 -4,108"],
};

/* Idle undulation, staggered by socket so the eight arms never lock step. */
const SWAY = [
  { values: "-3;4;-3", dur: "3.6s" },
  { values: "3;-4;3", dur: "4.3s" },
  { values: "-2.5;3.5;-2.5", dur: "3.2s" },
  { values: "2;-3;2", dur: "4.8s" },
];

/**
 * Soft undulation of an existing hanging leg. Same path language as idle —
 * scale control/tip on the same side of the body (never absolute nudges that
 * cross x=0 and rewrite an inner arm into a different silhouette).
 */
const swimFramesFromLeg = (legPath) => {
  const q = parseQ(legPath);
  const fmt = (cx, cy, ex, ey) =>
    `M0,0 Q${n1(cx)},${n1(cy)} ${n1(ex)},${n1(ey)}`;
  return [
    fmt(q.cx, q.cy, q.ex, q.ey),
    fmt(q.cx * 1.08, q.cy - 18, q.ex * 1.04, q.ey - 10),
    fmt(q.cx * 0.88, q.cy + 16, q.ex * 0.94, q.ey + 12),
    fmt(q.cx * 1.14, q.cy + 8, q.ex * 1.06, q.ey - 2),
    fmt(q.cx * 0.94, q.cy - 12, q.ex * 0.98, q.ey + 8),
  ];
};

/**
 * Stride cycle from that socket's own planted leg — outer/inner keep their
 * relative flare instead of all eight collapsing onto one shared RUN_CYCLE.
 */
const runFramesFromLeg = (legPath) => {
  const q = parseQ(legPath);
  const fmt = (cx, cy, ex, ey) =>
    `M0,0 Q${n1(cx)},${n1(cy)} ${n1(ex)},${n1(ey)}`;
  return [
    fmt(q.cx * 0.85, q.cy, q.ex * 0.75, q.ey),                 // plant back
    fmt(q.cx * 1.45, q.cy * 0.55, q.ex * 1.85, q.ey * 0.82),   // lift
    fmt(q.cx * 1.75, q.cy * 0.82, q.ex * 2.4, q.ey * 0.92),    // swing forward
    fmt(q.cx * 1.15, q.cy, q.ex * 1.35, q.ey),                 // plant forward
  ];
};

const loopVals = (frames) => [...frames, frames[0]].join(";");
const rotateFrames = (frames, offset) => {
  const n = frames.length;
  const i = ((offset % n) + n) % n;
  return [...frames.slice(i), ...frames.slice(0, i)];
};
const morphTiming = (frames) => {
  const n = frames.length;
  const keyTimes = Array.from({ length: n + 1 }, (_, i) => n1(i / n)).join(";");
  const keySplines = Array.from({ length: n }, () => "0.37 0 0.63 1").join(";");
  return { values: loopVals(frames), keyTimes, keySplines };
};

/* ============================================================
   GESTURE LIBRARY: Core / Moods / Action / Feedback (+ swimming)
   ============================================================ */
const GESTURES = [
  /* ------------- Core ------------- */
  {
    key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Arms drift in the current while the pupils follow your cursor.",
    arms: "drift", eye: "open", mouth: "smile", track: true, solve: 42,
  },
  {
    key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "One outer arm lifted high, flapping a friendly hello.",
    arms: "drift", over: { r0: A.high }, wave: "r0",
    eye: "open", mouth: "grin", brow: "up", solve: 46,
  },
  {
    key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased eyes, a warm grin, and both outer arms raised.",
    arms: "lift", eye: "arch", mouth: "grin", solve: 72,
  },
  {
    key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "One arm curled to the chin while a stray digit ticks overhead.",
    arms: "drift", over: { l1: A.chin }, front: ["l1"],
    eye: "open", mouth: "flat", brow: "oneUp", look: [3, -6], prop: "digits", solve: 34,
  },
  {
    key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with arms drawn close as sound bars breathe beside.",
    arms: "curl", lean: 5, eye: "open", mouth: "tiny", prop: "eq", solve: 30,
  },
  {
    key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with an explaining arm held open.",
    arms: "drift", over: { r0: A.out },
    eye: "open", mouth: "talk", brow: "up", prop: "speech", solve: 52,
  },
  {
    key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "One arm straight out, directing attention to the next step.",
    arms: "drift", over: { r0: A.point },
    eye: "open", mouth: "smile", brow: "up", look: [6, -2], prop: "pointer", solve: 50,
  },
  {
    key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Inner arms working the slate while a chalk mark blinks.",
    arms: "work", over: { l3: A.hold, r3: A.hold },
    eye: "open", mouth: "flat", look: [0, 5], prop: "chalk", solve: 88,
  },

  /* ------------- Moods ------------- */
  {
    key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Wide grin, arms thrown up, operators raining down.",
    arms: "cheer", eye: "arch", mouth: "grin", prop: "confetti", solve: 100,
  },
  {
    key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Soft eyes with hearts drifting off the mantle.",
    arms: "curl", eye: "heart", mouth: "smile", prop: "hearts", solve: 62,
  },
  {
    key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Arms hang low and the eyes go soft — never mean about it.",
    arms: "droop", eye: "open", mouth: "frown", brow: "sad", look: [0, 4], solve: 18,
  },
  {
    key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Real tears and bigger sorrow than sad.",
    arms: "droop", eye: "cry", mouth: "frown", brow: "sad", prop: "tear", solve: 10,
  },
  {
    key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, small pout — the remainder will not divide.",
    arms: "curl", eye: "flat", mouth: "frown", brow: "angry", solve: 22,
  },
  {
    key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a slow Z drifting off the dome.",
    arms: "droop", eye: "half", mouth: "tiny", prop: "zzz", solve: 12,
  },
  {
    key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up with a solved badge held beside the mantle.",
    arms: "lift", eye: "open", mouth: "grin", brow: "up", prop: "badge", solve: 94,
  },
  {
    key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile after a sign slip — soft fail, no shame.",
    arms: "drift", over: { r0: A.up },
    eye: "open", mouth: "wry", brow: "oneUp", look: [-3, 2], prop: "sweat", solve: 28,
  },
  {
    key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Every arm flares wide at an unexpected result.",
    arms: "wide", eye: "wide", mouth: "o", brow: "up", prop: "bang", solve: 68,
  },
  {
    key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "Arm to the mouth, then a heart blown toward the viewer.",
    arms: "curl", over: { r1: A.chin }, front: ["r1"],
    eye: "arch", mouth: "kiss", brow: "up", look: [6, -2], prop: "kiss", solve: 58,
  },
  {
    key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "An arm over the eyes — off by one again.",
    arms: "droop", over: { l1: A.face }, front: ["l1"],
    eye: "flat", mouth: "wry", brow: "sad", solve: 20,
  },
  {
    key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "All eight arms grooving after a clean proof.",
    arms: "cheer", dance: true, eye: "arch", mouth: "grin", prop: "notes", solve: 86,
  },

  /* ------------- Action ------------- */
  {
    key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes and ringing arcs — a deadline just landed.",
    arms: "wide", shake: true,
    eye: "wide", mouth: "o", brow: "up", prop: "alarmFx", solve: 76,
  },
  {
    key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Open arms and a warm face: you have got this one.",
    arms: "lift", eye: "open", mouth: "grin", brow: "up", prop: "cheer", solve: 70,
  },
  {
    key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "Scanning for the missing value with a lens in reach.",
    arms: "drift", over: { l1: A.chin, r0: A.out }, front: ["l1"],
    eye: "open", mouth: "flat", brow: "oneUp", look: [7, -3], prop: "search", solve: 40,
  },
  {
    key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "Clear approval — that answer checks out.",
    arms: "drift", over: { r0: A.thumb },
    eye: "arch", mouth: "grin", prop: "thumbUp", solve: 82,
  },
  {
    key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Clear disapproval — try the other method.",
    arms: "drift", over: { r0: A.down },
    eye: "flat", mouth: "frown", brow: "sad", prop: "thumbDown", solve: 24,
  },
  {
    key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Arms up and unsure which step comes next.",
    arms: "lift", over: { l1: A.up, r1: A.up },
    eye: "open", mouth: "flat", brow: "oneUp", prop: "question", solve: 36,
  },
  {
    key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Eight arms deep in the arithmetic, beads turning.",
    arms: "work", eye: "open", mouth: "flat", look: [0, 3], prop: "gears", solve: 96,
  },
  {
    key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Full scurry — eight arms stride like legs, body bouncing forward.",
    arms: "run", gait: "run", lean: -14,
    eye: "open", mouth: "flat", brow: "up", look: [8, -2], prop: "speed", solve: 64,
  },
  {
    key: "swimming", label: "Swimming", cat: "Action", use: "Explore · free swim",
    tip: "Same arms, living in water — mantle pulses while the legs undulate.",
    arms: "drift", gait: "swim", lean: -4,
    eye: "open", mouth: "smile", look: [4, -3], prop: "bubbles", solve: 58,
  },
  {
    key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Blasting upward like a rocket — thruster arms and roaring flames.",
    arms: "rocket", eye: "wide", mouth: "grin", brow: "up", look: [0, -9],
    prop: "boost", solve: 92,
  },
  {
    key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "One arm up and open for a high five.",
    arms: "drift", over: { r0: A.high },
    eye: "arch", mouth: "grin", prop: "highFive", solve: 80,
  },
  {
    key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Arms meeting mid-clap for a well-solved problem.",
    arms: "cheer", over: { l1: A.clap, r1: A.clap },
    eye: "arch", mouth: "grin", prop: "clapFx", solve: 84,
  },

  /* ------------- Feedback ------------- */
  {
    key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Crooked mouth and a question mark hanging in the water.",
    arms: "drift", over: { l1: A.chin, r1: A.up }, front: ["l1"],
    eye: "uneven", mouth: "wry", brow: "oneUp", prop: "question", solve: 26,
  },
  {
    key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "A clear win with the answer ticked off.",
    arms: "lift", eye: "arch", mouth: "grin", prop: "check", solve: 100,
  },
  {
    key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert — concerned, not scary.",
    arms: "wide", eye: "wide", mouth: "o", brow: "up", prop: "errorFx", solve: 16,
  },
  {
    key: "empty", label: "Empty", cat: "Feedback", use: "Empty state",
    tip: "A gentle nothing-here-yet, slate wiped clean.",
    arms: "droop", eye: "open", mouth: "tiny", brow: "sad", prop: "empty", solve: 6,
  },
  {
    key: "loading", label: "Loading", cat: "Feedback", use: "In progress",
    tip: "A soft wait while the pi ring turns.",
    arms: "curl", eye: "open", mouth: "flat", prop: "spinner", solve: 54,
  },
  {
    key: "waiting", label: "Waiting", cat: "Feedback", use: "Queued · hold on",
    tip: "Patient pause, eyes soft, three dots breathing.",
    arms: "curl", eye: "half", mouth: "tiny", prop: "dots", solve: 32,
  },
];

const CATEGORIES = ["Core", "Moods", "Action", "Feedback"];
const byKey = (key) => GESTURES.find((g) => g.key === key) || GESTURES[0];

/**
 * One arm — same three-stroke taper in every pose (idle, swim, run).
 * Morphing animates each taper layer from the same keyframes so the
 * silhouette language never switches mid-gesture.
 */
function Arm({ d, frames, dur, w, p, sway, suckers }) {
  const morph = frames && frames.length > 1;
  const base = morph ? frames[0] : d;
  const timing = morph ? morphTiming(frames) : null;
  const q = parseQ(base);
  const midTiming = morph
    ? morphTiming(frames.map((f) => splitQ(parseQ(f), 0.74)))
    : null;
  const tipTiming = morph
    ? morphTiming(frames.map((f) => splitQ(parseQ(f), 0.4)))
    : null;

  return (
    <g fill="none" stroke={p.body} strokeLinecap="round">
      {sway && (
        <animateTransform attributeName="transform" type="rotate" additive="sum"
          values={sway.values} dur={sway.dur} repeatCount="indefinite" />
      )}
      <path d={base} stroke={p.armDark} strokeWidth={n1(w * 0.4)}>
        {timing && (
          <animate attributeName="d" values={timing.values} dur={dur} repeatCount="indefinite"
            calcMode="spline" keyTimes={timing.keyTimes} keySplines={timing.keySplines} />
        )}
      </path>
      <path d={splitQ(q, 0.74)} strokeWidth={n1(w * 0.7)}>
        {midTiming && (
          <animate attributeName="d" values={midTiming.values} dur={dur} repeatCount="indefinite"
            calcMode="spline" keyTimes={midTiming.keyTimes} keySplines={midTiming.keySplines} />
        )}
      </path>
      <path d={splitQ(q, 0.4)} strokeWidth={w}>
        {tipTiming && (
          <animate attributeName="d" values={tipTiming.values} dur={dur} repeatCount="indefinite"
            calcMode="spline" keyTimes={tipTiming.keyTimes} keySplines={tipTiming.keySplines} />
        )}
      </path>
      {suckers && (
        <g fill={p.sucker} stroke="none" opacity=".85">
          {SUCKER_T.map((t, i) => {
            const [x, y] = atQ(q, t);
            if (!morph || !timing) {
              return <circle key={i} cx={n1(x)} cy={n1(y)} r={SUCKER_R[i]} />;
            }
            const pts = frames.map((f) => atQ(parseQ(f), t));
            const xs = loopVals(pts.map((pt) => n1(pt[0])));
            const ys = loopVals(pts.map((pt) => n1(pt[1])));
            return (
              <circle key={i} cx={n1(x)} cy={n1(y)} r={SUCKER_R[i]}>
                <animate attributeName="cx" values={xs} dur={dur} repeatCount="indefinite"
                  calcMode="spline" keyTimes={timing.keyTimes} keySplines={timing.keySplines} />
                <animate attributeName="cy" values={ys} dur={dur} repeatCount="indefinite"
                  calcMode="spline" keyTimes={timing.keyTimes} keySplines={timing.keySplines} />
              </circle>
            );
          })}
        </g>
      )}
    </g>
  );
}

/* ---------- eyes / face (layout comes from the body build) ---------- */
function Eye({ kind, x, p, track, eyeRef, gaze, face }) {
  const eyeY = face.eyeY;
  const baseRx = face.eyeRx;
  const baseRy = face.eyeRy;
  const midX = face.midX ?? 210;
  const at = `translate(${x},${eyeY})`;
  const line = { fill: "none", stroke: p.pupil, strokeWidth: 6, strokeLinecap: "round" };
  const gx = !track && gaze ? gaze[0] : 0;
  const gy = !track && gaze ? gaze[1] : 0;
  const pupilAt = (gx || gy) ? `translate(${gx},${gy})` : undefined;

  if (kind === "arch") {
    return (
      <g transform={at} {...line} strokeWidth="7">
        <path d={`M${-baseRx * 0.66},4 Q0,${-baseRy * 0.56} ${baseRx * 0.66},4`} />
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={baseRx} ry={baseRy} fill={p.eyeWhite} />
        <rect x={-baseRx * 0.52} y="-4" width={baseRx * 1.04} height="8" rx="4" fill={p.pupil} />
      </g>
    );
  }
  if (kind === "half") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={baseRx} ry={baseRy} fill={p.eyeWhite} />
        <rect x={-baseRx * 0.45} y="0" width={baseRx * 0.9} height="7" rx="3.5" fill={p.pupil} />
        <path d={`M${-baseRx - 1},-2 A${baseRx + 1},${baseRy + 1} 0 0,1 ${baseRx + 1},-2 Z`} fill={p.body} />
        <path d={`M${-baseRx},-1 L${baseRx},-1`} stroke={p.bodyDark} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "heart") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={baseRx} ry={baseRy} fill={p.eyeWhite} />
        <path fill={p.blush} transform="scale(1.7)"
          d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
      </g>
    );
  }
  if (kind === "cry") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={baseRx + 1} ry={baseRy + 2} fill={p.eyeWhite} />
        <g transform={pupilAt}>
          <ellipse cx="0" cy="2" rx={baseRx * 0.52} ry={baseRy * 0.68} fill={p.pupil} />
          <circle cx="-6" cy="-5" r="5.5" fill={p.eyeWhite} opacity=".9" />
          <circle cx="7" cy="7" r="2.6" fill={p.eyeWhite} opacity=".65" />
        </g>
      </g>
    );
  }

  const wide = kind === "wide";
  const uneven = kind === "uneven";
  const rx = uneven ? (x < midX ? baseRx - 3 : baseRx + 2) : wide ? baseRx + 2 : baseRx;
  const ry = uneven ? (x < midX ? baseRy - 2 : baseRy + 3) : wide ? baseRy + 4 : baseRy;
  const style = face.pupil || "slit";

  /* Per-species pupil language — same polish as Numi, different read. */
  let pupil;
  if (style === "bar") {
    /* Lexa — tall ink-bar reading pupil (never a round Numi pupil) */
    const pry = wide ? 18 : 16;
    pupil = (
      <>
        <rect x="-5" y={-pry} width="10" height={pry * 2} rx="5" fill={p.pupil} />
        <rect x="-2" y={-pry * 0.75} width="4" height={pry * 1.5} rx="2"
          fill={p.accent} opacity=".65" />
        <ellipse cx="-1.5" cy={-pry * 0.45} rx="2.4" ry="3.2" fill={p.eyeWhite} opacity=".92" />
      </>
    );
  } else if (style === "ring") {
    /* Coda — concentric vinyl / note-head rings */
    const pr = wide ? 15 : 14;
    pupil = (
      <>
        <circle cx="0" cy="1" r={pr} fill={p.pupil} />
        <circle cx="0" cy="1" r={pr * 0.7} fill="none" stroke={p.accent} strokeWidth="3.8" />
        <circle cx="0" cy="1" r={pr * 0.42} fill="none" stroke={p.chalk} strokeWidth="2" opacity=".7" />
        <circle cx="0" cy="1" r={pr * 0.22} fill={p.accent} />
        <circle cx="-4.5" cy="-5.5" r="3.6" fill={p.eyeWhite} opacity=".92" />
      </>
    );
  } else if (style === "fierce") {
    /* Kelp — squintier oval + thick grit bar (athletic, not cute-round) */
    const prx = wide ? 12 : 11;
    const pry = wide ? 10 : 9;
    pupil = (
      <>
        <ellipse cx="0" cy="1" rx={prx} ry={pry} fill={p.pupil} />
        <rect x={-prx * 0.85} y="-3" width={prx * 1.7} height="6" rx="1.2"
          fill={p.slate} opacity=".85" />
        <rect x={-prx * 0.35} y="-2" width={prx * 0.7} height="4" rx="1"
          fill={p.accent} opacity=".55" />
        <circle cx="-3" cy="-4" r="2.6" fill={p.eyeWhite} opacity=".85" />
      </>
    );
  } else if (style === "sesame") {
    /* Nori — big soft eye, obviously tilted sesame seed (not a circle) */
    pupil = (
      <>
        <ellipse cx="1" cy="2" rx="6" ry="15" fill={p.pupil} transform="rotate(-22)" />
        <ellipse cx="-1" cy="0" rx="3.5" ry="9" fill={p.slate} opacity=".35" transform="rotate(-22)" />
        <ellipse cx="-4" cy="-6" rx="4.2" ry="3.2" fill={p.eyeWhite} opacity=".95" />
        <circle cx="5" cy="7" r="2.2" fill={p.eyeWhite} opacity=".5" />
      </>
    );
  } else {
    /* Numi — classic round + subtle horizontal slit */
    const pr = wide ? 12 : 13;
    pupil = (
      <>
        <ellipse cx="0" cy="1" rx={pr} ry={n1(pr * 1.12)} fill={p.pupil} />
        <rect x={-pr} y="-1.6" width={n1(pr * 2)} height="3.2" rx="1.6"
          fill={p.slate} opacity=".55" />
        <circle cx="-5" cy="-6" r="4.6" fill={p.eyeWhite} opacity=".92" />
        <circle cx="6" cy="7" r="2.2" fill={p.eyeWhite} opacity=".6" />
      </>
    );
  }

  return (
    <g transform={at}>
      {kind === "open" && (
        <animateTransform attributeName="transform" type="scale" additive="sum"
          values="1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.9;0.923;0.946;1"
          dur="5.6s" repeatCount="indefinite" />
      )}
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={p.eyeWhite} />
      <g ref={track ? eyeRef : undefined} className="nm-pupils" transform={pupilAt}>
        {pupil}
      </g>
    </g>
  );
}

function Brows({ kind, p, face }) {
  if (!kind) return null;
  const dy = face.browY || 0;
  const l = face.eyeL;
  const r = face.eyeR;
  const y = face.eyeY - 36 + dy;
  const d = {
    up:    [`M${l - 28},${y} Q${l},${y - 14} ${l + 26},${y - 4}`, `M${r - 26},${y - 4} Q${r},${y - 14} ${r + 28},${y}`],
    sad:   [`M${l - 27},${y + 10} Q${l - 6},${y - 6} ${l + 26},${y - 8}`, `M${r - 26},${y - 8} Q${r + 6},${y - 6} ${r + 27},${y + 10}`],
    angry: [`M${l - 27},${y - 8} Q${l - 2},${y + 2} ${l + 27},${y + 14}`, `M${r - 27},${y + 14} Q${r + 2},${y + 2} ${r + 27},${y - 8}`],
    oneUp: [`M${l - 27},${y + 8} Q${l},${y + 2} ${l + 26},${y + 6}`, `M${r - 26},${y - 4} Q${r},${y - 20} ${r + 26},${y - 8}`],
  }[kind];
  return (
    <g fill="none" stroke={p.bodyDark} strokeWidth="7" strokeLinecap="round" opacity=".92">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p, face }) {
  const my = face.mouthY;
  const s = { fill: "none", stroke: p.bodyDark, strokeWidth: 6, strokeLinecap: "round" };
  if (kind === "grin")
    return <path d={`M184,${my - 8} Q210,${my + 22} 236,${my - 8}`} {...s} strokeWidth="7" />;
  if (kind === "frown")
    return <path d={`M188,${my + 8} Q210,${my - 12} 232,${my + 8}`} {...s} />;
  if (kind === "o")
    return <ellipse cx="210" cy={my} rx="11" ry="13" fill={p.bodyDark} />;
  if (kind === "talk")
    return (
      <ellipse cx="210" cy={my} rx="10" ry="12" fill={p.bodyDark}>
        <animate attributeName="ry" values="12;7;12;8;12" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
    );
  if (kind === "tiny")
    return <path d={`M198,${my} Q210,${my + 6} 222,${my}`} {...s} strokeWidth="5" />;
  if (kind === "flat")
    return <path d={`M192,${my} L228,${my}`} {...s} strokeWidth="5.5" />;
  if (kind === "wry")
    return <path d={`M188,${my - 2} Q210,${my + 14} 234,${my - 8}`} {...s} />;
  if (kind === "kiss")
    return (
      <g>
        <path d={`M198,${my - 2} Q210,${my - 12} 222,${my - 2} Q210,${my + 10} 198,${my - 2} Z`} fill="#FF6B8A" />
        <path d={`M204,${my - 4} Q210,${my + 4} 216,${my - 4}`} fill="none" stroke={p.blush}
          strokeWidth="2.5" strokeLinecap="round" opacity=".85" />
      </g>
    );
  return <path d={`M186,${my - 6} Q210,${my + 14} 234,${my - 6}`} {...s} />;
}

/* ---------- arm-tip digit chips (the solve instrument) ---------- */
const CHIP_ORDER = ["l0", "r0", "l1", "r1", "l2", "r2", "l3", "r3"];

function ChipShape({ shape, r, on, p }) {
  const fill = on ? p.accent : "none";
  const stroke = on ? p.accent : p.sucker;
  if (shape === "hex") {
    const s = r;
    const pts = [0, 1, 2, 3, 4, 5].map((i) => {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      return `${n1(Math.cos(a) * s)},${n1(Math.sin(a) * s)}`;
    }).join(" ");
    return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth="2" opacity={on ? 0.95 : 0.4} />;
  }
  if (shape === "diamond") {
    return <path d={`M0,${-r} L${r},0 L0,${r} L${-r},0 Z`} fill={fill} stroke={stroke}
      strokeWidth="2" opacity={on ? 0.95 : 0.4} />;
  }
  if (shape === "soft") {
    return <rect x={-r} y={-r * 0.85} width={r * 2} height={r * 1.7} rx={r * 0.45}
      fill={fill} stroke={stroke} strokeWidth="2" opacity={on ? 0.95 : 0.4} />;
  }
  return <circle r={r} fill={fill} stroke={stroke} strokeWidth="2" opacity={on ? 0.95 : 0.4} />;
}

/** Chips ride the working arms; an arm folded onto the face carries none. */
function Chips({ arms, p, solve, skip, symbols, chip }) {
  const CHIP_SYMBOLS = symbols;
  const lit = Math.round((Math.max(0, Math.min(100, solve)) / 100) * 8);
  const r = chip?.r ?? 11;
  return (
    <g className="nm-chips" textAnchor="middle" dominantBaseline="central"
      fontFamily="ui-monospace, monospace" fontSize="11" fontWeight="700">
      {arms.filter((a) => !skip.has(a.id)).map(({ id, side, index, socket, d }) => {
        const [tx, ty] = tipOf(d);
        const on = CHIP_ORDER.indexOf(id) < lit;
        return (
          <g key={id} transform={`translate(${n1(socket[0] + tx)},${n1(socket[1] + ty)})`}
            className={on ? "nm-chip" : undefined}
            style={on ? { animationDelay: `${(index * 0.22).toFixed(2)}s` } : undefined}>
            <ChipShape shape={chip?.shape || "circle"} r={r} on={on} p={p} />
            <text fill={on ? p.slate : p.sucker} opacity={on ? 1 : 0.55}>
              {CHIP_SYMBOLS[side][index]}
            </text>
          </g>
        );
      })}
    </g>
  );
}

const PROP_GLYPHS = {
  math: ["+", "\u2212", "\u00D7", "\u00F7", "=", "\u221A", "%", "\u03C0"],
  lang: ["A", "あ", "字", "أ", "ñ", "ü", "ß", "ø"],
  music: ["♪", "♫", "𝄞", "♭", "♯", "♩", "𝄢", "4"],
  fit: ["5", "10", "GO", "SET", "♥", "MAX", "15", "20"],
  cook: ["S", "G", "L", "C", "★", "°", "½", "1c"],
};

/* ---------- props ---------- */
const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path className={cls} fill={fill}
      style={delay ? { animationDelay: delay } : undefined}
      d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" />
  </g>
);

const Glyph = ({ x, y, size = 16, fill, cls, delay, children }) => (
  <text className={cls} x={x} y={y} fill={fill} fontSize={size} fontWeight="700"
    fontFamily="ui-monospace, monospace" textAnchor="middle"
    style={delay ? { animationDelay: delay } : undefined}>
    {children}
  </text>
);

function Props({ g, p, propKit = "math" }) {
  const glyphs = PROP_GLYPHS[propKit] || PROP_GLYPHS.math;
  switch (g.prop) {
    case "digits":
      return (
        <g>
          <circle cx="292" cy="150" r="5" fill={p.accent} opacity=".9" />
          <circle cx="314" cy="126" r="7" fill={p.body} opacity=".85" />
          <Glyph x={344} y={104} size={22} fill={p.accent} cls="nm-twinkle">{glyphs[0]}</Glyph>
          <Glyph x={372} y={140} size={16} fill={p.chalk} cls="nm-twinkle" delay=".35s">{glyphs[1]}</Glyph>
        </g>
      );
    case "eq":
      return (
        <g fill={p.accent}>
          {[[44, 18], [60, 30], [76, 12], [344, 12], [360, 30], [376, 18]].map(([x, h], i) => (
            <rect key={i} className="nm-eq" x={x} y={244 - h} width="8" height={h * 2} rx="4"
              style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
          ))}
        </g>
      );
    case "speech":
      return (
        <g fill="none" stroke={p.accent} strokeLinecap="round">
          <path className="nm-ring" d="M330,214 Q344,232 330,250" strokeWidth="5" />
          <path className="nm-ring" d="M352,202 Q372,232 352,262" strokeWidth="5"
            style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "pointer":
      return (
        <g fill="none" stroke={p.accent} strokeWidth="4" strokeLinecap="round">
          <path className="nm-pulse" d="M336,250 L364,250" />
          <path d="M356,240 L368,250 L356,260" />
        </g>
      );
    case "chalk":
      return (
        <g>
          <rect x="166" y="360" width="26" height="9" rx="4.5" fill={p.chalk}
            transform="rotate(-22 179 364)" />
          <rect className="nm-type" x="134" y="396" width="3" height="17" rx="1.5" fill={p.chalk} />
        </g>
      );
    case "confetti":
      return (
        <g>
          {[[104, 76, 0], [252, 66, 0.4], [176, 52, 0.8], [316, 106, 1.2],
            [72, 128, 1.6], [352, 156, 2], [140, 36, 2.4], [286, 32, 2.8]].map(([x, y, d], i) => (
            <Glyph key={i} x={x} y={y} size={17} cls="nm-fall" delay={`${d}s`}
              fill={[p.accent, p.chalk, p.brass][i % 3]}>
              {glyphs[i]}
            </Glyph>
          ))}
        </g>
      );
    case "hearts":
      return (
        <g>
          {/* Parent g keeps position — CSS rise animates transform and must not share the element. */}
          <g transform="translate(312,168) scale(1.4)">
            <path className="nm-rise" fill={p.blush}
              d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
          </g>
          <g transform="translate(112,150) scale(0.95)">
            <path className="nm-rise" fill={p.accent} style={{ animationDelay: ".9s" }}
              d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
          </g>
        </g>
      );
    case "tear":
      return (
        <g transform="translate(146,246)">
          <path className="nm-tear" fill={p.accent} opacity=".9"
            d="M0,-12 Q8,-2 8,4 A8,8 0 1,1 -8,4 Q-8,-2 0,-12 Z" />
        </g>
      );
    case "zzz":
      return (
        <path className="nm-zzz" d="M300,124 L322,124 L300,146 L322,146" fill="none"
          stroke={p.chalk} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "badge":
      return (
        <g transform="translate(330,152)">
          <circle cx="0" cy="0" r="19" fill={p.slate} stroke={p.accent} strokeWidth="3" />
          <path d="M-7,0 L-2,7 L9,-7" fill="none" stroke={p.accent} strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "sweat":
      return (
        <ellipse className="nm-fall" cx="134" cy="164" rx="5" ry="8" fill={p.accent} opacity=".85"
          style={{ animationDuration: "1.6s" }} />
      );
    case "bang":
      return (
        <g fill="none" stroke={p.accent} strokeWidth="5" strokeLinecap="round">
          <path d="M138,104 L124,82" /><path d="M210,86 L210,62" /><path d="M282,104 L296,82" />
        </g>
      );
    case "kiss":
      return (
        <g>
          {/* Breath leaves the mouth, then hearts drift toward the viewer. */}
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".9">
            <path className="nm-ring" d="M228,264 Q252,252 278,256" strokeWidth="3.4" />
            <path className="nm-ring" d="M230,272 Q258,266 286,268" strokeWidth="2.4"
              style={{ animationDelay: ".18s" }} />
          </g>
          <g transform="translate(276,252) scale(1.55)">
            <path className="nm-rise" fill="#FF6B8A"
              d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
          </g>
          <g transform="translate(318,214) scale(1.15)">
            <path className="nm-rise" fill="#FF8AA8" opacity=".95" style={{ animationDelay: ".4s" }}
              d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
          </g>
          <g transform="translate(354,178) scale(0.85)">
            <path className="nm-rise" fill={p.accent} style={{ animationDelay: ".8s" }}
              d="M0,8 C-10,0 -10,-8 -4,-8 C-1,-8 0,-5 0,-5 C0,-5 1,-8 4,-8 C10,-8 10,0 0,8 Z" />
          </g>
        </g>
      );
    case "notes":
      return (
        <g fill={p.chalk}>
          <g transform="translate(332,150)">
            <g className="nm-rise">
              <ellipse cx="0" cy="0" rx="5" ry="4" transform="rotate(-18)" />
              <path d="M4,-1 L4,-18 Q10,-16 12,-10" fill="none" stroke={p.chalk} strokeWidth="3"
                strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(364,192)">
            <g className="nm-rise" style={{ animationDelay: ".7s" }}>
              <ellipse cx="0" cy="0" rx="4" ry="3.2" transform="rotate(-18)" />
              <path d="M3,-1 L3,-14" fill="none" stroke={p.accent} strokeWidth="2.5"
                strokeLinecap="round" />
            </g>
          </g>
        </g>
      );
    case "alarmFx":
      return (
        <g fill="none" stroke={p.accent} strokeLinecap="round">
          <path className="nm-ring" d="M96,190 Q74,222 96,254" strokeWidth="5" />
          <path className="nm-ring" d="M324,190 Q346,222 324,254" strokeWidth="5"
            style={{ animationDelay: ".15s" }} />
          <path d="M138,100 L124,78" strokeWidth="5" />
          <path d="M282,100 L296,78" strokeWidth="5" />
          <path d="M210,84 L210,60" strokeWidth="5" />
        </g>
      );
    case "cheer":
      return (
        <g>
          <Star4 x={104} y={150} fill={p.accent} cls="nm-twinkle" s={1.1} />
          <Star4 x={318} y={138} fill={p.brass} cls="nm-twinkle" delay=".4s" s={1} />
          <Glyph x={344} y={196} size={17} fill={p.chalk} cls="nm-twinkle">+1</Glyph>
        </g>
      );
    case "search":
      return (
        <g>
          <g transform="translate(332,164)" fill="none" stroke={p.accent} strokeWidth="4">
            <circle cx="0" cy="0" r="15" />
            <path d="M11,11 L24,24" strokeLinecap="round" />
          </g>
          <rect className="nm-scan" x="150" y="196" width="120" height="3" rx="1.5"
            fill={p.accent} opacity=".55" />
        </g>
      );
    case "thumbUp":
      return (
        <g transform="translate(300,140)">
          <rect x="-8" y="4" width="18" height="28" rx="5" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
          <path d="M-4,4 Q-4,-16 6,-18 Q14,-16 12,4 Z" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
        </g>
      );
    case "thumbDown":
      return (
        <g transform="translate(316,392)">
          <rect x="-8" y="-24" width="18" height="28" rx="5" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
          <path d="M-4,4 Q-4,24 6,26 Q14,24 12,4 Z" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
        </g>
      );
    case "question":
      return <Glyph x={318} y={148} size={40} fill={p.chalk} cls="nm-pulse">?</Glyph>;
    case "gears":
      return (
        <g>
          <g transform="translate(332,150)">
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="0;360" dur="1.3s" repeatCount="indefinite" />
            <circle cx="0" cy="0" r="13" fill="none" stroke={p.accent} strokeWidth="4"
              strokeDasharray="6 4" />
          </g>
          <g transform="translate(364,180)">
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="360;0" dur="1.7s" repeatCount="indefinite" />
            <circle cx="0" cy="0" r="8" fill="none" stroke={p.brass} strokeWidth="3"
              strokeDasharray="4 3" />
          </g>
        </g>
      );
    case "speed":
      return (
        <g>
          <g fill="none" stroke={p.accent} strokeLinecap="round" opacity=".9">
            <path className="nm-whoosh" d="M70,236 L28,236" strokeWidth="5" />
            <path className="nm-whoosh" d="M66,268 L22,268" strokeWidth="6"
              style={{ animationDelay: ".08s", animationDuration: ".34s" }} />
            <path className="nm-whoosh" d="M72,300 L34,300" strokeWidth="4"
              style={{ animationDelay: ".14s", animationDuration: ".28s" }} />
          </g>
          {/* kick-up dust from the striding tips */}
          {[[150, 448, -30], [190, 456, -38], [250, 450, -34], [290, 458, -42]].map(([x, y, dx], i) => (
            <ellipse key={i} className="nm-dust" cx={x} cy={y} rx="10" ry="4"
              fill={p.bodyLight} opacity=".55"
              style={{ animationDelay: `${i * 0.09}s`, "--dx": `${dx}px` }} />
          ))}
        </g>
      );
    case "bubbles":
      return (
        <g>
          {/* water current lines drifting past */}
          <g fill="none" stroke={p.accent} strokeLinecap="round" opacity=".5">
            <path className="nm-whoosh" d="M78,200 L28,208" strokeWidth="3"
              style={{ animationDuration: "1.1s" }} />
            <path className="nm-whoosh" d="M86,260 L30,272" strokeWidth="4"
              style={{ animationDuration: "1.3s", animationDelay: ".3s" }} />
            <path className="nm-whoosh" d="M92,320 L40,330" strokeWidth="3"
              style={{ animationDuration: "1.15s", animationDelay: ".55s" }} />
          </g>
          {[
            [120, 360, -10, 7],
            [160, 390, 8, 5],
            [250, 370, -6, 8],
            [300, 400, 12, 4.5],
            [210, 410, 4, 6],
            [100, 300, 14, 3.5],
          ].map(([x, y, bx, r], i) => (
            <circle key={i} className="nm-bubble" cx={x} cy={y} r={r}
              fill="none" stroke={light(p.accent, 0.35)} strokeWidth="2.5"
              style={{ animationDelay: `${i * 0.28}s`, "--bx": `${bx}px` }} />
          ))}
          {/* siphon jet wake — the real octopus propulsion cue */}
          <g transform="translate(98,286)" opacity=".75">
            <ellipse cx="0" cy="0" rx="11" ry="7" fill={p.accent}>
              <animate attributeName="rx" values="11;16;9;11" dur="1.35s" repeatCount="indefinite" />
              <animate attributeName="opacity" values=".8;.35;.7;.8" dur="1.35s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="-16" cy="2" rx="8" ry="5" fill={light(p.accent, 0.35)}>
              <animate attributeName="rx" values="8;14;6;8" dur="1.35s" begin="0.15s" repeatCount="indefinite" />
            </ellipse>
          </g>
        </g>
      );
    case "boost":
      return (
        <g>
          {/* downward speed streaks — ship climbs, world streaks past */}
          <g fill="none" stroke={p.accent} strokeLinecap="round" opacity=".7">
            {[[92, 210, 4], [108, 250, 3], [312, 220, 4], [328, 260, 3]].map(([x, y, w], i) => (
              <path key={i} className="nm-streak" d={`M${x},${y} L${x},${y + 36}`} strokeWidth={w}
                style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </g>

          {/* main rocket plume under the mantle */}
          <g transform="translate(210,392)">
            <ellipse className="nm-flame" cx="0" cy="48" rx="34" ry="58"
              fill="#FF6B2C" opacity=".88" />
            <ellipse className="nm-flame" cx="0" cy="52" rx="22" ry="48"
              fill="#FFB040" opacity=".95" style={{ animationDelay: ".07s" }} />
            <ellipse className="nm-flame" cx="0" cy="56" rx="11" ry="36"
              fill="#FFF1B0" style={{ animationDelay: ".03s" }} />
            <ellipse className="nm-flame" cx="0" cy="60" rx="4.5" ry="22"
              fill="#FFFFFF" opacity=".9" style={{ animationDelay: ".11s" }} />
          </g>

          {/* twin side thrusters from the outer arm tips */}
          <g transform="translate(148,430)">
            <ellipse className="nm-flame" cx="0" cy="18" rx="12" ry="28"
              fill="#FF7A35" opacity=".85" style={{ animationDelay: ".05s" }} />
            <ellipse className="nm-flame" cx="0" cy="22" rx="6" ry="18"
              fill="#FFE08A" style={{ animationDelay: ".12s" }} />
          </g>
          <g transform="translate(272,430)">
            <ellipse className="nm-flame" cx="0" cy="18" rx="12" ry="28"
              fill="#FF7A35" opacity=".85" style={{ animationDelay: ".09s" }} />
            <ellipse className="nm-flame" cx="0" cy="22" rx="6" ry="18"
              fill="#FFE08A" style={{ animationDelay: ".16s" }} />
          </g>

          {/* embers + smoke falling away */}
          {[
            [178, 448, -10, "#FF8A3A"],
            [210, 456, 4, "#FFC060"],
            [242, 450, 12, "#FF6B2C"],
            [196, 462, -6, "#FFF0B0"],
            [226, 468, 8, "#FF9A50"],
          ].map(([x, y, ex, fill], i) => (
            <circle key={i} className="nm-ember" cx={x} cy={y} r={3.2 - (i % 3) * 0.4}
              fill={fill}
              style={{ animationDelay: `${i * 0.18}s`, "--ex": `${ex}px` }} />
          ))}

          <Star4 x={118} y={150} fill={p.brass} cls="nm-twinkle" s={1.1} />
          <Star4 x={304} y={132} fill={p.accent} cls="nm-twinkle" delay=".45s" />
        </g>
      );
    case "highFive":
      return (
        <g fill="none" stroke={p.accent} strokeWidth="4" strokeLinecap="round">
          <path className="nm-ring" d="M318,142 Q338,120 358,142" />
          <path className="nm-ring" d="M324,122 Q343,98 362,122" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "clapFx":
      return (
        <g fill="none" stroke={p.accent} strokeLinecap="round">
          <path className="nm-ring" d="M172,166 Q210,142 248,166" strokeWidth="4" />
          <Star4 x={210} y={136} fill={p.brass} cls="nm-twinkle" s={0.85} />
        </g>
      );
    case "check":
      return (
        <g transform="translate(330,150)">
          <circle className="nm-pulse" cx="0" cy="0" r="21" fill={p.slate}
            stroke={p.accent} strokeWidth="3" />
          <path d="M-8,0 L-2,8 L10,-8" fill="none" stroke={p.accent} strokeWidth="5"
            strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "errorFx":
      return (
        <g>
          <g transform="translate(330,150)">
            <circle cx="0" cy="0" r="19" fill={p.slate} stroke={p.blush} strokeWidth="3" />
            <path d="M-6,-6 L6,6 M6,-6 L-6,6" stroke={p.blush} strokeWidth="4" strokeLinecap="round" />
          </g>
          <path className="nm-ring" d="M96,196 Q74,226 96,256" fill="none" stroke={p.blush} strokeWidth="4" />
        </g>
      );
    case "empty":
      return (
        <g opacity=".7">
          <rect x="306" y="140" width="50" height="38" rx="7" fill="none" stroke={p.chalk}
            strokeWidth="3" strokeDasharray="4 4" />
          <path d="M318,160 L344,160" stroke={p.chalk} strokeWidth="3" strokeLinecap="round" opacity=".5" />
        </g>
      );
    case "spinner":
      return (
        <g transform="translate(330,150)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="1.15s" repeatCount="indefinite" />
          <circle cx="0" cy="0" r="17" fill="none" stroke={p.accent} strokeWidth="4"
            strokeDasharray="30 42" strokeLinecap="round" />
        </g>
      );
    case "dots":
      return (
        <g fill={p.chalk}>
          <circle className="nm-pulse" cx="306" cy="150" r="5" />
          <circle className="nm-pulse" cx="326" cy="150" r="5" style={{ animationDelay: ".25s" }} />
          <circle className="nm-pulse" cx="346" cy="150" r="5" style={{ animationDelay: ".5s" }} />
        </g>
      );
    default:
      return null;
  }
}

/* ============================================================
   THE OCTOPUS — geometry comes from the body build
   ============================================================ */

/** Resolve the eight arms for a gesture: id, socket, path, optional morph frames. */
function armsFor(g, body) {
  const scale = body.armScale ?? 1;
  const sockL = body.socketsL;
  const sockR = socketsR(body);
  const set = (ARMS[g.arms || "drift"] || ARMS.drift).map((d) => scaleArmPath(d, scale));
  const over = g.over || {};
  const out = [];
  for (let i = 0; i < 4; i++) {
    for (const side of ["l", "r"]) {
      const id = `${side}${i}`;
      const base = scaleArmPath(over[id] || (ARMS[g.arms || "drift"] || ARMS.drift)[i], scale);
      const d = side === "l" ? base : mir(base);
      const isWave = g.wave === id;
      const socket = side === "l" ? sockL[i] : sockR[i];

      if (g.gait === "run") {
        const phase = (side === "r" ? 2 : 0) + i;
        const planted = scaleArmPath(ARMS.run[i], scale);
        const cycle = runFramesFromLeg(planted).map((f) => (side === "l" ? f : mir(f)));
        out.push({
          id, side, index: i, socket,
          d: cycle[phase % cycle.length],
          frames: rotateFrames(cycle, phase),
          dur: "0.36s",
          sway: { values: side === "l" ? "-4;6;-4" : "4;-6;4", dur: "0.36s" },
        });
        continue;
      }

      if (g.gait === "swim") {
        const phase = i + (side === "r" ? 2 : 0);
        const cycle = swimFramesFromLeg(set[i]).map((f) => (side === "l" ? f : mir(f)));
        out.push({
          id, side, index: i, socket,
          d: cycle[0],
          frames: rotateFrames(cycle, phase),
          dur: "1.25s",
          sway: {
            values: side === "l" ? `${-4 - i};${5 + i};${-4 - i}` : `${4 + i};${-5 - i};${4 + i}`,
            dur: `${1.1 + i * 0.1}s`,
          },
        });
        continue;
      }

      const sway = isWave
        ? { values: side === "l" ? "-10;26;-10" : "10;-26;10", dur: "0.6s" }
        : g.dance
          ? { values: side === "l" ? `${-8 - i * 2};${12 + i * 2};${-8 - i * 2}` : `${8 + i * 2};${-12 - i * 2};${8 + i * 2}`, dur: `${0.5 + i * 0.06}s` }
          : side === "l" ? SWAY[i] : { values: mirSway(SWAY[i].values), dur: SWAY[i].dur };
      out.push({ id, side, index: i, socket, d, sway });
    }
  }
  return out;
}

function Siphon({ kind, p }) {
  if (kind === "quill") {
    return (
      <g strokeLinecap="round" fill="none">
        <path d="M132,236 Q108,248 96,268" stroke={p.bodyDark} strokeWidth="12" />
        <path d="M98,262 Q90,274 86,286" stroke={p.slate} strokeWidth="4" opacity=".55" />
        <path d="M86,286 L78,298" stroke={p.accent} strokeWidth="3" opacity=".7" />
      </g>
    );
  }
  if (kind === "shell") {
    return (
      <g>
        <path d="M118,248 Q96,258 92,278 Q98,292 118,286 Q130,274 126,258 Z"
          fill={p.bodyDark} opacity=".9" />
        <path d="M106,262 Q112,274 118,278" fill="none" stroke={p.accent} strokeWidth="2.5" opacity=".7" />
      </g>
    );
  }
  if (kind === "jet") {
    return (
      <g strokeLinecap="round" fill="none">
        <path d="M124,268 Q104,286 100,308" stroke={p.bodyDark} strokeWidth="16" />
        <path d="M104,300 Q100,312 98,322" stroke={p.slate} strokeWidth="7" opacity=".35" />
      </g>
    );
  }
  if (kind === "ladle") {
    return (
      <g>
        <path d="M120,250 Q100,262 98,280 Q104,296 122,290" fill={p.bodyDark} />
        <ellipse cx="108" cy="288" rx="10" ry="7" fill={p.slate} opacity=".35" />
      </g>
    );
  }
  return (
    <g strokeLinecap="round" fill="none">
      <path d="M126,250 Q108,262 101,280" stroke={p.bodyDark} strokeWidth="15" />
      <path d="M104,274 Q100,280 99,286" stroke={p.slate} strokeWidth="6" opacity=".4" />
    </g>
  );
}

function Signature({ kind, p }) {
  if (kind === "lexa") {
    return (
      <g>
        {/* ink scarf — identity, not a theme swatch */}
        <path d="M168,292 Q210,318 252,292 Q244,308 210,316 Q176,308 168,292 Z"
          fill={p.accent} opacity=".85" />
        <path d="M248,298 Q268,320 262,348" fill="none" stroke={p.accent} strokeWidth="7"
          strokeLinecap="round" opacity=".8" />
      </g>
    );
  }
  if (kind === "coda") {
    return (
      <g>
        {/* lateral ear-fins — reef silhouette */}
        <path d="M98,200 Q70,190 66,214 Q72,236 100,228 Z" fill={p.bodyDark} />
        <path d="M322,200 Q350,190 354,214 Q348,236 320,228 Z" fill={p.bodyDark} />
        <path d="M78,208 Q72,214 76,222" fill="none" stroke={p.accent} strokeWidth="2.5" opacity=".7" />
        <path d="M342,208 Q348,214 344,222" fill="none" stroke={p.accent} strokeWidth="2.5" opacity=".7" />
      </g>
    );
  }
  if (kind === "kelp") {
    return (
      <g>
        {/* athletic chest stripe — below the mouth, on the lower mantle */}
        <path d="M152,302 Q210,318 268,302" fill="none" stroke={p.slate} strokeWidth="10"
          strokeLinecap="round" opacity=".35" />
        <path d="M156,302 Q210,314 264,302" fill="none" stroke={p.accent} strokeWidth="4"
          strokeLinecap="round" opacity=".8" />
      </g>
    );
  }
  if (kind === "nori") {
    return (
      <g>
        {/* apron bib */}
        <path d="M168,300 Q210,336 252,300 L246,348 Q210,362 174,348 Z"
          fill={p.belly} opacity=".92" />
        <path d="M186,308 L186,340 M234,308 L234,340" stroke={p.accent} strokeWidth="3"
          strokeLinecap="round" opacity=".55" />
        <circle cx="210" cy="318" r="4" fill={p.accent} />
      </g>
    );
  }
  return null;
}

function CostumeCap({ style, p }) {
  if (style === "beret") {
    return (
      <g transform="translate(210,78)">
        <ellipse cx="4" cy="8" rx="48" ry="18" fill={p.slate} />
        <ellipse cx="0" cy="0" rx="40" ry="22" fill={p.slate} />
        <ellipse cx="-6" cy="-4" rx="18" ry="10" fill={light(p.slate, 0.18)} opacity=".5" />
        <circle cx="36" cy="2" r="5" fill={p.brass} />
      </g>
    );
  }
  if (style === "crown") {
    return (
      <g transform="translate(210,112)">
        {[-54, -32, -10, 12, 34].map((x, i) => (
          <ellipse key={i} cx={x} cy={-8 - (i % 2) * 8} rx="14" ry="16"
            fill={i % 2 ? p.accent : p.bodyDark} opacity=".92" />
        ))}
      </g>
    );
  }
  if (style === "band") {
    return (
      <g transform="translate(210,132)">
        {/* soft coconut shell dome under the sweatband */}
        <path d="M-62,8 Q-62,-48 0,-58 Q62,-48 62,8 Q30,0 0,-2 Q-30,0 -62,8 Z"
          fill={p.slate} opacity=".92" />
        <ellipse cx="-18" cy="-28" rx="12" ry="7" fill={p.bodyDark} opacity=".25" />
        <ellipse cx="16" cy="-34" rx="9" ry="5" fill={p.bodyDark} opacity=".2" />
        <path d="M-8,-56 Q-14,-72 -20,-76 M0,-58 Q2,-76 6,-80 M10,-56 Q18,-72 24,-76"
          fill="none" stroke={p.bodyDark} strokeWidth="3" strokeLinecap="round" opacity=".55" />
        <rect x="-56" y="-2" width="112" height="16" rx="8" fill={p.accent} opacity=".9" />
      </g>
    );
  }
  if (style === "toque") {
    /* Nori mantle crown is ~y138 — seat the band on the head, not floating above. */
    return (
      <g transform="translate(210,118)">
        <ellipse cx="0" cy="28" rx="42" ry="10" fill={p.slate} opacity=".28" />
        <path d="M-34,26 Q-38,-2 -20,-28 Q0,-44 20,-28 Q38,-2 34,26 Z" fill={p.chalk} />
        <ellipse cx="0" cy="-22" rx="28" ry="16" fill={p.chalk} />
        <ellipse cx="-8" cy="-28" rx="11" ry="6" fill="#fff" opacity=".5" />
        <rect x="-36" y="18" width="72" height="14" rx="6" fill={p.slate} />
        <ellipse cx="0" cy="30" rx="36" ry="7" fill={p.bodyDark} opacity=".18" />
      </g>
    );
  }
  /* grad */
  return (
    <g transform="translate(210,92)">
      <path d="M-44,0 L0,-18 L44,0 L0,18 Z" fill={p.slate} />
      <path d="M-22,8 L-22,26 Q0,34 22,26 L22,8" fill={p.slate} opacity=".92" />
      <path d="M40,2 L46,30" stroke={p.brass} strokeWidth="3" strokeLinecap="round" />
      <circle cx="46" cy="33" r="5" fill={p.brass} />
    </g>
  );
}

function CostumeSpecs({ style, p, face }) {
  const l = face.eyeL;
  const r = face.eyeR;
  const y = face.eyeY;
  if (style === "rect") {
    return (
      <g fill="none" stroke={p.brass} strokeWidth="3.5" opacity=".95">
        <rect x={l - 28} y={y - 26} width="56" height="48" rx="8" />
        <rect x={r - 28} y={y - 26} width="56" height="48" rx="8" />
        <path d={`M${l + 28},${y} L${r - 28},${y}`} strokeLinecap="round" />
        <path d={`M${l - 28},${y - 8} L${l - 48},${y - 18}`} strokeLinecap="round" />
        <path d={`M${r + 28},${y - 8} L${r + 48},${y - 18}`} strokeLinecap="round" />
      </g>
    );
  }
  if (style === "sport") {
    return (
      <g fill="none" stroke={p.slate} strokeWidth="5" opacity=".8">
        <ellipse cx={l} cy={y} rx="30" ry="24" />
        <ellipse cx={r} cy={y} rx="30" ry="24" />
        <path d={`M${l + 30},${y} L${r - 30},${y}`} strokeWidth="4" />
      </g>
    );
  }
  return (
    <g fill="none" stroke={p.brass} strokeWidth="4" opacity=".9">
      <circle cx={l} cy={y} r="34" />
      <circle cx={r} cy={y} r="34" />
      <path d={`M${(l + r) / 2 - 6},${y} L${(l + r) / 2 + 6},${y}`} strokeLinecap="round" />
      <path d={`M${l - 34},${y - 6} L${l - 58},${y - 16}`} strokeLinecap="round" />
      <path d={`M${r + 34},${y - 6} L${r + 58},${y - 16}`} strokeLinecap="round" />
    </g>
  );
}

/** Mirror a rotation keyframe list so mirrored arms sway outward together. */
const mirSway = (values) =>
  values.split(";").map((v) => n1(-parseFloat(v))).join(";");

function OctopusSVG({
  p, glow, solve, parts, paused, gesture, g: gProp, svgRef, eyeRefs,
  character, chipSymbols, writingGlyph, body = BUILD_NUMI,
}) {
  const g = gProp || byKey(gesture);
  const look = g.look || [0, 0];
  const face = { ...body.face, midX: body.midX };
  const arms = useMemo(() => armsFor(g, body), [g, body]);
  const front = new Set(g.front || []);
  const backArms = arms.filter((a) => !front.has(a.id));
  const frontArms = arms.filter((a) => front.has(a.id));
  const armW = body.armW;
  const hi = body.highlight;
  const clipId = `nm-mantleClip-${body.id}`;
  const glowId = `nm-glowG-${body.id}`;
  const mantleId = `nm-mantleG-${body.id}`;
  const slateId = `nm-slateG-${body.id}`;

  const renderArms = (list) =>
    list.map((a) => (
      <g key={a.id} transform={`translate(${a.socket[0]},${a.socket[1]})`}>
        <Arm
          d={a.d}
          frames={a.frames}
          dur={a.dur}
          w={armW[a.index]}
          p={p}
          sway={a.sway}
          suckers={parts.suckers}
        />
      </g>
    ));

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`${character.name} the octopus: ${g.label}`}
      className={`nm-svg nm-g-${gesture}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title>{character.title}</title>
      <style>{SVG_CSS}</style>

      <defs>
        <radialGradient id={glowId} cx="50%" cy="44%" r="58%">
          <stop offset="0" stopColor={p.glowC} stopOpacity=".9" />
          <stop offset="1" stopColor={p.glowC} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={mantleId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bodyLight} />
          <stop offset="1" stopColor={p.body} />
        </linearGradient>
        <linearGradient id={slateId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light(p.slate, 0.12)} />
          <stop offset="1" stopColor={p.slate} />
        </linearGradient>
        <clipPath id={clipId}>
          <path d={body.mantle} />
        </clipPath>
      </defs>

      {parts.shadow && (
        <g transform="translate(210,486)">
          <ellipse className="nm-shadowO" cx="0" cy="0" rx="104" ry="10" fill="#000000" />
        </g>
      )}

      <g className="nm-float">
        <g transform="translate(210,470)">
          {g.shake && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-2 0;2 0;-2 0" dur="0.12s" repeatCount="indefinite" />
          )}
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin="nm-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 8;0 -13;0 2;0 0" keyTimes="0;0.26;0.56;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="nm-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.06 0.91;0.95 1.06;1.01 0.98;1 1" keyTimes="0;0.26;0.56;0.8;1" />

          <g transform={`rotate(${g.lean || 0})`}>
            <g transform="translate(-210,-470)">
              <g id="nm-hit">
                <g transform="translate(210,300)">
                  {g.gait === "swim" && (
                    <animateTransform attributeName="transform" type="scale" additive="sum"
                      values="1 1;1.03 0.96;0.99 1.02;1 1" keyTimes="0;0.35;0.7;1"
                      dur="1.25s" repeatCount="indefinite" />
                  )}
                  <g transform="translate(-210,-300)">
                    {parts.halo && (
                      <ellipse className="nm-glow" cx="210" cy="248" rx="152" ry="140"
                        fill={`url(#${glowId})`} />
                    )}

                    {renderArms(backArms)}

                    {parts.siphon && <Siphon kind={body.siphon} p={p} />}

                    <path d={body.mantle} fill={`url(#${mantleId})`} />
                    <g clipPath={`url(#${clipId})`}>
                      <ellipse cx={hi.cx} cy={hi.cy} rx={hi.rx} ry={hi.ry}
                        fill={p.bodyLight} opacity=".5" />
                      {parts.spots && (
                        <g fill={p.spot} opacity=".3">
                          {body.spots.map(([cx, cy, r], i) => (
                            <circle key={i} cx={cx} cy={cy} r={r} />
                          ))}
                        </g>
                      )}
                    </g>

                    <Signature kind={body.signature} p={p} />

                    {parts.blush && (
                      <g fill={p.blush} opacity=".32">
                        {body.blush.map(([cx, cy, rx, ry], i) => (
                          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
                        ))}
                      </g>
                    )}

                    <g key={g.key} className="nm-pop">
                      {parts.brows && <Brows kind={g.brow} p={p} face={face} />}
                      <Eye kind={g.eye} x={face.eyeL} p={p} track={g.track}
                        eyeRef={eyeRefs?.l} gaze={look} face={face} />
                      <Eye kind={g.eye} x={face.eyeR} p={p} track={g.track}
                        eyeRef={eyeRefs?.r} gaze={look} face={face} />
                      <Mouth kind={g.mouth} p={p} face={face} />
                    </g>

                    {parts.specs && (
                      <CostumeSpecs style={body.costume.specs} p={p} face={face} />
                    )}

                    {parts.cap && <CostumeCap style={body.costume.cap} p={p} />}

                    {parts.slate && g.key === "writing" && (
                      <g transform="rotate(-7 114 410)">
                        <rect x="66" y="380" width="96" height="60" rx="9"
                          fill={`url(#${slateId})`} stroke={p.slateEdge} strokeWidth="3" />
                        <g stroke={p.chalk} strokeWidth="3" strokeLinecap="round" opacity=".65">
                          <path d="M78,398 H112" />
                          <path d="M78,412 H128" />
                          <path d="M78,426 H102" />
                        </g>
                        <Glyph x={140} y={422} size={18} fill={p.accent}>{writingGlyph}</Glyph>
                      </g>
                    )}

                    {renderArms(frontArms)}

                    {parts.chips && (
                      <Chips arms={arms} p={p} solve={solve} skip={front}
                        symbols={chipSymbols} chip={body.chip} />
                    )}

                    {parts.props && (
                      <g key={`p-${g.key}`} className="nm-pop">
                        <Props g={g} p={p} propKit={body.propKit} />
                      </g>
                    )}
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ---------- tap-burst shapes ---------- */
const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  plus: "M-1.8,-7 L1.8,-7 L1.8,-1.8 L7,-1.8 L7,1.8 L1.8,1.8 L1.8,7 L-1.8,7 L-1.8,1.8 L-7,1.8 L-7,-1.8 L-1.8,-1.8 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};


/* ============================================================
   FACTORY — bind themes, chips, copy, and studio shell to a character
   ============================================================ */
const BASE_PARTS = [
  { key: "suckers", label: "Suckers", category: "Body" },
  { key: "spots", label: "Mantle spots", category: "Body" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "specs", label: "Specs", category: "Costume" },
  { key: "cap", label: "Grad cap", category: "Costume" },
  { key: "slate", label: "Chalk slate", category: "Props" },
  { key: "chips", label: "Arm chips", category: "Props" },
  { key: "siphon", label: "Siphon", category: "Body" },
  { key: "props", label: "Pose props", category: "Props" },
  { key: "halo", label: "Glow", category: "Stage" },
  { key: "shadow", label: "Shadow", category: "Stage" },
];

/**
 * @param {object} cfg
 * @param {string} cfg.slug
 * @param {string} cfg.name
 * @param {string} cfg.product
 * @param {string} cfg.tagline
 * @param {string} cfg.brand
 * @param {string} cfg.defaultTheme
 * @param {Record<string, object>} cfg.themes
 * @param {{ l: string[], r: string[] }} cfg.chipSymbols
 * @param {string} [cfg.writingGlyph]
 * @param {object} cfg.solve  { label, zones, hint, dragHint, ramp }
 * @param {string} cfg.glowLabel
 * @param {Record<string, string>} [cfg.partLabels]
 * @param {string} cfg.title  SVG <title>
 */
export function createOctopusStudio(cfg) {
  const THEMES = cfg.themes;
  const BRAND = cfg.brand;
  const DEFAULT_THEME = cfg.defaultTheme;
  const CHIP_SYMBOLS = cfg.chipSymbols;
  const writingGlyph = cfg.writingGlyph ?? "=";
  const body = cfg.build || BUILD_NUMI;
  const solveCfg = cfg.solve;
  const SOLVE_RAMP = solveCfg.ramp;
  const solveZone = (n) =>
    n < 34 ? solveCfg.zones[0] : n < 67 ? solveCfg.zones[1] : solveCfg.zones[2];
  const PARTS = BASE_PARTS.map((part) => ({
    ...part,
    label: (cfg.partLabels && cfg.partLabels[part.key]) || part.label,
  }));
  const PART_CATEGORIES = ["Body", "Face", "Costume", "Props", "Stage"];
  const DEFAULT_PARTS = { ...(cfg.defaultParts || body.defaultParts) };
  const allParts = (on) =>
    PARTS.reduce((acc, part) => ({ ...acc, [part.key]: on }), {});
  const character = {
    name: cfg.name,
    title: cfg.title,
  };
  const SHELL_CSS = shellCss(BRAND);

  const POSE_SOURCE = {
    slug: cfg.slug,
    meta: {
      accent: BRAND,
      stage: THEMES[DEFAULT_THEME].stage,
      glowLabel: cfg.glowLabel,
      name: cfg.name,
      tagline: cfg.tagline,
      product: cfg.product,
      themes: Object.fromEntries(
        Object.entries(THEMES).map(([key, t]) => [
          key,
          {
            name: t.name,
            top: t.belly,
            mid: t.body,
            base: dark(t.body, 0.26),
            core: t.accent,
            stage: t.stage,
            features: dark(t.slate, 0.24),
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
      signal: g.solve ?? 62,
    })),
    renderPose: (key) => {
      const g = byKey(key);
      return (
        <OctopusSVG
          p={derive(THEMES[DEFAULT_THEME])}
          glow={0.45}
          solve={g.solve ?? 62}
          parts={DEFAULT_PARTS}
          gesture={key}
          g={g}
          eyeRefs={{}}
          character={character}
          chipSymbols={CHIP_SYMBOLS}
          writingGlyph={writingGlyph}
          body={body}
        />
      );
    },
  };

  function Studio() {
    const [themeKey, setThemeKey] = useState(DEFAULT_THEME);
    const [custom, setCustom] = useState({ ...THEMES[DEFAULT_THEME], name: "Custom" });
    const [glow, setGlow] = useState(0.45);
    const [solve, setSolve] = useState(62);
    const [parts, setParts] = useState(DEFAULT_PARTS);
    const [paused, setPaused] = useState(false);
    const [transparent, setTransparent] = useState(true);
    const [gesture, setGesture] = useState("idle");
    const [sparks, setSparks] = useState([]);
    const svgRef = useRef(null);
    const pupilL = useRef(null);
    const pupilR = useRef(null);
    const timers = useRef([]);
    const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const theme = themeKey === "custom" ? custom : THEMES[themeKey];
    const p = useMemo(() => derive(theme), [theme]);
    const activeG = byKey(gesture);
    const partsOn = PARTS.filter((part) => parts[part.key]).length;
    const zone = solveZone(solve);
    const solveColor = SOLVE_RAMP[
      Math.min(SOLVE_RAMP.length - 1, Math.floor((solve / 100) * SOLVE_RAMP.length))
    ];
    const stageBg = transparent
      ? undefined
      : `radial-gradient(640px 430px at 50% 120%, ${rgba(p.accent, 0.22)}, transparent 62%), ${theme.stage}`;

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
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const track = cfg.eyeTrack || {
        l: body.face.eyeL,
        r: body.face.eyeR,
        y: body.face.eyeY,
      };
      const aim = (ref, cx) => {
        if (!ref.current) return;
        const dx = clamp((sx - cx) * 0.08, -5, 5);
        const dy = clamp((sy - track.y) * 0.06, -4, 4);
        ref.current.setAttribute("transform", `translate(${dx},${dy})`);
      };
      aim(pupilL, track.l);
      aim(pupilR, track.r);
    }, [paused, activeG.track, cfg.eyeTrack, body.face.eyeL, body.face.eyeR, body.face.eyeY]);

    const delight = useCallback(() => {
      if (paused) return;
      const kinds = ["star", "plus", "dot"];
      const burst = Array.from({ length: 7 }, (_, i) => {
        const ang = (Math.PI * 2 * i) / 7 + Math.random() * 0.4;
        const dist = 40 + Math.random() * 70;
        return {
          key: `${Date.now()}-${i}`,
          kind: kinds[i % kinds.length],
          color: i % 2 ? BRAND : p.accent,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist - 20,
          rot: Math.random() * 60 - 30,
        };
      });
      setSparks(burst);
      later(() => setSparks([]), 1000);
    }, [paused, p.accent]);

    useEffect(() => {
      if (!["celebrate", "success", "dancing"].includes(gesture) || paused) return;
      delight();
      const iv = setInterval(delight, 1500);
      return () => clearInterval(iv);
    }, [gesture, paused, delight]);

    const swatchBg = (t) =>
      `linear-gradient(135deg, ${t.body} 0 55%, ${t.belly} 55% 78%, ${t.accent} 78% 100%)`;

    return (
      <div className="nu-root">
        <style>{SHELL_CSS}</style>

        <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2 pt-8">
          <div style={{
            width: 52, height: 52, borderRadius: 16, background: rgba(BRAND, 0.13),
            border: `1px solid ${rgba(BRAND, 0.4)}`, display: "grid", placeItems: "center",
          }}>
            <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
              <path d="M20,7 C27,7 31,12 31,18 C31,22 29,25 26,26 L14,26 C11,25 9,22 9,18 C9,12 13,7 20,7 Z"
                fill={BRAND} />
              <g stroke={BRAND} strokeWidth="2.6" strokeLinecap="round" fill="none">
                <path d="M12,25 Q8,30 9,35" /><path d="M16,26 Q14,31 15,36" />
                <path d="M24,26 Q26,31 25,36" /><path d="M28,25 Q32,30 31,35" />
              </g>
              <circle cx="16" cy="17" r="3" fill="#191A2E" />
              <circle cx="24" cy="17" r="3" fill="#191A2E" />
            </svg>
          </div>
          <div>
            <h1 className="nu-display" style={{ fontSize: 24, fontWeight: 640 }}>
              {cfg.name} <span style={{ color: BRAND }}>·</span> {cfg.product}
            </h1>
            <p style={{ fontSize: 13, color: "#B5AC9A" }}>
              {cfg.tagline}
            </p>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_400px]">
          <section className="nu-card flex flex-col gap-4 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="nu-eyebrow">Stage</h2>
              <div className="flex gap-2">
                <button type="button" className={`nu-pill ${transparent ? "on" : ""}`}
                  onClick={() => setTransparent(true)} aria-pressed={transparent}>
                  Transparent
                </button>
                <button type="button" className={`nu-pill ${!transparent ? "on" : ""}`}
                  onClick={() => setTransparent(false)} aria-pressed={!transparent}>
                  In-app
                </button>
              </div>
            </div>

            <div
              data-mascot-stage
              className={`relative overflow-hidden rounded-2xl ${transparent ? "nu-checker" : ""}`}
              style={{ background: stageBg, minHeight: 440 }}
              onPointerMove={onTrack}
              onPointerDown={delight}
            >
              <div className="mx-auto" style={{ maxWidth: 350, padding: "10px 10px 0" }}>
                <OctopusSVG
                  p={p}
                  glow={glow}
                  solve={solve}
                  parts={parts}
                  paused={paused}
                  gesture={gesture}
                  g={activeG}
                  svgRef={svgRef}
                  eyeRefs={{ l: pupilL, r: pupilR }}
                  character={character}
                  chipSymbols={CHIP_SYMBOLS}
                  writingGlyph={writingGlyph}
                  body={body}
                />
              </div>
              {sparks.map((spark) => (
                <span key={spark.key} className="nu-spark"
                  style={{ left: "50%", top: "52%", "--dx": `${spark.dx}px`, "--dy": `${spark.dy}px` }}>
                  <svg width="15" height="15" viewBox="-8 -8 16 16"
                    style={{ transform: `rotate(${spark.rot}deg)` }}>
                    <path d={SPARK_PATHS[spark.kind]} fill={spark.color} />
                  </svg>
                </span>
              ))}
            </div>

            <p style={{ fontSize: 12.5, color: "#B5AC9A", textAlign: "center" }}>
              {solveCfg.dragHint}
              &nbsp;·&nbsp; tap for bounce &amp; sparks &nbsp;·&nbsp;
              {activeG.track ? "eyes follow your cursor" : "this pose locks gaze"}
            </p>

            <div className="mt-2 flex flex-col gap-5 border-t pt-5"
              style={{ borderColor: `${BRAND}29` }}>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="nu-eyebrow">Elements</h3>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 12, color: "#B5AC9A" }}>{partsOn}/{PARTS.length}</span>
                    <button type="button" className="nu-tiny" onClick={() => setParts(allParts(true))}>All</button>
                    <button type="button" className="nu-tiny" onClick={() => setParts(allParts(false))}>None</button>
                    <button type="button" className="nu-tiny" onClick={() => setParts(DEFAULT_PARTS)}>Reset</button>
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: "#B5AC9A", lineHeight: 1.5 }}>
                  Toggle parts on/off instantly. Hidden parts stay available to add back.
                </p>
              </div>
              <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
                {PART_CATEGORIES.map((cat) => {
                  const list = PARTS.filter((part) => part.category === cat);
                  if (!list.length) return null;
                  return (
                    <div key={cat}>
                      <div style={{
                        fontSize: 10, letterSpacing: ".16em", color: "#8D8472",
                        textTransform: "uppercase", marginBottom: 6,
                      }}>{cat}</div>
                      <div className="flex flex-wrap gap-2">
                        {list.map((part) => {
                          const on = parts[part.key];
                          return (
                            <button key={part.key} type="button"
                              className={`nu-pill ${on ? "on" : ""}`}
                              aria-pressed={on}
                              onClick={() => setParts((v) => ({ ...v, [part.key]: !v[part.key] }))}
                              style={!on ? { opacity: 0.55, textDecoration: "line-through" } : undefined}
                            >{part.label}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="nu-card flex flex-col gap-6 p-5 sm:p-6">
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="nu-eyebrow">{solveCfg.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: solveColor }}>
                  {Math.round(solve)} · {zone}
                </span>
              </div>
              <input type="range" min={0} max={100} step={1} value={solve}
                className="nu-range w-full"
                onChange={(e) => setSolve(Number(e.target.value))}
                style={{ background: `linear-gradient(90deg, ${SOLVE_RAMP.join(",")})` }} />
              <div className="flex justify-between"
                style={{ fontSize: 10.5, color: "#8D8472", marginTop: 5 }}>
                <span>{solveCfg.zones[0]}</span>
                <span>{solveCfg.zones[1]}</span>
                <span>{solveCfg.zones[2]}</span>
              </div>
              <p style={{ fontSize: 11.5, color: "#8D8472", marginTop: 7, lineHeight: 1.5 }}>
                {solveCfg.hint}
              </p>
            </div>

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="nu-eyebrow">Gesture</span>
                <span style={{ fontSize: 11, color: "#8D8472" }}>{GESTURES.length} poses</span>
              </div>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map((cat) => (
                  <div key={cat}>
                    <div style={{
                      fontSize: 10, letterSpacing: ".16em", color: "#8D8472",
                      textTransform: "uppercase", margin: "4px 0 6px 2px",
                    }}>{cat}</div>
                    <div className="flex flex-wrap gap-2">
                      {GESTURES.filter((g) => g.cat === cat).map((g) => (
                        <button key={g.key} type="button" title={g.tip}
                          className={`nu-pill ${gesture === g.key ? "on" : ""}`}
                          onClick={() => { setGesture(g.key); setSolve(g.solve ?? 62); }}
                        >{g.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{
                marginTop: 12, padding: "11px 13px", borderRadius: 12,
                background: "rgba(255,246,230,.045)", border: `1px solid ${rgba(BRAND, 0.16)}`,
              }}>
                <div className="nu-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                  {activeG.use}
                </div>
                <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>
                  {activeG.tip}
                </p>
              </div>
            </div>

            <div>
              <div className="nu-eyebrow mb-3">
                Theme{" "}
                <span style={{ color: "#8D8472", textTransform: "none", letterSpacing: 0 }}>
                  (mantle / belly; the {solveCfg.label.toLowerCase()} ramp stays product-fixed)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button key={key} type="button" title={t.name}
                    className={`nu-swatch ${themeKey === key ? "on" : ""}`}
                    style={{ background: swatchBg(t) }}
                    onClick={() => setThemeKey(key)} />
                ))}
                <button type="button" title="Custom"
                  className={`nu-swatch ${themeKey === "custom" ? "on" : ""}`}
                  style={{
                    background: swatchBg(custom), display: "grid", placeItems: "center",
                    color: "#251603", fontWeight: 800,
                  }}
                  onClick={() => setThemeKey("custom")}>+</button>
              </div>
              {themeKey === "custom" && (
                <div className="mt-3 flex flex-wrap gap-4">
                  {[["body", "Body"], ["belly", "Belly"], ["slate", "Slate"], ["accent", "Accent"]].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2"
                      style={{ fontSize: 12, color: "#C6BCA7" }}>
                      <input type="color" value={custom[k]}
                        onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                        style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer" }} />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="nu-eyebrow">{cfg.glowLabel}</span>
                <span style={{ fontSize: 12, color: "#C6BCA7" }}>{Math.round(glow * 100)}%</span>
              </div>
              <input type="range" min={0} max={1} step={0.05} value={glow}
                className="nu-range w-full" style={{ background: "#3A3548" }}
                onChange={(e) => setGlow(Number(e.target.value))} />
            </div>

            <div className="flex items-center justify-between">
              <span className="nu-eyebrow">Motion</span>
              <button type="button" className={`nu-pill ${paused ? "" : "on"}`}
                onClick={() => setPaused((v) => !v)}>
                {paused ? "Paused" : "Playing"}
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return { default: Studio, POSE_SOURCE };
}
