"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";

/*
 * HAY — an app-friendly American pika for a budgeting app.
 *
 * Compact potato body, slightly oversized head, short rounded ears,
 * mitten paws that hold coins. Pose data drives arms, eyes, brows,
 * mouth, posture, glow and coin props for every gesture.
 *
 * Arms hang from symmetric shoulders inside the torso silhouette,
 * each with a shoulder cap and mitten hand inside the rotating group.
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
const dark = (c, t) => mix(c, "#1A1410", t);
const light = (c, t) => mix(c, "#FFF8F0", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---------- themes ---------- */
const THEMES = {
  wheat: { name: "Wheat Stack", body: "#E0C49A", belly: "#FFF1DC", accent: "#D4A84B", stage: "#221C16" },
  mint: { name: "Mint Savings", body: "#B8CDB8", belly: "#EAF4EA", accent: "#6B9E7A", stage: "#1A241C" },
  copper: { name: "Copper Cache", body: "#C9A080", belly: "#F5E6D8", accent: "#B87333", stage: "#241A14" },
  dusk: { name: "Dusk Ledger", body: "#B8A898", belly: "#EDE4D8", accent: "#9A8470", stage: "#1E1A24" },
  rose_gold: { name: "Rose Gold", body: "#D4B0A0", belly: "#FAE8E0", accent: "#C9957A", stage: "#241C1A" },
};
const derive = (t) => ({
  ...t,
  bodyDark: dark(t.body, 0.22),
  bodyLight: light(t.body, 0.2),
  limb: dark(t.body, 0.14),
  earTip: dark(t.body, 0.48),
  earInner: light(t.belly, 0.08),
  feature: dark(t.body, 0.52),
  blush: mix(t.accent, "#FF9A8A", 0.35),
  glowC: light(t.accent, 0.22),
  dim: rgba(t.accent, 0.35),
});

const BRAND = "#D4A84B";
/* Flame is fire — not theme paint — so the rocket always reads hot. */
const FLAME = { outer: "#FF6A1A", mid: "#FFB020", core: "#FFF4C8", smoke: "#D8C8B8", glow: "#FF8A30" };
const SHELL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Manrope:wght@400;500;600;700&display=swap');
  .hy-root{min-height:100vh;background:#181410;color:#F5EDE4;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px,rgba(212,168,75,.14),transparent 60%),
      radial-gradient(720px 400px at 88% 110%,rgba(224,196,154,.10),transparent 60%)}
  .hy-display{font-family:'Outfit',sans-serif;letter-spacing:.01em}
  .hy-card{background:rgba(245,237,228,.045);border:1px solid ${rgba(BRAND, 0.16)};
    border-radius:20px;backdrop-filter:blur(8px)}
  .hy-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${BRAND};font-weight:600}
  .hy-pill{border:1px solid ${rgba(BRAND, 0.28)};border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#F5EDE4;background:transparent;cursor:pointer;
    transition:background .15s,border-color .15s,color .15s;line-height:1}
  .hy-pill:hover{border-color:${rgba(BRAND, 0.55)}}
  .hy-pill.on{background:${BRAND};color:#1A1410;border-color:${BRAND}}
  .hy-pill:focus-visible,.hy-swatch:focus-visible{outline:2px solid #FFF0D4;outline-offset:3px}
  .hy-tiny{border:1px solid ${rgba(BRAND, 0.26)};border-radius:999px;padding:5px 10px;
    font-size:11.5px;font-weight:600;color:#A89888;background:transparent;cursor:pointer;
    transition:border-color .15s,color .15s}
  .hy-tiny:hover{border-color:${BRAND};color:#F5EDE4}
  .hy-swatch{width:34px;height:34px;border-radius:999px;border:2px solid transparent;cursor:pointer;
    box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}
  .hy-swatch.on{border-color:#fff;box-shadow:0 0 0 2px ${rgba(BRAND, 0.55)}}
  .hy-checker{background-color:#14100c;background-image:
    linear-gradient(45deg,#221C16 25%,transparent 25%),linear-gradient(-45deg,#221C16 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#221C16 75%),linear-gradient(-45deg,transparent 75%,#221C16 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .hy-range{-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:#2E2820;outline:none;cursor:pointer}
  .hy-range::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;
    background:${BRAND};cursor:pointer;border:2px solid #1A1410}
  .hy-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:${BRAND};cursor:pointer;border:2px solid #1A1410}
  .hy-spark{position:absolute;width:15px;height:15px;margin:-7px;pointer-events:none;
    animation:hy-spark .95s ease-out forwards}
  @keyframes hy-spark{0%{opacity:1;transform:translate(0,0) scale(1)}
    100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
`;

const SVG_CSS = `
  .hm-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .hm-g-alarm{--gf:1.75}
  .hm-g-celebrate{--gf:1.4}
  .hm-g-success{--gf:1.35}
  .hm-g-flying{--gf:1.5}
  .hm-g-proud{--gf:1.3}
  .hm-g-love{--gf:1.25}
  .hm-g-grumpy{--gf:.7}
  .hm-g-sad{--gf:.6}
  .hm-g-crying{--gf:.5}
  .hm-g-sleepy{--gf:.42}
  .hm-g-empty{--gf:.55}
  .hm-float{animation:hm-float 3.7s ease-in-out infinite}
  .hm-g-sleepy .hm-float{animation-duration:6s}
  .hm-g-alarm .hm-float{animation:none}
  .hm-g-celebrate .hm-float{animation-duration:1.85s}
  .hm-g-dancing .hm-float{animation-duration:1.4s}
  .hm-g-running .hm-float{animation:hm-runBounce .28s ease-in-out infinite}
  .hm-g-flying .hm-float{animation:hm-soar 1.15s ease-in-out infinite}
  .hm-shadowO{animation:hm-shadowO 3.7s ease-in-out infinite}
  .hm-g-running .hm-shadowO{animation:hm-runShadow .28s ease-in-out infinite}
  .hm-g-flying .hm-shadowO{opacity:.08;animation:none;transform:scaleX(.55)}
  .hm-glow{animation:hm-glow 3.1s ease-in-out infinite}
  .hm-g-alarm .hm-glow{animation-duration:.85s}
  .hm-g-flying .hm-glow{animation-duration:.9s}
  .hm-wave-on .hm-glow{animation-duration:1.5s}
  .hm-pop{animation:hm-pop .28s ease-out}
  .hm-pupils{transition:transform .12s ease-out}
  .hm-ring{animation:hm-ring 1.15s ease-out infinite}
  .hm-spin{animation:hm-spin 2.4s linear infinite}
  .hm-zzz{animation:hm-zzz 3.2s ease-in-out infinite}
  .hm-rise{animation:hm-rise 2.5s ease-out infinite}
  .hm-fall{animation:hm-fall 2.8s linear infinite}
  .hm-twinkle{animation:hm-twinkle 1.4s ease-in-out infinite}
  .hm-tear{animation:hm-tear 2.8s ease-in infinite}
  .hm-eq{animation:hm-eq 1s ease-in-out infinite}
  .hm-dot{animation:hm-dot 1.2s ease-in-out infinite}
  .hm-steam{animation:hm-steam 1.9s ease-out infinite}
  .hm-streak{animation:hm-streak .55s linear infinite}
  .hm-whoosh{animation:hm-whoosh .28s linear infinite}
  .hm-dust{animation:hm-dust .48s ease-out infinite}
  .hm-ember{animation:hm-ember 1s linear infinite}
  .hm-smoke{animation:hm-smoke 1.6s ease-out infinite}
  .hm-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes hm-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes hm-soar{0%,100%{transform:translateY(-18px)}50%{transform:translateY(-48px)}}
  @keyframes hm-runBounce{0%,100%{transform:translate(10px,4px)}25%{transform:translate(-4px,-14px)}50%{transform:translate(12px,2px)}75%{transform:translate(-2px,-16px)}}
  @keyframes hm-runShadow{0%,100%{opacity:.28;transform:translateX(-16px) scaleX(1.25)}50%{opacity:.12;transform:translateX(10px) scaleX(.65)}}
  @keyframes hm-shadowO{0%,100%{opacity:.22}50%{opacity:.12}}
  @keyframes hm-whoosh{0%{transform:translateX(18px);opacity:0}28%{opacity:.95}100%{transform:translateX(-56px);opacity:0}}
  @keyframes hm-dust{0%{transform:translate(0,0) scale(1);opacity:0}18%{opacity:.75}100%{transform:translate(-40px,8px) scale(.6);opacity:0}}
  @keyframes hm-glow{0%,100%{opacity:calc(var(--g,.45)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.45)*var(--gf,1))}}
  @keyframes hm-pop{from{opacity:0}to{opacity:1}}
  @keyframes hm-ring{0%,74%,100%{opacity:0}18%{opacity:.95}55%{opacity:0}}
  @keyframes hm-spin{0%{transform:rotateY(0deg)}100%{transform:rotateY(360deg)}}
  @keyframes hm-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes hm-rise{0%{opacity:.42;transform:translateY(10px)}24%{opacity:1}100%{opacity:0;transform:translateY(-42px)}}
  @keyframes hm-fall{0%{opacity:.3;transform:translateY(-20px)}12%{opacity:1}84%{opacity:.9}100%{opacity:.2;transform:translateY(145px)}}
  @keyframes hm-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes hm-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes hm-eq{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes hm-dot{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes hm-steam{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:.55}100%{opacity:0;transform:translate(0,48px) scale(1.3)}}
  @keyframes hm-streak{0%{opacity:0;transform:translateY(-18px)}20%{opacity:.9}100%{opacity:0;transform:translateY(78px)}}
  @keyframes hm-ember{0%{transform:translate(0,0);opacity:0}12%{opacity:.95}100%{transform:translate(var(--ex,8px),90px);opacity:0}}
  @keyframes hm-smoke{0%{opacity:0;transform:translate(0,0) scale(.7)}20%{opacity:.55}100%{opacity:0;transform:translate(0,52px) scale(1.35)}}
  @media (prefers-reduced-motion:reduce){.hm-svg *{animation:none!important;transition:none!important}}
`;

/* ============================================================
   BODY GEOMETRY — viewBox 0 0 420 520
   Head ~132..288 y 118..268 · torso 158..262 / 268..408
   Shoulders on torso edge; short pika limbs.
   ============================================================ */
const SH_L = [158, 318], SH_R = [262, 318];
const mir = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${-parseFloat(x)},${y}`);
const endOf = (d) => {
  const pairs = d.match(/-?[\d.]+,-?[\d.]+/g);
  const [x, y] = pairs[pairs.length - 1].split(",");
  return [parseFloat(x), parseFloat(y)];
};

const A = {
  rest: "M0,0 Q-18,22 -22,48",
  droop: "M0,0 Q-12,26 -16,52",
  out: "M0,0 Q-32,8 -58,14",
  up: "M0,0 Q-28,-14 -38,-48",
  high: "M0,0 Q-24,-32 -18,-68",
  point: "M0,0 Q-36,0 -68,-4",
  chin: "M0,0 Q-14,-20 28,-36",
  onFace: "M0,0 Q-18,-28 32,-54",
  palm: "M0,0 Q-20,-36 38,-68",
  write: "M0,0 Q-20,32 28,58",
  hold: "M0,0 Q-22,18 -18,42",
  clapOpenL: "M0,0 Q-24,6 14,0",
  clapShutL: "M0,0 Q-4,18 52,14",
  clapOpenR: "M0,0 Q24,6 -14,0",
  clapShutR: "M0,0 Q4,18 -52,14",
  clapL: "M0,0 Q-4,18 52,14",
  clapR: "M0,0 Q4,18 -52,14",
  shrug: "M0,0 Q-30,-12 -44,2",
  thumb: "M0,0 Q-34,-20 -32,-54",
  down: "M0,0 Q-22,28 -18,62",
  runFwd: "M0,0 Q-18,-14 -20,12",
  runBack: "M0,0 Q-22,46 -24,78",
  runMid: "M0,0 Q-20,16 -22,48",
  flyUp: "M0,0 Q-12,-50 -4,-92",
};

const GESTURES = [
  { key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Soft bob and blink while his pupils follow your cursor.",
    armL: A.rest, armR: mir(A.rest), eye: "open", mouth: "smile", track: true, prop: "idleCoin" },
  { key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "Right paw lifts high with a friendly coin-flip wave.",
    armL: A.high, armR: mir(A.rest), wave: true, eye: "open", mouth: "grin", brow: "up", prop: "waveCoin" },
  { key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased eyes and a warm grin — savings goal met!",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin" },
  { key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "Paw to chin, gaze drifting up while a coin spins overhead.",
    armL: A.chin, armR: mir(A.rest), eye: "open", mouth: "flat", brow: "oneUp",
    look: [3, -6], prop: "think" },
  { key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with soft focus while audio bars breathe.",
    armL: A.rest, armR: mir(A.rest), bow: 5, eye: "open", mouth: "tiny", prop: "eq" },
  { key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with speech arcs and a coin by the right paw.",
    armL: A.out, armR: mir(A.rest), eye: "open", mouth: "talk", brow: "up", prop: "speech" },
  { key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "Right paw out, directing attention to the next budget line.",
    armL: A.point, armR: mir(A.rest), eye: "open", mouth: "smile", brow: "up",
    look: [-6, -2], prop: "point" },
  { key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Both paws on a ledger while the caret blinks.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 5], prop: "ledger" },

  { key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Arms up and coins raining down after a savings win.",
    armL: A.high, armR: mir(A.high), eye: "arch", mouth: "grin", prop: "coinRain" },
  { key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart eyes and golden coins drifting off the chest.",
    armL: A.hold, armR: mir(A.hold), eye: "heart", mouth: "smile", prop: "hearts" },
  { key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Soft eyes and a gentle droop. Never mean about it.",
    armL: A.droop, armR: mir(A.droop), eye: "open", mouth: "frown", brow: "sad", look: [0, 4] },
  { key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Tears down the cheeks — bigger sorrow than sad.",
    armL: A.droop, armR: mir(A.droop), eye: "cry", mouth: "frown", brow: "sad", prop: "tears" },
  { key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, flat mouth. Overspent again.",
    armL: A.rest, armR: mir(A.rest), bow: 3, eye: "flat", mouth: "frown", brow: "angry", prop: "steam" },
  { key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a soft Z drifting off the ear.",
    armL: A.droop, armR: mir(A.droop), eye: "half", mouth: "tiny", prop: "zzz" },
  { key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up, bright glow, a tall coin stack earned.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "stack" },
  { key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile, right paw up, one dropped coin. Soft fail, no shame.",
    armL: A.up, armR: mir(A.rest), eye: "open", mouth: "wry", brow: "oneUp", look: [3, 2], prop: "oops" },
  { key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Wide eyes and a small jump — unexpected refund!",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "spark" },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "Paw to the cheek, a heart blown toward the saver.",
    armL: A.chin, armR: mir(A.rest), eye: "arch", mouth: "kiss", brow: "up",
    look: [6, -2], prop: "kissHeart" },
  { key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "Palm flat on the forehead over a classic budget typo.",
    armL: A.palm, armR: mir(A.droop), eye: "flat", mouth: "wry", brow: "sad" },
  { key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "Paws swinging and body swaying after hitting a goal.",
    armL: A.high, armR: mir(A.out), sway: true, eye: "arch", mouth: "grin", prop: "notes" },

  { key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes, ringing energy, whole body rattling. Bill due!",
    armL: A.out, armR: mir(A.out), shake: true, eye: "wide", mouth: "o", brow: "up", prop: "alarm" },
  { key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Both paws open and a warm face. You've got this — one more coin.",
    armL: A.out, armR: mir(A.out), eye: "open", mouth: "grin", brow: "up", prop: "encourage" },
  { key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "Right paw with a magnifier, scanning transactions.",
    armL: A.out, armR: mir(A.rest), eye: "open", mouth: "flat", brow: "oneUp",
    look: [-7, -3], prop: "search" },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "Right-paw approval — budget on track.",
    armL: A.thumb, armR: mir(A.rest), eye: "arch", mouth: "grin", prop: "thumbsUp" },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Right-paw disapproval — try another category.",
    armL: A.down, armR: mir(A.rest), eye: "flat", mouth: "frown", brow: "sad", prop: "thumbsDown" },
  { key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Shoulders up, unsure where that charge came from.",
    armL: A.shrug, armR: mir(A.shrug), eye: "open", mouth: "flat", brow: "oneUp", prop: "question" },
  { key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Focused busy posture stacking coins beside the desk.",
    armL: A.write, armR: mir(A.write), eye: "open", mouth: "flat", look: [0, 3], prop: "workStack" },
  { key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Full sprint — leaned forward, paws pumping, dust kicking up.",
    armL: A.runMid, armR: mir(A.runMid), lean: 18, look: [12, -3],
    eye: "wide", mouth: "o", brow: "up", gait: "run", prop: "speed" },
  { key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Rocket launch — eyes to the sky, fists up, cape and thruster flames.",
    armL: A.flyUp, armR: mir(A.flyUp), lift: -64,
    eye: "wide", mouth: "o", brow: "up", look: [0, -6], skyward: true,
    prop: "flyCoins", boost: true },
  { key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "Right paw raised and waiting for your palm.",
    armL: A.high, armR: mir(A.rest), eye: "arch", mouth: "grin", prop: "highFive" },
  { key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Paws meeting mid-clap for a well-balanced month.",
    armL: A.clapL, armR: A.clapR, eye: "arch", mouth: "grin", brow: "up",
    clap: true, prop: "clap" },

  { key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Uneven eyes, crooked mouth, question mark hovering.",
    armL: A.chin, armR: mir(A.shrug), bow: -3, eye: "uneven", mouth: "wry", brow: "oneUp",
    prop: "question" },
  { key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "Clear win pose with a bright check on a gold coin.",
    armL: A.up, armR: mir(A.up), eye: "arch", mouth: "grin", prop: "success" },
  { key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert — concerned, not scary.",
    armL: A.out, armR: mir(A.out), eye: "wide", mouth: "o", brow: "up", prop: "error" },
  { key: "empty", label: "Empty", cat: "Feedback", use: "Empty state",
    tip: "Gentle “nothing here yet” — empty wallet outline.",
    armL: A.droop, armR: mir(A.droop), eye: "open", mouth: "tiny", brow: "sad", prop: "empty" },
  { key: "loading", label: "Loading", cat: "Feedback", use: "In progress",
    tip: "Soft wait with a spinning coin beside the head.",
    armL: A.rest, armR: mir(A.rest), eye: "open", mouth: "flat", prop: "loading" },
  { key: "waiting", label: "Waiting", cat: "Feedback", use: "Queued · hold on",
    tip: "Patient pause, eyes soft, three dots breathing.",
    armL: A.rest, armR: mir(A.rest), eye: "half", mouth: "tiny", prop: "waiting" },
];

const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Moods", "Action", "Feedback"];
const ELEMENTS = [
  { key: "ears", label: "Ears", category: "Body" },
  { key: "whiskers", label: "Whiskers", category: "Body" },
  { key: "arms", label: "Arms", category: "Body" },
  { key: "legs", label: "Legs", category: "Body" },
  { key: "belly", label: "Belly patch", category: "Body" },
  { key: "brows", label: "Brows", category: "Face" },
  { key: "blush", label: "Blush", category: "Face" },
  { key: "nose", label: "Nose", category: "Face" },
  { key: "vest", label: "Vest", category: "Costume" },
  { key: "cape", label: "Cape", category: "Costume" },
  { key: "coins", label: "Coins", category: "Props" },
  { key: "flames", label: "Rocket flames", category: "Stage" },
  { key: "halo", label: "Halo glow", category: "Stage" },
  { key: "shadow", label: "Shadow", category: "Stage" },
  { key: "props", label: "Pose props", category: "Stage" },
];
const ELEMENT_CATEGORIES = ["Body", "Face", "Costume", "Props", "Stage"];
const makeParts = (onExceptVest = true) =>
  Object.fromEntries(ELEMENTS.map((e) => [e.key, e.key === "vest" ? false : onExceptVest]));
/** Fresh defaults — never share one mutable object across studio / SVG / reset. */
const DEFAULT_PARTS = makeParts(true);
const ALL_PARTS = makeParts(true);
const allParts = (on) => Object.fromEntries(ELEMENTS.map((e) => [e.key, on]));

const EYE_L_X = 182, EYE_R_X = 238, EYE_Y = 232;
const HEART_D = "M0,8 C-10,0 -11,-7 -4.5,-9 C-1.5,-10 0,-6.5 0,-4.5 C0,-6.5 1.5,-10 4.5,-9 C11,-7 10,0 0,8 Z";

/* ---------- realistic coin (SVG only) ---------- */
const COIN_METAL = {
  gold: { hi: "#FFF4C8", mid: "#E8C04A", lo: "#A67C1A", rim: "#8A6210", mark: "#7A5A0E" },
  silver: { hi: "#F4F8FC", mid: "#C8D0D8", lo: "#889098", rim: "#6A7278", mark: "#5A6268" },
  copper: { hi: "#FFD8B8", mid: "#D4845A", lo: "#9A5030", rim: "#7A4028", mark: "#6A3820" },
};

/* Short, stable numbers keep the exported pose pack deterministic. */
const n1 = (v) => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? 0 : r;
};

function Coin({ x, y, s = 1, metal = "gold", spin = false, uid = "c0", tilt = 1 }) {
  const m = COIN_METAL[metal] || COIN_METAL.gold;
  const id = `hm-coin-${uid}`;
  const tickLines = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r1 = 17, r2 = 19.5;
    return {
      x1: n1(Math.cos(a) * r1),
      y1: n1(Math.sin(a) * r1 * tilt),
      x2: n1(Math.cos(a) * r2),
      y2: n1(Math.sin(a) * r2 * tilt),
    };
  });
  return (
    /* Outer owns placement; inner owns spin so they don't fight on one transform attr. */
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <g>
        {spin && (
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="2.4s" repeatCount="indefinite" />
        )}
        <defs>
          <radialGradient id={`${id}-face`} cx="38%" cy="32%" r="68%">
            <stop offset="0" stopColor={m.hi} />
            <stop offset="0.55" stopColor={m.mid} />
            <stop offset="1" stopColor={m.lo} />
          </radialGradient>
          <linearGradient id={`${id}-rim`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={m.hi} />
            <stop offset="0.5" stopColor={m.mid} />
            <stop offset="1" stopColor={m.rim} />
          </linearGradient>
        </defs>
        <ellipse cx="0" cy="3" rx="20" ry="6" fill="#000" opacity=".12" />
        <ellipse cx="0" cy="0" rx="20" ry={n1(20 * tilt)} fill={`url(#${id}-rim)`} stroke={m.rim} strokeWidth="1.2" />
        <ellipse cx="0" cy="-0.5" rx="16.5" ry={n1(16.5 * tilt)} fill={`url(#${id}-face)`} />
        <g stroke={m.rim} strokeWidth="1.1" strokeLinecap="round" opacity=".65">
          {tickLines.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
          ))}
        </g>
        <path d="M-10,-5 A10,10 0 0,1 10,-5" fill="none" stroke={m.hi} strokeWidth="1.8" opacity=".55" />
        <ellipse cx="0" cy="0" rx="11" ry={n1(11 * tilt)} fill="none" stroke={m.lo} strokeWidth="0.8" opacity=".35" />
        <text x="0" y={n1(5 * tilt)} textAnchor="middle" fontSize="14" fontWeight="700"
          fill={m.mark} fontFamily="Outfit, sans-serif">$</text>
      </g>
    </g>
  );
}

function Eye({ kind, x, p, track, eyeRef, gaze = [0, 0] }) {
  const at = `translate(${x},${EYE_Y})`;
  const stroke = { fill: "none", stroke: p.feature, strokeWidth: 4.5, strokeLinecap: "round" };
  if (kind === "arch") return <path d="M-11,2 Q0,-8 11,2" transform={at} {...stroke} />;
  if (kind === "flat") return <path d="M-11,0 L11,0" transform={at} {...stroke} />;
  if (kind === "heart") return <path transform={`${at} scale(1.35)`} fill={p.blush} d={HEART_D} />;
  if (kind === "half")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="2" rx="10" ry="6.5" fill={p.feature} />
        <path d="M-11,-1 L11,-1" stroke={p.bodyLight} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    );
  if (kind === "cry")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="10" ry="13" fill={p.feature} />
        <circle cx="-2.5" cy="-3" r="2.8" fill={p.bodyLight} opacity=".55" />
        <path d="M-12,4 Q0,11 12,4" fill="none" stroke={p.accent} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  const uneven = kind === "uneven";
  const wide = kind === "wide";
  const rx = uneven ? (x < 210 ? 8.5 : 12) : wide ? 12 : 10;
  const ry = uneven ? (x < 210 ? 11 : 15) : wide ? 15 : 12.5;
  /* Clamp gaze so the highlight stays inside the iris. */
  const gx = Math.max(-4, Math.min(4, gaze[0]));
  const gy = Math.max(-7, Math.min(5, gaze[1]));
  return (
    <g transform={at}>
      {kind === "open" && (
        <>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1 1;1 0.08;1 1;1 1" keyTimes="0;0.9;0.925;0.95;1"
            dur="5.4s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="hm-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      <ellipse cx="0" cy="0" rx={rx} ry={ry} fill={p.feature} />
      {/* Track uses style.transform on the outer group; gaze stays on the inner SVG transform. */}
      <g ref={track ? eyeRef : undefined} className="hm-pupils">
        <g transform={`translate(${gx},${gy})`}>
          <circle cx="-2.5" cy="-3.5" r={wide ? 3.6 : 3.2} fill="#F8F4EC" />
          <circle cx="2.5" cy="3" r="1.4" fill={light(p.feature, 0.4)} opacity=".75" />
        </g>
      </g>
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    up: ["M162,208 Q180,198 198,206", "M222,206 Q240,198 258,208"],
    sad: ["M163,214 Q174,206 198,204", "M222,204 Q246,206 257,214"],
    angry: ["M163,200 Q180,206 199,214", "M221,214 Q240,206 257,200"],
    oneUp: ["M164,212 Q180,208 198,212", "M222,206 Q240,194 256,202"],
  }[kind];
  return (
    <g fill="none" stroke={p.feature} strokeWidth="4.2" strokeLinecap="round" opacity=".88">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Mouth({ kind, p }) {
  const line = { fill: "none", stroke: p.feature, strokeWidth: 4.2, strokeLinecap: "round" };
  if (kind === "grin") return <path className="hm-pop" d="M188,258 Q210,278 232,258" {...line} strokeWidth="5" />;
  if (kind === "frown") return <path className="hm-pop" d="M190,266 Q210,252 230,266" {...line} />;
  if (kind === "o") return <ellipse className="hm-pop" cx="210" cy="260" rx="8" ry="10" fill={p.feature} />;
  if (kind === "talk")
    return (
      <ellipse className="hm-pop" cx="210" cy="260" rx="8" ry="10" fill={p.feature}>
        <animate attributeName="ry" values="10;5;10;7;10" dur="0.55s" repeatCount="indefinite" />
      </ellipse>
    );
  if (kind === "tiny") return <path className="hm-pop" d="M200,260 Q210,264 220,260" {...line} strokeWidth="3.5" />;
  if (kind === "flat") return <path className="hm-pop" d="M194,260 L226,260" {...line} strokeWidth="4" />;
  if (kind === "wry") return <path className="hm-pop" d="M192,258 Q210,270 228,252" {...line} />;
  if (kind === "kiss")
    return (
      <g className="hm-pop" fill={p.feature}>
        <path d="M202,256 Q210,248 218,256 Q210,266 202,256 Z" />
        <ellipse cx="210" cy="260" rx="3" ry="2" fill={p.bodyLight} opacity=".5" />
      </g>
    );
  return <path className="hm-pop" d="M190,258 Q210,272 230,258" {...line} />;
}

function Arm({ d, shoulder, p, anim, animKey, morph }) {
  const [hx_, hy] = endOf(d);
  const morphEnds = morph ? morph.values.split(";").map((frame) => endOf(frame.trim())) : null;
  const handCx = morphEnds ? morphEnds.map((pt) => pt[0]).join(";") : null;
  const handCy = morphEnds ? morphEnds.map((pt) => pt[1]).join(";") : null;
  return (
    <g transform={`translate(${shoulder.join(",")})`}>
      {anim && (
        <animateTransform key={animKey} attributeName="transform" type="rotate" additive="sum"
          values={anim.values} dur={anim.dur} repeatCount="indefinite" />
      )}
      <path d={d} fill="none" stroke={p.limb} strokeWidth="22" strokeLinecap="round">
        {morph && <animate key={`${animKey}-d`} attributeName="d" values={morph.values} dur={morph.dur} repeatCount="indefinite" />}
      </path>
      <path d={d} fill="none" stroke={p.bodyLight} strokeWidth="8" strokeLinecap="round" opacity=".28">
        {morph && <animate key={`${animKey}-hi`} attributeName="d" values={morph.values} dur={morph.dur} repeatCount="indefinite" />}
      </path>
      <circle cx="0" cy="0" r="15" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
      <ellipse cx={hx_} cy={hy} rx="13" ry="11" fill={p.bodyLight} stroke={p.bodyDark} strokeWidth="2">
        {handCx && (
          <>
            <animate attributeName="cx" values={handCx} dur={morph.dur} repeatCount="indefinite" />
            <animate attributeName="cy" values={handCy} dur={morph.dur} repeatCount="indefinite" />
          </>
        )}
      </ellipse>
      <ellipse cx={hx_ - 1} cy={hy - 1} rx="4" ry="3.2" fill={p.accent} opacity=".35">
        {handCx && (
          <>
            <animate attributeName="cx" values={morphEnds.map((pt) => pt[0] - 1).join(";")} dur={morph.dur} repeatCount="indefinite" />
            <animate attributeName="cy" values={morphEnds.map((pt) => pt[1] - 1).join(";")} dur={morph.dur} repeatCount="indefinite" />
          </>
        )}
      </ellipse>
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

/**
 * Superman cape — flying flare, or a shorter draped rest pose so the toggle
 * is visible outside the flying gesture.
 */
function Cape({ p, uid, mode = "fly" }) {
  const red = "#C0392B";
  const redDeep = "#8E241C";
  const gold = light(p.accent, 0.15);
  const rest = mode === "rest";
  return (
    <g transform={rest ? "translate(210,302)" : "translate(210,308)"}>
      {!rest && (
        <animateTransform attributeName="transform" type="rotate" additive="sum"
          values="-3;3;-3" dur="1.1s" repeatCount="indefinite" />
      )}
      {rest && (
        <animateTransform attributeName="transform" type="rotate" additive="sum"
          values="-1.2;1.2;-1.2" dur="3.2s" repeatCount="indefinite" />
      )}
      <defs>
        <linearGradient id={`hm-cape-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={red} />
          <stop offset="1" stopColor={redDeep} />
        </linearGradient>
      </defs>
      <path
        d={rest
          ? "M-34,2 C-48,28 -46,72 -34,102 C-12,90 12,90 34,102 C46,72 48,28 34,2 C18,12 -18,12 -34,2 Z"
          : "M-42,0 C-70,36 -78,96 -72,168 C-40,152 -14,148 0,148 C14,148 40,152 72,168 C78,96 70,36 42,0 C22,14 -22,14 -42,0 Z"}
        fill={`url(#hm-cape-${uid})`}
        stroke={redDeep}
        strokeWidth="2"
        strokeLinejoin="round"
        opacity={rest ? 0.92 : 1}
      />
      <path d={rest ? "M0,6 L0,92" : "M0,8 L0,150"} fill="none" stroke={gold}
        strokeWidth={rest ? 2 : 2.5} strokeLinecap="round" opacity=".35" />
      <ellipse cx="0" cy="2" rx={rest ? 8 : 10} ry={rest ? 5 : 6}
        fill={gold} stroke={dark(p.accent, 0.25)} strokeWidth="1.5" />
    </g>
  );
}

/** Huge rocket thruster plume under the feet — vertical Superman launch. */
function RocketFlames({ uid }) {
  const nozzles = [
    { x: 178, y: 448, begin: "0s", s: 1 },
    { x: 210, y: 452, begin: "0.05s", s: 1.28 },
    { x: 242, y: 448, begin: "0.1s", s: 1 },
  ];
  return (
    <g>
      <defs>
        <radialGradient id={`hm-puff-${uid}`} cx="50%" cy="28%" r="72%">
          <stop offset="0" stopColor={FLAME.smoke} stopOpacity=".55" />
          <stop offset="1" stopColor={FLAME.smoke} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`hm-flare-${uid}`} cx="50%" cy="20%" r="70%">
          <stop offset="0" stopColor={FLAME.glow} stopOpacity=".7" />
          <stop offset="1" stopColor={FLAME.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Heat bloom + smoke bed */}
      <ellipse cx="210" cy="470" rx="110" ry="48" fill={`url(#hm-flare-${uid})`} />
      <ellipse cx="210" cy="505" rx="98" ry="20" fill={`url(#hm-puff-${uid})`} />
      {[[150, 486, 20, "0s"], [270, 488, 22, "0.2s"], [210, 496, 18, "0.4s"],
        [176, 508, 15, "0.65s"], [244, 510, 16, "0.85s"]].map(([x, y, r, delay], i) => (
        <circle key={i} className="hm-smoke" cx={x} cy={y} r={r} fill={`url(#hm-puff-${uid})`}
          style={{ animationDelay: delay }} />
      ))}
      {nozzles.map(({ x, y, begin, s }, i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <g transform={`scale(${s})`}>
            <animateTransform attributeName="transform" type="scale" additive="sum"
              values="1 1;1.12 1.55;0.9 1.1;1 1" dur="0.2s" begin={begin}
              repeatCount="indefinite" />
            <ellipse cx="0" cy="36" rx="34" ry="48" fill={FLAME.outer} opacity=".28" />
            <path d="M-22,0 Q-16,46 0,96 Q16,46 22,0 Q0,22 -22,0 Z" fill={FLAME.outer} opacity=".96" />
            <path d="M-14,0 Q-9,38 0,74 Q9,38 14,0 Q0,16 -14,0 Z" fill={FLAME.mid} />
            <path d="M-6,0 Q-3,24 0,48 Q3,24 6,0 Z" fill={FLAME.core} />
            <circle className="hm-ember" cx="-10" cy="28" r="3" fill={FLAME.mid}
              style={{ animationDelay: begin, "--ex": "-14px" }} />
            <circle className="hm-ember" cx="12" cy="34" r="2.4" fill={FLAME.core}
              style={{ animationDelay: `${0.12 + i * 0.05}s`, "--ex": "12px" }} />
          </g>
        </g>
      ))}
    </g>
  );
}

function Props({ g, p, showCoins }) {
  const accent = p.accent;
  const uid = g.key;
  switch (g.prop) {
    case "idleCoin":
      return showCoins
        ? <Coin x={248} y={368} s={0.52} metal="gold" uid={`${uid}-idle`} />
        : <Star4 x={248} y={368} s={1.05} fill={accent} cls="hm-twinkle" />;
    case "waveCoin":
      return showCoins
        ? <Coin x={102} y={218} s={0.58} metal="gold" spin uid={`${uid}-wv`} />
        : <Star4 x={102} y={218} s={1.15} fill={accent} cls="hm-twinkle" />;
    case "think":
      return (
        <g>
          {showCoins ? (
            <Coin x={120} y={148} s={0.72} metal="gold" spin uid={`${uid}-think`} />
          ) : (
            <Star4 x={120} y={148} s={1.35} fill={accent} cls="hm-twinkle" />
          )}
          <Star4 x={92} y={118} s={1.2} fill={accent} cls="hm-twinkle" />
        </g>
      );
    case "eq":
      return (
        <g fill={accent}>
          {[[56, 18], [72, 32], [88, 12], [324, 12], [340, 32], [356, 18]].map(([x, h], i) => (
            <rect key={i} className="hm-eq" x={x} y={230 - h} width="8" height={h * 2} rx="4"
              style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
          ))}
        </g>
      );
    case "speech":
      return (
        <g>
          <g fill="none" stroke={accent} strokeLinecap="round">
            <path className="hm-ring" d="M128,242 Q118,256 128,270" strokeWidth="4" />
            <path className="hm-ring" d="M110,232 Q94,256 110,280" strokeWidth="4" style={{ animationDelay: ".2s" }} />
          </g>
          {showCoins && <Coin x={72} y={252} s={0.55} metal="copper" uid={`${uid}-sp`} />}
        </g>
      );
    case "point":
      return (
        <g fill="none" stroke={accent} strokeWidth="4.5" strokeLinecap="round">
          <path className="hm-ring" d="M68,316 L36,316" />
          <path d="M46,306 L36,316 L46,326" />
        </g>
      );
    case "ledger":
      return (
        <g transform="translate(152,384)">
          <rect x="0" y="0" width="116" height="38" rx="8" fill={p.belly} stroke={accent} strokeWidth="2.2" />
          {[[8, 8], [24, 8], [40, 8], [56, 8], [72, 8], [88, 8],
            [16, 22], [32, 22], [48, 22], [64, 22], [80, 22]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width="11" height="7" rx="2" fill={p.bodyDark} opacity={i === 5 ? 0.9 : 0.45} />
          ))}
          {showCoins && <Coin x={98} y={8} s={0.42} metal="gold" uid={`${uid}-lg`} />}
        </g>
      );
    case "coinRain":
      if (!showCoins) {
        return (
          <g>
            {[[118, 72, 0], [196, 58, 0.35], [278, 68, 0.7], [340, 96, 1.05]].map(([x, y, delay], i) => (
              <Star4 key={i} x={x} y={y} s={1.1} fill={[accent, p.bodyLight, p.blush][i % 3]}
                cls="hm-fall" delay={`${delay}s`} />
            ))}
          </g>
        );
      }
      return (
        <g>
          {[[118, 72, 0, "gold"], [196, 58, 0.35, "silver"], [278, 68, 0.7, "copper"],
            [340, 96, 1.05, "gold"], [88, 118, 1.4, "silver"], [320, 130, 1.75, "gold"]].map(
            ([x, y, delay, metal], i) => (
              <g key={i} className="hm-fall" style={{ animationDelay: `${delay}s` }}>
                <Coin x={x} y={y} s={0.62} metal={metal} uid={`${uid}-r${i}`} tilt={0.85} />
              </g>
            )
          )}
        </g>
      );
    case "hearts":
      return (
        <g>
          <g transform="translate(302,162) scale(1.4)">
            <path className="hm-rise" d={HEART_D} fill={p.blush} />
          </g>
          {showCoins && (
            <>
              <Coin x={108} y={148} s={0.58} metal="gold" uid={`${uid}-h1`} />
              <Coin x={318} y={138} s={0.52} metal="gold" uid={`${uid}-h2`} />
            </>
          )}
        </g>
      );
    case "tears":
      return (
        <g>
          <g transform="translate(168,248)">
            <path className="hm-tear" fill={accent} opacity=".88"
              d="M0,-10 Q6,-2 6,2.5 A6,6 0 1,1 -6,2.5 Q-6,-2 0,-10 Z" />
          </g>
          <g transform="translate(252,248)">
            <path className="hm-tear" fill={accent} opacity=".88"
              d="M0,-10 Q6,-2 6,2.5 A6,6 0 1,1 -6,2.5 Q-6,-2 0,-10 Z" style={{ animationDelay: ".4s" }} />
          </g>
        </g>
      );
    case "steam":
      return (
        <g fill={p.bodyLight} opacity=".48">
          <circle className="hm-rise" cx="304" cy="178" r="8" />
          <circle className="hm-rise" cx="318" cy="164" r="6" style={{ animationDelay: ".5s" }} />
        </g>
      );
    case "zzz":
      return (
        <path className="hm-zzz" d="M288,118 L304,118 L288,134 L304,134" fill="none"
          stroke={p.feature} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "stack":
      return (
        <g>
          {showCoins ? (
            <>
              <Coin x={322} y={168} s={0.68} metal="gold" uid={`${uid}-st3`} tilt={0.92} />
              <Coin x={322} y={152} s={0.68} metal="gold" uid={`${uid}-st2`} tilt={0.88} />
              <Coin x={322} y={136} s={0.68} metal="gold" uid={`${uid}-st1`} tilt={0.85} />
            </>
          ) : (
            <>
              <Star4 x={322} y={168} s={1.1} fill={accent} />
              <Star4 x={322} y={148} s={1.2} fill={accent} cls="hm-twinkle" />
              <Star4 x={322} y={128} s={1.05} fill={p.bodyLight} />
            </>
          )}
        </g>
      );
    case "oops":
      return (
        <g>
          <text x="108" y="152" fontSize="26" fill={accent} fontWeight="700" fontFamily="Outfit, sans-serif">!</text>
          {showCoins && <Coin x={118} y={380} s={0.55} metal="silver" uid={`${uid}-drop`} tilt={0.7} />}
        </g>
      );
    case "spark":
      return (
        <g stroke={accent} strokeLinecap="round" strokeWidth="4.5">
          <path d="M128,128 L112,106" /><path d="M292,128 L308,106" /><path d="M210,114 L210,90" />
        </g>
      );
    case "kissHeart":
      return (
        <g>
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".9">
            <path className="hm-ring" d="M224,256 Q246,248 266,252" strokeWidth="3.2" />
            <path className="hm-ring" d="M226,264 Q250,260 272,262" strokeWidth="2.4" style={{ animationDelay: ".18s" }} />
          </g>
          <g transform="translate(270,244) scale(1.55)">
            <path className="hm-rise" d={HEART_D} fill="#FF6B8A" />
          </g>
          <g transform="translate(310,208) scale(1.15)">
            <path className="hm-rise" d={HEART_D} fill="#FF8AA8" opacity=".95" style={{ animationDelay: ".4s" }} />
          </g>
          <g transform="translate(346,174) scale(0.85)">
            <path className="hm-rise" d={HEART_D} fill={accent} style={{ animationDelay: ".8s" }} />
          </g>
        </g>
      );
    case "notes":
      return (
        <g fill={accent}>
          <g transform="translate(316,148)">
            <g className="hm-rise">
              <ellipse cx="0" cy="0" rx="5" ry="3.8" transform="rotate(-18)" />
              <path d="M3.5,-1 L3.5,-17" fill="none" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />
            </g>
          </g>
          {showCoins && <Coin x={96} y={142} s={0.5} metal="copper" uid={`${uid}-dn`} />}
        </g>
      );
    case "alarm":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round">
          <path className="hm-ring" d="M112,208 Q92,236 112,264" strokeWidth="4.5" />
          <path className="hm-ring" d="M308,208 Q328,236 308,264" strokeWidth="4.5" style={{ animationDelay: ".16s" }} />
          {showCoins && <Coin x={210} y={96} s={0.65} metal="gold" spin uid={`${uid}-al`} />}
        </g>
      );
    case "encourage":
      return (
        <g>
          <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="4">
            <path className="hm-ring" d="M78,302 Q58,284 78,266" />
            <path className="hm-ring" d="M342,302 Q362,284 342,266" style={{ animationDelay: ".2s" }} />
          </g>
          <Star4 x={118} y={148} fill={accent} cls="hm-twinkle" s={1.05} />
        </g>
      );
    case "search":
      return (
        <g transform="translate(82,304) rotate(8)">
          <circle cx="0" cy="0" r="19" fill={rgba("#FFFFFF", 0.12)} stroke={accent} strokeWidth="4.5" />
          <path d="M14,14 L28,30" stroke={p.feature} strokeWidth="6" strokeLinecap="round" />
          {showCoins && <Coin x={6} y={-4} s={0.38} metal="silver" uid={`${uid}-sr`} />}
        </g>
      );
    case "thumbsUp":
      return showCoins
        ? <Coin x={112} y={248} s={0.58} metal="gold" uid={`${uid}-tu`} />
        : <Star4 x={112} y={248} s={1.2} fill={accent} cls="hm-twinkle" />;
    case "thumbsDown":
      return showCoins
        ? <Coin x={126} y={374} s={0.55} metal="copper" uid={`${uid}-td`} tilt={0.75} />
        : <Star4 x={126} y={374} s={1.15} fill={p.blush} />;
    case "question":
      return (
        <text x="304" y="148" fontSize="36" fill={accent} fontWeight="700" fontFamily="Outfit, sans-serif">?</text>
      );
    case "workStack":
      return (
        <g>
          {showCoins ? (
            <>
              <Coin x={318} y={168} s={0.6} metal="gold" uid={`${uid}-w1`} />
              <Coin x={318} y={152} s={0.6} metal="silver" uid={`${uid}-w2`} />
              <Coin x={318} y={136} s={0.6} metal="copper" uid={`${uid}-w3`} />
            </>
          ) : (
            <>
              <Star4 x={318} y={168} s={1.05} fill={accent} />
              <Star4 x={318} y={148} s={1.15} fill={p.bodyLight} cls="hm-twinkle" />
              <Star4 x={318} y={128} s={1} fill={accent} />
            </>
          )}
        </g>
      );
    case "speed":
      return (
        <g>
          <g fill="none" stroke={accent} strokeLinecap="round" opacity=".8">
            <path className="hm-whoosh" d="M78,252 L28,252" strokeWidth="4.5" />
            <path className="hm-whoosh" d="M74,288 L20,288" strokeWidth="5.5" style={{ animationDelay: ".07s" }} />
            <path className="hm-whoosh" d="M80,324 L34,324" strokeWidth="4" style={{ animationDelay: ".13s" }} />
          </g>
          {[[152, 458], [190, 464], [248, 460], [286, 466]].map(([x, y], i) => (
            <ellipse key={i} className="hm-dust" cx={x} cy={y} rx="10" ry="4" fill={p.bodyLight} opacity=".5"
              style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </g>
      );
    case "flyCoins":
      return (
        <g>
          {/* Vertical speed lines falling away under the launch */}
          <g fill="none" stroke={accent} strokeLinecap="round">
            <path className="hm-streak" d="M108,250 L108,330" strokeWidth="5.5" opacity=".8" />
            <path className="hm-streak" d="M142,268 L142,352" strokeWidth="4" opacity=".6"
              style={{ animationDelay: ".12s" }} />
            <path className="hm-streak" d="M278,268 L278,352" strokeWidth="4" opacity=".6"
              style={{ animationDelay: ".22s" }} />
            <path className="hm-streak" d="M312,250 L312,330" strokeWidth="5.5" opacity=".8"
              style={{ animationDelay: ".34s" }} />
          </g>
          <Star4 x={150} y={96} fill={FLAME.mid} cls="hm-twinkle" s={1.15} />
          <Star4 x={270} y={88} fill={accent} cls="hm-twinkle" delay=".35s" s={1.05} />
          {showCoins && (
            <>
              <Coin x={126} y={132} s={0.5} metal="gold" uid={`${uid}-f1`} tilt={0.78} />
              <Coin x={294} y={120} s={0.48} metal="silver" uid={`${uid}-f2`} tilt={0.78} />
            </>
          )}
        </g>
      );
    case "highFive":
      return (
        <g fill="none" stroke={accent} strokeLinecap="round" strokeWidth="4.5">
          <path className="hm-ring" d="M124,234 Q104,214 84,234" />
          <path className="hm-ring" d="M118,212 Q98,188 78,212" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "clap":
      return (
        <g transform="translate(210,338)">
          <g fill="none" stroke={accent} strokeLinecap="round">
            <path className="hm-ring" d="M-26,0 Q0,-20 26,0" strokeWidth="4" />
            <path className="hm-ring" d="M-34,6 Q0,-28 34,6" strokeWidth="3.2" style={{ animationDelay: ".18s" }} />
          </g>
          {showCoins && <Coin x={0} y={-8} s={0.48} metal="gold" uid={`${uid}-cl`} />}
        </g>
      );
    case "success":
      return (
        <g transform="translate(318,144)">
          <circle r="22" fill={accent} />
          <path d="M-9,-1 L-2,7 L10,-8" fill="none" stroke={p.belly} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          {showCoins && <Coin x={28} y={18} s={0.5} metal="gold" uid={`${uid}-ok`} />}
        </g>
      );
    case "error":
      return (
        <g>
          <g transform="translate(318,144)">
            <circle r="20" fill={p.blush} opacity=".92" />
            <path d="M-7,-7 L7,7 M7,-7 L-7,7" stroke={p.belly} strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <path className="hm-ring" d="M112,208 Q92,236 112,264" fill="none" stroke={p.blush} strokeWidth="4" />
        </g>
      );
    case "empty":
      return (
        <g stroke={p.dim} strokeWidth="2.8" fill="none" opacity=".75">
          <path d="M292,148 Q310,132 328,148 L328,178 Q310,194 292,178 Z" strokeDasharray="5 5" />
          <path d="M300,162 L320,162" strokeLinecap="round" opacity=".55" />
          <text x="310" y="172" textAnchor="middle" fontSize="10" fill={p.dim} fontFamily="Manrope, sans-serif">$0</text>
        </g>
      );
    case "loading":
      return showCoins ? <Coin x={318} y={144} s={0.72} metal="gold" spin uid={`${uid}-ld`} /> : (
        <g transform="translate(318,144)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="1.1s" repeatCount="indefinite" />
          <circle r="16" fill="none" stroke={accent} strokeWidth="4.5" strokeDasharray="26 72" strokeLinecap="round" />
        </g>
      );
    case "waiting":
      return (
        <g fill={p.feature}>
          {[0, 1, 2].map((i) => (
            <circle key={i} className="hm-dot" cx={298 + i * 15} cy="144" r="4.5"
              style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

export function HaySVG({ p, glow, paused, waving, gesture, svgRef, eyeRef, parts = ALL_PARTS }) {
  const g = byKey(gesture);
  const isWaving = (waving && !!g.track) || !!g.wave;
  const look = g.look || [0, 0];
  const lift = g.lift || 0;
  const skyward = !!g.skyward;
  const running = g.gait === "run";
  const clapping = !!g.clap;
  const showCoins = parts.coins;
  const swayAnim = { values: "-10;10;-10", dur: "1.2s" };
  const waveAnim = { values: "-8;28;-8", dur: "0.7s" };
  const idleL = { values: "-2;2;-2", dur: "3.5s" };
  const idleR = { values: "2;-2;2", dur: "3.8s" };
  const runPumpL = { values: "8;-8;8", dur: "0.28s" };
  const runPumpR = { values: "-8;8;-8", dur: "0.28s" };
  const armBusy = g.boost || running || clapping;
  /* Wave with the character's right hand (screen-left / SH_L). */
  const armLAnim = armBusy ? (running ? runPumpL : null) : isWaving ? waveAnim : g.sway ? swayAnim : idleL;
  const armRAnim = armBusy ? (running ? runPumpR : null) : g.sway ? swayAnim : idleR;
  const runMorphL = running ? { values: `${A.runBack};${A.runFwd};${A.runBack}`, dur: "0.28s" } : null;
  const runMorphR = running ? { values: `${mir(A.runFwd)};${mir(A.runBack)};${mir(A.runFwd)}`, dur: "0.28s" } : null;
  const clapMorphL = clapping ? { values: `${A.clapOpenL};${A.clapShutL};${A.clapShutL};${A.clapOpenL}`, dur: "0.42s" } : null;
  const clapMorphR = clapping ? { values: `${A.clapOpenR};${A.clapShutR};${A.clapShutR};${A.clapOpenR}`, dur: "0.42s" } : null;
  const armMorphL = runMorphL || clapMorphL;
  const armMorphR = runMorphR || clapMorphR;
  const flying = !!g.boost;
  /* Looking up = pupils ride high in the sockets. Never bend the neck/head. */
  const faceLift = skyward ? -6 : 0;
  const pupilGaze = skyward ? [0, -7] : [look[0] * 0.35, look[1] * 0.35];

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-labelledby={`hm-title-${g.key} hm-description-${g.key}`}
      className={`hm-svg hm-g-${gesture} ${isWaving ? "hm-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title id={`hm-title-${g.key}`}>{`Hay the budgeting pika — ${g.label}`}</title>
      <desc id={`hm-description-${g.key}`}>{g.tip}</desc>
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id={`hm-glow-${g.key}`} cx="50%" cy="46%" r="58%">
          <stop offset="0" stopColor={flying ? FLAME.glow : p.glowC} stopOpacity=".95" />
          <stop offset="1" stopColor={flying ? FLAME.glow : p.glowC} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`hm-body-${g.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bodyLight} />
          <stop offset="1" stopColor={p.body} />
        </linearGradient>
        <linearGradient id={`hm-belly-${g.key}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.belly} />
          <stop offset="1" stopColor={light(p.belly, 0.06)} />
        </linearGradient>
      </defs>

      {parts.shadow && (
        <ellipse className="hm-shadowO" cx="210" cy={flying ? 512 : 498}
          rx={flying ? 52 : 84} ry="8" fill="#000" opacity=".2" />
      )}

      <g transform={`translate(0,${lift})`}>
        <g className="hm-float">
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
            begin="hm-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 7;0 -12;0 3;0 0" keyTimes="0;0.24;0.54;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="hm-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.05 .93;.97 1.05;1.02 .98;1 1" keyTimes="0;0.24;0.54;0.8;1" />
          <g transform={`rotate(${g.bow || g.lean || 0})`}>
            <g transform="translate(-210,-470)">
              <g id="hm-hit">
                {parts.halo && (
                  <ellipse className="hm-glow" cx="210" cy={flying ? 250 : 278}
                    rx={flying ? 148 : 136} ry={flying ? 132 : 120}
                    fill={`url(#hm-glow-${g.key})`} />
                )}

                {/* Cape sits behind the body — resting drape when not flying so the toggle stays honest */}
                {parts.cape && <Cape p={p} uid={g.key} mode={flying ? "fly" : "rest"} />}

                {flying && parts.flames && <RocketFlames uid={g.key} />}

                {parts.legs && (
                  <g>
                    {flying ? (
                      <>
                        <path d="M196,398 L192,442" stroke={p.limb} strokeWidth="13" strokeLinecap="round" />
                        <path d="M224,398 L228,442" stroke={p.limb} strokeWidth="13" strokeLinecap="round" />
                        <ellipse cx="190" cy="452" rx="16" ry="10" fill={p.bodyDark} />
                        <ellipse cx="230" cy="452" rx="16" ry="10" fill={p.bodyDark} />
                      </>
                    ) : running ? (
                      <>
                        <path d="M186,396 L152,432" stroke={p.limb} strokeWidth="13" strokeLinecap="round" />
                        <path d="M234,396 L272,426" stroke={p.limb} strokeWidth="13" strokeLinecap="round" />
                        <ellipse cx="144" cy="446" rx="18" ry="11" fill={p.bodyDark} />
                        <ellipse cx="280" cy="440" rx="18" ry="11" fill={p.bodyDark} />
                      </>
                    ) : (
                      <>
                        <path d="M188,396 L176,434" stroke={p.limb} strokeWidth="12" strokeLinecap="round" />
                        <path d="M232,396 L244,434" stroke={p.limb} strokeWidth="12" strokeLinecap="round" />
                        <ellipse cx="172" cy="448" rx="17" ry="10" fill={p.bodyDark} />
                        <ellipse cx="248" cy="448" rx="17" ry="10" fill={p.bodyDark} />
                      </>
                    )}
                  </g>
                )}

                {/* torso — same silhouette as every other pose */}
                <ellipse cx="210" cy="348" rx="74" ry="58" fill={`url(#hm-body-${g.key})`}
                  stroke={p.bodyDark} strokeWidth="2" />
                {parts.belly && (
                  <ellipse cx="210" cy="358" rx="48" ry="38" fill={`url(#hm-belly-${g.key})`} opacity=".92" />
                )}

                {parts.vest && (
                  <path d="M168,312 Q210,298 252,312 L248,368 Q210,378 172,368 Z"
                    fill={dark(p.accent, 0.15)} stroke={p.accent} strokeWidth="2" opacity=".88" />
                )}

                {parts.arms && (
                  <g>
                    <ellipse cx={SH_L[0]} cy={SH_L[1]} rx="18" ry="14" fill={p.bodyDark} opacity=".5" />
                    <ellipse cx={SH_R[0]} cy={SH_R[1]} rx="18" ry="14" fill={p.bodyDark} opacity=".5" />
                  </g>
                )}

                {/* neck bridge — unchanged for flying */}
                <ellipse cx="210" cy="278" rx="36" ry="18"
                  fill={p.body} stroke={p.bodyDark} strokeWidth="1.5" />

                {/* head — upright, attached; looking up is face-only */}
                <g>
                  {parts.ears && (
                    <g>
                      <g transform="translate(148,132)">
                        <ellipse cx="0" cy="0" rx="22" ry="26" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
                        <ellipse cx="0" cy="-4" rx="14" ry="16" fill={p.earInner} />
                        <ellipse cx="0" cy="-14" rx="18" ry="10" fill={p.earTip} />
                        <animateTransform attributeName="transform" type="rotate" additive="sum"
                          values="-3;3;-3" dur="3.2s" repeatCount="indefinite" />
                      </g>
                      <g transform="translate(272,132)">
                        <ellipse cx="0" cy="0" rx="22" ry="26" fill={p.body} stroke={p.bodyDark} strokeWidth="2" />
                        <ellipse cx="0" cy="-4" rx="14" ry="16" fill={p.earInner} />
                        <ellipse cx="0" cy="-14" rx="18" ry="10" fill={p.earTip} />
                        <animateTransform attributeName="transform" type="rotate" additive="sum"
                          values="3;-3;3" dur="3.5s" repeatCount="indefinite" />
                      </g>
                    </g>
                  )}

                  <ellipse cx="210" cy="208" rx="80" ry="72"
                    fill={`url(#hm-body-${g.key})`} stroke={p.bodyDark} strokeWidth="2" />
                  <ellipse cx="210" cy="224" rx="62" ry="48" fill={p.bodyLight} opacity=".22" />

                  {parts.whiskers && (
                    <g stroke={p.feature} strokeWidth="1.8" strokeLinecap="round" opacity=".55">
                      <path d="M138,228 L98,222" /><path d="M138,238 L96,242" /><path d="M138,248 L100,258" />
                      <path d="M282,228 L322,222" /><path d="M282,238 L324,242" /><path d="M282,248 L320,258" />
                    </g>
                  )}

                  {parts.nose && (
                    <ellipse cx="210" cy="254" rx="7" ry="6" fill={p.feature} />
                  )}

                  {parts.blush && (
                    <g fill={p.blush} opacity=".38">
                      <ellipse cx="156" cy="252" rx="9" ry="5.5" />
                      <ellipse cx="264" cy="252" rx="9" ry="5.5" />
                    </g>
                  )}

                  <g key={g.key} className="hm-pop"
                    transform={`translate(${look[0]},${look[1] + faceLift})`}>
                    {parts.brows && <Brows kind={g.brow} p={p} />}
                    <g>
                      <Eye kind={g.eye} x={EYE_L_X} p={p} track={g.track} eyeRef={eyeRef?.l}
                        gaze={pupilGaze} />
                      <Eye kind={g.eye} x={EYE_R_X} p={p} track={g.track} eyeRef={eyeRef?.r}
                        gaze={pupilGaze} />
                    </g>
                    <Mouth kind={g.mouth} p={p} />
                  </g>
                </g>

                {parts.props && (
                  <g key={`p-${g.key}`} className="hm-pop">
                    <Props g={g} p={p} showCoins={showCoins} />
                  </g>
                )}

                {parts.arms && (
                  <>
                    <Arm d={g.armL} shoulder={SH_L} p={p} anim={armLAnim}
                      morph={armMorphL} animKey={`l-${g.key}-${isWaving}`} />
                    <Arm d={g.armR} shoulder={SH_R} p={p} anim={armRAnim}
                      morph={armMorphR} animKey={`r-${g.key}-${isWaving}`} />
                  </>
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
  coin: "M0,-6 A6,6 0 1,0 0.01,-6 Z",
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};

export const POSE_SOURCE = {
  slug: "hay",
  meta: {
    name: "Hay",
    tagline: "Careful pika who stacks every coin",
    product: "Budgeting App",
    accent: BRAND,
    stage: THEMES.wheat.stage,
    glowLabel: "Warm glow",
    themes: Object.fromEntries(
      Object.entries(THEMES).map(([key, t]) => [
        key,
        {
          name: t.name,
          top: t.belly,
          mid: t.body,
          base: dark(t.body, 0.3),
          core: t.accent,
          stage: t.stage,
          features: dark(t.body, 0.4),
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
    <HaySVG
      p={derive(THEMES.wheat)}
      glow={0.45}
      waving={false}
      gesture={key}
      eyeRef={{}}
    />
  ),
};

export default function HayStudio() {
  const [themeKey, setThemeKey] = useState("wheat");
  const [custom, setCustom] = useState({ ...THEMES.wheat, name: "Custom" });
  const [glow, setGlow] = useState(0.45);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [waving, setWaving] = useState(false);
  const [gesture, setGesture] = useState("idle");
  const [parts, setParts] = useState({ ...DEFAULT_PARTS });
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
  const partsOn = ELEMENTS.filter((e) => parts[e.key]).length;

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
        kind: i % 3 === 0 ? "coin" : i % 3 === 1 ? "star" : "dot",
        dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20,
        color: [p.accent, p.bodyLight, p.belly][i % 3],
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
    `linear-gradient(135deg, ${t.body} 0 55%, ${t.belly} 55% 78%, ${t.accent} 78% 100%)`;
  const stageBg = transparent
    ? undefined
    : `radial-gradient(640px 420px at 50% 118%, ${rgba(theme.body, 0.32)}, transparent 62%), ${theme.stage}`;

  return (
    <div className="hy-root">
      <style>{SHELL_CSS}</style>

      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2 pt-8">
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: rgba(BRAND, 0.13),
          border: `1px solid ${rgba(BRAND, 0.4)}`, display: "grid", placeItems: "center",
        }}>
          <svg viewBox="0 0 40 40" width="30" height="30" aria-hidden>
            <ellipse cx="20" cy="24" rx="12" ry="10" fill={BRAND} />
            <ellipse cx="20" cy="18" rx="14" ry="12" fill="#E0C49A" />
            <ellipse cx="12" cy="10" rx="4" ry="5" fill="#E0C49A" />
            <ellipse cx="28" cy="10" rx="4" ry="5" fill="#E0C49A" />
            <circle cx="20" cy="30" r="4" fill={BRAND} opacity=".85" />
          </svg>
        </div>
        <div>
          <h1 className="hy-display" style={{ fontSize: 24, fontWeight: 640 }}>
            Hay <span style={{ color: BRAND }}>·</span> Budgeting App
          </h1>
          <p style={{ fontSize: 13, color: "#B5AC9A" }}>
            Careful pika who stacks every coin
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-5 py-6 lg:grid-cols-[1fr_400px]">
        <section className="hy-card flex flex-col gap-4 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="hy-eyebrow">Stage</h2>
            <div className="flex gap-2">
              <button type="button" className={`hy-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)} aria-pressed={transparent}>
                Transparent
              </button>
              <button type="button" className={`hy-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)} aria-pressed={!transparent}>
                In-app
              </button>
            </div>
          </div>

          <div
            data-mascot-stage
            className={`relative overflow-hidden rounded-2xl ${transparent ? "hy-checker" : ""}`}
            style={{ background: stageBg, minHeight: 440 }}
            onMouseEnter={() => activeG.track && setWaving(true)}
            onMouseLeave={() => setWaving(false)}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 350, padding: "10px 10px 0" }}>
              <HaySVG
                p={p} glow={glow} paused={paused} waving={waving}
                gesture={gesture} svgRef={svgRef} parts={parts}
                eyeRef={{ l: pupilL, r: pupilR }}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="hy-spark"
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
            style={{ borderColor: `${BRAND}29` }}>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="hy-eyebrow">Elements</h3>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 12, color: "#B5AC9A" }}>{partsOn}/{ELEMENTS.length}</span>
                  <button type="button" className="hy-tiny" onClick={() => setParts(allParts(true))}>All</button>
                  <button type="button" className="hy-tiny" onClick={() => setParts(allParts(false))}>None</button>
                  <button type="button" className="hy-tiny" onClick={() => setParts({ ...DEFAULT_PARTS })}>Reset</button>
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: "#B5AC9A", lineHeight: 1.5 }}>
                Toggle parts on/off instantly. Hidden parts stay available to add back.
              </p>
            </div>
            <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
              {ELEMENT_CATEGORIES.map((cat) => {
                const list = ELEMENTS.filter((el) => el.category === cat);
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
                            className={`hy-pill ${on ? "on" : ""}`}
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

        <section className="hy-card flex flex-col gap-6 p-5 sm:p-6">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <span className="hy-eyebrow">Gesture</span>
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
                        className={`hy-pill ${gesture === gg.key ? "on" : ""}`}
                        onClick={() => setGesture(gg.key)}
                      >{gg.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 12, padding: "11px 13px", borderRadius: 12,
              background: "rgba(255,246,230,.045)", border: `1px solid ${rgba(BRAND, 0.16)}`,
            }}>
              <div className="hy-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>
                {activeG.tip}
              </p>
            </div>
          </div>

          <div>
            <div className="hy-eyebrow mb-3">Theme</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} type="button" title={t.name}
                  className={`hy-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button type="button" title="Custom"
                className={`hy-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#1A1410", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="mt-3 flex flex-wrap gap-4">
                {[["body", "Fur"], ["belly", "Belly"], ["accent", "Accent"]].map(
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
              <span className="hy-eyebrow">Warm glow</span>
              <span style={{ fontSize: 12, color: "#C6BCA7" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={glow}
              className="hy-range w-full" style={{ background: "#2E2820" }}
              onChange={(e) => setGlow(Number(e.target.value))} />
          </div>

          <div className="flex items-center justify-between">
            <span className="hy-eyebrow">Motion</span>
            <button type="button" className={`hy-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

