"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { MascotPartsPanel } from "@/components/mascot-edit-panel";
import { useStudioPartToggles } from "@/hooks/use-studio-part-toggles";
import { FANOUS_PARTS } from "@/lib/legacy-example-parts";

/* ============================================================
   FANOUS: animated lantern mascot studio for an Islamic app
   v3, traced 1:1 against the reference artwork
   • Resting face IS the artwork's wink; smooth bell dome;
     chunky mitten arms tucked behind the body; stadium rings
   • All shape-critical animations are SMIL (<animateTransform>)
     so they render identically in every browser AND inside the
     exported .svg, with no CSS transform-origin traps
   • Idle: float, blink, arm sway, glow pulse, ground shadow
     Hover: wave · Tap: grin + squash-bounce + wave burst
     (tap even works inside the exported SVG when inlined)
   ============================================================ */

/* ---------- color utilities ---------- */
const hx = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = (r, g, b) =>
  "#" + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => {
  const [r1, g1, b1] = hx(a), [r2, g2, b2] = hx(b);
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
const light = (c, t) => mix(c, "#ffffff", t);
const dark = (c, t) => mix(c, "#000000", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---------- theme presets (teal = the reference artwork) ---------- */
const THEMES = {
  teal:     { name: "Midnight Teal",  body: "#1C3340", accent: "#DFA92F", face: "#F5C74C", stage: "#33707A" },
  violet:   { name: "Ramadan Violet", body: "#2E2160", accent: "#F3BE5E", face: "#FFDD93", stage: "#171034" },
  emerald:  { name: "Emerald Mosque", body: "#0F3D32", accent: "#D9B24C", face: "#FFE59A", stage: "#0B2B24" },
  moon:     { name: "Moonlight",      body: "#10264F", accent: "#C9D6EA", face: "#EAF4FF", stage: "#0A1830" },
  desert:   { name: "Desert Amber",   body: "#6E3A1F", accent: "#E8A94E", face: "#FFE9BF", stage: "#3B2113" },
  rose:     { name: "Rose Dusk",      body: "#5A2340", accent: "#F0A75F", face: "#FFD9A0", stage: "#33122A" },
};
const GOLD = "#E8B54B";
const INK = "#0A0F1C";

const derive = (t) => ({
  ...t,
  features: dark(t.body, 0.3),
  faceEdge: dark(t.face, 0.22),
  blush: mix(t.face, "#E4573D", 0.55),
  glowC: light(t.face, 0.12),
});

/* ---------- the ONLY CSS animations kept are origin-free
     (translation / opacity), so they can't shift geometry ---------- */
const SVG_CSS = `
  .lm-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .lm-g-sleep{--gf:.34}
  .lm-g-sad{--gf:.5}
  .lm-g-adhan{--gf:1.6}
  .lm-g-dua{--gf:1.5}
  .lm-g-celebrate{--gf:1.35}
  .lm-float{animation:lm-float 3.8s ease-in-out infinite}
  .lm-g-sleep .lm-float{animation-duration:7s}
  .lm-g-sad .lm-float{animation:none}
  .lm-g-celebrate .lm-float{animation-duration:1.9s}
  .lm-shadowO{animation:lm-shadowO 3.8s ease-in-out infinite}
  .lm-glow{animation:lm-glow 3.2s ease-in-out infinite}
  .lm-g-adhan .lm-glow{animation-duration:1.15s}
  .lm-wave-on .lm-glow{animation-duration:1.6s}
  .lm-gleam{animation:lm-gleam 6s ease-in-out infinite}
  .lm-eyes{transition:transform .12s ease-out}
  .lm-pop{animation:lm-pop .3s ease-out}
  .lm-moonBob{animation:lm-moonBob 3.4s ease-in-out infinite}
  .lm-ring{animation:lm-ring 1.15s ease-out infinite}
  .lm-zzz{animation:lm-zzz 3.3s ease-in-out infinite}
  .lm-tear{animation:lm-tear 2.8s ease-in infinite}
  .lm-ray{animation:lm-ray 2.6s ease-in-out infinite}
  .lm-point{animation:lm-point 1.6s ease-in-out infinite}
  .lm-svg[data-paused] *{animation-play-state:paused !important}
  @keyframes lm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes lm-shadowO{0%,100%{opacity:.22}50%{opacity:.12}}
  @keyframes lm-glow{0%,100%{opacity:calc(var(--g,.4)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.4)*var(--gf,1))}}
  @keyframes lm-gleam{0%,26%,100%{transform:translateX(-88px);opacity:0}8%{opacity:.45}16%{transform:translateX(88px);opacity:0}}
  @keyframes lm-pop{from{opacity:0}to{opacity:1}}
  @keyframes lm-moonBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes lm-ring{0%,74%,100%{opacity:0}18%{opacity:.95}55%{opacity:0}}
  @keyframes lm-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-28px)}}
  @keyframes lm-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(50px)}}
  @keyframes lm-ray{0%,100%{opacity:.12;transform:translateY(5px)}50%{opacity:.8;transform:translateY(-5px)}}
  @keyframes lm-point{0%,100%{transform:translateX(0)}50%{transform:translateX(7px)}}
  .lm-g-angry{--gf:.8}
  .lm-g-pale{--gf:.42}
  .lm-g-dying{--gf:.15}
  .lm-g-overjoyed{--gf:1.4}
  .lm-g-eid{--gf:1.3}
  .lm-g-pale .lm-float{animation-duration:6.6s}
  .lm-g-dying .lm-float{animation:none}
  .lm-g-overjoyed .lm-float{animation-duration:1.7s}
  .lm-fall{animation:lm-fall 2.8s linear infinite}
  .lm-rise{animation:lm-rise 2.6s ease-out infinite}
  .lm-swing{animation:lm-swing 2.2s ease-in-out infinite}
  .lm-clap{animation:lm-clapK .55s ease-out infinite}
  .lm-burst{animation:lm-burstK 1.1s ease-out infinite}
  .lm-throb{animation:lm-throbK 1s ease-in-out infinite}
  .lm-steam{animation:lm-steamK 2s ease-out infinite}
  .lm-sweatD{animation:lm-sweatK 2.2s ease-in infinite}
  .lm-smoke{animation:lm-smokeK 3s ease-out infinite}
  .lm-dot{animation:lm-dotK 1.2s ease-in-out infinite}
  .lm-write{animation:lm-writeK 1.6s ease-in-out infinite}
  .lm-bead{animation:lm-throbK 1.4s ease-in-out infinite}
  @keyframes lm-fall{0%{transform:translateY(-26px);opacity:0}12%{opacity:1}82%{opacity:.9}100%{transform:translateY(150px);opacity:0}}
  @keyframes lm-rise{0%{transform:translateY(14px);opacity:0}22%{opacity:1}100%{transform:translateY(-48px);opacity:0}}
  @keyframes lm-swing{0%,100%{transform:translateX(-5px)}50%{transform:translateX(5px)}}
  @keyframes lm-clapK{0%{opacity:0}22%{opacity:1}100%{opacity:0}}
  @keyframes lm-burstK{0%{opacity:.15}35%{opacity:1}100%{opacity:.15}}
  @keyframes lm-throbK{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes lm-steamK{0%{transform:translateY(6px);opacity:0}30%{opacity:.6}100%{transform:translateY(-28px);opacity:0}}
  @keyframes lm-sweatK{0%{transform:translateY(-4px);opacity:0}18%{opacity:1}100%{transform:translateY(32px);opacity:0}}
  @keyframes lm-smokeK{0%{transform:translateY(8px);opacity:0}25%{opacity:.8}100%{transform:translateY(-36px);opacity:0}}
  @keyframes lm-dotK{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes lm-writeK{0%,100%{transform:translate(0,0)}22%{transform:translate(-6px,2px)}45%{transform:translate(-3px,0)}72%{transform:translate(-9px,2px)}}
`;

/* ---------- gold band: pure stadium shape, exactly like the artwork ---------- */
const Band = ({ x, y, w, h, p, depth }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={h / 2}
      fill={depth ? "url(#lm-goldG)" : p.accent} />
    {depth && (
      <>
        <rect x={x + 8} y={y + 2.5} width={w - 16} height={h * 0.24} rx={h * 0.12}
          fill="#ffffff" opacity=".35" />
        <rect x={x + 7} y={y + h - 4.5} width={w - 14} height="3" rx="1.5"
          fill="#000000" opacity=".16" />
      </>
    )}
  </g>
);

/* ============================================================
   THE MASCOT
   Geometry notes (all traced from the reference):
   • bell dome: vertical at the rim, rounding into a broad crown
   • body tapers gently to the waist; face rim margins thin
     toward the bottom exactly like the artwork
   • arms: 39-wide round-capped strokes, shoulders tucked fully
     behind the body so the silhouette never flares
   • resting expression: left-eye wink + tilted right eye +
     smile a touch right of center
   ============================================================ */
/* ============================================================
   GESTURE LIBRARY: 30 poses
   Every pose is a whole performance: arms, eyes, brows, mouth,
   gaze, posture, glow, face tint and a prop.

   SHOULDERS. The artwork's own arms sit at different heights
   (L y331, R y303) because one is up and one is down. That
   asymmetry is why mirrored poses used to come out uneven.
   So only `idle` uses the traced pivots; every other pose uses
   a symmetric pair and mirrors one path onto the other, which
   makes both hands identical in length and dead level.
   ============================================================ */
const SH_L = [113.1, 318], SH_R = [306.9, 318];      /* symmetric */
const SH_L_ART = [113.1, 331.2], SH_R_ART = [309.7, 303.3]; /* traced */

/* mirror a left-arm path onto the right shoulder: negate every x */
const mir = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${-parseFloat(x)},${y}`);

/* named arm poses, written for the LEFT shoulder in its local space */
const A = {
  down:     "M0,0 Q-14,28 -20,56",
  limp:     "M0,0 Q-6,28 -16,56",
  tuck:     "M0,0 Q10,24 24,40",       /* parked behind the body */
  out:      "M0,0 Q-42,-8 -74,-6",
  outLow:   "M0,0 Q-40,14 -72,14",
  upWide:   "M0,0 Q-48,-22 -60,-60",
  upHigh:   "M0,0 Q-44,-34 -46,-78",
  raise:    "M0,0 Q-32,-36 -20,-74",
  upNarrow: "M0,0 Q-36,-30 -28,-70",
};

const GESTURES = [
  /* ---------------- core ---------------- */
  {
    key: "idle", label: "Idle", cat: "Core", use: "Home screen", art: true,
    tip: "Resting companion. He floats, blinks, sways and follows your cursor.",
    armL: "M0,0 Q-46.4,-35.7 -58.8,-47.6", armR: "M0,0 Q34.8,51.3 34.3,45.8",
    eyeL: "arch", eyeR: "open", mouth: "smile", track: true,
  },
  {
    key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "One palm up and flapping, the other resting.",
    armL: A.raise, armR: A.down, wave: true,
    eyeL: "arch", eyeR: "open", mouth: "smile",
  },
  {
    key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Both eyes creased shut and an easy grin. Plain contentment.",
    armL: A.down, armR: mir(A.down),
    eyeL: "arch", eyeR: "arch", mouth: "grin",
  },
  {
    key: "thinking", label: "Thinking", cat: "Core", use: "Loading · reflecting",
    tip: "Hand to the chin, eyes cast up, thought bubble ticking over.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "open", eyeR: "open", brow: "oneUp", mouth: "flat",
    look: [5, -7], prop: "think",
  },
  {
    key: "confused", label: "Confused", cat: "Core", use: "Error · not found",
    tip: "One brow up, a crooked mouth, question mark hanging overhead.",
    armL: A.down, armR: mir(A.tuck), bow: -4,
    eyeL: "open", eyeR: "small", brow: "oneUp", mouth: "smirk",
    look: [4, -3], prop: "question",
  },

  /* ---------------- prayer ---------------- */
  {
    key: "salaam", label: "Salaam", cat: "Prayer", use: "App open · onboarding",
    tip: "He raises a palm, closes his eyes and bows.",
    armL: A.raise, armR: mir(A.down),
    eyeL: "arch", eyeR: "arch", mouth: "smile", bow: 6,
  },
  {
    key: "dua", label: "Dua", cat: "Prayer", use: "After a prayer is logged",
    tip: "With both palms raised dead level and his eyes closed, the light rises.",
    armL: A.upWide, armR: mir(A.upWide),
    eyeL: "arch", eyeR: "arch", mouth: "serene", prop: "rays",
  },
  {
    key: "adhan", label: "Adhan", cat: "Prayer", use: "Prayer time alert",
    tip: "He rocks as the bell rings out, mouth open, eyes wide.",
    armL: A.out, armR: mir(A.out),
    eyeL: "wide", eyeR: "wide", brow: "up", mouth: "o", prop: "rings", sway: true,
  },
  {
    key: "calling", label: "Call to prayer", cat: "Prayer", use: "Muezzin · adhan playing",
    tip: "Hands cupped either side of the mouth, voice carrying.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "arch", brow: "up", mouth: "open", prop: "call",
  },
  {
    key: "qibla", label: "Qibla", cat: "Prayer", use: "Compass screen",
    tip: "Brows set, eyes cut to the arrow. He's pointing the way.",
    armL: A.down, armR: mir(A.out),
    eyeL: "focus", eyeR: "focus", brow: "focus", mouth: "flat",
    look: [5, 0], prop: "arrow",
  },
  {
    key: "guiding", label: "Guiding", cat: "Prayer", use: "Tutorial · next step",
    tip: "Come this way. Open palm, warm face, a soft trail of arcs.",
    armL: A.down, armR: mir(A.out),
    eyeL: "arch", eyeR: "open", mouth: "smile", look: [4, 0], prop: "beckon",
  },
  {
    key: "recite", label: "Recite", cat: "Prayer", use: "Quran · adhkar",
    tip: "He holds an open mushaf up, eyes down on the page.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "open", eyeR: "open", mouth: "serene", look: [0, 7], prop: "book",
  },
  {
    key: "dhikr", label: "Dhikr", cat: "Prayer", use: "Tasbih counter",
    tip: "Tasbih beads turning, eyes closed, mouth quiet.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "arch", mouth: "serene", prop: "beads",
  },
  {
    key: "shahada", label: "Shahada", cat: "Prayer", use: "Testimony · revert flow",
    tip: "Index finger raised for the testimony, face serene, glow lifted.",
    armL: A.down, armR: mir(A.upNarrow), finger: "index", fingerAt: [28, -70],
    eyeL: "arch", eyeR: "arch", mouth: "serene",
  },
  {
    key: "fasting", label: "Fasting", cat: "Prayer", use: "Ramadan · sawm",
    tip: "Hands folded and mouth closed. Crescent overhead, light banked.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "arch", mouth: "tiny", prop: "fast",
  },
  {
    key: "eid", label: "Eid", cat: "Prayer", use: "Eid al-Fitr · Eid al-Adha",
    tip: "A festival lantern in hand, crescent above, confetti coming down.",
    armL: A.upWide, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "arch", mouth: "bigGrin", prop: "eid",
  },

  /* ---------------- positive ---------------- */
  {
    key: "praise", label: "Well done", cat: "Positive", use: "Streak kept · goal met",
    tip: "Both mittens clapping, impact lines flying.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "arch", mouth: "grin", prop: "clap",
  },
  {
    key: "thumbsup", label: "Thumbs up", cat: "Positive", use: "Approval · confirm",
    tip: "A closed fist with a short, fat thumb up. Reads as a thumb, nothing else.",
    armL: A.down, armR: mir(A.upNarrow), finger: "thumb", fingerAt: [28, -70],
    eyeL: "arch", eyeR: "open", mouth: "grin",
  },
  {
    key: "celebrate", label: "Celebrate", cat: "Positive", use: "Milestones",
    tip: "Arms flung wide, confetti falling, sparkles everywhere.",
    armL: A.upWide, armR: mir(A.upWide),
    eyeL: "arch", eyeR: "arch", mouth: "bigGrin", prop: "confetti",
  },
  {
    key: "overjoyed", label: "Overjoyed", cat: "Positive", use: "Big win · perfect week",
    tip: "Star eyes, arms up high, bursting on the spot.",
    armL: A.upHigh, armR: mir(A.upHigh),
    eyeL: "star", eyeR: "star", mouth: "bigGrin", prop: "burst",
  },
  {
    key: "grateful", label: "Grateful", cat: "Positive", use: "Thanks · shukr",
    tip: "Heart eyes and hands held to the chest, with a heart lifting away.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "heart", eyeR: "heart", mouth: "serene", prop: "heart",
  },
  {
    key: "charity", label: "Charity", cat: "Positive", use: "Sadaqah · donate",
    tip: "He offers a coin on an open palm.",
    armL: A.down, armR: mir(A.out),
    eyeL: "arch", eyeR: "open", mouth: "smile", prop: "coin",
  },

  /* ---------------- negative ---------------- */
  {
    key: "sad", label: "Sad", cat: "Negative", use: "Missed prayer, gently",
    tip: "Brows peaked, a frown, arms limp, one tear. Never shaming.",
    armL: A.limp, armR: mir(A.limp),
    eyeL: "sad", eyeR: "sad", brow: "sad", mouth: "frown", prop: "tear",
  },
  {
    key: "angry", label: "Angry", cat: "Negative", use: "Warning · blocked",
    tip: "Brows driven down, teeth gritted, vein popping, steam off the top.",
    armL: A.outLow, armR: mir(A.outLow), shake: true,
    eyeL: "glare", eyeR: "glare", brow: "angry", mouth: "gritted", prop: "steam",
    tint: "#E0584A", tintO: 0.22,
  },
  {
    key: "pale", label: "Pale", cat: "Negative", use: "Unwell · sync failed",
    tip: "Gone pale. Hollow eyes, wobbling mouth, cold sweat, all the colour drained.",
    armL: A.limp, armR: mir(A.limp), drain: "pale", hatch: true,
    eyeL: "pin", eyeR: "pin", brow: "sad", mouth: "wobble",
    prop: "sweat", tint: "#8FB4D6", tintO: 0.3,
  },
  {
    key: "dying", label: "Dying", cat: "Negative", use: "Battery dead · offline",
    tip: "The light is going out. X eyes, slack jaw, grey, one wisp of smoke.",
    armL: A.limp, armR: mir(A.limp), drain: "dead", bow: 7,
    eyeL: "xx", eyeR: "xx", mouth: "dead",
    prop: "dead", tint: "#8E9AA8", tintO: 0.34,
  },
  {
    key: "sleep", label: "Sleep", cat: "Negative", use: "Isha → Fajr",
    tip: "Lids down, breathing slowed, glow banked, a Zzz drifting off.",
    armL: A.limp, armR: mir(A.limp),
    eyeL: "sleep", eyeR: "sleep", mouth: "tiny", prop: "zzz",
  },

  /* ---------------- action ---------------- */
  {
    key: "writing", label: "Writing", cat: "Action", use: "Journal · notes",
    tip: "Pen to the pad, eyes down on the line.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "open", eyeR: "open", mouth: "serene", look: [0, 7], prop: "pen",
  },
  {
    key: "focused", label: "Focused", cat: "Action", use: "Deep work · streak",
    tip: "Locked in. Narrowed eyes, level brows, one bead of sweat.",
    armL: A.tuck, armR: mir(A.tuck),
    eyeL: "focus", eyeR: "focus", brow: "focus", mouth: "flat", prop: "focusFx",
  },
  {
    key: "announce", label: "Announce", cat: "Action", use: "Updates · new feature",
    tip: "Megaphone up, mouth wide, words carrying.",
    armL: A.down, armR: mir(A.tuck),
    eyeL: "arch", eyeR: "open", brow: "up", mouth: "open", prop: "mega",
  },
];
const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Prayer", "Positive", "Negative", "Action"];

/* ---------- face parts ---------- */
const EYE_L_X = 171.5, EYE_R_X = 246.7, EYE_Y = 260.7;
const HEART_D = "M0,13 C-17,1 -19,-10 -10,-15.5 C-4,-19 0,-13.5 0,-9 C0,-13.5 4,-19 10,-15.5 C19,-10 17,1 0,13 Z";

function Eye({ kind, x, p, dOnly, side }) {
  const line = { fill: "none", stroke: p.features, strokeWidth: 10, strokeLinecap: "round" };
  const at = `translate(${x},${EYE_Y})`;
  const s = side === "L" ? 1 : -1;   /* so lids/glares mirror correctly */
  /* closed & happy: the artwork's own wink arch */
  if (kind === "arch") return <path d="M-17.9,4.5 Q0.5,-17.1 17.8,4.3" transform={at} {...line} />;
  if (kind === "sleep") return <path d="M-17.9,-5 Q0.5,16.5 17.8,-5" transform={at} {...line} />;
  if (kind === "star")
    return <path transform={at} fill={p.features}
      d="M0,-20 L4.8,-4.8 L20,0 L4.8,4.8 L0,20 L-4.8,4.8 L-20,0 L-4.8,-4.8 Z" />;
  if (kind === "heart")
    return <path transform={`${at} scale(0.92)`} fill={p.features} d={HEART_D} />;
  if (kind === "xx")
    return (
      <g transform={at} stroke={p.features} strokeWidth="8" strokeLinecap="round">
        <path d="M-11,-11 L11,11" /><path d="M11,-11 L-11,11" />
      </g>
    );
  if (kind === "blank")
    return <ellipse cx="0" cy="0" rx="11.8" ry="17.7" transform={at}
      fill="none" stroke={p.features} strokeWidth="4.5" />;
  if (kind === "pin")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="12.6" ry="18.5" fill="#FDFCF4"
          stroke={p.features} strokeWidth="4" />
        <circle cx="0" cy="2" r="3.7" fill={p.features} />
      </g>
    );
  if (kind === "glare")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="11.8" ry="17.7" fill={p.features} />
        {/* heavy lid driving inward: the anger read */}
        <path d={`M${-17 * s},-16 L${16 * s},-5`} stroke={p.face} strokeWidth="15" strokeLinecap="round" />
      </g>
    );
  const rx = kind === "wide" ? 13.6 : kind === "sad" ? 11 : kind === "small" ? 8 : 11.8;
  const ry = kind === "wide" ? 20.4 : kind === "focus" ? 11.4 : kind === "sad" ? 13.5
    : kind === "small" ? 10 : 17.7;
  return (
    <g transform={at}>
      {kind === "open" && (
        <>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.9;0.922;0.945;1"
            dur="5.4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="lm-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={p.features} />
      <circle cx="-4" cy="-6.5" r="3.2" fill="#ffffff" opacity=".9" style={dOnly} />
    </g>
  );
}

/* brows carry most of the emotion: sad peaks inward, angry drives inward */
function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    sad:   ["M152,241 Q164,230 189,228", "M231,228 Q256,230 268,241"],
    focus: ["M153,229 Q167,231 190,240", "M230,240 Q253,231 267,229"],
    angry: ["M152,224 Q170,231 191,245", "M229,245 Q250,231 268,224"],
    up:    ["M152,231 Q171,219 190,229", "M230,229 Q249,219 268,231"],
    oneUp: ["M152,238 Q171,234 190,238", "M230,233 Q249,219 268,229"],
  }[kind];
  return (
    <g fill="none" stroke={p.features} strokeWidth="7.5" strokeLinecap="round">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p }) {
  const s = { fill: "none", stroke: p.features, strokeWidth: 8.5, strokeLinecap: "round" };
  if (kind === "smile")
    return (
      <>
        {/* the artwork's smile, swapped for a grin on tap */}
        <path d="M185.7,294.2 Q210,320.5 234.3,294.5" {...s}>
          <animate attributeName="opacity" values="1;0;0;1" keyTimes="0;0.05;0.88;1"
            begin="lm-hit.click" dur="1s" fill="remove" />
        </path>
        <path d="M183,293 Q210,325 237,293.5 Q210,303 183,293 Z" fill={p.features} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.88;1"
            begin="lm-hit.click" dur="1s" fill="remove" />
        </path>
      </>
    );
  if (kind === "serene") return <path d="M192,296 Q210,312 228,296" {...s} />;
  if (kind === "grin") return <path d="M183,293 Q210,325 237,293.5 Q210,303 183,293 Z" fill={p.features} />;
  if (kind === "bigGrin")
    return (
      <g>
        <path d="M176,289 Q210,337 244,289.5 Q210,301 176,289 Z" fill={p.features} />
        <path d="M196,331 Q210,341 224,331 Q210,327 196,331 Z" fill={p.blush} opacity=".85" />
      </g>
    );
  if (kind === "o") return <ellipse cx="210" cy="304" rx="11.5" ry="15.5" fill={p.features} />;
  if (kind === "open")
    return (
      <g>
        <ellipse cx="210" cy="306" rx="19" ry="22" fill={p.features} />
        <path d="M198,320 Q210,312 222,320 Q210,330 198,320 Z" fill={p.blush} opacity=".8" />
      </g>
    );
  if (kind === "flat") return <path d="M194,300 Q210,306 226,300" {...s} />;
  if (kind === "frown") return <path d="M187,310 Q210,287 233,310" {...s} />;
  if (kind === "tiny") return <path d="M201,302 Q210,309 219,302" {...s} />;
  if (kind === "smirk") return <path d="M188,299 Q206,314 232,295" {...s} />;
  if (kind === "wobble")
    return <path d="M184,301 Q193,292 202,301 Q211,310 220,301 Q229,292 237,300" {...s} strokeWidth="7" />;
  if (kind === "slack") return <ellipse cx="210" cy="309" rx="9.5" ry="12" fill={p.features} />;
  if (kind === "dead")
    return (
      <g>
        <ellipse cx="210" cy="305" rx="12" ry="13" fill={p.features} />
        <path d="M206,309 Q206,330 216,332 Q226,334 226,320 L226,310 Z"
          fill={p.blush} stroke={p.features} strokeWidth="3" strokeLinejoin="round" />
      </g>
    );
  if (kind === "gritted")
    return (
      <g>
        <path d="M182,295 Q210,286 238,295 Q210,320 182,295 Z" fill={p.features} />
        <g stroke={p.face} strokeWidth="3.2" strokeLinecap="round">
          <path d="M196,292 L196,307" /><path d="M210,290 L210,311" /><path d="M224,292 L224,307" />
        </g>
      </g>
    );
  return null;
}

/* ---------- props: the signal that removes all doubt ---------- */
const FrontArm = ({ d, p }) => (
  <path d={d} fill="none" stroke={p.body} strokeWidth="39" strokeLinecap="round" />
);
const Crescent = ({ p, x, y, s = 0.8, o = 0.9 }) => (
  <path d="M24,6 A15,15 0 1,0 24,34 A11.5,11.5 0 1,1 24,6 Z" fill={p.accent} opacity={o}
    transform={`translate(${x},${y}) scale(${s})`} />
);
const Drop = ({ x, y, s = 1, cls = "", col = "#9AD7EC", delay }) => (
  <g transform={`translate(${x},${y}) scale(${s})`}>
    <path className={cls} fill={col} opacity=".95"
      style={delay ? { animationDelay: delay } : undefined}
      d="M0,-14 Q10,-2.5 10,4.5 A10,10 0 1,1 -10,4.5 Q-10,-2.5 0,-14 Z" />
  </g>
);

function Props({ g, p }) {
  const acc = p.accent, ink = p.features;
  switch (g.prop) {
    case "rings":
      return (
        <g fill="none" stroke={acc} strokeLinecap="round">
          <path className="lm-ring" d="M243,63 Q252,78 243,93" strokeWidth="5" />
          <path className="lm-ring" d="M257,54 Q270,78 257,102" strokeWidth="5" style={{ animationDelay: ".18s" }} />
          <path className="lm-ring" d="M177,63 Q168,78 177,93" strokeWidth="5" />
          <path className="lm-ring" d="M163,54 Q150,78 163,102" strokeWidth="5" style={{ animationDelay: ".18s" }} />
        </g>
      );
    case "rays":
      return (
        <g fill="none" stroke={acc} strokeLinecap="round">
          <path className="lm-ray" d="M210,56 L210,20" strokeWidth="6" />
          <path className="lm-ray" d="M178,64 L163,34" strokeWidth="5" style={{ animationDelay: ".22s" }} />
          <path className="lm-ray" d="M242,64 L257,34" strokeWidth="5" style={{ animationDelay: ".22s" }} />
          <path className="lm-ray" d="M150,86 L129,64" strokeWidth="4.5" style={{ animationDelay: ".44s" }} />
          <path className="lm-ray" d="M270,86 L291,64" strokeWidth="4.5" style={{ animationDelay: ".44s" }} />
        </g>
      );
    case "call":
      /* cupped hands either side of the mouth + the voice carrying out both ways */
      return (
        <g>
          <FrontArm d="M112,352 Q136,340 158,318" p={p} />
          <FrontArm d="M308,352 Q284,340 262,318" p={p} />
          <g fill="none" stroke={acc} strokeLinecap="round">
            <path className="lm-ring" d="M104,282 Q92,304 104,326" strokeWidth="5" />
            <path className="lm-ring" d="M84,268 Q68,304 84,340" strokeWidth="5" style={{ animationDelay: ".2s" }} />
            <path className="lm-ring" d="M316,282 Q328,304 316,326" strokeWidth="5" />
            <path className="lm-ring" d="M336,268 Q352,304 336,340" strokeWidth="5" style={{ animationDelay: ".2s" }} />
          </g>
        </g>
      );
    case "arrow":
      return (
        <g className="lm-point">
          <path d="M382,270 L417,297 L382,324 L393,297 Z" fill={acc} />
          <path d="M366,285 L366,309" stroke={acc} strokeWidth="7" strokeLinecap="round" opacity=".5" />
        </g>
      );
    case "beckon":
      return (
        <g className="lm-point" fill="none" stroke={acc} strokeLinecap="round" opacity=".85">
          <path d="M368,282 Q382,300 368,318" strokeWidth="5.5" />
          <path d="M386,272 Q404,300 386,328" strokeWidth="5" opacity=".6" />
        </g>
      );
    case "book":
      return (
        <g>
          <path d="M210,358 C190,347 168,344 148,349 L148,391 C168,386 190,389 210,397 Z"
            fill="#F7EFD9" stroke={p.faceEdge} strokeWidth="3" strokeLinejoin="round" />
          <path d="M210,358 C230,347 252,344 272,349 L272,391 C252,386 230,389 210,397 Z"
            fill="#F7EFD9" stroke={p.faceEdge} strokeWidth="3" strokeLinejoin="round" />
          <g stroke={p.faceEdge} strokeWidth="2.4" strokeLinecap="round" opacity=".5">
            <path d="M162,361 L198,365" /><path d="M162,371 L198,375" /><path d="M170,381 L198,384" />
            <path d="M222,365 L258,361" /><path d="M222,375 L258,371" /><path d="M222,384 L250,381" />
          </g>
          <FrontArm d="M114,362 Q134,378 150,378" p={p} />
          <FrontArm d="M306,354 Q288,374 270,378" p={p} />
        </g>
      );
    case "beads":
      /* tasbih looping through a raised hand */
      return (
        <g>
          <FrontArm d="M306,354 Q288,368 272,362" p={p} />
          <path d="M266,368 Q244,404 210,404 Q176,404 154,368" fill="none"
            stroke={acc} strokeWidth="3" opacity=".6" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
            const t = i / 8, a = Math.PI * (1 - t);
            return <circle key={i} cx={210 + Math.cos(a) * 56} cy={368 + Math.sin(a) * 36} r="6.4" fill={acc} />;
          })}
          <circle className="lm-bead" cx="266" cy="368" r="8.4" fill={p.faceEdge} />
          <path d="M154,368 L146,392" stroke={acc} strokeWidth="3" opacity=".6" />
        </g>
      );
    case "fast":
      return (
        <g>
          <Crescent p={p} x={186} y={16} s={0.86} />
          <FrontArm d="M112,352 Q160,384 206,378" p={p} />
          <FrontArm d="M308,352 Q260,384 214,378" p={p} />
        </g>
      );
    case "eid":
      /* dressed for the festival: bow tie, pennant sash, handheld fanous,
         crescent overhead and confetti coming down */
      return (
        <g>
          <Crescent p={p} x={286} y={22} s={0.8} />
          {/* bow tie in the collar gap */}
          <g className="lm-throb">
            <path d="M210,199 L189,189.5 L189,208.5 Z" fill={p.blush} />
            <path d="M210,199 L231,189.5 L231,208.5 Z" fill={p.blush} />
            <circle cx="210" cy="199" r="5.5" fill={acc} />
          </g>
          {/* pennant sash draped across the belly */}
          <path d="M120,357 Q210,392 300,357" fill="none" stroke={acc}
            strokeWidth="3.5" opacity=".9" />
          {[[138, 369], [164, 375], [190, 380], [230, 380], [256, 375], [282, 369]].map(([x, y], i) => (
            <path key={i} d={`M${x - 6.5},${y} L${x + 6.5},${y} L${x},${y + 14} Z`}
              fill={[acc, p.face, p.blush][i % 3]} />
          ))}
          {/* his own little fanous, swinging from the raised hand */}
          <g className="lm-swing">
            <path d="M62,250 L62,266" stroke={acc} strokeWidth="3" />
            <path d="M46,266 L78,266 L84,300 L40,300 Z" fill={acc} opacity=".95" />
            <rect x="38" y="298" width="48" height="8" rx="4" fill={p.faceEdge} />
            <circle cx="62" cy="282" r="7" fill={p.face} />
          </g>
          {[[150, 116, 0], [268, 104, 0.5], [196, 92, 1], [318, 146, 1.5],
            [104, 156, 2], [236, 130, 2.5]].map(([x, y, d], i) => (
            <rect key={i} className="lm-fall" x={x} y={y} width="9" height="14" rx="2"
              fill={i % 2 ? p.face : acc} style={{ animationDelay: `${d}s` }} />
          ))}
          {[[130, 84, 0.3], [300, 70, 1.3], [352, 190, 2.3]].map(([x, y, d], i) => (
            <g key={i} transform={`translate(${x},${y}) scale(1.15)`}>
              <path className="lm-fall"
                d="M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z"
                fill={p.blush} style={{ animationDelay: `${d}s` }} />
            </g>
          ))}
        </g>
      );
    case "clap":
      /* both mittens meeting, no finger anywhere near this */
      return (
        <g>
          <FrontArm d="M110,350 Q150,382 190,382" p={p} />
          <FrontArm d="M310,350 Q270,382 230,382" p={p} />
          <g className="lm-clap" stroke={acc} strokeWidth="5" strokeLinecap="round" opacity=".9">
            <path d="M210,352 L210,338" /><path d="M178,358 L166,346" />
            <path d="M242,358 L254,346" /><path d="M156,374 L140,370" /><path d="M264,374 L280,370" />
          </g>
        </g>
      );
    case "confetti":
      return (
        <g>
          {[[132, 96, 0], [258, 84, 0.3], [188, 70, 0.6], [312, 128, 0.9],
            [92, 140, 1.2], [348, 176, 1.5], [156, 44, 1.8], [286, 40, 2.1]].map(([x, y, d], i) => (
            <rect key={i} className="lm-fall" x={x} y={y} width="9" height="15" rx="2"
              fill={[p.accent, p.face, p.blush][i % 3]} style={{ animationDelay: `${d}s` }} />
          ))}
        </g>
      );
    case "burst":
      return (
        <g className="lm-burst" stroke={acc} strokeWidth="6" strokeLinecap="round">
          {[[210, 42, 210, 12], [140, 70, 118, 44], [280, 70, 302, 44],
            [96, 148, 66, 132], [324, 148, 354, 132], [86, 226, 52, 222], [334, 226, 368, 222]]
            .map(([a, b, c, d], i) => <path key={i} d={`M${a},${b} L${c},${d}`} />)}
        </g>
      );
    case "heart":
      return (
        <g>
          <FrontArm d="M112,352 Q152,376 196,352" p={p} />
          <FrontArm d="M308,352 Q268,376 224,352" p={p} />
          <g transform="translate(300,150) scale(1.3)">
            <path className="lm-rise" d={HEART_D} fill={p.blush} />
          </g>
          <g transform="translate(334,110) scale(0.8)">
            <path className="lm-rise" d={HEART_D} fill={p.accent} opacity=".8"
              style={{ animationDelay: ".9s" }} />
          </g>
        </g>
      );
    case "coin":
      return (
        <g>
          <circle cx="382" cy="296" r="17" fill={acc} stroke={p.faceEdge} strokeWidth="3" />
          <Crescent p={p} x={374} y={286} s={0.44} o={1} />
          <g transform="translate(384,214) scale(0.62)">
            <path className="lm-rise" d={HEART_D} fill={p.blush} opacity=".9" />
          </g>
        </g>
      );
    case "tear":
      return <Drop cls="lm-tear" x={155} y={288} />;
    case "steam":
      return (
        <g>
          {/* anger vein: the manga mark, unmistakable */}
          <g stroke="#E05B4A" strokeWidth="5" strokeLinecap="round" fill="none" className="lm-throb">
            <path d="M139,222 L149,232 L139,242" /><path d="M155,222 L165,232 L155,242" />
          </g>
          <g fill={p.faceEdge} opacity=".55">
            <g className="lm-steam">
              <circle cx="92" cy="196" r="11" /><circle cx="106" cy="184" r="8" /><circle cx="80" cy="184" r="7" />
            </g>
            <g className="lm-steam" style={{ animationDelay: ".7s" }}>
              <circle cx="328" cy="188" r="11" /><circle cx="314" cy="176" r="8" /><circle cx="342" cy="176" r="7" />
            </g>
          </g>
        </g>
      );
    case "sweat":
      return (
        <g>
          <Drop cls="lm-sweatD" x={296} y={228} s={0.72} col="#BFE3F2" />
          <Drop cls="lm-sweatD" x={124} y={244} s={0.58} col="#BFE3F2" delay=".8s" />
        </g>
      );
    case "focusFx":
      return (
        <g>
          <Drop cls="lm-sweatD" x={294} y={230} s={0.62} col="#BFE3F2" />
          <g stroke={p.faceEdge} strokeWidth="4" strokeLinecap="round" opacity=".5">
            <path d="M118,238 L100,230" /><path d="M302,238 L320,230" />
          </g>
        </g>
      );
    case "dead":
      /* the flame just went out */
      return (
        <g>
          <path className="lm-smoke" d="M210,60 Q196,42 210,26 Q224,12 210,-6" fill="none"
            stroke="#B7C1CC" strokeWidth="5" strokeLinecap="round" opacity=".8" />
          <g className="lm-moonBob">
            <ellipse cx="210" cy="30" rx="27" ry="8.5" fill="none"
              stroke={acc} strokeWidth="5.5" opacity=".9" />
          </g>
        </g>
      );
    case "zzz":
      return (
        <g>
          <g className="lm-moonBob"><Crescent p={p} x={74} y={40} /></g>
          <g fill="none" stroke={acc} strokeLinecap="round" strokeLinejoin="round">
            <path className="lm-zzz" d="M266,88 L284,88 L266,106 L284,106" strokeWidth="5" />
            <path className="lm-zzz" d="M294,58 L308,58 L294,72 L308,72" strokeWidth="4.5"
              style={{ animationDelay: ".6s" }} />
            <path className="lm-zzz" d="M316,32 L327,32 L316,43 L327,43" strokeWidth="4"
              style={{ animationDelay: "1.2s" }} />
          </g>
        </g>
      );
    case "think":
      return (
        <g>
          <FrontArm d="M112,350 Q140,356 164,342" p={p} />
          <g fill={p.faceEdge} opacity=".92">
            <circle cx="316" cy="146" r="6" /><circle cx="334" cy="122" r="9" />
            <ellipse cx="360" cy="76" rx="34" ry="26" />
          </g>
          <g fill={p.body}>
            <circle className="lm-dot" cx="344" cy="76" r="4" />
            <circle className="lm-dot" cx="360" cy="76" r="4" style={{ animationDelay: ".2s" }} />
            <circle className="lm-dot" cx="376" cy="76" r="4" style={{ animationDelay: ".4s" }} />
          </g>
        </g>
      );
    case "question":
      return (
        <g className="lm-rise">
          <path d="M322,84 Q322,62 344,62 Q366,62 366,82 Q366,98 348,104 L348,114" fill="none"
            stroke={acc} strokeWidth="9" strokeLinecap="round" />
          <circle cx="348" cy="132" r="5.5" fill={acc} />
        </g>
      );
    case "pen":
      return (
        <g>
          {/* ruled pad */}
          <rect x="148" y="348" width="124" height="54" rx="7"
            fill="#F7EFD9" stroke={p.faceEdge} strokeWidth="3" />
          <g stroke={p.faceEdge} strokeWidth="2.4" strokeLinecap="round" opacity=".45">
            <path d="M160,364 L258,364" /><path d="M160,378 L258,378" />
          </g>
          {/* the line he has already written */}
          <path d="M160,392 q6,-5 12,0 q6,5 12,0 q6,-5 12,0 q6,5 12,0" fill="none"
            stroke={p.features} strokeWidth="3.5" strokeLinecap="round" opacity=".85" />
          {/* left mitten steadies the pad */}
          <FrontArm d="M114,362 Q134,380 150,380" p={p} />
          {/* pen: gold barrel, dark nib, cap ring, scribbling on the third line */}
          <g className="lm-write">
            <path d="M252,390 L284,346" stroke={acc} strokeWidth="13" strokeLinecap="round" />
            <path d="M252,390 L258,378 L266,384 Z" fill={p.features} />
            <path d="M276,357 L285,363" stroke={p.faceEdge} strokeWidth="6" strokeLinecap="round" />
            {/* writing mitten rides the barrel */}
            <path d="M308,352 Q294,374 268,371" fill="none" stroke={p.body}
              strokeWidth="39" strokeLinecap="round" />
          </g>
        </g>
      );
    case "mega":
      return (
        <g>
          <FrontArm d="M308,352 Q296,326 288,300" p={p} />
          <g transform="rotate(-24 300 268)">
            <path d="M286,254 L286,282 L332,298 L332,238 Z" fill={acc} stroke={p.faceEdge} strokeWidth="3"
              strokeLinejoin="round" />
            <rect x="272" y="256" width="16" height="24" rx="5" fill={p.faceEdge} />
          </g>
          <g className="lm-ring" fill="none" stroke={acc} strokeWidth="5" strokeLinecap="round">
            <path d="M350,214 Q368,228 362,250" />
            <path d="M368,196 Q396,220 386,254" style={{ animationDelay: ".2s" }} />
          </g>
        </g>
      );
    default:
      return null;
  }
}

/* ---------- hands: a real fist with a real digit ---------- */
function Hand({ kind, at = [0, 0], p }) {
  const [x, y] = at;
  if (kind === "index")
    /* shahada: round fist, one slender index rising off its leading edge */
    return (
      <g transform={`translate(${x},${y})`}>
        <circle cx="0" cy="0" r="17.5" fill={p.body} />
        <path d="M7,-9 Q12,-27 9,-44" fill="none" stroke={p.body}
          strokeWidth="12.5" strokeLinecap="round" />
      </g>
    );
  /* thumbs-up: knuckles as a horizontal slab, one short fat thumb off the corner */
  return (
    <g transform={`translate(${x},${y}) rotate(-12)`}>
      <rect x="-20" y="-13" width="41" height="28" rx="13" fill={p.body} />
      <path d="M13,-8 Q21,-23 15,-34" fill="none" stroke={p.body}
        strokeWidth="14.5" strokeLinecap="round" />
    </g>
  );
}

function LanternSVG({ p, glow, paused, waving, depth, gesture, svgRef, eyesRef }) {
  const dOnly = depth ? undefined : { display: "none" };
  const g = byKey(gesture);
  const armIdle = { values: "-3;3;-3", dur: "3.6s" };
  const armWave = { values: "-6;26;-6", dur: ".72s" };
  const isWaving = waving || !!g.wave;
  const arm = isWaving ? armWave : armIdle;
  const look = g.look || [0, 0];
  const armStroke = depth ? dark(p.body, 0.06) : p.body;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Fanous the lantern mascot: ${g.label}`}
      className={`lm-svg lm-g-${gesture} ${isWaving ? "lm-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title>Fanous, the lantern mascot</title>
      <style>{SVG_CSS}</style>

      <defs>
        {/* film grain, clipped to the painted character only */}
        <filter id="lm-grain" x="-25%" y="-15%" width="150%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.16 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="g" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="g" />
          </feMerge>
        </filter>
        {/* colour drain for pale / dying */}
        <filter id="lm-desatP"><feColorMatrix type="saturate" values="0.45" /></filter>
        <filter id="lm-desatD"><feColorMatrix type="saturate" values="0.12" /></filter>

        <linearGradient id="lm-bodyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light(p.body, 0.2)} />
          <stop offset=".5" stopColor={p.body} />
          <stop offset="1" stopColor={dark(p.body, 0.2)} />
        </linearGradient>
        <linearGradient id="lm-baseG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.body} />
          <stop offset="1" stopColor={dark(p.body, 0.3)} />
        </linearGradient>
        <linearGradient id="lm-goldG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light(p.accent, 0.38)} />
          <stop offset=".45" stopColor={p.accent} />
          <stop offset="1" stopColor={dark(p.accent, 0.26)} />
        </linearGradient>
        <radialGradient id="lm-faceG" cx=".5" cy=".42" r=".75">
          <stop offset="0" stopColor={light(p.face, 0.16)} />
          <stop offset=".62" stopColor={p.face} />
          <stop offset="1" stopColor={dark(p.face, 0.08)} />
        </radialGradient>
        <radialGradient id="lm-glowG" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor={rgba(p.glowC, 0.9)} />
          <stop offset=".4" stopColor={rgba(p.glowC, 0.38)} />
          <stop offset=".75" stopColor={rgba(p.glowC, 0.1)} />
          <stop offset="1" stopColor={rgba(p.glowC, 0)} />
        </radialGradient>
        <radialGradient id="lm-knobG" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor={light(p.accent, 0.5)} />
          <stop offset=".55" stopColor={p.accent} />
          <stop offset="1" stopColor={dark(p.accent, 0.3)} />
        </radialGradient>
        <radialGradient id="lm-sheenG" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".24" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lm-aoG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000000" stopOpacity=".22" />
          <stop offset="1" stopColor="#000000" stopOpacity="0" />
        </linearGradient>
        <clipPath id="lm-faceclip">
          <rect x="118.9" y="207" width="181.6" height="144.9" rx="70" />
        </clipPath>
        <clipPath id="lm-domeclip">
          <path d="M114.8,171.9 C114.8,137.2 200.9,94.3 200.9,91.2 L219.1,91.2 C219.1,94.3 305.2,137.2 305.2,171.9 Z" />
        </clipPath>
      </defs>

      {/* ground shadow, squashed via SMIL around its own centre */}
      <g data-ms-part="shadow" transform="translate(210,452)">
        <ellipse className="lm-shadowO" cx="0" cy="0" rx="104" ry="10" fill="#000000">
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;0.88 1;1 1" keyTimes="0;0.5;1" dur="3.8s" repeatCount="indefinite" />
        </ellipse>
      </g>

      <g className="lm-float">
        {/* squash-bounce pivots at the feet: translate out, SMIL, translate back */}
        <g transform="translate(210,460)">
          {g.sway && (
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="-2.4;2.4;-2.4" dur="1.15s" repeatCount="indefinite" />
          )}
          {g.shake && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-1.7 0;1.7 0;-1.7 0" dur="0.14s" repeatCount="indefinite" />
          )}
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin="lm-hit.click" dur="0.62s" fill="remove"
            values="0 0;0 9;0 -15;0 3;0 0" keyTimes="0;0.26;0.56;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="lm-hit.click" dur="0.62s" fill="remove"
            values="1 1;1.06 0.9;0.95 1.08;1.02 0.97;1 1" keyTimes="0;0.26;0.56;0.8;1" />
          {/* respectful bow, pivoting on the foot */}
          <g transform={`rotate(${g.bow || 0})`}>
          <g transform="translate(-210,-460)">
            <g id="lm-hit" filter="url(#lm-grain)">
              <g filter={g.drain ? `url(#lm-desat${g.drain === "dead" ? "D" : "P"})` : undefined}>

              {/* halo of light */}
              <ellipse data-ms-part="halo" className="lm-glow ms-glow-halo" cx="210" cy="280" rx="122" ry="96" fill="url(#lm-glowG)" />

              {/* mitten arms use symmetric shoulders so mirrored poses come out
                  dead level and equal length; only `idle` keeps the artwork's
                  traced uneven pivots (its arms are meant to differ) */}
              <g data-ms-part="arms">
              <g transform={`translate(${(g.art ? SH_L_ART : SH_L).join(",")})`}>
                <animateTransform id="lm-armAnim" key={waving ? "w" : "i"}
                  attributeName="transform" type="rotate" additive="sum"
                  values={arm.values} dur={arm.dur} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="rotate" additive="sum"
                  begin="lm-hit.click" dur="0.9s" fill="remove"
                  values="0;26;-8;22;0" keyTimes="0;0.3;0.55;0.8;1" />
                <path d={g.armL} fill="none" stroke={armStroke}
                  strokeWidth="39" strokeLinecap="round" />
                {gesture === "idle" && (
                  <path d="M-10,-10 Q-34,-27 -46,-38" fill="none" stroke={light(p.body, 0.28)}
                    strokeWidth="10" strokeLinecap="round" opacity=".3" style={dOnly} />
                )}
              </g>
              <g transform={`translate(${(g.art ? SH_R_ART : SH_R).join(",")})`}>
                <animateTransform attributeName="transform" type="rotate" additive="sum"
                  values="2.5;-3;2.5" dur="4.1s" repeatCount="indefinite" />
                <path d={g.armR} fill="none" stroke={armStroke}
                  strokeWidth="41" strokeLinecap="round" />
                {g.finger && <Hand kind={g.finger} at={g.fingerAt} p={p} />}
                {gesture === "idle" && (
                  <path d="M9,10 Q28,38 28,35" fill="none" stroke={light(p.body, 0.28)}
                    strokeWidth="10" strokeLinecap="round" opacity=".26" style={dOnly} />
                )}
              </g>
              </g>

              {/* flared base: straight trumpet sides, exactly as drawn */}
              <g data-ms-part="base">
                <path d="M127.4,396.3 L292.6,396.3 L315.5,442.2 L104.5,442.2 Z"
                  fill={depth ? "url(#lm-baseG)" : p.body} />
                <path d="M135,400 L143,400 L129,438 L121,438 Z" fill="#ffffff" opacity=".1" style={dOnly} />
                <Band x={101.4} y={436.2} w={217.3} h={23.8} p={p} depth={depth} />
              </g>

              {/* body barrel curve: swells at the belly, tucks into the waist */}
              <g data-ms-part="body">
                <path d="M107,190.1 L313,190.1 C316,261.8 334,268.4 334,320.5 C334,349.9 299.1,353.1 293.1,385.7 L126.9,385.7 C120.9,353.1 86,349.9 86,320.5 C86,268.4 104,261.8 107,190.1 Z"
                  fill={depth ? "url(#lm-bodyG)" : p.body} />
                <rect x="107" y="190" width="206" height="13" fill="url(#lm-aoG)" style={dOnly} />
                <ellipse cx="152" cy="252" rx="44" ry="70" fill="url(#lm-sheenG)" style={dOnly} />
              </g>

              {/* super-rounded glass face with its ochre rim */}
              <g data-ms-part="face">
              <rect x="118.9" y="207" width="181.6" height="144.9" rx="70"
                fill={depth ? "url(#lm-faceG)" : p.face}
                stroke={p.faceEdge} strokeWidth="6.2" />
              <g clipPath="url(#lm-faceclip)">
                <rect x="118.9" y="207" width="181.6" height="30" fill="url(#lm-aoG)" opacity=".5" style={dOnly} />
                <g data-ms-part="blush">
                  <circle cx="156" cy="306" r="9" fill={p.blush} opacity=".45" style={dOnly} />
                  <circle cx="264" cy="306" r="9" fill={p.blush} opacity=".45" style={dOnly} />
                </g>
                {g.tint && (
                  <rect x="118.9" y="207" width="181.6" height="144.9"
                    fill={g.tint} opacity={g.tintO || 0.3} />
                )}
                {g.hatch && (
                  <g stroke="#5E88AC" strokeWidth="5" strokeLinecap="round" opacity=".55">
                    <path d="M168,212 L162,244" /><path d="M196,208 L192,242" />
                    <path d="M224,208 L228,242" /><path d="M252,212 L258,244" />
                  </g>
                )}

                {/* expression: the group tracks the cursor; gaze is per gesture */}
                <g className="lm-eyes ms-eyes" ref={eyesRef}>
                  <g key={g.key} className="lm-pop" transform={`translate(${look[0]},${look[1]})`}>
                    <g data-ms-part="brows">
                      <Brows kind={g.brow} p={p} />
                    </g>
                    <g data-ms-part="eyes">
                      <Eye kind={g.eyeL} x={EYE_L_X} p={p} dOnly={dOnly} />
                      <Eye kind={g.eyeR} x={EYE_R_X} p={p} dOnly={dOnly} />
                    </g>
                  </g>
                </g>
                <g data-ms-part="mouth" key={`m-${g.key}`} className="lm-pop">
                  <Mouth kind={g.mouth} p={p} />
                </g>

                <rect x="132" y="218" width="62" height="26" rx="13" fill="#ffffff" opacity=".2"
                  transform="rotate(-14 163 231)" style={dOnly} />
              </g>
              </g>

              {/* waist ring: the thinnest, capping the body/base seam */}
              <g data-ms-part="bands">
                <Band x={125.2} y={377.7} w={169.2} h={17.6} p={p} depth={depth} />
                <Band x={98.3} y={172.4} w={223.5} h={21.7} p={p} depth={depth} />
              </g>

              {/* ogee bell: flares at the rim, sweeps into a narrow neck */}
              <g data-ms-part="dome">
                <path d="M114.8,171.9 C114.8,137.2 200.9,94.3 200.9,91.2 L219.1,91.2 C219.1,94.3 305.2,137.2 305.2,171.9 Z"
                  fill={depth ? "url(#lm-bodyG)" : p.body} />
                <g clipPath="url(#lm-domeclip)" style={dOnly}>
                  <ellipse cx="168" cy="138" rx="40" ry="24" fill="url(#lm-sheenG)" />
                  <ellipse className="lm-gleam" cx="210" cy="140" rx="11" ry="30" fill="#ffffff" opacity="0" />
                </g>
              </g>

              {/* finial ball capping the neck */}
              <g data-ms-part="finial">
                <circle cx="210" cy="78" r="13" fill={depth ? "url(#lm-knobG)" : p.accent} />
                <circle cx="205" cy="73" r="3.4" fill="#ffffff" opacity=".75" style={dOnly} />
              </g>

              {/* the prop that removes all doubt: rings, rays, Zzz, tear, arrow, mushaf */}
              <g data-ms-part="props" key={`p-${g.key}`} className="lm-pop">
                <Props g={g} p={p} />
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

/* ---------- sparkle burst (overlay layer, never exported) ---------- */
const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  moon: "M 2.4 -5.6 A 6 6 0 1 0 2.4 5.6 A 4.4 4.4 0 1 1 2.4 -5.6 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};

/* ============================================================
   POSE SOURCE
   Lets the build snapshot every pose exactly as the studio draws
   it at its defaults, so the remix pipeline edits real markup
   instead of guessing at it. Read by scripts, never by the app.
   ============================================================ */
export const POSE_SOURCE = {
  slug: "fanous",
  /** Snapshot palette + no signal slider: the lantern is driven by glow alone. */
  meta: {
    accent: GOLD,
    stage: THEMES.teal.stage,
    glowLabel: "Lantern glow",
    themes: Object.fromEntries(
      Object.entries(THEMES).map(([key, t]) => [
        key,
        {
          name: t.name,
          top: light(t.face, 0.18),
          mid: t.accent,
          base: t.body,
          core: t.face,
          stage: t.stage,
          features: dark(t.body, 0.3),
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
      p={derive(THEMES.teal)}
      glow={0.4}
      waving={false}
      depth={false}
      gesture={key}
    />
  ),
};

/* ============================================================
   STUDIO SHELL
   ============================================================ */
export default function FanousStudio() {
  const [themeKey, setThemeKey] = useState("teal");
  const [custom, setCustom] = useState({ ...THEMES.teal, name: "Custom" });
  const [glow, setGlow] = useState(0.4);
  const [depth, setDepth] = useState(false);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [waving, setWaving] = useState(false);
  const [sparks, setSparks] = useState([]);
  const [gesture, setGesture] = useState("idle");

  const svgRef = useRef(null);
  const eyesRef = useRef(null);
  const idRef = useRef(0);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  /* pause/resume BOTH css and SMIL animations */
  useEffect(() => {
    const s = svgRef.current;
    if (!s) return;
    try { paused ? s.pauseAnimations() : s.unpauseAnimations(); } catch {}
  }, [paused]);
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPaused(true);
    }
  }, []);

  const theme = themeKey === "custom" ? custom : THEMES[themeKey];
  const p = useMemo(() => derive(theme), [theme]);
  const activeG = byKey(gesture);
  const { parts, enabledParts, togglePart } = useStudioPartToggles(
    FANOUS_PARTS,
    svgRef,
    [gesture, glow, themeKey, depth, waving, paused]
  );

  /* a held pose shouldn't inherit the last cursor offset */
  useEffect(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
  }, [gesture]);

  /* ---- cursor-tracking eyes ---- */
  const onTrack = useCallback((e) => {
    const svg = svgRef.current, eyes = eyesRef.current;
    if (!svg || !eyes || paused || !activeG.track) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 420;
    const sy = ((e.clientY - r.top) / r.height) * 520;
    let dx = sx - 209, dy = sy - 263;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len, 60) / 60 * 4.5;
    eyes.style.transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
  }, [paused, activeG]);
  const onTrackEnd = useCallback(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
  }, []);

  /* ---- tap: sparkles (bounce, grin & arm burst fire natively via SMIL) ---- */
  const delight = useCallback(() => {
    const kinds = ["star", "moon", "dot", "star", "star", "dot"];
    const cols = [light(p.accent, 0.3), "#ffffff", p.face];
    const burst = Array.from({ length: 12 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 12 + Math.random() * 0.5;
      const d = 62 + Math.random() * 58;
      return {
        id: ++idRef.current,
        x: 210 + Math.cos(a) * 14,
        y: 244 + Math.sin(a) * 10,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 22,
        kind: kinds[i % kinds.length],
        col: cols[i % cols.length],
        delay: Math.random() * 0.12,
        s: 0.7 + Math.random() * 0.8,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(() => setSparks((s) => s.filter((k) => !burst.includes(k))), 1100);
  }, [p]);

  /* ---- celebrating? keep the sparkles coming ---- */
  useEffect(() => {
    if (!["celebrate", "overjoyed", "eid"].includes(gesture) || paused) return;
    delight();
    const iv = setInterval(delight, 1400);
    return () => clearInterval(iv);
  }, [gesture, paused, delight]);

  const setCustomColor = (key) => (e) => {
    const v = e.target.value;
    setCustom({
      ...theme, name: "Custom", [key]: v,
      ...(key === "body" ? { stage: dark(v, 0.3) } : {}),
    });
    setThemeKey("custom");
  };

  /* ---- ornamental background pattern (8-point star lattice) ---- */
  const patternUrl = useMemo(() => {
    const s = `<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><g fill='none' stroke='${GOLD}' stroke-opacity='0.06'><rect x='34' y='34' width='60' height='60'/><rect x='34' y='34' width='60' height='60' transform='rotate(45 64 64)'/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  }, []);

  const stageBg = transparent
    ? undefined
    : `radial-gradient(120% 120% at 50% 20%, ${light(theme.stage, 0.08)}, ${theme.stage} 60%, ${dark(theme.stage, 0.25)})`;

  return (
    <div className="min-h-screen w-full" style={{
      background: `${patternUrl}, radial-gradient(120% 90% at 50% 0%, #101a30 0%, ${INK} 55%, #070b14 100%)`,
      color: "#E9EDF6",
      fontFamily: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Marcellus&family=Manrope:wght@400;500;600;700&display=swap');
        .fs-display{font-family:'Marcellus',serif;letter-spacing:.5px}
        .fs-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${rgba(GOLD, 0.85)};font-weight:600}
        .fs-card{background:linear-gradient(180deg, rgba(21,31,54,.85), rgba(13,20,38,.92));
          border:1px solid ${rgba(GOLD, 0.16)};border-radius:26px;
          box-shadow:0 24px 60px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.05)}
        .fs-layout{display:grid;gap:22px}
        @media(min-width:980px){.fs-layout{grid-template-columns:1.12fr .88fr;align-items:start}}
        .fs-checker{background-color:#0c1322;background-image:
          linear-gradient(45deg, rgba(255,255,255,.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.05) 75%),
          linear-gradient(45deg, rgba(255,255,255,.05) 25%, transparent 25%, transparent 75%, rgba(255,255,255,.05) 75%);
          background-size:24px 24px;background-position:0 0,12px 12px}
        .fs-pill{border:1px solid ${rgba(GOLD, 0.3)};border-radius:999px;padding:6px 14px;font-size:12.5px;
          font-weight:600;color:${rgba("#E9EDF6", 0.75)};background:transparent;cursor:pointer;transition:all .2s}
        .fs-pill:hover{color:#fff;border-color:${rgba(GOLD, 0.6)}}
        .fs-pill.on{background:${rgba(GOLD, 0.14)};color:${light(GOLD, 0.35)};border-color:${rgba(GOLD, 0.65)}}
        .fs-swatch{width:42px;height:42px;border-radius:999px;cursor:pointer;border:none;transition:transform .18s;position:relative}
        .fs-swatch:hover{transform:translateY(-3px) scale(1.05)}
        .fs-btn{border-radius:999px;padding:12px 22px;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s;border:none}
        .fs-btn-gold{background:linear-gradient(180deg, ${light(GOLD, 0.28)}, ${GOLD} 55%, ${dark(GOLD, 0.15)});
          color:#231A05;box-shadow:0 10px 26px ${rgba(GOLD, 0.32)}}
        .fs-btn-gold:hover{filter:brightness(1.08);transform:translateY(-1px)}
        .fs-btn-ghost{background:transparent;border:1px solid ${rgba(GOLD, 0.4)};color:${light(GOLD, 0.25)}}
        .fs-btn-ghost:hover{background:${rgba(GOLD, 0.1)}}
        .fs-spark{animation:fs-spark .92s cubic-bezier(.2,.75,.3,1) forwards;transform-box:fill-box;transform-origin:center}
        @keyframes fs-spark{0%{opacity:0;transform:translate(0,0) scale(.35) rotate(0deg)}
          16%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(var(--s)) rotate(150deg)}}
        .fs-picker{appearance:none;-webkit-appearance:none;width:34px;height:34px;border:none;border-radius:999px;
          padding:0;background:none;cursor:pointer}
        .fs-picker::-webkit-color-swatch-wrapper{padding:0}
        .fs-picker::-webkit-color-swatch{border:2px solid rgba(255,255,255,.25);border-radius:999px}
        .fs-picker::-moz-color-swatch{border:2px solid rgba(255,255,255,.25);border-radius:999px}
        .fs-switch{width:46px;height:26px;border-radius:999px;border:1px solid ${rgba(GOLD, 0.4)};
          background:rgba(255,255,255,.06);position:relative;cursor:pointer;transition:background .2s}
        .fs-switch::after{content:'';position:absolute;top:2.5px;left:3px;width:19px;height:19px;border-radius:999px;
          background:#96a2b8;transition:all .2s}
        .fs-switch.on{background:${rgba(GOLD, 0.35)}}
        .fs-switch.on::after{left:22px;background:${light(GOLD, 0.3)}}
        @media (prefers-reduced-motion:reduce){.fs-spark{animation:none}}
      `}</style>

      <div className="mx-auto px-5 py-8" style={{ maxWidth: 1120 }}>
        {/* header */}
        <header className="flex items-end justify-between flex-wrap gap-4 mb-7">
          <div className="flex items-center gap-4">
            <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
              <path d="M 24 6 A 15 15 0 1 0 24 34 A 11.5 11.5 0 1 1 24 6 Z" fill={GOLD} />
              <path d="M29,14 L31,18 L35,20 L31,22 L29,26 L27,22 L23,20 L27,18 Z" fill={light(GOLD, 0.3)} />
            </svg>
            <div>
              <h1 className="fs-display" style={{ fontSize: 30, lineHeight: 1.1 }}>Fanous Studio</h1>
              <p style={{ fontSize: 13, color: "#93A0B8", marginTop: 3 }}>
                An animated lantern companion for your Islamic app
              </p>
            </div>
          </div>
          <div className="fs-eyebrow" style={{
            border: `1px solid ${rgba(GOLD, 0.35)}`, borderRadius: 999, padding: "7px 14px",
          }}>
            SVG · animated · transparent
          </div>
        </header>

        <div className="fs-layout">
          {/* ---------- stage ---------- */}
          <section className="fs-card p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <span className="fs-eyebrow">Preview</span>
              <div className="flex gap-2">
                <button className={`fs-pill ${transparent ? "on" : ""}`} onClick={() => setTransparent(true)}>
                  Transparent
                </button>
                <button className={`fs-pill ${!transparent ? "on" : ""}`} onClick={() => setTransparent(false)}>
                  In-app
                </button>
              </div>
            </div>

            <div
              className={`relative rounded-3xl overflow-hidden flex items-center justify-center ${transparent ? "fs-checker" : ""}`}
              style={{ background: stageBg, minHeight: 380, padding: "26px 12px" }}
              onMouseMove={onTrack}
              onMouseLeave={onTrackEnd}
            >
              <div
                style={{ width: "min(74vw, 360px)", position: "relative" }}
                onMouseEnter={() => activeG.track && setWaving(true)}
                onMouseLeave={() => setWaving(false)}
                onPointerDown={delight}
              >
                <LanternSVG
                  p={p} glow={glow} paused={paused} depth={depth} waving={waving}
                  gesture={gesture} svgRef={svgRef} eyesRef={eyesRef}
                />
                {/* sparkle overlay: same coordinate space, never exported */}
                <svg viewBox="0 0 420 520" className="absolute inset-0 w-full h-full"
                  style={{ pointerEvents: "none" }} aria-hidden="true">
                  {sparks.map((s) => (
                    <g key={s.id} transform={`translate(${s.x},${s.y})`}
                      style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--s": s.s }}>
                      <path className="fs-spark" d={SPARK_PATHS[s.kind]} fill={s.col}
                        style={{ animationDelay: `${s.delay}s` }} />
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            <p className="text-center" style={{ fontSize: 12.5, color: "#8B98B0", marginTop: 14, letterSpacing: ".04em" }}>
              hover to make him wave &nbsp;·&nbsp; tap for a grin, bounce &amp; sparkles &nbsp;·&nbsp; pick a gesture for app scenes
            </p>

            <MascotPartsPanel
              parts={parts}
              enabledParts={enabledParts}
              onTogglePart={togglePart}
              accent={GOLD}
              pillClassName="fs-pill"
              eyebrowClassName="fs-eyebrow"
            />
          </section>

          {/* ---------- controls ---------- */}
          <section className="fs-card p-5 sm:p-6 flex flex-col gap-6">
            <div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="fs-eyebrow">Gesture</span>
                <span style={{ fontSize: 11, color: "#6E7B93" }}>{GESTURES.length} poses</span>
              </div>
              <div className="flex flex-col gap-2">
                {CATS.map((cat) => (
                  <div key={cat}>
                    <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#6E7B93",
                      textTransform: "uppercase", margin: "4px 0 6px 2px" }}>{cat}</div>
                    <div className="flex flex-wrap gap-2">
                      {GESTURES.filter((gg) => gg.cat === cat).map((gg) => (
                        <button
                          key={gg.key}
                          title={gg.tip}
                          className={`fs-pill ${gesture === gg.key ? "on" : ""}`}
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
                background: "rgba(255,255,255,.04)", border: `1px solid ${rgba(GOLD, 0.14)}`,
              }}>
                <div className="fs-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                  {activeG.use}
                </div>
                <p style={{ fontSize: 12.5, color: "#A6B2C8", lineHeight: 1.5 }}>{activeG.tip}</p>
              </div>
            </div>

            <div>
              <div className="fs-eyebrow mb-3">Theme</div>
              <div className="flex flex-wrap gap-3">
                {Object.entries(THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    title={t.name}
                    aria-label={t.name}
                    className="fs-swatch"
                    onClick={() => setThemeKey(key)}
                    style={{
                      background: `conic-gradient(from 210deg, ${t.body} 0 55%, ${t.face} 0 78%, ${t.accent} 0)`,
                      boxShadow: themeKey === key
                        ? `0 0 0 3px ${INK}, 0 0 0 5px ${GOLD}`
                        : `0 0 0 1px rgba(255,255,255,.15)`,
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: 12.5, color: "#8B98B0", marginTop: 10 }}>
                {theme.name}
              </p>
            </div>

            <div>
              <div className="fs-eyebrow mb-3">Custom colors</div>
              <div className="flex flex-wrap gap-5">
                {[["body", "Body"], ["accent", "Brass"], ["face", "Glass"]].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="color" className="fs-picker" value={theme[k]} onChange={setCustomColor(k)} />
                    <span style={{ fontSize: 13, color: "#B7C1D6", fontWeight: 600 }}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="fs-eyebrow mb-3">Finish</div>
              <div className="flex gap-2">
                <button className={`fs-pill ${!depth ? "on" : ""}`} onClick={() => setDepth(false)}>
                  Flat · matches artwork
                </button>
                <button className={`fs-pill ${depth ? "on" : ""}`} onClick={() => setDepth(true)}>
                  3D shading
                </button>
              </div>
            </div>

            <div>
              <div className="fs-eyebrow mb-3">Lantern glow</div>
              <input
                type="range" min="0" max="1" step="0.05" value={glow}
                onChange={(e) => setGlow(parseFloat(e.target.value))}
                className="w-full" style={{ accentColor: GOLD }}
                aria-label="Glow intensity"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="fs-eyebrow">Motion</div>
                <p style={{ fontSize: 12.5, color: "#8B98B0", marginTop: 4 }}>
                  {paused ? "Animations paused" : "Idle float, blink & glow are on"}
                </p>
              </div>
              <button
                className={`fs-switch ${paused ? "" : "on"}`}
                onClick={() => setPaused((v) => !v)}
                aria-label="Toggle animations"
              />
            </div>

            <p style={{ fontSize: 12.5, color: "#8B98B0", lineHeight: 1.6 }}>
              Examples are for browsing. Build your own to download and export.
            </p>
          </section>
        </div>

        <footer className="text-center" style={{ fontSize: 12, color: "#6B7890", marginTop: 26 }}>
          Fanous, the Ramadan lantern reimagined as a friendly guide.
        </footer>
      </div>
    </div>
  );
}
