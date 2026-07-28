"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/*
 * ROBOT FAMILY FACTORY — Byte-derived robots with distinct chassis per app.
 *
 * Shared gesture / arm / studio engine. Each variant swaps head, antenna,
 * ears, chest badge, and feet so they read as different characters, not recolors.
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

/* ---------- per-robot themes + identity ---------- */
const ROBOT_VARIANTS = {
  bolt: {
    slug: "bolt",
    name: "Bolt",
    tagline: "Angular coach robot that never skips the warm-up",
    product: "Fitness Coach App",
    brand: "#FF6B4A",
    defaultTheme: "ember",
    chassis: "athlete",
    eyeStyle: "hud",
    elementLabels: {
      antenna: "Spike antenna",
      ears: "Shoulder pads",
      chest: "Heart monitor",
      legs: "Roller blades",
    },
    themes: {
      ember: { name: "Ember Sprint", body: "#FF6B4A", panel: "#2A1418", led: "#C8FF4A", accent: "#FFD166", stage: "#1A1214" },
      voltage: { name: "Voltage Lime", body: "#6BCF63", panel: "#142418", led: "#F4FF6A", accent: "#FF7A4A", stage: "#121A14" },
      midnight: { name: "Midnight Reps", body: "#5B6FD9", panel: "#141828", led: "#A8B8FF", accent: "#FF8A6A", stage: "#12141E" },
      graphite: { name: "Graphite Gym", body: "#8A94A0", panel: "#1A1E24", led: "#E8F0FF", accent: "#FF7A5A", stage: "#14161A" },
      solar: { name: "Solar Burn", body: "#F0A040", panel: "#241810", led: "#FFE08A", accent: "#FF5A4A", stage: "#1A1610" },
    },
  },
  relay: {
    slug: "relay",
    name: "Relay",
    tagline: "Headset helper who turns every ticket into a high-five",
    product: "Customer Support App",
    brand: "#4AA3E0",
    defaultTheme: "skyline",
    chassis: "support",
    eyeStyle: "soft",
    elementLabels: {
      antenna: "Boom mic",
      ears: "Headset cups",
      chest: "Ticket badge",
      legs: "Soft casters",
    },
    themes: {
      skyline: { name: "Skyline Help", body: "#4AA3E0", panel: "#142430", led: "#D4F0FF", accent: "#7BE0C8", stage: "#121C28" },
      inbox: { name: "Inbox Coral", body: "#E07868", panel: "#2A1818", led: "#FFE0D4", accent: "#6AB8E0", stage: "#1A1414" },
      queue: { name: "Queue Mint", body: "#4CB89A", panel: "#142820", led: "#D4FFE8", accent: "#6AA8E0", stage: "#121C18" },
      after: { name: "After Hours", body: "#6B7AB8", panel: "#181C28", led: "#E0E8FF", accent: "#E0A06A", stage: "#14161E" },
      resolve: { name: "Resolve Gold", body: "#D4A04A", panel: "#241C10", led: "#FFF0C8", accent: "#4AA3E0", stage: "#1A1610" },
    },
  },
  orbit: {
    slug: "orbit",
    name: "Orbit",
    tagline: "Dome-headed space guide for first trips past the moon",
    product: "Kids Space Learning App",
    brand: "#7B6FE0",
    defaultTheme: "nebula",
    chassis: "astronaut",
    eyeStyle: "visor",
    elementLabels: {
      antenna: "Sat dish",
      ears: "Helmet seals",
      chest: "Planet badge",
      legs: "Boot thrusters",
    },
    themes: {
      nebula: { name: "Nebula Violet", body: "#7B6FE0", panel: "#1A1430", led: "#F0E0FF", accent: "#F0C060", stage: "#12101E" },
      comet: { name: "Comet Teal", body: "#3CB8C8", panel: "#102428", led: "#D4FFFF", accent: "#F0B060", stage: "#10181C" },
      lunar: { name: "Lunar Silver", body: "#A8B0C8", panel: "#1C2030", led: "#FFFFFF", accent: "#E0A050", stage: "#14161E" },
      mars: { name: "Mars Dust", body: "#E07050", panel: "#281410", led: "#FFE0C8", accent: "#80C0E0", stage: "#1A1210" },
      ion: { name: "Ion Blue", body: "#4A78E0", panel: "#101828", led: "#C8E0FF", accent: "#F0C060", stage: "#10141E" },
    },
  },
  brew: {
    slug: "brew",
    name: "Brew",
    tagline: "Flat-top barista bot pouring loyalty into every cup",
    product: "Cafe Loyalty App",
    brand: "#C4784A",
    defaultTheme: "espresso",
    chassis: "barista",
    eyeStyle: "bean",
    elementLabels: {
      antenna: "Steam plume",
      ears: "Cup handles",
      chest: "Latte art",
      legs: "Stubby boots",
    },
    themes: {
      espresso: { name: "Espresso", body: "#C4784A", panel: "#241810", led: "#FFE8C8", accent: "#E0A060", stage: "#1A1410" },
      foam: { name: "Milk Foam", body: "#E8D0B0", panel: "#2A2420", led: "#FFF8F0", accent: "#C4784A", stage: "#1C1814" },
      matcha: { name: "Matcha Steam", body: "#6BA86A", panel: "#182418", led: "#E8FFD4", accent: "#D4A060", stage: "#121810" },
      mocha: { name: "Mocha Night", body: "#8A6048", panel: "#1E1410", led: "#F0D8C0", accent: "#E09060", stage: "#161210" },
      berry: { name: "Berry Syrup", body: "#C06078", panel: "#241418", led: "#FFE0E8", accent: "#E0A060", stage: "#1A1214" },
    },
  },
};

const derive = (t) => ({
  ...t,
  bodyDark: dark(t.body, 0.24),
  bodyLight: light(t.body, 0.26),
  limb: dark(t.body, 0.15),
  joint: dark(t.body, 0.42),
  wheel: dark(t.panel, 0.18),
  screen: t.panel,
  screenLight: light(t.panel, 0.14),
  blush: mix(t.accent, "#FF8A9A", 0.4),
  glowC: light(t.led, 0.18),
  dim: rgba(t.led, 0.35),
});

/* ---------- flame is fire, not theme paint ---------- */
const FLAME = { outer: "#FF9A3C", mid: "#FFD166", core: "#FFF6E0", smoke: "#DCE8E4" };

/* Studio shell mirrors GeneratedStudio: stage left, one controls card right. */
const shellCss = (brand) => `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  .rb-root{min-height:100vh;background:#101820;color:#E8F4F0;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px,${rgba(brand, 0.15)},transparent 60%),
      radial-gradient(720px 400px at 88% 110%,${rgba(brand, 0.10)},transparent 60%)}
  .rb-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
  .rb-card{background:rgba(232,244,240,.045);border:1px solid ${rgba(brand, 0.16)};
    border-radius:20px;backdrop-filter:blur(8px)}
  .rb-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${brand};font-weight:600}
  .rb-pill{border:1px solid ${rgba(brand, 0.28)};border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#E8F4F0;background:transparent;cursor:pointer;
    transition:background .15s,border-color .15s,color .15s;line-height:1}
  .rb-pill:hover{border-color:${rgba(brand, 0.55)}}
  .rb-pill.on{background:${brand};color:#0A1814;border-color:${brand}}
  .rb-pill:focus-visible,.rb-swatch:focus-visible{outline:2px solid #DFFFF4;outline-offset:3px}
  .rb-tiny{border:1px solid ${rgba(brand, 0.26)};border-radius:999px;padding:5px 10px;
    font-size:11.5px;font-weight:600;color:#9BB5AE;background:transparent;cursor:pointer;
    transition:border-color .15s,color .15s}
  .rb-tiny:hover{border-color:${brand};color:#E8F4F0}
  .rb-swatch{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .rb-swatch.on{border-color:#fff;box-shadow:0 0 0 2px ${rgba(brand, 0.55)}}
  .rb-checker{background-color:#0c1322;background-image:
    linear-gradient(45deg,#152038 25%,transparent 25%),linear-gradient(-45deg,#152038 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#152038 75%),linear-gradient(-45deg,transparent 75%,#152038 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .rb-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#2A3540;outline:none;cursor:pointer}
  .rb-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
    background:${brand};cursor:pointer;border:2px solid #0A1814}
  .rb-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:${brand};cursor:pointer;border:2px solid #0A1814}
  .rb-spark{position:absolute;width:15px;height:15px;margin:-7px;pointer-events:none;
    animation:rb-spark .95s ease-out forwards}
  @keyframes rb-spark{0%{opacity:1;transform:translate(0,0) scale(1)}
    100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
`;

const SVG_CSS = `
  .rt-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .rt-g-alarm{--gf:1.75}
  .rt-g-celebrate{--gf:1.4}
  .rt-g-success{--gf:1.35}
  .rt-g-flying{--gf:1.5}
  .rt-g-proud{--gf:1.3}
  .rt-g-love{--gf:1.25}
  .rt-g-grumpy{--gf:.7}
  .rt-g-sad{--gf:.6}
  .rt-g-crying{--gf:.5}
  .rt-g-sleepy{--gf:.42}
  .rt-g-empty{--gf:.55}
  .rt-float{animation:rt-float 3.7s ease-in-out infinite}
  .rt-g-sleepy .rt-float{animation-duration:6s}
  .rt-g-alarm .rt-float{animation:none}
  .rt-g-celebrate .rt-float{animation-duration:1.85s}
  .rt-g-dancing .rt-float{animation-duration:1.4s}
  .rt-g-running .rt-float{animation:rt-runBounce .28s ease-in-out infinite}
  .rt-g-flying .rt-float{animation:rt-soar 1.6s ease-in-out infinite}
  .rt-shadowO{animation:rt-shadowO 3.7s ease-in-out infinite}
  .rt-g-running .rt-shadowO{animation:rt-runShadow .28s ease-in-out infinite}
  .rt-g-flying .rt-shadowO{opacity:.1;animation:none;transform:scaleX(.72)}
  .rt-glow{animation:rt-glow 3.1s ease-in-out infinite}
  .rt-g-alarm .rt-glow{animation-duration:.85s}
  .rt-wave-on .rt-glow{animation-duration:1.5s}
  .rt-pop{animation:rt-pop .28s ease-out}
  .rt-pupils{transition:transform .12s ease-out}
  .rt-ring{animation:rt-ring 1.15s ease-out infinite}
  .rt-scan{animation:rt-scan 2.4s ease-in-out infinite}
  .rt-zzz{animation:rt-zzz 3.2s ease-in-out infinite}
  .rt-rise{animation:rt-rise 2.5s ease-out infinite}
  .rt-fall{animation:rt-fall 2.8s linear infinite}
  .rt-twinkle{animation:rt-twinkle 1.4s ease-in-out infinite}
  .rt-tear{animation:rt-tear 2.8s ease-in infinite}
  .rt-eq{animation:rt-eq 1s ease-in-out infinite}
  .rt-type{animation:rt-type .52s steps(2) infinite}
  .rt-dot{animation:rt-dot 1.2s ease-in-out infinite}
  .rt-smoke{animation:rt-smoke 1.9s ease-out infinite}
  .rt-streak{animation:rt-streak .7s linear infinite}
  .rt-whoosh{animation:rt-whoosh .28s linear infinite}
  .rt-dust{animation:rt-dust .48s ease-out infinite}
  .rt-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes rt-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes rt-soar{0%,100%{transform:translateY(0)}50%{transform:translateY(-22px)}}
  @keyframes rt-runBounce{0%,100%{transform:translate(10px,4px)}25%{transform:translate(-4px,-14px)}50%{transform:translate(12px,2px)}75%{transform:translate(-2px,-16px)}}
  @keyframes rt-runShadow{0%,100%{opacity:.28;transform:translateX(-16px) scaleX(1.25)}50%{opacity:.12;transform:translateX(10px) scaleX(.65)}}
  @keyframes rt-shadowO{0%,100%{opacity:.22}50%{opacity:.12}}
  @keyframes rt-whoosh{0%{transform:translateX(18px);opacity:0}28%{opacity:.95}100%{transform:translateX(-56px);opacity:0}}
  @keyframes rt-dust{0%{transform:translate(0,0) scale(1);opacity:0}18%{opacity:.75}100%{transform:translate(-40px,8px) scale(.6);opacity:0}}
  @keyframes rt-glow{0%,100%{opacity:calc(var(--g,.45)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.45)*var(--gf,1))}}
  @keyframes rt-pop{from{opacity:0}to{opacity:1}}
  @keyframes rt-ring{0%,74%,100%{opacity:0}18%{opacity:.95}55%{opacity:0}}
  @keyframes rt-scan{0%,100%{opacity:.1;transform:translateY(-2px)}50%{opacity:.5;transform:translateY(74px)}}
  @keyframes rt-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes rt-rise{0%{opacity:.42;transform:translateY(10px)}24%{opacity:1}100%{opacity:0;transform:translateY(-42px)}}
  @keyframes rt-fall{0%{opacity:.3;transform:translateY(-20px)}12%{opacity:1}84%{opacity:.9}100%{opacity:.2;transform:translateY(145px)}}
  @keyframes rt-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes rt-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes rt-eq{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes rt-type{0%,100%{opacity:1}50%{opacity:.2}}
  @keyframes rt-dot{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes rt-smoke{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:.55}100%{opacity:0;transform:translate(0,48px) scale(1.3)}}
  @keyframes rt-streak{0%{opacity:0;transform:translate(0,0)}28%{opacity:.85}100%{opacity:0;transform:translate(0,36px)}}
  @media (prefers-reduced-motion:reduce){.rt-svg *{animation:none!important;transition:none!important}}
`;

/* ============================================================
   BODY GEOMETRY
   Head 138..282 / 158..290 · face panel 150..270 / 186..270
   Torso 150..270 / 300..408 · wheels at y 450
   Shoulders sit on the torso edge so arms stay visibly attached.
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
  rest: "M0,0 Q-22,28 -28,62",
  droop: "M0,0 Q-14,32 -18,64",
  out: "M0,0 Q-38,10 -70,18",
  up: "M0,0 Q-36,-18 -48,-54",
  high: "M0,0 Q-30,-40 -22,-78",
  point: "M0,0 Q-42,2 -80,0",
  chin: "M0,0 Q-18,-24 34,-42",
  onFace: "M0,0 Q-22,-34 38,-62",
  palm: "M0,0 Q-26,-42 44,-78",
  write: "M0,0 Q-24,40 36,66",
  /* Clap: open (hands apart) ↔ shut (hands meet at center chest) */
  clapOpenL: "M0,0 Q-28,8 18,2",
  clapShutL: "M0,0 Q-6,20 56,16",
  clapOpenR: "M0,0 Q28,8 -18,2",
  clapShutR: "M0,0 Q6,20 -56,16",
  clapL: "M0,0 Q-6,20 56,16",
  clapR: "M0,0 Q6,20 -56,16",
  shrug: "M0,0 Q-34,-14 -50,2",
  thumb: "M0,0 Q-38,-22 -36,-58",
  down: "M0,0 Q-26,30 -22,66",
  /* Sprint: fists stay on the flanks — high = forward, low = back */
  runFwd: "M0,0 Q-20,-18 -22,16",
  runBack: "M0,0 Q-24,52 -26,88",
  runMid: "M0,0 Q-22,18 -24,52",
  /* Vertical launch: fists punched straight toward the sky */
  flyUp: "M0,0 Q-14,-56 -6,-98",
};

const GESTURES = [
  /* Core */
  { key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Soft bob and blink while his LED pupils follow your cursor.",
    armL: A.rest, armR: mir(A.rest), eye: "open", mouth: "smile", track: true },
  { key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "One arm lifts high and flaps a friendly hello.",
    armL: A.rest, armR: mir(A.high), wave: true, eye: "open", mouth: "grin", brow: "up" },
  { key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased LED eyes and a warm pixel grin.",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin" },
  { key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "Hand to chin, gaze drifting up while a code spark ticks over.",
    armL: A.chin, armR: mir(A.rest), eye: "open", mouth: "flat", brow: "oneUp",
    look: [3, -6], prop: "think" },
  { key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with soft focus while the audio bars breathe.",
    armL: A.rest, armR: mir(A.rest), bow: 5, eye: "open", mouth: "tiny", prop: "eq" },
  { key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with speech arcs carrying off the panel.",
    armL: A.out, armR: mir(A.rest), eye: "open", mouth: "talk", brow: "up", prop: "speech" },
  { key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "One arm out, directing attention to the next lesson.",
    armL: A.rest, armR: mir(A.point), eye: "open", mouth: "smile", brow: "up",
    look: [6, -2], prop: "point" },
  { key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Both hands on a floating keyboard while the caret blinks.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 5], prop: "keyboard" },

  /* Moods */
  { key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Arms up and bracket confetti raining down after a green build.",
    armL: A.high, armR: mir(A.high), eye: "arch", mouth: "grin", prop: "confetti" },
  { key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart pixels in both eyes and hearts drifting off the chest.",
    armL: A.rest, armR: mir(A.rest), eye: "heart", mouth: "smile", prop: "hearts" },
  { key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Soft eyes and a gentle droop. Never mean about it.",
    armL: A.droop, armR: mir(A.droop), eye: "open", mouth: "frown", brow: "sad", look: [0, 4] },
  { key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Pixel tears down the panel — bigger sorrow than sad.",
    armL: A.droop, armR: mir(A.droop), eye: "cry", mouth: "frown", brow: "sad", prop: "tears" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, flat mouth. Compile warnings again.",
    armL: A.rest, armR: mir(A.rest), bow: 3, eye: "flat", mouth: "frown", brow: "angry", prop: "steam" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a soft Z drifting off the antenna.",
    armL: A.droop, armR: mir(A.droop), eye: "half", mouth: "tiny", prop: "zzz" },
  { key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up, panel bright, a badge earned for clean code.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "badge" },
  { key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile and one bead of coolant. Soft fail, no shame.",
    armL: A.rest, armR: mir(A.up), eye: "open", mouth: "wry", brow: "oneUp", look: [-3, 2], prop: "oops" },
  { key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Wide LED eyes and a small jump of delight.",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "spark" },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "Hand to the mouth panel, a heart blown toward the learner.",
    armL: A.chin, armR: mir(A.rest), eye: "arch", mouth: "kiss", brow: "up",
    look: [6, -2], prop: "kissHeart" },
  { key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "Palm flat on the panel over a very classic bug.",
    armL: A.palm, armR: mir(A.droop), eye: "flat", mouth: "wry", brow: "sad" },
  { key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "Arms swinging and chassis swaying after shipping a feature.",
    armL: A.high, armR: mir(A.out), sway: true, eye: "arch", mouth: "grin", prop: "notes" },

  /* Action */
  { key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes, ringing energy, whole chassis rattling. Deadline ping.",
    armL: A.out, armR: mir(A.out), shake: true, eye: "wide", mouth: "o", brow: "up", prop: "alarm" },
  { key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Both arms open and a warm face. You've got this — one more try.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "encourage" },
  { key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "Magnifier over the docs while a scan line sweeps the panel.",
    armL: A.chin, armR: mir(A.out), eye: "open", mouth: "flat", brow: "oneUp",
    look: [7, -3], prop: "search" },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "Clear approval — all tests green.",
    armL: A.rest, armR: mir(A.thumb), eye: "arch", mouth: "grin", prop: "thumbsUp" },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Gentle disapproval — try another approach.",
    armL: A.rest, armR: mir(A.down), eye: "flat", mouth: "frown", brow: "sad", prop: "thumbsDown" },
  { key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Shoulders up, unsure which branch to take.",
    armL: A.shrug, armR: mir(A.shrug), eye: "open", mouth: "flat", brow: "oneUp", prop: "question" },
  { key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Focused busy posture with gears turning beside the head.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 3], prop: "gears" },
  { key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Full sprint — leaned forward, arms pumping, wheels spinning, dust kicking up.",
    armL: A.runMid, armR: mir(A.runMid), lean: 18, look: [12, -3],
    eye: "wide", mouth: "o", brow: "up", gait: "run", prop: "speed" },
  { key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Rocketing straight up — chin tipped to the sky, fists leading, thrusters roaring below.",
    armL: A.flyUp, armR: mir(A.flyUp), lift: -56,
    eye: "wide", mouth: "o", brow: "up", look: [0, -18], skyward: true,
    gazeY: -7, prop: "rocket", boost: true },
  { key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "Arm raised and waiting for your palm.",
    armL: A.rest, armR: mir(A.high), eye: "arch", mouth: "grin", prop: "highFive" },
  { key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Hands meeting mid-clap for a well-solved problem.",
    armL: A.clapL, armR: A.clapR, eye: "arch", mouth: "grin", brow: "up",
    clap: true, prop: "clap" },

  /* Feedback */
  { key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Uneven eyes, crooked mouth, question mark hovering.",
    armL: A.chin, armR: mir(A.shrug), bow: -3, eye: "uneven", mouth: "wry", brow: "oneUp",
    prop: "question" },
  { key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "Clear win pose with a bright check stamped beside him.",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin", prop: "success" },
  { key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert — concerned, not scary.",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "error" },
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
  { key: "antenna", label: "Antenna", category: "Body" },
  { key: "ears", label: "Ear pods", category: "Body" },
  { key: "arms", label: "Arms", category: "Body" },
  { key: "chest", label: "Chest screen", category: "Body" },
  { key: "rivets", label: "Rivets", category: "Body" },
  { key: "legs", label: "Legs & wheels", category: "Body" },
  { key: "frame", label: "Screen frame", category: "Face" },
  { key: "scan", label: "Scan line", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "thrusters", label: "Thrusters", category: "Stage" },
  { key: "halo", label: "Halo glow", category: "Stage" },
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "props", label: "Pose props", category: "Stage" },
];
const ELEMENT_CATEGORIES = ["Body", "Face", "Stage"];
const ALL_PARTS = Object.fromEntries(ELEMENTS.map((e) => [e.key, true]));
const allParts = (on) => Object.fromEntries(ELEMENTS.map((e) => [e.key, on]));
const elementsFor = (cfg) =>
  ELEMENTS.map((el) => ({
    ...el,
    label: cfg.elementLabels?.[el.key] || el.label,
  }));

const EYE_L_X = 180, EYE_R_X = 240, EYE_Y = 224;
const HEART_D = "M0,8 C-10,0 -11,-7 -4.5,-9 C-1.5,-10 0,-6.5 0,-4.5 C0,-6.5 1.5,-10 4.5,-9 C11,-7 10,0 0,8 Z";

/* ---------- face ---------- */
/* eyeStyle: hud (square LEDs) · soft (big rounds) · visor (ringed) · bean (almond ovals)
   gazeY: negative shifts pupils up (flight / skyward look). */
function Eye({ kind, x, p, track, eyeRef, style = "soft", gazeY = 0 }) {
  const at = `translate(${x},${EYE_Y})`;
  const pupilAt = gazeY ? `translate(0,${gazeY})` : undefined;
  const line = { fill: "none", stroke: p.led, strokeWidth: 5.5, strokeLinecap: "round" };
  if (kind === "arch") return <path d="M-12,3 Q0,-9 12,3" transform={at} {...line} />;
  if (kind === "flat") return <path d="M-12,0 L12,0" transform={at} {...line} />;
  if (kind === "heart") return <path transform={`${at} scale(1.5)`} fill={p.led} d={HEART_D} />;
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
            begin="rt-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      {style === "hud" && (() => {
        const w = uneven ? (x < 210 ? 16 : 22) : wide ? 24 : 20;
        const h = uneven ? (x < 210 ? 20 : 28) : wide ? 28 : 24;
        return (
          <>
            <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="3" fill={p.led} />
            <g ref={track ? eyeRef : undefined} className="rt-pupils" transform={pupilAt}>
              <rect x="-4" y="-5" width="7" height="7" rx="1.5" fill={p.screen} opacity=".75" />
              <rect x="2" y="2" width="3" height="3" rx="0.5" fill={light(p.led, 0.55)} opacity=".75" />
            </g>
          </>
        );
      })()}
      {style === "soft" && (() => {
        const r = uneven ? (x < 210 ? 11 : 15) : wide ? 16 : 14;
        return (
          <>
            <circle cx="0" cy="0" r={r} fill={p.led} />
            <g ref={track ? eyeRef : undefined} className="rt-pupils" transform={pupilAt}>
              <circle cx="-3.5" cy="-4" r={wide ? 4.5 : 3.8} fill={p.screen} opacity=".72" />
              <circle cx="3.5" cy="3.5" r="1.8" fill={light(p.led, 0.55)} opacity=".75" />
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
            <g ref={track ? eyeRef : undefined} className="rt-pupils" transform={pupilAt}>
              <circle cx="0" cy="0" r={wide ? 4.2 : 3.4} fill={p.led} />
              <path d={`M0,${-r * 0.45} L0,${r * 0.45}`} stroke={p.led} strokeWidth="1.2" opacity=".35" />
              <path d={`M${-r * 0.45},0 L${r * 0.45},0`} stroke={p.led} strokeWidth="1.2" opacity=".35" />
              <circle cx="2.5" cy="-2.5" r="1.4" fill={light(p.led, 0.6)} opacity=".8" />
            </g>
          </>
        );
      })()}
      {style === "bean" && (() => {
        const rx = uneven ? (x < 210 ? 12 : 16) : wide ? 17 : 14.5;
        const ry = uneven ? (x < 210 ? 7 : 10) : wide ? 11 : 8.5;
        return (
          <>
            <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={p.led} />
            <g ref={track ? eyeRef : undefined} className="rt-pupils" transform={pupilAt}>
              <ellipse cx="-3" cy="-1.5" rx={wide ? 5 : 4} ry={wide ? 3.2 : 2.6} fill={p.screen} opacity=".72" />
              <ellipse cx="4" cy="2" rx="2" ry="1.4" fill={light(p.led, 0.55)} opacity=".7" />
            </g>
          </>
        );
      })()}
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    up: ["M160,196 Q178,186 196,194", "M224,194 Q244,186 260,196"],
    sad: ["M161,204 Q172,194 196,192", "M224,192 Q248,194 259,204"],
    angry: ["M161,190 Q178,196 197,206", "M223,206 Q242,196 259,190"],
    oneUp: ["M162,202 Q178,198 196,202", "M224,196 Q242,184 258,192"],
  }[kind];
  return (
    <g fill="none" stroke={p.led} strokeWidth="5" strokeLinecap="round" opacity=".9">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p }) {
  const line = { fill: "none", stroke: p.led, strokeWidth: 5, strokeLinecap: "round" };
  if (kind === "grin") return <path className="rt-pop" d="M186,250 Q210,272 234,250" {...line} strokeWidth="6" />;
  if (kind === "frown") return <path className="rt-pop" d="M188,260 Q210,244 232,260" {...line} />;
  if (kind === "o") return <ellipse className="rt-pop" cx="210" cy="254" rx="9" ry="11" fill={p.led} />;
  if (kind === "talk")
    return (
      <ellipse className="rt-pop" cx="210" cy="254" rx="9" ry="11" fill={p.led}>
        <animate attributeName="ry" values="11;6;11;8;11" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
    );
  if (kind === "tiny") return <path className="rt-pop" d="M198,254 Q210,259 222,254" {...line} strokeWidth="4" />;
  if (kind === "flat") return <path className="rt-pop" d="M192,254 L228,254" {...line} strokeWidth="4.5" />;
  if (kind === "wry") return <path className="rt-pop" d="M190,252 Q210,266 232,246" {...line} />;
  if (kind === "kiss")
    return (
      <g className="rt-pop" fill={p.led}>
        {/* puckered pixel kiss */}
        <path d="M200,250 Q210,242 220,250 Q210,262 200,250 Z" />
        <ellipse cx="210" cy="254" rx="3.2" ry="2.2" fill={p.screen} opacity=".55" />
      </g>
    );
  return <path className="rt-pop" d="M188,250 Q210,266 232,250" {...line} />;
}

/* ---------- limbs ---------- */
/* Distinct hands per chassis — not the same mitten on every bot. */
function HandShape({ chassis, p }) {
  if (chassis === "athlete") {
    /* angular block fist — reads from any pose */
    return (
      <g>
        <path d="M-16,-14 L16,-14 L18,12 L-18,12 Z" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="3" />
        <path d="M-12,-14 L-12,-24 L0,-24 L0,-14" fill={p.body} stroke={p.bodyDark} strokeWidth="2.5" />
        <path d="M-16,0 H18" stroke={p.bodyDark} strokeWidth="2" opacity=".5" />
        <rect x="-12" y="-10" width="6" height="8" rx="1.5" fill={p.joint} />
        <rect x="-3" y="-10" width="6" height="8" rx="1.5" fill={p.joint} />
        <rect x="6" y="-10" width="6" height="8" rx="1.5" fill={p.joint} />
        <rect x="-10" y="4" width="20" height="4" rx="1" fill={p.accent} opacity=".55" />
      </g>
    );
  }
  if (chassis === "astronaut") {
    /* bulky space glove + cuff ring */
    return (
      <g>
        <ellipse cx="0" cy="3" rx="20" ry="17" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="3" />
        <ellipse cx="0" cy="3" rx="20" ry="17" fill="none" stroke={p.accent} strokeWidth="2.5" opacity=".4" />
        <ellipse cx="-9" cy="-2" rx="6" ry="7" fill={p.body} opacity=".4" />
        <ellipse cx="0" cy="-5" rx="6" ry="8" fill={p.body} opacity=".4" />
        <ellipse cx="9" cy="-2" rx="6" ry="7" fill={p.body} opacity=".4" />
        <rect x="-14" y="-20" width="28" height="12" rx="5" fill={p.joint} />
        <rect x="-11" y="-17" width="22" height="5" rx="2" fill={p.led} opacity=".5" />
        <circle cx="10" cy="8" r="3" fill={p.accent} opacity=".55" />
      </g>
    );
  }
  if (chassis === "barista") {
    /* soft cup-holder mitt with flat palm pad */
    return (
      <g>
        <path d="M-18,-7 Q-20,14 0,18 Q20,14 18,-7 Q10,-18 0,-18 Q-10,-18 -18,-7 Z"
          fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="3" />
        <ellipse cx="0" cy="3" rx="10" ry="8" fill={p.accent} opacity=".45" />
        <path d="M-10,-9 Q0,-16 10,-9" fill="none" stroke={p.bodyDark} strokeWidth="2.5" opacity=".4" />
        <circle cx="-6" cy="-2" r="2.5" fill={p.bodyDark} opacity=".25" />
        <circle cx="6" cy="-2" r="2.5" fill={p.bodyDark} opacity=".25" />
      </g>
    );
  }
  /* support — friendly three-finger soft mitt */
  return (
    <g>
      <ellipse cx="0" cy="3" rx="17" ry="15" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="3" />
      <ellipse cx="-8" cy="-7" rx="6.5" ry="8" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="2.5" />
      <ellipse cx="0" cy="-9" rx="6.5" ry="8.5" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="2.5" />
      <ellipse cx="8" cy="-7" rx="6.5" ry="8" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="2.5" />
      <circle cx="-3" cy="1" r="4" fill={p.accent} opacity=".45" />
    </g>
  );
}

function Arm({ d, shoulder, p, anim, animKey, morph, chassis = "support" }) {
  const [hx_, hy] = endOf(d);
  const morphEnds = morph
    ? morph.values.split(";").map((frame) => endOf(frame.trim()))
    : null;
  const handTx = morphEnds ? morphEnds.map((pt) => `${pt[0]} ${pt[1]}`).join(";") : null;
  return (
    <g transform={`translate(${shoulder.join(",")})`}>
      {anim && (
        <animateTransform key={animKey} attributeName="transform" type="rotate" additive="sum"
          values={anim.values} dur={anim.dur} repeatCount="indefinite" />
      )}
      <path d={d} fill="none" stroke={p.limb} strokeWidth="26" strokeLinecap="round">
        {morph && (
          <animate key={`${animKey}-d`} attributeName="d" values={morph.values}
            dur={morph.dur} repeatCount="indefinite" />
        )}
      </path>
      <path d={d} fill="none" stroke={p.bodyLight} strokeWidth="9" strokeLinecap="round" opacity=".28">
        {morph && (
          <animate key={`${animKey}-hi`} attributeName="d" values={morph.values}
            dur={morph.dur} repeatCount="indefinite" />
        )}
      </path>
      <circle cx="0" cy="0" r="18" fill={p.body} stroke={p.bodyDark} strokeWidth="2.5" />
      <circle cx="0" cy="0" r="7" fill={p.joint} opacity=".7" />
      <g transform={`translate(${hx_},${hy})`}>
        {handTx && (
          <animateTransform attributeName="transform" type="translate"
            values={handTx} dur={morph.dur} repeatCount="indefinite" />
        )}
        <HandShape chassis={chassis} p={p} />
      </g>
    </g>
  );
}

/** Rocket thrusters + big exhaust plumes for flying. */
function Thrusters({ p }) {
  const nozzles = [
    { x: 172, y: 418, begin: "0s" },
    { x: 248, y: 418, begin: "0.08s" },
  ];
  return (
    <g>
      <defs>
        <radialGradient id="rt-puff" cx="50%" cy="30%" r="70%">
          <stop offset="0" stopColor={FLAME.smoke} stopOpacity=".6" />
          <stop offset="1" stopColor={FLAME.smoke} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rt-flame-bloom" cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor={FLAME.mid} stopOpacity=".55" />
          <stop offset="1" stopColor={FLAME.outer} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* big bloom under the whole chassis so flying reads hot */}
      <ellipse cx="210" cy="470" rx="130" ry="70" fill="url(#rt-flame-bloom)" opacity=".85" />
      <ellipse cx="210" cy="505" rx="128" ry="28" fill="url(#rt-puff)" />
      {[[140, 455, 30, "0s"], [280, 458, 32, "0.18s"], [210, 475, 28, "0.35s"],
        [160, 492, 22, "0.55s"], [260, 494, 24, "0.75s"], [210, 508, 20, "0.95s"]].map(([x, y, r, delay], i) => (
        <circle key={i} className="rt-smoke" cx={x} cy={y} r={r} fill="url(#rt-puff)"
          style={{ animationDelay: delay }} />
      ))}
      {nozzles.map(({ x, y, begin }, i) => (
        <g key={i}>
          <path d={`M${x - 24},${y - 12} L${x + 24},${y - 12} L${x + 16},${y + 8} L${x - 16},${y + 8} Z`}
            fill={p.joint} stroke={p.bodyDark} strokeWidth="2" />
          <ellipse cx={x} cy={y + 7} rx="13" ry="5.5" fill={p.bodyDark} />
          <g transform={`translate(${x},${y + 8})`}>
            <animateTransform attributeName="transform" type="scale" additive="sum"
              values="1 1;1.28 1.85;0.86 1.12;1 1" dur="0.18s" begin={begin}
              repeatCount="indefinite" />
            {/* ~2.5× original plume */}
            <ellipse cx="0" cy="40" rx="48" ry="58" fill={FLAME.outer} opacity=".35" />
            <path d="M-30,0 Q-22,48 0,100 Q22,48 30,0 Q0,26 -30,0 Z" fill={FLAME.outer} opacity=".97" />
            <path d="M-19,0 Q-12,38 0,78 Q12,38 19,0 Q0,20 -19,0 Z" fill={FLAME.mid} />
            <path d="M-9,0 Q-5,24 0,50 Q5,24 9,0 Z" fill={FLAME.core} />
            <circle cx="-18" cy="52" r="4" fill={FLAME.mid} opacity=".92">
              <animate attributeName="cy" values="26;72;26" dur="0.28s" begin={begin}
                repeatCount="indefinite" />
              <animate attributeName="opacity" values=".95;0;.95" dur="0.28s" begin={begin}
                repeatCount="indefinite" />
            </circle>
            <circle cx="16" cy="58" r="3.2" fill={FLAME.core} opacity=".92">
              <animate attributeName="cy" values="22;76;22" dur="0.34s" begin="0.1s"
                repeatCount="indefinite" />
            </circle>
            <circle cx="-4" cy="70" r="2.6" fill={FLAME.core} opacity=".85">
              <animate attributeName="cy" values="40;92;40" dur="0.26s" begin="0.05s"
                repeatCount="indefinite" />
            </circle>
            <circle cx="8" cy="78" r="2" fill={FLAME.mid} opacity=".75">
              <animate attributeName="cy" values="48;96;48" dur="0.3s" begin="0.12s"
                repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      ))}
    </g>
  );
}

const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <path className={cls} transform={`translate(${x},${y}) scale(${s})`} fill={fill}
    style={delay ? { animationDelay: delay } : undefined}
    d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" />
);

function Props({ g, p }) {
  const accent = p.accent;
  switch (g.prop) {
    case "think":
      return (
        <g>
          <circle cx="292" cy="176" r="4.5" fill={p.led} opacity=".85" />
          <circle cx="310" cy="154" r="6.5" fill={accent} opacity=".85" />
          <Star4 x={334} y={122} s={1.4} fill={p.led} cls="rt-twinkle" />
          <text x="300" y="112" fill={accent} fontSize="15" fontFamily="monospace"
            className="rt-twinkle">{"{ }"}</text>
        </g>
      );
    case "eq":
      return (
        <g fill={accent}>
          {[[56, 18], [72, 32], [88, 12], [324, 12], [340, 32], [356, 18]].map(([x, h], i) => (
            <rect key={i} className="rt-eq" x={x} y={230 - h} width="8" height={h * 2} rx="4"
              style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
          ))}
        </g>
      );
    case "speech":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round">
          <path className="rt-ring" d="M294,238 Q304,252 294,266" strokeWidth="4.5" />
          <path className="rt-ring" d="M312,228 Q328,252 312,276" strokeWidth="4.5"
            style={{ animationDelay: ".2s" }} />
          <text x="338" y="258" fill={p.led} fontSize="14" fontFamily="monospace"
            className="rt-twinkle">;</text>
        </g>
      );
    case "point":
      return (
        <g fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round">
          <path className="rt-ring" d="M358,312 L390,312" />
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
              opacity={i === 5 ? 1 : 0.5} className={i === 5 ? "rt-type" : undefined} />
          ))}
        </g>
      );
    case "confetti":
      return (
        <g fontFamily="monospace" fontSize="17" fontWeight="700">
          {[[112, 82, 0, "<"], [250, 68, 0.4, ">"], [184, 54, 0.8, "{"],
            [316, 106, 1.2, "}"], [86, 126, 1.6, "/"], [342, 150, 2, ";"]].map(
            ([x, y, delay, glyph], i) => (
              <text key={i} className="rt-fall" x={x} y={y}
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
            <path className="rt-rise" d={HEART_D} fill={p.blush} />
          </g>
          <g transform="translate(112,150) scale(1.1)">
            <path className="rt-rise" d={HEART_D} fill={p.led} opacity=".85"
              style={{ animationDelay: ".9s" }} />
          </g>
        </g>
      );
    case "tears":
      return (
        <g>
          <path className="rt-tear" transform="translate(166,246)" fill={p.accent} opacity=".9"
            d="M0,-11 Q7,-2 7,3 A7,7 0 1,1 -7,3 Q-7,-2 0,-11 Z" />
          <path className="rt-tear" transform="translate(254,246)" fill={p.accent} opacity=".9"
            d="M0,-11 Q7,-2 7,3 A7,7 0 1,1 -7,3 Q-7,-2 0,-11 Z" style={{ animationDelay: ".4s" }} />
        </g>
      );
    case "steam":
      return (
        <g fill={p.bodyLight} opacity=".5">
          <circle className="rt-rise" cx="308" cy="176" r="9" />
          <circle className="rt-rise" cx="322" cy="162" r="6.5" style={{ animationDelay: ".5s" }} />
        </g>
      );
    case "zzz":
      return (
        <path className="rt-zzz" d="M292,120 L310,120 L292,138 L310,138" fill="none"
          stroke={p.led} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <ellipse className="rt-tear" cx="158" cy="196" rx="5" ry="8" fill={accent} opacity=".8" />
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
            <path className="rt-ring" d="M226,252 Q248,244 268,248" strokeWidth="3.5" />
            <path className="rt-ring" d="M228,260 Q252,256 274,258" strokeWidth="2.5"
              style={{ animationDelay: ".18s" }} />
          </g>
          {/* Hearts float clear of the face — parent g keeps position under rt-rise */}
          <g transform="translate(272,248) scale(1.65)">
            <path className="rt-rise" d={HEART_D} fill="#FF6B8A" />
          </g>
          <g transform="translate(312,212) scale(1.2)">
            <path className="rt-rise" d={HEART_D} fill="#FF8AA8" opacity=".95"
              style={{ animationDelay: ".4s" }} />
          </g>
          <g transform="translate(348,178) scale(0.85)">
            <path className="rt-rise" d={HEART_D} fill={p.led}
              style={{ animationDelay: ".8s" }} />
          </g>
        </g>
      );
    case "notes":
      return (
        <g fill={accent}>
          <g className="rt-rise" transform="translate(320,150)">
            <ellipse cx="0" cy="0" rx="5.5" ry="4.2" transform="rotate(-18)" />
            <path d="M4,-1 L4,-19 Q11,-17 13,-11" fill="none" stroke={accent} strokeWidth="3"
              strokeLinecap="round" />
          </g>
          <g className="rt-rise" transform="translate(96,138)" style={{ animationDelay: ".7s" }}>
            <ellipse cx="0" cy="0" rx="4.5" ry="3.4" transform="rotate(-18)" />
            <path d="M3.5,-1 L3.5,-15" fill="none" stroke={p.led} strokeWidth="2.6" strokeLinecap="round" />
          </g>
        </g>
      );
    case "alarm":
      return (
        <g fill="none" stroke={p.led} strokeLinecap="round">
          <path className="rt-ring" d="M112,204 Q92,232 112,260" strokeWidth="5" />
          <path className="rt-ring" d="M308,204 Q328,232 308,260" strokeWidth="5"
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
            <path className="rt-ring" d="M76,300 Q56,282 76,264" />
            <path className="rt-ring" d="M344,300 Q364,282 344,264" style={{ animationDelay: ".2s" }} />
          </g>
          <Star4 x={116} y={146} fill={p.led} cls="rt-twinkle" s={1.1} />
          <Star4 x={306} y={136} fill={accent} cls="rt-twinkle" delay=".4s" />
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
      return (
        <path d="M304,256 Q303,232 312,231 Q321,232 320,256 Z" fill={p.bodyLight}
          stroke={p.bodyDark} strokeWidth="2.5" strokeLinejoin="round" />
      );
    case "thumbsDown":
      return (
        <path d="M290,382 Q289,406 298,407 Q307,406 306,382 Z" fill={p.bodyLight}
          stroke={p.bodyDark} strokeWidth="2.5" strokeLinejoin="round" />
      );
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
            <path className="rt-whoosh" d="M78,250 L28,250" strokeWidth="5" />
            <path className="rt-whoosh" d="M74,286 L20,286" strokeWidth="6"
              style={{ animationDelay: ".07s", animationDuration: ".32s" }} />
            <path className="rt-whoosh" d="M80,322 L34,322" strokeWidth="4.5"
              style={{ animationDelay: ".13s", animationDuration: ".26s" }} />
            <path className="rt-whoosh" d="M70,358 L30,358" strokeWidth="3.5"
              style={{ animationDelay: ".19s", animationDuration: ".3s" }} />
          </g>
          {/* dust kicked up from the wheels */}
          {[[150, 456], [188, 462], [248, 458], [286, 464]].map(([x, y], i) => (
            <ellipse key={i} className="rt-dust" cx={x} cy={y} rx="11" ry="4.5"
              fill={p.bodyLight} opacity=".55"
              style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </g>
      );
    case "rocket":
      return (
        <g>
          {/* vertical speed lines falling away under the launch */}
          <g fill="none" stroke={accent} strokeLinecap="round">
            <path className="rt-streak" d="M118,300 L118,360" strokeWidth="5" opacity=".75" />
            <path className="rt-streak" d="M156,310 L156,372" strokeWidth="4" opacity=".6"
              style={{ animationDelay: ".16s" }} />
            <path className="rt-streak" d="M264,310 L264,372" strokeWidth="4" opacity=".6"
              style={{ animationDelay: ".28s" }} />
            <path className="rt-streak" d="M302,300 L302,360" strokeWidth="5" opacity=".75"
              style={{ animationDelay: ".4s" }} />
          </g>
          <Star4 x={150} y={120} fill={p.led} cls="rt-twinkle" s={1.1} />
          <Star4 x={270} y={110} fill={accent} cls="rt-twinkle" delay=".45s" />
        </g>
      );
    case "highFive":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="5">
          <path className="rt-ring" d="M300,238 Q320,218 340,238" />
          <path className="rt-ring" d="M306,216 Q326,192 346,216" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "clap":
      return (
        <g>
          {/* Impact burst at the clap point (center chest) */}
          <g transform="translate(210,344)">
            <g fill="none" stroke={accent} strokeLinecap="round">
              <path className="rt-ring" d="M-28,0 Q0,-22 28,0" strokeWidth="4.5" />
              <path className="rt-ring" d="M-36,6 Q0,-30 36,6" strokeWidth="3.5"
                style={{ animationDelay: ".18s" }} />
            </g>
            <Star4 x={0} y={-6} fill={p.led} cls="rt-twinkle" s={1.05} />
            <Star4 x={-22} y={8} fill={accent} cls="rt-twinkle" s={0.7} delay=".25s" />
            <Star4 x={22} y={8} fill={accent} cls="rt-twinkle" s={0.7} delay=".4s" />
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
          <path className="rt-ring" d="M112,204 Q92,232 112,260" fill="none" stroke={p.blush}
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
            <circle key={i} className="rt-dot" cx={302 + i * 16} cy="152" r="5"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/* ---------- the robot ---------- */

/* ---------- distinct chassis pieces ---------- */
function Antenna({ chassis, p, skyward }) {
  const y = skyward ? 148 : 158;
  if (chassis === "athlete") {
    return (
      <g data-ms-part="antenna" transform={`translate(210,${y})`}>
        <path d="M0,0 L0,-62" fill="none" stroke={p.joint} strokeWidth="7" strokeLinecap="round" />
        <path d="M-14,-42 L0,-62 L14,-42" fill="none" stroke={p.led} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M-6,-62 L0,-74 L6,-62 Z" fill={p.accent} />
      </g>
    );
  }
  if (chassis === "support") {
    /* boom mic swings out past the left headset cup */
    return (
      <g data-ms-part="antenna" transform={`translate(210,${y})`}>
        <path d="M-78,36 Q-110,52 -96,88" fill="none" stroke={p.joint} strokeWidth="7" strokeLinecap="round" />
        <ellipse cx="-92" cy="98" rx="14" ry="10" fill={p.led} />
        <circle cx="-92" cy="98" r="5" fill={p.screen} opacity=".55" />
        <circle cx="-86" cy="94" r="2.5" fill={light(p.led, 0.5)} opacity=".85" />
      </g>
    );
  }
  if (chassis === "astronaut") {
    return (
      <g data-ms-part="antenna" transform={`translate(210,${y})`}>
        <path d="M0,0 L0,-22" fill="none" stroke={p.joint} strokeWidth="6" strokeLinecap="round" />
        <ellipse cx="0" cy="-40" rx="24" ry="16" fill="none" stroke={p.accent} strokeWidth="5" />
        <ellipse cx="0" cy="-40" rx="12" ry="8" fill={p.led} opacity=".75" />
        <path d="M0,-24 L0,-56" stroke={p.joint} strokeWidth="3" opacity=".5" />
      </g>
    );
  }
  // barista steam — thick rising plumes
  return (
    <g data-ms-part="antenna" transform={`translate(210,${y})`}>
      <path className="rt-smoke" d="M-14,4 Q-28,-30 -10,-58" fill="none" stroke={p.bodyLight} strokeWidth="9" strokeLinecap="round" opacity=".8" />
      <path className="rt-smoke" d="M2,2 Q18,-34 -2,-66" fill="none" stroke={p.led} strokeWidth="8" strokeLinecap="round" opacity=".75"
        style={{ animationDelay: ".35s" }} />
      <path className="rt-smoke" d="M16,6 Q30,-22 14,-50" fill="none" stroke={p.accent} strokeWidth="6" strokeLinecap="round" opacity=".6"
        style={{ animationDelay: ".7s" }} />
      <ellipse cx="-6" cy="-64" rx="10" ry="7" fill={p.led} opacity=".45" />
      <ellipse cx="10" cy="-56" rx="8" ry="6" fill={p.bodyLight} opacity=".4" />
    </g>
  );
}

function Ears({ chassis, p }) {
  if (chassis === "athlete") {
    return (
      <g data-ms-part="ears">
        <path d="M108,210 L140,188 L152,248 L118,252 Z" fill={p.bodyDark} />
        <path d="M312,210 L280,188 L268,248 L302,252 Z" fill={p.bodyDark} />
        <rect x="124" y="208" width="20" height="32" rx="4" fill={p.accent} opacity=".55" />
        <rect x="276" y="208" width="20" height="32" rx="4" fill={p.accent} opacity=".55" />
        <path d="M128,216 H140" stroke={p.led} strokeWidth="2" opacity=".5" />
        <path d="M280,216 H292" stroke={p.led} strokeWidth="2" opacity=".5" />
      </g>
    );
  }
  if (chassis === "support") {
    return (
      <g data-ms-part="ears">
        {/* headband sits above the egg head so it reads as a headset */}
        <path d="M126,178 Q210,128 294,178" fill="none" stroke={p.bodyDark} strokeWidth="12" strokeLinecap="round" />
        <path d="M126,178 Q210,136 294,178" fill="none" stroke={p.accent} strokeWidth="4" opacity=".55" />
        <rect x="100" y="188" width="40" height="62" rx="20" fill={p.bodyDark} />
        <rect x="280" y="188" width="40" height="62" rx="20" fill={p.bodyDark} />
        <rect x="108" y="200" width="24" height="38" rx="12" fill={p.accent} opacity=".45" />
        <rect x="288" y="200" width="24" height="38" rx="12" fill={p.accent} opacity=".45" />
        <circle cx="120" cy="220" r="6" fill={p.led} opacity=".65" />
        <circle cx="300" cy="220" r="6" fill={p.led} opacity=".65" />
      </g>
    );
  }
  if (chassis === "astronaut") {
    return (
      <g data-ms-part="ears">
        <ellipse cx="126" cy="218" rx="16" ry="26" fill={p.bodyDark} />
        <ellipse cx="294" cy="218" rx="16" ry="26" fill={p.bodyDark} />
        <circle cx="126" cy="218" r="7" fill={p.led} opacity=".55" />
        <circle cx="294" cy="218" r="7" fill={p.led} opacity=".55" />
        <circle cx="126" cy="218" r="3" fill={p.accent} opacity=".7" />
        <circle cx="294" cy="218" r="3" fill={p.accent} opacity=".7" />
      </g>
    );
  }
  // barista cup handles — thick C-curves that clearly stick out
  return (
    <g data-ms-part="ears" fill="none" stroke={p.bodyDark} strokeWidth="16" strokeLinecap="round">
      <path d="M148,198 Q88,232 148,274" />
      <path d="M272,198 Q332,232 272,274" />
      <path d="M148,198 Q98,232 148,274" stroke={p.accent} strokeWidth="5" opacity=".5" />
      <path d="M272,198 Q322,232 272,274" stroke={p.accent} strokeWidth="5" opacity=".5" />
    </g>
  );
}

function Chest({ chassis, p }) {
  if (chassis === "athlete") {
    return (
      <g data-ms-part="chest">
        <path d="M170,316 L250,316 L246,378 L174,378 Z" fill={p.screen} opacity=".95" />
        <path d="M198,338 C198,326 222,326 222,338 C222,350 210,358 210,358 C210,358 198,350 198,338 Z" fill={p.led} opacity=".92" />
        <path d="M178,366 H196 L202,354 L210,372 L218,348 L224,366 H242" fill="none" stroke={p.accent}
          strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (chassis === "support") {
    return (
      <g data-ms-part="chest">
        <rect x="164" y="318" width="92" height="56" rx="14" fill={p.screen} opacity=".95" />
        <rect x="174" y="328" width="72" height="36" rx="8" fill={p.bodyDark} opacity=".5" />
        <text x="210" y="352" textAnchor="middle" fill={p.led} fontSize="17" fontWeight="700" fontFamily="monospace">#42</text>
      </g>
    );
  }
  if (chassis === "astronaut") {
    return (
      <g data-ms-part="chest">
        <circle cx="210" cy="350" r="36" fill={p.screen} opacity=".95" />
        <circle cx="210" cy="350" r="26" fill={p.accent} opacity=".28" />
        <circle cx="220" cy="340" r="12" fill={p.led} opacity=".9" />
        <circle cx="198" cy="358" r="8" fill={p.bodyLight} opacity=".75" />
        <circle cx="210" cy="350" r="36" fill="none" stroke={p.accent} strokeWidth="2" opacity=".35" />
      </g>
    );
  }
  // barista latte art
  return (
    <g data-ms-part="chest">
      <ellipse cx="210" cy="350" rx="44" ry="32" fill={p.screen} opacity=".95" />
      <path d="M186,350 Q210,324 234,350 Q210,368 186,350 Z" fill={p.led} opacity=".5" />
      <path d="M196,352 Q210,336 224,352" fill="none" stroke={p.accent} strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="210" cy="350" rx="44" ry="32" fill="none" stroke={p.bodyDark} strokeWidth="2" opacity=".25" />
    </g>
  );
}

function HeadShell({ chassis, p, skyward, gradId }) {
  const y = skyward ? 148 : 158;
  if (chassis === "athlete") {
    /* sharp hexagonal HUD helmet */
    return (
      <g data-ms-part="head">
        <path d={`M142,${y + 28} L170,${y} L250,${y} L278,${y + 28} L278,${y + 108} L250,${y + 136} L170,${y + 136} L142,${y + 108} Z`}
          fill={`url(#${gradId})`} />
        <path d={`M170,${y} L250,${y}`} stroke={p.accent} strokeWidth="3" opacity=".35" />
      </g>
    );
  }
  if (chassis === "support") {
    /* soft egg / pill head */
    return (
      <ellipse data-ms-part="head" cx="210" cy={y + 68} rx="82" ry="76"
        fill={`url(#${gradId})`} />
    );
  }
  if (chassis === "astronaut") {
    /* oversized dome + collar ring */
    return (
      <g data-ms-part="head">
        <ellipse cx="210" cy={y + 70} rx="88" ry="80" fill={`url(#${gradId})`} />
        <ellipse cx="210" cy={y + 70} rx="88" ry="80" fill="none" stroke={p.accent} strokeWidth="4" opacity=".4" />
        <ellipse cx="210" cy={y + 138} rx="56" ry="12" fill={p.bodyDark} opacity=".85" />
        <ellipse cx="210" cy={y + 138} rx="56" ry="12" fill="none" stroke={p.accent} strokeWidth="2" opacity=".35" />
      </g>
    );
  }
  /* barista — tall cup cylinder with thick rim */
  return (
    <g data-ms-part="head">
      <path d={`M148,${y + 16} Q148,${y + 8} 158,${y + 8} L262,${y + 8} Q272,${y + 8} 272,${y + 16} L266,${y + 128} Q266,${y + 140} 252,${y + 140} L168,${y + 140} Q154,${y + 140} 154,${y + 128} Z`}
        fill={`url(#${gradId})`} />
      <rect x="144" y={y} width="132" height="22" rx="8" fill={p.bodyDark} />
      <rect x="152" y={y + 4} width="116" height="8" rx="3" fill={p.accent} opacity=".35" />
    </g>
  );
}

function NeckTorso({ chassis, p, gradId }) {
  if (chassis === "athlete") {
    /* tapered armor torso with sharp shoulders */
    return (
      <g data-ms-part="body">
        <path d="M186,278 L234,278 L228,300 L192,300 Z" fill={p.bodyDark} />
        <path d="M140,298 L280,298 L268,412 L152,412 Z" fill={`url(#${gradId})`} />
        <path d="M152,318 L268,318" stroke={p.bodyDark} strokeWidth="4" opacity=".3" />
        <path d="M160,298 L170,412" stroke={p.bodyLight} strokeWidth="3" opacity=".2" />
        <path d="M260,298 L250,412" stroke={p.bodyLight} strokeWidth="3" opacity=".2" />
      </g>
    );
  }
  if (chassis === "astronaut") {
    /* chubby oval body + twin life-support tanks */
    return (
      <g data-ms-part="body">
        <rect x="118" y="320" width="26" height="68" rx="12" fill={p.bodyDark} opacity=".92" />
        <rect x="276" y="320" width="26" height="68" rx="12" fill={p.bodyDark} opacity=".92" />
        <rect x="122" y="328" width="18" height="18" rx="5" fill={p.accent} opacity=".45" />
        <rect x="280" y="328" width="18" height="18" rx="5" fill={p.accent} opacity=".45" />
        <rect x="122" y="354" width="18" height="24" rx="5" fill={p.led} opacity=".3" />
        <rect x="280" y="354" width="18" height="24" rx="5" fill={p.led} opacity=".3" />
        <ellipse cx="210" cy="356" rx="78" ry="64" fill={`url(#${gradId})`} />
        <ellipse cx="210" cy="292" rx="28" ry="14" fill={p.bodyDark} />
      </g>
    );
  }
  if (chassis === "barista") {
    /* cup body — narrow neck, wide belly */
    return (
      <g data-ms-part="body">
        <rect x="192" y="286" width="36" height="16" rx="6" fill={p.bodyDark} />
        <path d="M162,300 Q210,288 258,300 L274,418 Q210,438 146,418 Z" fill={`url(#${gradId})`} />
        <path d="M168,348 H252" stroke={p.bodyDark} strokeWidth="10" strokeLinecap="round" opacity=".3" />
        <path d="M172,378 H248" stroke={p.bodyDark} strokeWidth="6" strokeLinecap="round" opacity=".22" />
      </g>
    );
  }
  /* support — soft tall rounded torso */
  return (
    <g data-ms-part="body">
      <rect x="192" y="286" width="36" height="20" rx="10" fill={p.bodyDark} />
      <rect x="148" y="300" width="124" height="112" rx="40" fill={`url(#${gradId})`} />
    </g>
  );
}

function Feet({ chassis, p, flying, running }) {
  if (flying) {
    return (
      <g data-ms-part="legs">
        <path d="M196,398 L192,440" stroke={p.joint} strokeWidth="13" strokeLinecap="round" />
        <path d="M224,398 L228,440" stroke={p.joint} strokeWidth="13" strokeLinecap="round" />
        <ellipse cx="190" cy="452" rx="18" ry="11" fill={p.wheel} />
        <ellipse cx="230" cy="452" rx="18" ry="11" fill={p.wheel} />
      </g>
    );
  }
  if (chassis === "athlete") {
    if (running) {
      return (
        <g data-ms-part="legs">
          <path d="M188,398 L148,438" stroke={p.joint} strokeWidth="15" strokeLinecap="round" />
          <path d="M232,398 L280,428" stroke={p.joint} strokeWidth="15" strokeLinecap="round" />
          {[{ x: 140, y: 448 }, { x: 288, y: 436 }].map(({ x, y }, i) => (
            <g key={i} transform={`translate(${x},${y})`}>
              <path d="M-28,-6 L22,-6 L26,6 L-30,6 Z" fill={p.wheel} />
              <rect x="-22" y="-2" width="44" height="5" rx="1" fill={p.accent} opacity=".65" />
              <path d="M-30,8 L26,8" stroke={p.led} strokeWidth="2.5" opacity=".55" />
            </g>
          ))}
        </g>
      );
    }
    return (
      <g data-ms-part="legs">
        <path d="M186,400 L166,438" stroke={p.joint} strokeWidth="15" strokeLinecap="round" />
        <path d="M234,400 L254,438" stroke={p.joint} strokeWidth="15" strokeLinecap="round" />
        <path d="M138,440 L196,440 L200,456 L134,456 Z" fill={p.wheel} />
        <path d="M224,440 L282,440 L286,456 L220,456 Z" fill={p.wheel} />
        <rect x="144" y="446" width="48" height="5" rx="1" fill={p.accent} opacity=".6" />
        <rect x="230" y="446" width="48" height="5" rx="1" fill={p.accent} opacity=".6" />
        <path d="M136,458 H200" stroke={p.led} strokeWidth="2" opacity=".45" />
        <path d="M222,458 H286" stroke={p.led} strokeWidth="2" opacity=".45" />
      </g>
    );
  }
  if (chassis === "astronaut") {
    return (
      <g data-ms-part="legs">
        <path d="M186,386 L168,418" stroke={p.joint} strokeWidth="20" strokeLinecap="round" />
        <path d="M234,386 L252,418" stroke={p.joint} strokeWidth="20" strokeLinecap="round" />
        <rect x="146" y="416" width="48" height="36" rx="12" fill={p.wheel} />
        <rect x="226" y="416" width="48" height="36" rx="12" fill={p.wheel} />
        <rect x="154" y="424" width="12" height="10" rx="3" fill={p.accent} opacity=".55" />
        <rect x="254" y="424" width="12" height="10" rx="3" fill={p.accent} opacity=".55" />
        <ellipse cx="170" cy="458" rx="18" ry="7" fill={p.led} opacity=".55" />
        <ellipse cx="250" cy="458" rx="18" ry="7" fill={p.led} opacity=".55" />
      </g>
    );
  }
  if (chassis === "barista") {
    return (
      <g data-ms-part="legs">
        <path d="M192,400 L186,436" stroke={p.joint} strokeWidth="16" strokeLinecap="round" />
        <path d="M228,400 L234,436" stroke={p.joint} strokeWidth="16" strokeLinecap="round" />
        <ellipse cx="184" cy="450" rx="22" ry="14" fill={p.wheel} />
        <ellipse cx="236" cy="450" rx="22" ry="14" fill={p.wheel} />
        <ellipse cx="184" cy="452" rx="12" ry="6" fill={p.bodyDark} opacity=".4" />
        <ellipse cx="236" cy="452" rx="12" ry="6" fill={p.bodyDark} opacity=".4" />
      </g>
    );
  }
  // support casters — soft friendly wheels
  if (running) {
    return (
      <g data-ms-part="legs">
        <path d="M188,398 L156,436" stroke={p.joint} strokeWidth="14" strokeLinecap="round" />
        <path d="M232,398 L270,428" stroke={p.joint} strokeWidth="14" strokeLinecap="round" />
        {[{ x: 148, y: 450, dur: "0.16s" }, { x: 278, y: 440, dur: "0.14s" }].map(({ x, y, dur }, i) => (
          <g key={i} transform={`translate(${x},${y})`}>
            <g>
              <animateTransform attributeName="transform" type="rotate" values="0;360" dur={dur} repeatCount="indefinite" />
              <ellipse cx="0" cy="0" rx="22" ry="14" fill={p.wheel} />
              <path d="M0,-11 L2.5,-2 L11,-1 L3,3 L5,11 L0,5 L-5,11 L-3,3 L-11,-1 L-2.5,-2 Z" fill={p.accent} opacity=".85" />
              <circle cx="0" cy="0" r="5" fill={p.bodyDark} />
            </g>
          </g>
        ))}
      </g>
    );
  }
  return (
    <g data-ms-part="legs">
      <path d="M188,398 L176,436" stroke={p.joint} strokeWidth="13" strokeLinecap="round" />
      <path d="M232,398 L244,436" stroke={p.joint} strokeWidth="13" strokeLinecap="round" />
      <ellipse cx="176" cy="450" rx="22" ry="14" fill={p.wheel} />
      <ellipse cx="244" cy="450" rx="22" ry="14" fill={p.wheel} />
      <ellipse cx="176" cy="450" rx="9" ry="5" fill={p.accent} opacity=".5" />
      <ellipse cx="244" cy="450" rx="9" ry="5" fill={p.accent} opacity=".5" />
    </g>
  );
}

function FaceClip({ chassis, id, skyward }) {
  const y = skyward ? 176 : 186;
  if (chassis === "athlete") {
    return (
      <clipPath id={id}>
        <path d={`M162,${y + 10} L176,${y} L244,${y} L258,${y + 10} L258,${y + 70} L244,${y + 84} L176,${y + 84} L162,${y + 70} Z`} />
      </clipPath>
    );
  }
  if (chassis === "support") {
    return (
      <clipPath id={id}>
        <rect x="148" y={y} width="124" height="90" rx="34" />
      </clipPath>
    );
  }
  if (chassis === "astronaut") {
    return (
      <clipPath id={id}>
        <ellipse cx="210" cy={y + 44} rx="60" ry="50" />
      </clipPath>
    );
  }
  return (
    <clipPath id={id}>
      <ellipse cx="210" cy={y + 44} rx="64" ry="38" />
    </clipPath>
  );
}

function FacePanel({ chassis, p, skyward, gradId, showFrame }) {
  const y = skyward ? 176 : 186;
  /* Fill is permanent; frame stroke is a separate data-ms-part so GeneratedStudio can toggle it. */
  if (chassis === "athlete") {
    const d = `M162,${y + 10} L176,${y} L244,${y} L258,${y + 10} L258,${y + 70} L244,${y + 84} L176,${y + 84} L162,${y + 70} Z`;
    return (
      <g>
        <path d={d} fill={`url(#${gradId})`} />
        {showFrame && (
          <path data-ms-part="frame" d={d} fill="none" stroke={p.accent} strokeWidth="2.5" />
        )}
      </g>
    );
  }
  if (chassis === "support") {
    return (
      <g>
        <rect x="148" y={y} width="124" height="90" rx="34" fill={`url(#${gradId})`} />
        {showFrame && (
          <rect data-ms-part="frame" x="148" y={y} width="124" height="90" rx="34"
            fill="none" stroke={p.accent} strokeWidth="2.5" />
        )}
      </g>
    );
  }
  if (chassis === "astronaut") {
    return (
      <g>
        <ellipse cx="210" cy={y + 44} rx="60" ry="50" fill={`url(#${gradId})`} />
        <ellipse cx="210" cy={y + 44} rx="60" ry="50"
          fill="none" stroke={p.accent} strokeWidth="2" opacity=".3" />
        {showFrame && (
          <ellipse data-ms-part="frame" cx="210" cy={y + 44} rx="60" ry="50"
            fill="none" stroke={p.accent} strokeWidth="2.5" />
        )}
      </g>
    );
  }
  /* barista — wide coffee window */
  return (
    <g>
      <ellipse cx="210" cy={y + 44} rx="64" ry="38" fill={`url(#${gradId})`} />
      {showFrame && (
        <ellipse data-ms-part="frame" cx="210" cy={y + 44} rx="64" ry="38"
          fill="none" stroke={p.accent} strokeWidth="2.5" />
      )}
    </g>
  );
}


function RobotSVG({ variant, p, glow, paused, waving, gesture, svgRef, eyeRef, parts = ALL_PARTS }) {
  const chassis = variant?.chassis || "support";
  const eyeStyle = variant?.eyeStyle || "soft";
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

  const flying = !!g.boost;
  /* Face features ride high on the panel so he reads as looking up, not at the viewer. */
  const faceLift = skyward ? -14 : 0;
  const mouthY = skyward ? -12 : 0;
  /* Pupils park at the top of each eye when launching skyward. */
  const gazeY = g.gazeY ?? (skyward ? -6 : 0);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-labelledby={`rt-title-${g.key} rt-description-${g.key}`}
      className={`rt-svg rt-g-${gesture} ${isWaving ? "rt-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title id={`rt-title-${g.key}`}>{`${variant?.name || "Robot"} — ${g.label}`}</title>
      <desc id={`rt-description-${g.key}`}>{g.tip}</desc>
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id={`rt-glow-${g.key}`} cx="50%" cy="46%" r="58%">
          <stop offset="0" stopColor={p.glowC} stopOpacity=".95" />
          <stop offset="1" stopColor={p.glowC} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`rt-body-${g.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bodyLight} />
          <stop offset="1" stopColor={p.body} />
        </linearGradient>
        <linearGradient id={`rt-screen-${g.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.screenLight} />
          <stop offset="1" stopColor={p.screen} />
        </linearGradient>
        <FaceClip chassis={chassis} id={`rt-face-${g.key}`} skyward={skyward} />
      </defs>

      {parts.shadow && (
        <ellipse data-ms-part="shadow" className="rt-shadowO" cx="210" cy={flying ? 508 : 498}
          rx={flying ? 68 : 88} ry="9" fill="#000" opacity=".2" />
      )}

      <g className="rt-float" transform={`translate(0,${lift})`}>
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
            begin="rt-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 7;0 -12;0 3;0 0" keyTimes="0;0.24;0.54;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="rt-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.05 .93;.97 1.05;1.02 .98;1 1" keyTimes="0;0.24;0.54;0.8;1" />
          <g transform={`rotate(${g.bow || g.lean || 0})`}>
            <g transform="translate(-210,-470)">
              <g id="rt-hit">
                {parts.halo && (
                  <ellipse data-ms-part="halo" className="rt-glow ms-glow-halo" cx="210" cy="280" rx="140" ry="124"
                    fill={`url(#rt-glow-${g.key})`} />
                )}

                {/* thrusters sit behind the feet */}
                {flying && parts.thrusters && <g data-ms-part="thrusters"><Thrusters p={p} /></g>}

                {parts.legs && (
                  <Feet chassis={chassis} p={p} flying={flying} running={running} />
                )}

                <NeckTorso chassis={chassis} p={p} gradId={`rt-body-${g.key}`} />
                {parts.chest && <Chest chassis={chassis} p={p} />}
                {parts.rivets && (
                  <g data-ms-part="rivets" fill={p.bodyDark} opacity=".65">
                    <circle cx="162" cy="312" r="3.5" /><circle cx="258" cy="312" r="3.5" />
                    <circle cx="162" cy="396" r="3.5" /><circle cx="258" cy="396" r="3.5" />
                  </g>
                )}

                {parts.antenna && <Antenna chassis={chassis} p={p} skyward={skyward} />}
                <HeadShell chassis={chassis} p={p} skyward={skyward} gradId={`rt-body-${g.key}`} />
                {/* ears/headset/handles after head so headbands & cups sit on top */}
                {parts.ears && <Ears chassis={chassis} p={p} />}

                {/* face panel — shape unique per chassis */}
                <FacePanel chassis={chassis} p={p} skyward={skyward}
                  gradId={`rt-screen-${g.key}`} showFrame={!!parts.frame} />
                {parts.scan && (
                  <g data-ms-part="scan" clipPath={`url(#rt-face-${g.key})`}>
                    <rect className="rt-scan" x="148" y={skyward ? 178 : 188} width="124" height="3"
                      fill={p.led} opacity=".2" />
                  </g>
                )}
                {parts.blush && (
                  <g data-ms-part="blush" fill={p.blush} opacity=".38"
                    transform={`translate(0,${skyward ? -14 : 0})`}>
                    <ellipse cx={chassis === "astronaut" ? 162 : 156} cy={chassis === "barista" ? 246 : 252}
                      rx={chassis === "barista" ? 10 : 8} ry="5" />
                    <ellipse cx={chassis === "astronaut" ? 258 : 264} cy={chassis === "barista" ? 246 : 252}
                      rx={chassis === "barista" ? 10 : 8} ry="5" />
                  </g>
                )}

                <g key={g.key} className="rt-pop ms-eyes" data-ms-part="eyes"
                  transform={`translate(${look[0]},${look[1] + faceLift})`}>
                  <Brows kind={g.brow} p={p} />
                  <g transform={`translate(0,${skyward ? -10 : 0})`}>
                    <Eye kind={g.eye} x={EYE_L_X} p={p} track={g.track} eyeRef={eyeRef?.l}
                      style={eyeStyle} gazeY={gazeY} />
                    <Eye kind={g.eye} x={EYE_R_X} p={p} track={g.track} eyeRef={eyeRef?.r}
                      style={eyeStyle} gazeY={gazeY} />
                  </g>
                  <g transform={`translate(0,${mouthY})`}>
                    <Mouth kind={g.mouth} p={p} />
                  </g>
                </g>

                {parts.props && (
                  <g data-ms-part="props" key={`p-${g.key}`} className="rt-pop">
                    <Props g={g} p={p} />
                  </g>
                )}

                {/* shoulders + arms share one toggle so sockets never orphan */}
                {parts.arms && (
                  <g data-ms-part="arms">
                    <ellipse cx={SH_L[0]} cy={SH_L[1]} rx="20" ry="16" fill={p.bodyDark} opacity=".55" />
                    <ellipse cx={SH_R[0]} cy={SH_R[1]} rx="20" ry="16" fill={p.bodyDark} opacity=".55" />
                    <Arm d={g.armL} shoulder={SH_L} p={p} anim={armLAnim}
                      morph={armMorphL} animKey={`l-${g.key}-${isWaving}`} chassis={chassis} />
                    <Arm d={g.armR} shoulder={SH_R} p={p} anim={armRAnim}
                      morph={armMorphR} animKey={`r-${g.key}-${isWaving}`} chassis={chassis} />
                  </g>
                )}
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


export function createRobotPoseSource(slug) {
  const cfg = ROBOT_VARIANTS[slug];
  if (!cfg) throw new Error(`Unknown robot mascot: ${slug}`);
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
      glowLabel: "Screen glow",
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
      <RobotSVG
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

export function RobotStudio({ slug }) {
  const cfg = ROBOT_VARIANTS[slug];
  if (!cfg) throw new Error(`Unknown robot mascot: ${slug}`);
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
    <div className="rb-root">
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
          <h1 className="rb-display" style={{ fontSize: 24, fontWeight: 640 }}>
            {cfg.name} <span style={{ color: brand }}>·</span> {cfg.product}
          </h1>
          <p style={{ fontSize: 13, color: "#B5AC9A" }}>{cfg.tagline}</p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_400px]">
        <section className="rb-card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="rb-eyebrow">Stage</h2>
            <div className="flex gap-2">
              <button type="button" className={`rb-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)} aria-pressed={transparent}>
                Transparent
              </button>
              <button type="button" className={`rb-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)} aria-pressed={!transparent}>
                In-app
              </button>
            </div>
          </div>

          <div
            data-mascot-stage
            className={`relative overflow-hidden rounded-2xl ${transparent ? "rb-checker" : ""}`}
            style={{ background: stageBg, minHeight: 440 }}
            onMouseEnter={() => activeG.track && setWaving(true)}
            onMouseLeave={() => setWaving(false)}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 350, padding: "10px 10px 0" }}>
              <RobotSVG
                variant={cfg}
                p={p} glow={glow} paused={paused} waving={waving}
                gesture={gesture} svgRef={svgRef} parts={parts}
                eyeRef={{ l: pupilL, r: pupilR }}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="rb-spark"
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
                <h3 className="rb-eyebrow">Elements</h3>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: "#B5AC9A" }}>{partsOn}/{uiElements.length}</span>
                  <button type="button" className="rb-tiny" onClick={() => setParts(allParts(true))}>All</button>
                  <button type="button" className="rb-tiny" onClick={() => setParts(allParts(false))}>None</button>
                  <button type="button" className="rb-tiny" onClick={() => setParts(ALL_PARTS)}>Reset</button>
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
                            className={`rb-pill ${on ? "on" : ""}`}
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

        <section className="rb-card flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="rb-eyebrow">Gesture</span>
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
                        className={`rb-pill ${gesture === gg.key ? "on" : ""}`}
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
              <div className="rb-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>
                {activeG.tip}
              </p>
            </div>
          </div>

          <div>
            <div className="rb-eyebrow mb-3">Theme</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(themes).map(([k, t]) => (
                <button key={k} type="button" title={t.name}
                  className={`rb-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button type="button" title="Custom"
                className={`rb-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#0A1814", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="mt-3 flex flex-wrap gap-4">
                {[["body", "Chassis"], ["panel", "Screen"], ["led", "LEDs"], ["accent", "Accent"]].map(
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
              <span className="rb-eyebrow">Screen glow</span>
              <span style={{ fontSize: 12, color: "#C6BCA7" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={glow}
              className="rb-range w-full" style={{ background: "#2A3540" }}
              onChange={(e) => setGlow(Number(e.target.value))} />
          </div>

          <div className="flex items-center justify-between">
            <span className="rb-eyebrow">Motion</span>
            <button type="button" className={`rb-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export const ROBOT_SLUGS = Object.keys(ROBOT_VARIANTS);
