"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   BUD: a round dawn-orange rooster chick with tiny
   alarm-clock bell feet. Mascot studio for an AI alarm app.

   Engineering notes (lessons carried over from Fanous):
   · every shape-critical animation is SMIL (no CSS
     transform-box / transform-origin traps)
   · CSS animations are origin-free only (opacity, translate)
   · wings hang from SYMMETRIC shoulders and mirrored paths,
     so paired poses are dead level and equal length
   · every gesture is a whole performance: wings, eyes, brows,
     beak, gaze, posture, glow and a prop
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
const dark = (c, t) => mix(c, "#100B08", t);
const light = (c, t) => mix(c, "#FFF6EA", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ---------- themes ---------- */
const THEMES = {
  dawn:   { name: "First Light",  body: "#F59A48", belly: "#FFE4BE", comb: "#E5533D", beak: "#F2A93B", brass: "#E9B54C", stage: "#2B3555" },
  peach:  { name: "Peach Sky",    body: "#F58E6B", belly: "#FFE0CE", comb: "#D9485F", beak: "#FFB84A", brass: "#EDB558", stage: "#472B4E" },
  golden: { name: "Golden Hour",  body: "#F5B23E", belly: "#FFEBBB", comb: "#DE5638", beak: "#F09A2E", brass: "#E8AE45", stage: "#3A4A66" },
  ember:  { name: "Ember Dusk",   body: "#E07A4F", belly: "#F8D7B4", comb: "#C4453F", beak: "#EFA23A", brass: "#D9A64A", stage: "#26203F" },
  frost:  { name: "Frost Dawn",   body: "#F2A264", belly: "#FFEAD2", comb: "#D95555", beak: "#F4AE45", brass: "#D9B36A", stage: "#31485C" },
};
const derive = (t) => ({
  ...t,
  features: "#33231A",
  wing: dark(t.body, 0.14),
  leg: dark(t.body, 0.28),
  bellyEdge: dark(t.belly, 0.12),
  beakDark: dark(t.beak, 0.22),
  brassDark: dark(t.brass, 0.28),
  combDark: dark(t.comb, 0.18),
  blush: light(t.comb, 0.28),
  glowC: light(t.body, 0.35),
});

/* ---------- studio shell CSS ---------- */
const AMBER = "#F1B04C";
const SHELL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap');
  .bs-root{min-height:100vh;background:#111726;color:#F2E9DC;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 500px at 50% -160px, rgba(241,176,76,.14), transparent 60%),
      radial-gradient(700px 380px at 85% 108%, rgba(229,83,61,.10), transparent 60%);}
  .bs-display{font-family:'Fredoka',sans-serif;letter-spacing:.01em}
  .bs-card{background:rgba(255,244,228,.045);border:1px solid rgba(241,176,76,.16);
    border-radius:20px;backdrop-filter:blur(8px)}
  .bs-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${AMBER}}
  .bs-pill{border:1px solid rgba(241,176,76,.28);border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#F2E9DC;background:transparent;cursor:pointer;
    transition:all .16s ease;line-height:1}
  .bs-pill:hover{border-color:${AMBER};transform:translateY(-1px)}
  .bs-pill.on{background:${AMBER};color:#241503;border-color:${AMBER}}
  .bs-btn{border-radius:12px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;
    border:1px solid rgba(241,176,76,.35);color:#241503;background:${AMBER};transition:all .16s}
  .bs-btn:hover{filter:brightness(1.07)}
  .bs-btn.ghost{background:transparent;color:#F2E9DC}
  .bs-swatch{width:38px;height:38px;border-radius:12px;cursor:pointer;border:2px solid transparent;
    transition:transform .15s ease}
  .bs-swatch:hover{transform:scale(1.1)}
  .bs-swatch.on{border-color:#FFF3DD}
  .bs-checker{background-image:linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(-45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,rgba(255,255,255,.05) 75%),
    linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.05) 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .bs-range{accent-color:${AMBER}}
  .bs-spark{position:absolute;pointer-events:none;animation:bs-spark .95s ease-out forwards}
  @keyframes bs-spark{0%{opacity:0;transform:translate(0,0) scale(.4)}
    18%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
`;

/* ---------- mascot CSS (origin-free animations only) ---------- */
const SVG_CSS = `
  .bd-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .bd-g-ring{--gf:1.7}
  .bd-g-crow{--gf:1.5}
  .bd-g-sunrise{--gf:1.55}
  .bd-g-celebrate{--gf:1.35}
  .bd-g-love{--gf:1.25}
  .bd-g-grumpy{--gf:.7}
  .bd-g-sleepy{--gf:.45}
  .bd-g-night{--gf:.28}
  .bd-float{animation:bd-float 3.6s ease-in-out infinite}
  .bd-g-night .bd-float{animation-duration:7s}
  .bd-g-sleepy .bd-float{animation-duration:5.6s}
  .bd-g-ring .bd-float{animation:none}
  .bd-g-celebrate .bd-float{animation-duration:1.8s}
  .bd-shadowO{animation:bd-shadowO 3.6s ease-in-out infinite}
  .bd-glow{animation:bd-glow 3.1s ease-in-out infinite}
  .bd-g-ring .bd-glow{animation-duration:.9s}
  .bd-pop{animation:bd-pop .3s ease-out}
  .bd-pupils{transition:transform .12s ease-out}
  .bd-ringArc{animation:bd-ringArc .9s ease-out infinite}
  .bd-zzz{animation:bd-zzz 3.2s ease-in-out infinite}
  .bd-rise{animation:bd-rise 2.6s ease-out infinite}
  .bd-fall{animation:bd-fall 2.8s linear infinite}
  .bd-twinkle{animation:bd-twinkle 1.4s ease-in-out infinite}
  .bd-steam{animation:bd-steam 2.1s ease-out infinite}
  .bd-tear{animation:bd-tear 2.8s ease-in infinite}
  .bd-ray{animation:bd-ray 2.4s ease-in-out infinite}
  .bd-eq{animation:bd-eq 1s ease-in-out infinite}
  .bd-note{animation:bd-note 2.2s ease-out infinite}
  .bd-cloud{animation:bd-cloud 6s ease-in-out infinite}
  .bd-svg[data-paused] *{animation-play-state:paused !important}
  @keyframes bd-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes bd-shadowO{0%,100%{opacity:.24}50%{opacity:.13}}
  @keyframes bd-glow{0%,100%{opacity:calc(var(--g,.45)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.45)*var(--gf,1))}}
  @keyframes bd-pop{from{opacity:0}to{opacity:1}}
  @keyframes bd-ringArc{0%{opacity:0}15%{opacity:1}70%{opacity:0}100%{opacity:0}}
  @keyframes bd-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes bd-rise{0%{transform:translateY(12px);opacity:0}22%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
  @keyframes bd-fall{0%{transform:translateY(-24px);opacity:0}12%{opacity:1}82%{opacity:.9}100%{transform:translateY(150px);opacity:0}}
  @keyframes bd-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes bd-steam{0%{transform:translateY(6px);opacity:0}30%{opacity:.6}100%{transform:translateY(-26px);opacity:0}}
  @keyframes bd-tear{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes bd-ray{0%,100%{opacity:.15;transform:translateY(4px)}50%{opacity:.85;transform:translateY(-4px)}}
  @keyframes bd-eq{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes bd-note{0%{opacity:0;transform:translate(0,6px)}20%{opacity:1}100%{opacity:0;transform:translate(16px,-34px)}}
  @keyframes bd-cloud{0%,100%{transform:translateX(0)}50%{transform:translateX(10px)}}
`;

/* ============================================================
   GESTURE LIBRARY: 16 poses for an alarm app
   Wing shoulders are symmetric: L (104,296)  R (316,296).
   Wing paths are written for the LEFT shoulder; the right
   wing is the exact mirror, so pairs are level and equal.
   ============================================================ */
const SH_L = [104, 296], SH_R = [316, 296];
const mir = (d) => d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_, x, y) => `${-parseFloat(x)},${y}`);

const W = {
  rest:  "M0,0 Q-22,14 -20,42",
  droop: "M0,0 Q-12,22 -6,46",
  out:   "M0,0 Q-36,-4 -62,0",
  up:    "M0,0 Q-32,-20 -28,-56",
  high:  "M0,0 Q-26,-32 -12,-66",
  press: "M0,0 Q-18,44 -58,104",   /* written for the RIGHT wing (snooze) */
};

const GESTURES = [
  /* ------------- core ------------- */
  {
    key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "He bobs and blinks, and his pupils follow your cursor.",
    wingL: W.rest, wingR: mir(W.rest),
    eyeL: "open", eyeR: "open", beak: "smile", track: true,
  },
  {
    key: "happy", label: "Happy", cat: "Core", use: "Good morning · task done",
    tip: "Eyes creased shut, beak in a big smile.",
    wingL: W.up, wingR: mir(W.up),
    eyeL: "arch", eyeR: "arch", beak: "smile",
  },
  {
    key: "thinking", label: "Thinking", cat: "Core", use: "AI working · planning",
    tip: "Pupils roll up, wing to chin, sparks ticking over.",
    wingL: W.rest, wingR: mir(W.droop),
    eyeL: "open", eyeR: "open", brow: "oneUp", beak: "closed",
    look: [4, -6], prop: "sparks",
  },
  {
    key: "listening", label: "Listening", cat: "Core", use: "Voice command",
    tip: "Head tilted with a level gaze while the sound bars breathe.",
    wingL: W.rest, wingR: mir(W.rest), bow: 4,
    eyeL: "open", eyeR: "open", beak: "closed", prop: "eq",
  },
  {
    key: "talking", label: "Talking", cat: "Core", use: "AI reply · briefing",
    tip: "Beak open mid-word and speech arcs carrying.",
    wingL: W.out, wingR: mir(W.rest),
    eyeL: "open", eyeR: "open", brow: "up", beak: "open", prop: "speech",
  },

  /* ------------- alarm ------------- */
  {
    key: "ring", label: "Alarm!", cat: "Alarm", use: "Alarm firing",
    tip: "Bell feet hammering, striker whipping, and the whole chick rattles.",
    wingL: W.out, wingR: mir(W.out), shake: true, ringing: true,
    eyeL: "wide", eyeR: "wide", brow: "up", beak: "o", prop: "ringFx",
  },
  {
    key: "snooze", label: "Snooze", cat: "Alarm", use: "Snooze pressed",
    tip: "Five more minutes. A wing presses one bell down, lids heavy.",
    wingL: W.droop, wingR: mir(W.droop),
    eyeL: "half", eyeR: "half", beak: "closed", prop: "snoozeFx",
  },
  {
    key: "crow", label: "Crow", cat: "Alarm", use: "Wake-up call",
    tip: "Head thrown back for the cock-a-doodle, beak wide, notes flying.",
    wingL: W.high, wingR: mir(W.high), bow: -6,
    eyeL: "arch", eyeR: "arch", beak: "crow", prop: "crowFx",
  },
  {
    key: "sunrise", label: "Sunrise", cat: "Alarm", use: "Morning summary",
    tip: "Sun up, a cloud drifting past, warm easy smile. Good morning.",
    wingL: W.up, wingR: mir(W.rest),
    eyeL: "arch", eyeR: "open", beak: "smile", prop: "sun",
  },
  {
    key: "sleepy", label: "Sleepy", cat: "Alarm", use: "Wind-down reminder",
    tip: "Half-lidded and fading, with a slow bob and one drifting Z.",
    wingL: W.droop, wingR: mir(W.droop),
    eyeL: "half", eyeR: "half", beak: "closed", prop: "sleepyFx",
  },
  {
    key: "night", label: "Night", cat: "Alarm", use: "Sleep mode",
    tip: "Out cold with the glow banked, lids down, crescent and Zzz overhead.",
    wingL: W.droop, wingR: mir(W.droop),
    eyeL: "sleep", eyeR: "sleep", beak: "closed", prop: "nightFx",
  },

  /* ------------- moods ------------- */
  {
    key: "celebrate", label: "Celebrate", cat: "Moods", use: "On-time streak",
    tip: "Nailed it. Star eyes, wings up, confetti coming down.",
    wingL: W.high, wingR: mir(W.high),
    eyeL: "star", eyeR: "star", beak: "openSmile", prop: "confetti",
  },
  {
    key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too-early alarm",
    tip: "Flat lids, knitted brows, downturned beak, one puff of steam. Pre-coffee.",
    wingL: W.droop, wingR: mir(W.droop), bow: 3,
    eyeL: "half", eyeR: "half", brow: "angry", beak: "frown", prop: "steam",
  },
  {
    key: "sad", label: "Sad", cat: "Moods", use: "Overslept, gently",
    tip: "He missed it. Peaked brows, drooped wings, one tear, and never any shaming.",
    wingL: W.droop, wingR: mir(W.droop),
    eyeL: "sad", eyeR: "sad", brow: "sad", beak: "frown", prop: "tear",
  },
  {
    key: "dizzy", label: "Dizzy", cat: "Moods", use: "Third snooze in a row",
    tip: "Too many snoozes have him spiral-eyed, with stars orbiting the comb.",
    wingL: W.out, wingR: mir(W.out), bow: -3,
    eyeL: "spiral", eyeR: "spiral", beak: "o", prop: "orbit",
  },
  {
    key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart eyes, wings folded to his chest, hearts floating off.",
    wingL: W.rest, wingR: mir(W.rest),
    eyeL: "heart", eyeR: "heart", beak: "smile", prop: "hearts",
  },
];
const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Alarm", "Moods"];

/* ---------- face geometry ---------- */
const EYE_L_X = 168, EYE_R_X = 252, EYE_Y = 254;
const HEART_D = "M0,12 C-16,1 -18,-9 -9.5,-14.5 C-4,-18 0,-13 0,-8.5 C0,-13 4,-18 9.5,-14.5 C18,-9 16,1 0,12 Z";

function Eye({ kind, x, p, track, eyeRefs }) {
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
        <circle cx="-3.4" cy="-3.6" r="2.8" fill="#FFF6EA" opacity=".92" />
      </g>
    );
  if (kind === "half")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx="12" ry="16.5" fill={p.features} />
        <rect x="-15" y="-20" width="30" height="17" fill={p.body} />
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
            begin="bd-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      <ellipse cx="0" cy="0" rx={wide ? 14.5 : 12.5} ry={wide ? 21.5 : 17.5} fill={p.features} />
      <g ref={track ? eyeRefs : undefined} className="bd-pupils">
        <circle cx="-3.8" cy="-5.4" r={wide ? 4.4 : 3.8} fill="#FFF6EA" opacity=".95" />
        <circle cx="3.4" cy="3.4" r="1.7" fill="#FFF6EA" opacity=".55" />
      </g>
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    up:    ["M148,222 Q166,211 186,220", "M234,220 Q254,211 272,222"],
    sad:   ["M149,231 Q160,221 185,219", "M235,219 Q260,221 271,231"],
    angry: ["M149,216 Q166,222 187,234", "M233,234 Q254,222 271,216"],
    oneUp: ["M150,228 Q167,224 186,228", "M234,224 Q252,212 270,220"],
  }[kind];
  return (
    <g fill="none" stroke={p.features} strokeWidth="7" strokeLinecap="round">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

/* beak states: the chick's whole mouth */
function Beak({ kind, p }) {
  const seam = { fill: "none", stroke: p.beakDark, strokeWidth: 4, strokeLinecap: "round" };
  if (kind === "open" || kind === "crow") {
    const big = kind === "crow";
    return (
      <g className="bd-pop">
        <path d={big
          ? "M178,288 Q210,300 242,288 Q238,330 210,334 Q182,330 178,288 Z"
          : "M186,290 Q210,298 234,290 Q231,320 210,323 Q189,320 186,290 Z"}
          fill={p.features} />
        <path d={big
          ? "M192,318 Q210,330 228,318 Q210,310 192,318 Z"
          : "M196,313 Q210,321 224,313 Q210,307 196,313 Z"} fill={p.blush} />
        <path d={big ? "M172,290 Q210,252 248,290 Q210,304 172,290 Z"
          : "M180,290 Q210,262 240,290 Q210,301 180,290 Z"} fill={p.beak} />
        <path d={big ? "M176,289 Q210,268 244,289" : "M184,289 Q210,272 236,289"} {...seam} />
      </g>
    );
  }
  if (kind === "openSmile")
    return (
      <g className="bd-pop">
        <path d="M182,288 Q210,320 238,288 Q210,300 182,288 Z" fill={p.features} />
        <path d="M180,290 Q210,262 240,290 Q210,299 180,290 Z" fill={p.beak} />
      </g>
    );
  if (kind === "frown")
    return (
      <g className="bd-pop">
        <path d="M182,296 Q210,272 238,296 Q210,286 182,296 Z" fill={p.beak} />
        <path d="M188,301 Q210,290 232,301" {...seam} strokeWidth="5" />
      </g>
    );
  if (kind === "o")
    return (
      <g className="bd-pop">
        <path d="M182,286 Q210,262 238,286 Q210,296 182,286 Z" fill={p.beak} />
        <ellipse cx="210" cy="302" rx="10" ry="12" fill={p.features} />
      </g>
    );
  /* closed / smile */
  return (
    <g className="bd-pop">
      <path d="M180,290 Q210,262 240,290 Q210,302 180,290 Z" fill={p.beak} />
      <path d="M186,291 Q210,282 234,291" {...seam} />
      {kind === "smile" && (
        <path d="M178,293 Q186,301 196,299 M242,293 Q234,301 224,299" {...seam} strokeWidth="4.5" />
      )}
    </g>
  );
}

/* ---------- props: the signal that removes all doubt ---------- */
const Crescent = ({ p, x, y, s = 0.8, o = 0.92 }) => (
  <path d="M24,6 A15,15 0 1,0 24,34 A11.5,11.5 0 1,1 24,6 Z" fill={p.brass} opacity={o}
    transform={`translate(${x},${y}) scale(${s})`} />
);
const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <path className={cls} transform={`translate(${x},${y}) scale(${s})`} fill={fill}
    style={delay ? { animationDelay: delay } : undefined}
    d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" />
);
const Note = ({ x, y, s = 1, fill, delay }) => (
  <g className="bd-note" transform={`translate(${x},${y}) scale(${s})`} fill={fill}
    style={delay ? { animationDelay: delay } : undefined}>
    <ellipse cx="0" cy="0" rx="6" ry="4.6" transform="rotate(-18)" />
    <path d="M5,-1.5 L5,-22 Q12,-20 15,-14" fill="none" stroke={fill} strokeWidth="3.4"
      strokeLinecap="round" />
  </g>
);

function Props({ g, p }) {
  const A2 = p.brass;
  switch (g.prop) {
    case "sparks":
      return (
        <g>
          <circle cx="252" cy="184" r="4.5" fill={p.belly} opacity=".9" />
          <circle cx="272" cy="160" r="6.5" fill={p.belly} opacity=".9" />
          <Star4 x={306} y={118} s={1.5} fill={A2} cls="bd-twinkle" />
          <Star4 x={338} y={150} s={1} fill={p.belly} cls="bd-twinkle" delay=".35s" />
          <Star4 x={286} y={86} s={0.8} fill={p.comb} cls="bd-twinkle" delay=".7s" />
        </g>
      );
    case "eq":
      return (
        <g fill={A2}>
          {[[52, 20], [68, 34], [84, 14], [336, 14], [352, 34], [368, 20]].map(([x, h], i) => (
            <rect key={i} className="bd-eq" x={x} y={288 - h} width="9" height={h * 2} rx="4.5"
              style={{ animationDelay: `${(i % 3) * 0.18}s` }} />
          ))}
        </g>
      );
    case "speech":
      return (
        <g fill="none" stroke={A2} strokeLinecap="round">
          <path className="bd-ringArc" d="M262,286 Q272,300 262,314" strokeWidth="5" />
          <path className="bd-ringArc" d="M280,276 Q296,300 280,324" strokeWidth="5"
            style={{ animationDelay: ".2s" }} />
          <circle cx="306" cy="300" r="3.4" fill={A2} className="bd-twinkle" />
        </g>
      );
    case "ringFx":
      return (
        <g fill="none" stroke={A2} strokeLinecap="round">
          {/* clangs off both bells */}
          <path className="bd-ringArc" d="M118,414 Q104,438 118,462" strokeWidth="5.5" />
          <path className="bd-ringArc" d="M98,402 Q78,438 98,474" strokeWidth="5"
            style={{ animationDelay: ".16s" }} />
          <path className="bd-ringArc" d="M302,414 Q316,438 302,462" strokeWidth="5.5" />
          <path className="bd-ringArc" d="M322,402 Q342,438 322,474" strokeWidth="5"
            style={{ animationDelay: ".16s" }} />
          {/* startle ticks off the comb */}
          <path d="M150,120 L138,102" strokeWidth="6" stroke={p.comb} />
          <path d="M270,120 L282,102" strokeWidth="6" stroke={p.comb} />
          <path d="M210,104 L210,84" strokeWidth="6" stroke={p.comb} />
        </g>
      );
    case "snoozeFx":
      return (
        <g>
          {/* front wing reaching down to squash the right bell */}
          <path d={`M${SH_R[0]},${SH_R[1]} Q298,340 262,402`} fill="none" stroke={p.wing}
            strokeWidth="34" strokeLinecap="round" />
          <path className="bd-zzz" d="M296,150 L312,150 L296,166 L312,166" fill="none"
            stroke={A2} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    case "crowFx":
      return (
        <g>
          <g fill="none" stroke={A2} strokeLinecap="round">
            <path className="bd-ray" d="M258,240 L292,214" strokeWidth="6" />
            <path className="bd-ray" d="M268,264 L306,252" strokeWidth="5.5"
              style={{ animationDelay: ".2s" }} />
            <path className="bd-ray" d="M266,290 L304,292" strokeWidth="5"
              style={{ animationDelay: ".4s" }} />
          </g>
          <Note x={322} y={188} s={1.15} fill={p.comb} />
          <Note x={352} y={238} s={0.9} fill={A2} delay=".7s" />
          <Note x={330} y={130} s={0.8} fill={p.belly} delay="1.4s" />
        </g>
      );
    case "sun":
      return (
        <g>
          <circle cx="84" cy="88" r="27" fill={A2} />
          <g stroke={A2} strokeWidth="5.5" strokeLinecap="round">
            {[[84, 46, 84, 30], [124, 58, 136, 46], [140, 92, 158, 92],
              [122, 122, 134, 134], [44, 58, 32, 46], [28, 92, 10, 92]].map(([a, b, c, d], i) => (
              <path key={i} className="bd-ray" d={`M${a},${b} L${c},${d}`}
                style={{ animationDelay: `${(i % 3) * 0.25}s` }} />
            ))}
          </g>
          <g className="bd-cloud" fill={p.belly} opacity=".9">
            <ellipse cx="330" cy="96" rx="30" ry="13" />
            <circle cx="314" cy="86" r="12" /><circle cx="338" cy="82" r="15" />
          </g>
        </g>
      );
    case "sleepyFx":
      return (
        <path className="bd-zzz" d="M292,138 L310,138 L292,156 L310,156" fill="none"
          stroke={A2} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      );
    case "nightFx":
      return (
        <g>
          <Crescent p={p} x={64} y={44} s={0.9} />
          <Star4 x={140} y={62} s={0.8} fill={p.belly} cls="bd-twinkle" />
          <Star4 x={330} y={70} s={1} fill={p.belly} cls="bd-twinkle" delay=".5s" />
          <g fill="none" stroke={A2} strokeLinecap="round" strokeLinejoin="round">
            <path className="bd-zzz" d="M282,128 L300,128 L282,146 L300,146" strokeWidth="5" />
            <path className="bd-zzz" d="M312,96 L326,96 L312,110 L326,110" strokeWidth="4.5"
              style={{ animationDelay: ".6s" }} />
            <path className="bd-zzz" d="M334,66 L345,66 L334,77 L345,77" strokeWidth="4"
              style={{ animationDelay: "1.2s" }} />
          </g>
        </g>
      );
    case "confetti":
      return (
        <g>
          {[[128, 92, 0], [252, 78, 0.4], [186, 64, 0.8], [312, 118, 1.2],
            [86, 138, 1.6], [346, 170, 2], [154, 42, 2.4], [284, 40, 2.8]].map(([x, y, d], i) => (
            <rect key={i} className="bd-fall" x={x} y={y} width="9" height="14" rx="2"
              fill={[A2, p.comb, p.belly][i % 3]} style={{ animationDelay: `${d}s` }} />
          ))}
          <Star4 x={110} y={70} fill={p.comb} cls="bd-fall" delay=".6s" s={1.1} />
          <Star4 x={318} y={60} fill={A2} cls="bd-fall" delay="1.8s" s={1.1} />
        </g>
      );
    case "steam":
      return (
        <g fill={p.bellyEdge} opacity=".6">
          <g className="bd-steam">
            <circle cx="132" cy="150" r="11" /><circle cx="146" cy="138" r="8" />
            <circle cx="120" cy="138" r="7" />
          </g>
        </g>
      );
    case "tear":
      return (
        <path className="bd-tear" transform="translate(150,282)" fill="#9AD7EC" opacity=".95"
          d="M0,-13 Q9,-2 9,4 A9,9 0 1,1 -9,4 Q-9,-2 0,-13 Z" />
      );
    case "orbit":
      return (
        <g transform="translate(210,150)">
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            values="0;360" dur="2.6s" repeatCount="indefinite" />
          <Star4 x={46} y={0} fill={A2} s={1.1} />
          <Star4 x={-23} y={-40} fill={p.comb} s={0.9} />
          <Star4 x={-23} y={40} fill={p.belly} s={0.9} />
        </g>
      );
    case "hearts":
      return (
        <g>
          <path className="bd-rise" d={HEART_D} fill={p.comb}
            transform="translate(302,168) scale(1.25)" />
          <path className="bd-rise" d={HEART_D} fill={A2} opacity=".85"
            transform="translate(122,150) scale(0.8)" style={{ animationDelay: ".9s" }} />
        </g>
      );
    default:
      return null;
  }
}

/* ---------- the chick ---------- */
function BudSVG({ p, glow, paused, waving, gesture, svgRef, eyeRefs }) {
  const g = byKey(gesture);
  const isWaving = waving && !!g.track;
  const wingAnim = isWaving
    ? { values: "-8;30;-8", dur: "0.7s" }
    : { values: "-3;3;-3", dur: "3.4s" };
  const look = g.look || [0, 0];

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Bud the alarm chick: ${g.label}`}
      className={`bd-svg bd-g-${gesture} ${isWaving ? "bd-wave-on" : ""}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title>Bud, the dawn alarm chick</title>
      <style>{SVG_CSS}</style>

      <defs>
        <filter id="bd-grain" x="-25%" y="-15%" width="150%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.12 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="gg" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="gg" />
          </feMerge>
        </filter>
        <radialGradient id="bd-glowG" cx="50%" cy="46%" r="60%">
          <stop offset="0" stopColor={p.glowC} stopOpacity=".95" />
          <stop offset="1" stopColor={p.glowC} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <g transform="translate(210,470)">
        <ellipse className="bd-shadowO" cx="0" cy="0" rx="96" ry="9" fill="#000000" />
      </g>

      <g className="bd-float">
        {/* squash-bounce pivots at the bells */}
        <g transform="translate(210,470)">
          {g.shake && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-2 0;2 0;-2 0" dur="0.11s" repeatCount="indefinite" />
          )}
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin="bd-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 8;0 -14;0 3;0 0" keyTimes="0;0.26;0.56;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="bd-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.06 0.9;0.95 1.07;1.02 0.97;1 1" keyTimes="0;0.26;0.56;0.8;1" />
          {/* posture: head thrown back to crow, tilted to listen */}
          <g transform={`rotate(${g.bow || 0})`}>
            <g transform="translate(-210,-470)">
              <g id="bd-hit" filter="url(#bd-grain)">
                {/* dawn halo */}
                <ellipse className="bd-glow" cx="210" cy="280" rx="146" ry="128"
                  fill="url(#bd-glowG)" />

                {/* wings: symmetric shoulders, mirrored paths */}
                <g transform={`translate(${SH_L.join(",")})`}>
                  <animateTransform id="bd-wingAnim" key={isWaving ? "w" : "i"}
                    attributeName="transform" type="rotate" additive="sum"
                    values={wingAnim.values} dur={wingAnim.dur} repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="rotate" additive="sum"
                    begin="bd-hit.click" dur="0.8s" fill="remove"
                    values="0;24;-8;20;0" keyTimes="0;0.3;0.55;0.8;1" />
                  <path d={g.wingL} fill="none" stroke={p.wing}
                    strokeWidth="34" strokeLinecap="round" />
                </g>
                <g transform={`translate(${SH_R.join(",")})`}>
                  <animateTransform attributeName="transform" type="rotate" additive="sum"
                    values="2.5;-2.5;2.5" dur="3.9s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="rotate" additive="sum"
                    begin="bd-hit.click" dur="0.8s" fill="remove"
                    values="0;-24;8;-20;0" keyTimes="0;0.3;0.55;0.8;1" />
                  <path d={g.wingR} fill="none" stroke={p.wing}
                    strokeWidth="34" strokeLinecap="round" />
                </g>

                {/* legs down to the bell feet */}
                <path d="M186,396 L166,420" stroke={p.leg} strokeWidth="7" strokeLinecap="round" />
                <path d="M234,396 L254,420" stroke={p.leg} strokeWidth="7" strokeLinecap="round" />

                {/* striker between the bells; whips when the alarm fires */}
                <g transform="translate(210,404)">
                  {g.ringing && (
                    <animateTransform attributeName="transform" type="rotate" additive="sum"
                      values="-24;24;-24" dur="0.14s" repeatCount="indefinite" />
                  )}
                  <path d="M0,0 L0,24" stroke={p.brassDark} strokeWidth="5" strokeLinecap="round" />
                  <circle cx="0" cy="29" r="6.5" fill={p.brassDark} />
                </g>

                {/* ALARM-BELL FEET: brass domes, knobs, base rims */}
                <g>
                  {g.ringing && (
                    <animateTransform attributeName="transform" type="rotate" additive="sum"
                      values="-4 166 452;4 166 452;-4 166 452" dur="0.16s" repeatCount="indefinite" />
                  )}
                  <circle cx="166" cy="416" r="5.5" fill={p.brassDark} />
                  <path d="M140,450 A26,26 0 0 1 192,450 Z" fill={p.brass} />
                  <path d="M147,436 A19,19 0 0 1 166,424" fill="none" stroke={light(p.brass, 0.4)}
                    strokeWidth="4" strokeLinecap="round" opacity=".8" />
                  <rect x="137" y="448" width="58" height="10" rx="5" fill={p.brassDark} />
                </g>
                <g>
                  {g.ringing && (
                    <animateTransform attributeName="transform" type="rotate" additive="sum"
                      values="4 254 452;-4 254 452;4 254 452" dur="0.16s" repeatCount="indefinite" />
                  )}
                  <circle cx="254" cy="416" r="5.5" fill={p.brassDark} />
                  <path d="M228,450 A26,26 0 0 1 280,450 Z" fill={p.brass} />
                  <path d="M235,436 A19,19 0 0 1 254,424" fill="none" stroke={light(p.brass, 0.4)}
                    strokeWidth="4" strokeLinecap="round" opacity=".8" />
                  <rect x="225" y="448" width="58" height="10" rx="5" fill={p.brassDark} />
                </g>

                {/* round chick body + cream belly */}
                <ellipse cx="210" cy="288" rx="112" ry="120" fill={p.body} />
                <ellipse cx="210" cy="330" rx="72" ry="62" fill={p.belly} />
                {/* tiny feather flick on the crown */}
                <path d="M196,172 Q192,158 200,150 M210,170 Q210,152 218,146" fill="none"
                  stroke={dark(p.body, 0.1)} strokeWidth="5" strokeLinecap="round" opacity="0" />

                {/* rooster comb */}
                <g fill={p.comb}>
                  <circle cx="182" cy="176" r="13" />
                  <circle cx="210" cy="163" r="16" />
                  <circle cx="238" cy="176" r="13" />
                </g>
                <circle cx="205" cy="158" r="4" fill={light(p.comb, 0.35)} opacity=".8" />

                {/* wattle under the beak */}
                <circle cx="201" cy="313" r="6.5" fill={p.comb} />
                <circle cx="219" cy="313" r="6.5" fill={p.comb} />

                {/* blush */}
                <circle cx="140" cy="288" r="11" fill={p.blush} opacity=".55" />
                <circle cx="280" cy="288" r="11" fill={p.blush} opacity=".55" />

                {/* face */}
                <g key={g.key} className="bd-pop" transform={`translate(${look[0]},${look[1]})`}>
                  <Brows kind={g.brow} p={p} />
                  <Eye kind={g.eyeL} x={EYE_L_X} p={p} track={g.track} eyeRefs={eyeRefs.l} />
                  <Eye kind={g.eyeR} x={EYE_R_X} p={p} track={g.track} eyeRefs={eyeRefs.r} />
                </g>
                <g key={`b-${g.key}`}>
                  <Beak kind={g.beak} p={p} />
                </g>

                {/* the prop that removes all doubt */}
                <g key={`p-${g.key}`} className="bd-pop">
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
  feather: "M0,7 Q-5,-2 0,-8 Q5,-2 0,7 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};

/* ============================================================
   POSE SOURCE
   Lets the build snapshot every pose exactly as the studio draws
   it at its defaults, so the remix pipeline edits real markup
   instead of guessing at it. Read by scripts, never by the app.
   ============================================================ */
export const POSE_SOURCE = {
  slug: "bud",
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
    <BudSVG
      p={derive(THEMES.dawn)}
      glow={0.45}
      waving={false}
      gesture={key}
      eyeRefs={{}}
    />
  ),
};

/* ============================================================
   STUDIO SHELL
   ============================================================ */
export default function BudStudio() {
  const [themeKey, setThemeKey] = useState("dawn");
  const [custom, setCustom] = useState({ ...THEMES.dawn, name: "Custom" });
  const [glow, setGlow] = useState(0.45);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [waving, setWaving] = useState(false);
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

  /* honor reduced motion */
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (m.matches) setPaused(true);
    const onC = (e) => e.matches && setPaused(true);
    m.addEventListener?.("change", onC);
    return () => m.removeEventListener?.("change", onC);
  }, []);

  /* SMIL pause/resume */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try { paused ? svg.pauseAnimations() : svg.unpauseAnimations(); } catch (e) { /* noop */ }
  }, [paused, gesture]);

  /* pupil tracking */
  const onTrack = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg || paused || !activeG.track) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 420;
    const sy = ((e.clientY - r.top) / r.height) * 520;
    let dx = sx - 210, dy = sy - 254;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len / 40, 1) * 4.5;
    const t = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
    [pupilL, pupilR].forEach((ref) => { if (ref.current) ref.current.style.transform = t; });
  }, [paused, activeG]);
  useEffect(() => {
    [pupilL, pupilR].forEach((ref) => {
      if (ref.current) ref.current.style.transform = "translate(0,0)";
    });
  }, [gesture]);

  /* tap burst: feathers + stars */
  const delight = useCallback(() => {
    const burst = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const d = 60 + Math.random() * 70;
      return {
        key: Math.random().toString(36).slice(2),
        kind: i % 3 === 0 ? "star" : i % 3 === 1 ? "feather" : "dot",
        dx: Math.cos(a) * d, dy: Math.sin(a) * d - 22,
        color: [p.brass, p.comb, p.belly, light(p.body, 0.2)][i % 4],
        rot: Math.random() * 360,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(() => setSparks((s) => s.filter((k) => !burst.some((b) => b.key === k.key))), 1000);
  }, [p]);

  useEffect(() => {
    if (!["celebrate", "crow"].includes(gesture) || paused) return;
    delight();
    const iv = setInterval(delight, 1500);
    return () => clearInterval(iv);
  }, [gesture, paused, delight]);

  const swatchBg = (t) =>
    `linear-gradient(135deg, ${t.body} 0 55%, ${t.comb} 55% 78%, ${t.brass} 78% 100%)`;

  return (
    <div className="bs-root">
      <style>{SHELL_CSS}</style>

      <header className="max-w-6xl mx-auto px-5 pt-4 pb-2 flex items-center gap-4 sm:pt-6">
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: rgba(AMBER, 0.14),
          border: `1px solid ${rgba(AMBER, 0.4)}`, display: "grid", placeItems: "center",
        }}>
          {/* mini bell mark */}
          <svg viewBox="0 0 40 40" width="30" height="30">
            <path d="M8,28 A12,12 0 0 1 32,28 Z" fill={AMBER} />
            <rect x="6" y="27" width="28" height="5" rx="2.5" fill="#B9822D" />
            <circle cx="20" cy="13" r="3" fill="#B9822D" />
            <path d="M33,12 Q38,20 33,28 M36,7 Q43,20 36,33" stroke={AMBER} strokeWidth="2.6"
              fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="bs-display" style={{ fontSize: 24, fontWeight: 600 }}>
            Bud <span style={{ color: AMBER }}>·</span> Dawn Alarm Chick
          </h1>
          <p style={{ fontSize: 13, color: "#B9AB97" }}>
            Round rooster chick · alarm-bell feet · mascot studio for your AI alarm app
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ---------- stage ---------- */}
        <section className="bs-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="bs-eyebrow">Stage</span>
            <div className="flex gap-2">
              <button className={`bs-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)}>Transparent</button>
              <button className={`bs-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)}>In-app</button>
            </div>
          </div>

          <div
            className={`relative rounded-2xl overflow-hidden ${transparent ? "bs-checker" : ""}`}
            style={{
              background: transparent
                ? "rgba(255,255,255,.02)"
                : `radial-gradient(640px 420px at 50% 118%, ${rgba(theme.body, 0.32)}, transparent 62%), ${theme.stage}`,
              minHeight: 430,
            }}
            onMouseEnter={() => activeG.track && setWaving(true)}
            onMouseLeave={() => setWaving(false)}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 360, padding: "14px 10px 4px" }}>
              <BudSVG
                p={p} glow={glow} paused={paused} waving={waving}
                gesture={gesture} svgRef={svgRef}
                eyeRefs={{ l: pupilL, r: pupilR }}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="bs-spark"
                style={{
                  left: "50%", top: "46%",
                  "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
                }}>
                <svg width="16" height="16" viewBox="-8 -8 16 16"
                  style={{ transform: `rotate(${s.rot}deg)` }}>
                  <path d={SPARK_PATHS[s.kind]} fill={s.color} />
                </svg>
              </span>
            ))}
          </div>

          <p style={{ fontSize: 12.5, color: "#B9AB97", textAlign: "center" }}>
            hover to make him flap &nbsp;·&nbsp; tap for a bounce &amp; feathers &nbsp;·&nbsp; his pupils follow your cursor
          </p>
        </section>

        {/* ---------- controls ---------- */}
        <section className="bs-card p-5 sm:p-6 flex flex-col gap-6">
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="bs-eyebrow">Gesture</span>
              <span style={{ fontSize: 11, color: "#8B7E6C" }}>{GESTURES.length} poses</span>
            </div>
            <div className="flex flex-col gap-2">
              {CATS.map((cat) => (
                <div key={cat}>
                  <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8B7E6C",
                    textTransform: "uppercase", margin: "4px 0 6px 2px" }}>{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.filter((gg) => gg.cat === cat).map((gg) => (
                      <button
                        key={gg.key}
                        title={gg.tip}
                        className={`bs-pill ${gesture === gg.key ? "on" : ""}`}
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
              background: "rgba(255,244,228,.045)", border: `1px solid ${rgba(AMBER, 0.16)}`,
            }}>
              <div className="bs-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C9BBA6", lineHeight: 1.5 }}>{activeG.tip}</p>
            </div>
          </div>

          <div>
            <div className="bs-eyebrow mb-3">Theme</div>
            <div className="flex flex-wrap gap-2 items-center">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={t.name}
                  className={`bs-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button title="Custom"
                className={`bs-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#241503", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="flex gap-4 mt-3">
                {[["body", "Body"], ["comb", "Comb"], ["brass", "Bells"]].map(([k, label]) => (
                  <label key={k} style={{ fontSize: 12, color: "#C9BBA6" }}
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
              <span className="bs-eyebrow">Dawn glow</span>
              <span style={{ fontSize: 12, color: "#C9BBA6" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={glow}
              className="bs-range w-full"
              onChange={(e) => setGlow(parseFloat(e.target.value))} />
          </div>

          <div className="flex items-center justify-between">
            <span className="bs-eyebrow">Motion</span>
            <button className={`bs-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <p style={{ fontSize: 11.5, color: "#8B7E6C", lineHeight: 1.5 }}>
            Examples are for browsing. Build your own to download and export.
          </p>
        </section>
      </main>
    </div>
  );
}
