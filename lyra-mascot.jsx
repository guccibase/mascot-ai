import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";

/* ============================================================
   LYRA — the lyrebird. Mascot for Orator AI, a speech
   coaching app.

   Why a lyrebird: the animal kingdom's best vocal mimic — it
   reproduces any sound it hears, which is what a communication
   coach does. The name nods to the lyre (rhetoric, music) and
   stays short and pronounceable across locales.

   The tail is an INSTRUMENT, not an illustration:
   · exactly NINE feather paths
   · one 0–100 "delivery" input drives every feather's spread
     angle, length and colour
   · colours come from ONE fixed spectrogram ramp — the same
     ramp the product uses for every score, gauge and waveform
     (violet = flat delivery → amber = commanding delivery)
   · the score is spring-animated in JS each frame, so the fan
     sweeps smoothly with zero CSS-transform pitfalls
   · a nine-bar waveform strip under the stage renders from the
     SAME computeFeathers() output — mascot and UI read one
     data source

   Engineering carried over from the other mascots:
   · shape-critical animation is SMIL or per-frame attributes
   · CSS animations are origin-free only (opacity, translate)
   · every gesture is a whole performance: posture, eyes,
     brows, beak, tail behaviour, prop
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
const dark = (c, t) => mix(c, "#0E0A12", t);
const light = (c, t) => mix(c, "#FFF8EC", t);
const rgba = (c, a) => {
  const [r, g, b] = hx(c);
  return `rgba(${r},${g},${b},${a})`;
};

/* ============================================================
   THE SPECTROGRAM RAMP — the product's single source of colour
   truth. Flat delivery sits in violet; commanding delivery
   burns amber. Reuse rampColor() for every gauge & waveform.
   ============================================================ */
const RAMP = ["#41236B", "#7A2D80", "#C23A5F", "#EE7433", "#FFB92E"];
const rampColor = (score) => {
  const s = Math.max(0, Math.min(100, score)) / 100;
  const x = s * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  return mix(RAMP[i], RAMP[i + 1], x - i);
};
const rampCSS = `linear-gradient(90deg, ${RAMP.join(", ")})`;

/* ============================================================
   THE TAIL — nine feathers, one input.
   Feather i (0..8): spread angle, length and colour all derive
   from the animated score. Outer feathers (0 and 8) are the
   lyrebird's signature curled "lyre" pair.
   ============================================================ */
const TAIL_BASE = [210, 362];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function computeFeathers(score) {
  const e = easeOut(Math.max(0, Math.min(100, score)) / 100);
  return Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;                                   // 0 left … 1 right
    const side = (t - 0.5) * 2;                        // -1 left … +1 right
    const sgn = side < 0 ? -1 : 1;
    const magDroop = 180 - Math.abs(side) * 38;        // hanging limp past the mic
    const magSpread = Math.abs(side) * 94;             // proud display arc
    const angle = sgn * (magDroop + (magSpread - magDroop) * e);
    /* inner plumes gather before they fan — and no feather ever
       crosses to the other side, so the sweep stays symmetric */
    const gather = 1 - 0.45 * Math.pow(Math.sin(Math.PI * e), 2) * (1 - Math.abs(side));
    const outer = i === 0 || i === 8;
    const len = (outer ? 132 : 112 + 34 * Math.sin(Math.PI * t)) * (0.62 + 0.42 * e) * gather;
    const color = rampColor(score + (t - 0.5) * 22);
    return { i, t, angle, len, color, outer };
  });
}

/* slender filled plume, drawn pointing up from its base */
const plumeD = (L) =>
  `M0,0 C-5,${-L * 0.3} -6.2,${-L * 0.72} -1.8,${-L} ` +
  `C-0.6,${-L - 3} 0.6,${-L - 3} 1.8,${-L} ` +
  `C6.2,${-L * 0.72} 5,${-L * 0.3} 0,0 Z`;
/* the signature curled lyre feather — an S that hooks inward */
const lyreD = (L, dir) =>
  `M0,0 C${15 * dir},${-L * 0.26} ${19 * dir},${-L * 0.62} ${9 * dir},${-L * 0.86} ` +
  `C${3 * dir},${-L * 1.0} ${-7 * dir},${-L * 1.02} ${-12 * dir},${-L * 0.9}`;

/* ---------- themes: her plumage & stage (ramp never changes) ---------- */
const THEMES = {
  slate:  { name: "Slate Stage",  body: "#3A4757", breast: "#F2E7D6", stage: "#20283A", mic: "#4A4038" },
  night:  { name: "Night Hall",   body: "#333A52", breast: "#EFE3D0", stage: "#181D30", mic: "#403A48" },
  forest: { name: "Forest Green", body: "#3E4B40", breast: "#F0E8D2", stage: "#1F2A22", mic: "#4A4434" },
  plum:   { name: "Plum Velvet",  body: "#4A3A52", breast: "#F2E4DA", stage: "#2A2032", mic: "#443C4E" },
  dune:   { name: "Dune Warm",    body: "#5A5245", breast: "#F6ECD8", stage: "#2E2A22", mic: "#514A3E" },
};
const derive = (t) => ({
  ...t,
  features: "#221A16",
  wing: dark(t.body, 0.16),
  leg: dark(t.body, 0.3),
  crest: dark(t.body, 0.1),
  micDark: dark(t.mic, 0.3),
  micLight: light(t.mic, 0.25),
  blush: "#E8927C",
  beak: "#E8A84B",
  beakDark: dark("#E8A84B", 0.25),
});

/* ---------- studio shell CSS ---------- */
const AMBER = "#F0A93C";
const SHELL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,640&family=Manrope:wght@400;500;600;700&display=swap');
  .ly-root{min-height:100vh;background:#12141F;color:#F1EADB;font-family:'Manrope',sans-serif;
    background-image:radial-gradient(1100px 520px at 50% -170px, rgba(240,169,60,.12), transparent 60%),
      radial-gradient(760px 420px at 90% 112%, rgba(122,45,128,.14), transparent 62%);}
  .ly-display{font-family:'Fraunces',serif;letter-spacing:.005em}
  .ly-card{background:rgba(255,246,230,.04);border:1px solid rgba(240,169,60,.15);
    border-radius:20px;backdrop-filter:blur(8px)}
  .ly-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:${AMBER}}
  .ly-pill{border:1px solid rgba(240,169,60,.28);border-radius:999px;padding:7px 13px;
    font-size:12.5px;font-weight:600;color:#F1EADB;background:transparent;cursor:pointer;
    transition:all .16s ease;line-height:1}
  .ly-pill:hover{border-color:${AMBER};transform:translateY(-1px)}
  .ly-pill.on{background:${AMBER};color:#251603;border-color:${AMBER}}
  .ly-btn{border-radius:12px;padding:10px 16px;font-weight:700;font-size:13.5px;cursor:pointer;
    border:1px solid rgba(240,169,60,.35);color:#251603;background:${AMBER};transition:all .16s}
  .ly-btn:hover{filter:brightness(1.07)}
  .ly-btn.ghost{background:transparent;color:#F1EADB}
  .ly-swatch{width:38px;height:38px;border-radius:12px;cursor:pointer;border:2px solid transparent;
    transition:transform .15s ease}
  .ly-swatch:hover{transform:scale(1.1)}
  .ly-swatch.on{border-color:#FFF4DE}
  .ly-checker{background-image:linear-gradient(45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(-45deg,rgba(255,255,255,.05) 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,rgba(255,255,255,.05) 75%),
    linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.05) 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .ly-range{-webkit-appearance:none;appearance:none;height:10px;border-radius:6px;outline:none;
    background:${rampCSS};cursor:pointer}
  .ly-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;
    border-radius:50%;background:#FFF6E2;border:3px solid #251603;cursor:pointer}
  .ly-range::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#FFF6E2;
    border:3px solid #251603;cursor:pointer}
  .ly-spark{position:absolute;pointer-events:none;animation:ly-spark .95s ease-out forwards}
  @keyframes ly-spark{0%{opacity:0;transform:translate(0,0) scale(.4)}
    18%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
`;

/* ---------- mascot CSS (origin-free animations only) ---------- */
const SVG_CSS = `
  .lv-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .lv-g-proud{--gf:1.35}
  .lv-g-bravo{--gf:1.4}
  .lv-g-rest{--gf:.3}
  .lv-g-oops{--gf:.55}
  .lv-float{animation:lv-float 4s ease-in-out infinite}
  .lv-g-rest .lv-float{animation-duration:7.5s}
  .lv-shadowO{animation:lv-shadowO 4s ease-in-out infinite}
  .lv-glow{animation:lv-glow 3.4s ease-in-out infinite}
  .lv-eyes{transition:transform .12s ease-out}
  .lv-pop{animation:lv-pop .3s ease-out}
  .lv-ring{animation:lv-ring 1.5s ease-out infinite}
  .lv-breath{animation:lv-breath 4.6s ease-in-out infinite}
  .lv-zzz{animation:lv-zzz 3.2s ease-in-out infinite}
  .lv-rise{animation:lv-rise 2.6s ease-out infinite}
  .lv-twinkle{animation:lv-twinkle 1.4s ease-in-out infinite}
  .lv-drop{animation:lv-drop 2.6s ease-in infinite}
  .lv-note{animation:lv-note 2.4s ease-out infinite}
  .lv-tick{animation:lv-tick .55s ease-out infinite}
  .lv-dots{animation:lv-twinkle 1.2s ease-in-out infinite}
  .lv-svg[data-paused] *{animation-play-state:paused !important}
  @keyframes lv-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
  @keyframes lv-shadowO{0%,100%{opacity:.24}50%{opacity:.14}}
  @keyframes lv-glow{0%,100%{opacity:calc(var(--g,.4)*var(--gf,1)*.5)}50%{opacity:calc(var(--g,.4)*var(--gf,1))}}
  @keyframes lv-pop{from{opacity:0}to{opacity:1}}
  @keyframes lv-ring{0%{opacity:.8}70%{opacity:0}100%{opacity:0}}
  @keyframes lv-breath{0%,100%{opacity:.25}45%,60%{opacity:.8}}
  @keyframes lv-zzz{0%{opacity:0;transform:translate(0,8px)}25%{opacity:.95}72%{opacity:.5}100%{opacity:0;transform:translate(12px,-26px)}}
  @keyframes lv-rise{0%{transform:translateY(12px);opacity:0}22%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
  @keyframes lv-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @keyframes lv-drop{0%{opacity:0;transform:translateY(0)}16%{opacity:1}82%{opacity:.85}100%{opacity:0;transform:translateY(46px)}}
  @keyframes lv-note{0%{opacity:0;transform:translate(0,8px)}20%{opacity:1}100%{opacity:0;transform:translate(14px,-40px)}}
  @keyframes lv-tick{0%{opacity:0}25%{opacity:1}100%{opacity:0}}
  .lv-pulse{animation:lv-pulse 1.1s ease-in-out infinite}
  .lv-fall{animation:lv-fall 2.8s linear infinite}
  @keyframes lv-pulse{0%,100%{opacity:.35}50%{opacity:1}}
  @keyframes lv-fall{0%{transform:translateY(-24px);opacity:0}12%{opacity:1}82%{opacity:.9}100%{transform:translateY(150px);opacity:0}}
`;

/* ============================================================
   GESTURE LIBRARY — 22 coaching performances
   score: when set, selecting the gesture retargets the tail
   eq:    feathers pulse like a live equaliser
   ============================================================ */
const GESTURES = [
  /* ------------- core ------------- */
  {
    key: "idle", label: "Idle", cat: "Core", use: "Home · session start",
    tip: "Perched and present — blinks, breathes, eyes follow your cursor. Tail sits at the live score.",
    eyeL: "open", eyeR: "open", beak: "closed", track: true,
  },
  {
    key: "listening", label: "Listening", cat: "Core", use: "While you speak",
    tip: "Head tilted, tail dancing like an equaliser to your voice.",
    bow: 5, eq: true,
    eyeL: "open", eyeR: "open", beak: "closed", prop: "earRings",
  },
  {
    key: "analyzing", label: "Analyzing", cat: "Core", use: "Scoring your take",
    tip: "Reading the take — gaze up, motes ticking while the model listens back.",
    look: [4, -6],
    eyeL: "open", eyeR: "open", brow: "oneUp", beak: "closed", prop: "sparks",
  },
  {
    key: "mimic", label: "Mimic", cat: "Core", use: "Playback · demonstration",
    tip: "Her superpower — she repeats your line: your waveform in grey, hers in amber, note-perfect.",
    eyeL: "arch", eyeR: "open", beak: "open", prop: "mimicFx",
  },
  {
    key: "record", label: "Recording", cat: "Core", use: "Take in progress",
    tip: "Capturing — a red pulse above her, tail reading your voice live.",
    eq: true,
    eyeL: "open", eyeR: "open", beak: "closed", prop: "recDot",
  },
  {
    key: "ready", label: "Ready", cat: "Core", use: "Countdown to record",
    tip: "Poised — three beats light up, then you're on.",
    bow: -2,
    eyeL: "open", eyeR: "open", beak: "closed", prop: "readyDots",
  },
  {
    key: "bravo", label: "Bravo", cat: "Core", use: "Nailed take",
    tip: "Applause — wings meet, sparkles fly, and the tail snaps to full display.",
    score: 100, wings: "clap",
    eyeL: "arch", eyeR: "arch", beak: "smile", prop: "clapFx",
  },

  /* ------------- coaching ------------- */
  {
    key: "breathe", label: "Breathe", cat: "Coaching", use: "Pre-talk calm",
    tip: "Box-breath pacing — a soft ring swells and settles around her; follow it.",
    eyeL: "arch", eyeR: "arch", beak: "closed", prop: "breathFx",
  },
  {
    key: "tempo", label: "Tempo", cat: "Coaching", use: "Pacing drill",
    tip: "A metronome keeps the beat beside her — slow your cadence to the tick.",
    eyeL: "open", eyeR: "open", beak: "closed", look: [5, 0], prop: "metronome",
  },
  {
    key: "warmup", label: "Warm-up", cat: "Coaching", use: "Vocal scales",
    tip: "Do–re–mi — beak parted, a ladder of notes climbing away.",
    eyeL: "arch", eyeR: "arch", beak: "open", prop: "scales",
  },
  {
    key: "fillers", label: "Filler alert", cat: "Coaching", use: '"um" caught — gently',
    tip: "One brow up, a wing raised: pause instead. The dots hang where the um was.",
    wings: "raise",
    eyeL: "open", eyeR: "small", brow: "oneUp", beak: "closed", prop: "dots",
  },

  {
    key: "eyeContact", label: "Eye contact", cat: "Coaching", use: "Gaze drill",
    tip: "Locked in — she holds your gaze inside the frame; hold hers back.",
    eyeL: "wide", eyeR: "wide", beak: "closed", prop: "gazeFrame",
  },
  {
    key: "project", label: "Project", cat: "Coaching", use: "Louder — fill the room",
    tip: "Crescendo — beak open, the wedge widens, arcs carry to the back row.",
    eyeL: "open", eyeR: "open", brow: "up", beak: "open", prop: "crescendo",
  },
  {
    key: "whisper", label: "Soften", cat: "Coaching", use: "Bring it down",
    tip: "Almost a whisper — wing lifted to the beak, the smallest arcs.",
    eyeL: "arch", eyeR: "open", beak: "closed", prop: "hush",
  },
  {
    key: "pause", label: "The pause", cat: "Coaching", use: "Hold the beat",
    tip: "Say nothing — one suspended beat breathing above her, then the reward.",
    wings: "raise",
    eyeL: "sleep", eyeR: "sleep", beak: "closed", prop: "holdBeat",
  },
  {
    key: "timesUp", label: "Time's up", cat: "Coaching", use: "Pitch timer done",
    tip: "Wrap it — the clock hits twelve, two urgent ticks, eyes a touch wide.",
    eyeL: "wide", eyeR: "wide", brow: "up", beak: "closed", look: [5, -2], prop: "clockUp",
  },

  /* ------------- moods ------------- */
  {
    key: "proud", label: "Proud", cat: "Moods", use: "Personal best",
    tip: "Full lyre display — chin up, tail wide and amber, tips sparkling.",
    score: 96, bow: -4,
    eyeL: "arch", eyeR: "arch", beak: "smile", prop: "tipSpark",
  },
  {
    key: "powerPose", label: "Power pose", cat: "Moods", use: "Confidence builder",
    tip: "Wings on hips, chin up, tail at 85 — two minutes of this before you walk on.",
    score: 85, bow: -5, wings: "hips",
    eyeL: "arch", eyeR: "arch", beak: "smile",
  },
  {
    key: "milestone", label: "Milestone", cat: "Moods", use: "Streak · level up",
    tip: "Confetti in ramp colours and a full display — the big one.",
    score: 100, wings: "clap",
    eyeL: "arch", eyeR: "arch", beak: "smile", prop: "confetti",
  },
  {
    key: "encourage", label: "Encourage", cat: "Moods", use: "Mid-streak nudge",
    tip: "A wing extended to you — warm eyes, you've got this.",
    wings: "point",
    eyeL: "arch", eyeR: "open", beak: "smile", prop: "heart",
  },
  {
    key: "oops", label: "Oops", cat: "Moods", use: "Rough take — kindly",
    tip: "Tail settles to violet, one bead of sweat. Coaching, never shaming.",
    score: 16,
    eyeL: "sad", eyeR: "sad", brow: "sad", beak: "frown", prop: "sweat",
  },
  {
    key: "rest", label: "Rest", cat: "Moods", use: "Practice paused",
    tip: "Folded tail, mic off, one drifting Z.",
    score: 6,
    eyeL: "sleep", eyeR: "sleep", beak: "closed", prop: "zzz",
  },
];
const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];
const CATS = ["Core", "Coaching", "Moods"];

/* ---------- face ---------- */
const EYE_L_X = 196, EYE_R_X = 224, EYE_Y = 262;

function Eye({ kind, x, p }) {
  const at = `translate(${x},${EYE_Y})`;
  const line = { fill: "none", stroke: p.features, strokeWidth: 6.5, strokeLinecap: "round" };
  if (kind === "arch") return <path d="M-9.5,2.5 Q0,-9 9.4,2.3" transform={at} {...line} />;
  if (kind === "sleep") return <path d="M-9.5,-2.5 Q0,8.5 9.4,-2.5" transform={at} {...line} />;
  if (kind === "sad")
    return (
      <g transform={at}>
        <ellipse cx="0" cy="1" rx="6.6" ry="8.6" fill={p.features} />
        <circle cx="-2.2" cy="-2.4" r="1.9" fill="#FFF6E4" opacity=".95" />
      </g>
    );
  const small = kind === "small";
  const wide = kind === "wide";
  return (
    <g transform={at}>
      {kind === "open" && (
        <>
          <animateTransform attributeName="transform" type="scale" additive="sum"
            values="1 1;1 1;1 0.07;1 1;1 1" keyTimes="0;0.9;0.923;0.946;1"
            dur="5.1s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="lv-hit.click" dur="0.5s" fill="remove"
            values="1 1;1 0.1;1 1;1 0.1;1 1" keyTimes="0;0.2;0.45;0.7;1" />
        </>
      )}
      <ellipse cx="0" cy="0" rx={small ? 5 : wide ? 9.6 : 7.8}
        ry={small ? 6.4 : wide ? 13.2 : 11} fill={p.features} />
      <circle cx="-2.4" cy="-3.4" r={small ? 1.6 : wide ? 3 : 2.4} fill="#FFF6E4" opacity=".95" />
    </g>
  );
}

function Brows({ kind, p }) {
  if (!kind) return null;
  const d = {
    sad:   ["M184,246 Q191,240 202,239", "M218,239 Q229,240 236,246"],
    oneUp: ["M185,244 Q195,241 205,244", "M216,241 Q226,233 235,238"],
    up:    ["M184,242 Q195,235 206,241", "M214,241 Q225,235 236,242"],
  }[kind];
  return (
    <g fill="none" stroke={p.features} strokeWidth="5" strokeLinecap="round">
      <path d={d[0]} /><path d={d[1]} />
    </g>
  );
}

function Beak({ kind, p }) {
  const seam = { fill: "none", stroke: p.beakDark, strokeWidth: 3, strokeLinecap: "round" };
  if (kind === "open")
    return (
      <g className="lv-pop">
        <path d="M199,281 Q210,286 221,281 Q219,296 210,298 Q201,296 199,281 Z" fill={p.features} />
        <path d="M201,280 Q210,266 219,280 Q210,286 201,280 Z" fill={p.beak} />
        <path d="M203,280 Q210,273 217,280" {...seam} />
      </g>
    );
  if (kind === "frown")
    return (
      <g className="lv-pop">
        <path d="M201,285 Q210,273 219,285 Q210,280 201,285 Z" fill={p.beak} />
        <path d="M203,288 Q210,283 217,288" {...seam} />
      </g>
    );
  return (
    <g className="lv-pop">
      <path d="M201,278 Q210,268 219,278 Q210,290 201,278 Z" fill={p.beak} />
      <path d="M203,279 Q210,275 217,279" {...seam} />
      {kind === "smile" && (
        <path d="M197,281 Q201,286 206,285 M223,281 Q219,286 214,285" {...seam} strokeWidth="2.6" />
      )}
    </g>
  );
}

/* ---------- props ---------- */
const Star4 = ({ x, y, s = 1, fill, cls, delay }) => (
  <path className={cls} transform={`translate(${x},${y}) scale(${s})`} fill={fill}
    style={delay ? { animationDelay: delay } : undefined}
    d="M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z" />
);
const Note = ({ x, y, s = 1, fill, delay }) => (
  <g className="lv-note" transform={`translate(${x},${y}) scale(${s})`} fill={fill}
    style={delay ? { animationDelay: delay } : undefined}>
    <ellipse cx="0" cy="0" rx="5.6" ry="4.3" transform="rotate(-18)" />
    <path d="M4.6,-1.4 L4.6,-19 Q11,-17 13.5,-12" fill="none" stroke={fill} strokeWidth="3"
      strokeLinecap="round" />
  </g>
);
const HEART_D = "M0,10 C-13,1 -15,-7 -8,-11.5 C-3.4,-14.5 0,-10.5 0,-7 C0,-10.5 3.4,-14.5 8,-11.5 C15,-7 13,1 0,10 Z";
const wavePath = (x, y, w, amp) => {
  const seg = w / 6;
  let d = `M${x},${y}`;
  for (let i = 0; i < 6; i++)
    d += ` q${seg / 2},${(i % 2 ? 1 : -1) * amp} ${seg},0`;
  return d;
};

function Props({ g, p, score }) {
  const warm = rampColor(Math.max(score, 62));
  switch (g.prop) {
    case "earRings":
      return (
        <g fill="none" stroke={warm} strokeLinecap="round">
          <path className="lv-ring" d="M156,246 Q146,262 156,278" strokeWidth="4.5" />
          <path className="lv-ring" d="M142,238 Q128,262 142,286" strokeWidth="4"
            style={{ animationDelay: ".4s" }} />
        </g>
      );
    case "sparks":
      return (
        <g>
          <circle cx="242" cy="212" r="3.6" fill={warm} opacity=".9" />
          <circle cx="258" cy="192" r="5" fill={warm} opacity=".9" />
          <Star4 x={288} y={158} s={1.3} fill={warm} cls="lv-twinkle" />
          <Star4 x={314} y={190} s={0.9} fill={RAMP[1]} cls="lv-twinkle" delay=".35s" />
          <Star4 x={268} y={128} s={0.75} fill={RAMP[3]} cls="lv-twinkle" delay=".7s" />
        </g>
      );
    case "mimicFx":
      /* your line in grey — her repeat in ramp-amber, same shape */
      return (
        <g strokeLinecap="round" fill="none">
          <path className="lv-tick" d="M232,286 Q240,296 232,306" stroke={warm} strokeWidth="4" />
          <path d={wavePath(258, 236, 104, 9)} stroke="#9A93A8" strokeWidth="5" opacity=".75" />
          <path d={wavePath(258, 262, 104, 9)} stroke={warm} strokeWidth="5" />
          <circle cx="250" cy="236" r="3" fill="#9A93A8" />
          <circle cx="250" cy="262" r="3" fill={warm} />
        </g>
      );
    case "clapFx":
      return (
        <g className="lv-tick" stroke={warm} strokeWidth="4.5" strokeLinecap="round" fill="none">
          <path d="M210,300 L210,290" /><path d="M188,306 L180,298" />
          <path d="M232,306 L240,298" /><path d="M178,322 L168,320" /><path d="M242,322 L252,320" />
        </g>
      );
    case "breathFx":
      return (
        <g fill="none" stroke={rampColor(48)} strokeWidth="4">
          <circle className="lv-breath" cx="210" cy="316" r="118" />
          <circle className="lv-breath" cx="210" cy="316" r="98" opacity=".5"
            style={{ animationDelay: "2.3s" }} />
        </g>
      );
    case "metronome":
      return (
        <g>
          <path d="M296,306 L336,306 L326,236 L306,236 Z" fill={p.mic}
            stroke={p.micDark} strokeWidth="3" strokeLinejoin="round" />
          <path d="M300,306 L332,306 L334,314 L298,314 Z" fill={p.micDark} />
          <g transform="translate(316,300)">
            <animateTransform attributeName="transform" type="rotate" additive="sum"
              values="-23;23;-23" dur="1.15s" repeatCount="indefinite" />
            <path d="M0,0 L0,-56" stroke={warm} strokeWidth="4" strokeLinecap="round" />
            <circle cx="0" cy="-44" r="6.5" fill={warm} />
          </g>
        </g>
      );
    case "scales":
      return (
        <g>
          <Note x={252} y={244} s={0.95} fill={rampColor(40)} />
          <Note x={282} y={214} s={1.05} fill={rampColor(62)} delay=".7s" />
          <Note x={312} y={184} s={1.15} fill={rampColor(84)} delay="1.4s" />
        </g>
      );
    case "dots":
      return (
        <g>
          <path d="M252,220 Q252,196 280,196 L318,196 Q340,196 340,216 Q340,236 318,236 L286,236 L268,248 L272,236 L280,236"
            fill="none" stroke={p.breast} strokeWidth="4" strokeLinejoin="round" opacity=".85" />
          <circle className="lv-dots" cx="278" cy="216" r="4.2" fill={p.breast} />
          <circle className="lv-dots" cx="296" cy="216" r="4.2" fill={p.breast}
            style={{ animationDelay: ".25s" }} />
          <circle className="lv-dots" cx="314" cy="216" r="4.2" fill={p.breast}
            style={{ animationDelay: ".5s" }} />
        </g>
      );
    case "tipSpark":
      return (
        <g>
          <Star4 x={210} y={176} s={1.1} fill={warm} cls="lv-twinkle" />
          <Star4 x={104} y={238} s={0.9} fill={RAMP[3]} cls="lv-twinkle" delay=".4s" />
          <Star4 x={316} y={238} s={0.9} fill={RAMP[3]} cls="lv-twinkle" delay=".8s" />
        </g>
      );
    case "recDot":
      return (
        <g>
          <circle className="lv-pulse" cx="284" cy="196" r="9" fill="#E5484D" />
          <circle className="lv-ring" cx="284" cy="196" r="16" fill="none"
            stroke="#E5484D" strokeWidth="3" />
        </g>
      );
    case "readyDots":
      return (
        <g>
          <circle className="lv-dots" cx="178" cy="190" r="6" fill={rampColor(30)} />
          <circle className="lv-dots" cx="210" cy="182" r="6" fill={rampColor(60)}
            style={{ animationDelay: ".35s" }} />
          <circle className="lv-dots" cx="242" cy="190" r="6" fill={rampColor(90)}
            style={{ animationDelay: ".7s" }} />
        </g>
      );
    case "gazeFrame":
      return (
        <g stroke={warm} strokeWidth="4.5" strokeLinecap="round" fill="none" opacity=".9">
          <path d="M156,232 L156,220 L170,220" /><path d="M250,220 L264,220 L264,232" />
          <path d="M156,292 L156,304 L170,304" /><path d="M250,304 L264,304 L264,292" />
        </g>
      );
    case "crescendo":
      return (
        <g stroke={warm} strokeLinecap="round" fill="none">
          <path d="M256,268 L318,246 M256,268 L318,290" strokeWidth="5" />
          <path className="lv-ring" d="M262,252 Q274,268 262,284" strokeWidth="4" />
          <path className="lv-ring" d="M282,240 Q300,268 282,296" strokeWidth="4.5"
            style={{ animationDelay: ".3s" }} />
          <path className="lv-ring" d="M304,228 Q328,268 304,308" strokeWidth="5"
            style={{ animationDelay: ".6s" }} />
        </g>
      );
    case "hush":
      return (
        <g>
          <path d="M244,330 Q238,300 224,288" fill="none" stroke={p.wing}
            strokeWidth="16" strokeLinecap="round" />
          <g stroke={rampColor(34)} strokeLinecap="round" fill="none" opacity=".8">
            <path className="lv-ring" d="M186,268 Q182,276 186,284" strokeWidth="3.5" />
            <path className="lv-ring" d="M174,262 Q168,276 174,290" strokeWidth="3"
              style={{ animationDelay: ".45s" }} />
          </g>
        </g>
      );
    case "holdBeat":
      return (
        <g>
          <circle cx="210" cy="192" r="6" fill={warm} />
          <circle className="lv-breath" cx="210" cy="192" r="17" fill="none"
            stroke={warm} strokeWidth="3.5" />
          <Star4 x={242} y={176} s={0.9} fill={warm} cls="lv-twinkle" delay="1.2s" />
        </g>
      );
    case "clockUp":
      return (
        <g>
          <circle cx="296" cy="210" r="22" fill={p.breast} stroke={p.micDark} strokeWidth="3.5" />
          <path d="M296,210 L296,193 M296,210 L305,214" stroke={p.features} strokeWidth="3.5"
            strokeLinecap="round" fill="none" />
          <circle cx="296" cy="210" r="2.6" fill={p.features} />
          <g className="lv-tick" stroke={warm} strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M270,186 L262,178" /><path d="M322,186 L330,178" />
          </g>
        </g>
      );
    case "confetti":
      return (
        <g>
          {[[118, 92, 0], [252, 74, 0.4], [178, 58, 0.8], [306, 108, 1.2],
            [86, 142, 1.6], [336, 156, 2], [148, 40, 2.4], [282, 38, 2.8]].map(([x, y, d], i) => (
            <rect key={i} className="lv-fall" x={x} y={y} width="8" height="13" rx="2"
              fill={rampColor(20 + i * 11)} style={{ animationDelay: `${d}s` }} />
          ))}
          <Star4 x={106} y={70} s={1} fill={rampColor(88)} cls="lv-fall" delay=".6s" />
          <Star4 x={318} y={58} s={1} fill={rampColor(64)} cls="lv-fall" delay="1.8s" />
        </g>
      );
    case "heart":
      return (
        <path className="lv-rise" d={HEART_D} fill={p.blush}
          transform="translate(286,232) scale(1.15)" />
      );
    case "sweat":
      return (
        <path className="lv-drop" transform="translate(246,244)" fill="#9AD7EC" opacity=".95"
          d="M0,-10 Q7,-1.5 7,3.5 A7,7 0 1,1 -7,3.5 Q-7,-1.5 0,-10 Z" />
      );
    case "zzz":
      return (
        <g fill="none" stroke={p.breast} strokeLinecap="round" strokeLinejoin="round" opacity=".9">
          <path className="lv-zzz" d="M258,208 L274,208 L258,224 L274,224" strokeWidth="4.5" />
          <path className="lv-zzz" d="M286,180 L298,180 L286,192 L298,192" strokeWidth="4"
            style={{ animationDelay: ".7s" }} />
        </g>
      );
    default:
      return null;
  }
}

/* ---------- wings ---------- */
const WING_L = [176, 330], WING_R = [244, 330];
const WINGS = {
  rest:  { l: "M0,0 Q-14,10 -14,30", r: "M0,0 Q14,10 14,30" },
  clap:  { l: "M0,0 Q-2,26 22,34", r: "M0,0 Q2,26 -22,34" },
  raise: { l: "M0,0 Q-14,10 -14,30", r: "M0,0 Q22,-8 30,-30" },
  point: { l: "M0,0 Q-14,10 -14,30", r: "M0,0 Q28,2 46,-2" },
  hips:  { l: "M0,0 Q-24,6 -14,28", r: "M0,0 Q24,6 14,28" },
};

/* ============================================================
   LYRA
   ============================================================ */
function LyraSVG({ p, glow, paused, gesture, score, svgRef, eyesRef }) {
  const g = byKey(gesture);
  const feathers = computeFeathers(score);
  const look = g.look || [0, 0];
  const wings = WINGS[g.wings] || WINGS.rest;
  const scoreC = rampColor(score);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Lyra the lyrebird — ${g.label}, delivery ${Math.round(score)}`}
      className={`lv-svg lv-g-${gesture}`}
      style={{ "--g": glow, cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title>Lyra — Orator AI's lyrebird coach</title>
      <style>{SVG_CSS}</style>

      <defs>
        <filter id="lv-grain" x="-25%" y="-15%" width="150%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.1 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="gg" />
          <feMerge>
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="gg" />
          </feMerge>
        </filter>
        <radialGradient id="lv-glowG" cx="50%" cy="46%" r="60%">
          <stop offset="0" stopColor={scoreC} stopOpacity=".8" />
          <stop offset="1" stopColor={scoreC} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* stage shadow */}
      <g transform="translate(210,496)">
        <ellipse className="lv-shadowO" cx="0" cy="0" rx="86" ry="8" fill="#000000" />
      </g>

      <g className="lv-float">
        {/* bounce pivots at the mic base */}
        <g transform="translate(210,492)">
          <animateTransform attributeName="transform" type="translate" additive="sum"
            begin="lv-hit.click" dur="0.6s" fill="remove"
            values="0 0;0 7;0 -12;0 3;0 0" keyTimes="0;0.26;0.56;0.8;1" />
          <animateTransform attributeName="transform" type="scale" additive="sum"
            begin="lv-hit.click" dur="0.6s" fill="remove"
            values="1 1;1.05 0.92;0.96 1.06;1.02 0.98;1 1" keyTimes="0;0.26;0.56;0.8;1" />
          <g transform={`rotate(${g.bow || 0})`}>
            <g transform="translate(-210,-492)">
              <g id="lv-hit" filter="url(#lv-grain)">
                {/* halo — tinted by the live score */}
                <ellipse className="lv-glow" cx="210" cy="300" rx="150" ry="140"
                  fill="url(#lv-glowG)" />

                {/* ============ THE INSTRUMENT ============
                    nine feathers · spread, length & colour all
                    driven by the animated delivery score */}
                <g>
                  {feathers.map((f) => (
                    <g key={f.i}
                      transform={`translate(${TAIL_BASE[0]},${TAIL_BASE[1]}) rotate(${f.angle})`}>
                      <animateTransform attributeName="transform" type="rotate" additive="sum"
                        values="-1.6;1.6;-1.6" dur="3.4s" begin={`${-f.i * 0.37}s`}
                        repeatCount="indefinite" />
                      {g.eq && (
                        <animateTransform attributeName="transform" type="scale" additive="sum"
                          values="1 1;1 1.07;1 1;1 0.96;1 1" dur="0.9s"
                          begin={`${-f.i * 0.11}s`} repeatCount="indefinite" />
                      )}
                      {f.outer ? (
                        <>
                          <path d={lyreD(f.len, f.i === 0 ? -1 : 1)} fill="none"
                            stroke={f.color} strokeWidth="7.5" strokeLinecap="round" />
                          <path d={lyreD(f.len, f.i === 0 ? -1 : 1)} fill="none"
                            stroke={light(f.color, 0.45)} strokeWidth="7.5"
                            strokeLinecap="round" strokeDasharray="5 11" opacity=".85" />
                        </>
                      ) : (
                        <>
                          <path d={plumeD(f.len)} fill={f.color} />
                          <path d={`M0,-6 L0,${-f.len * 0.9}`} stroke={dark(f.color, 0.28)}
                            strokeWidth="2" strokeLinecap="round" />
                        </>
                      )}
                    </g>
                  ))}
                </g>

                {/* microphone perch */}
                <path d="M202,466 L218,466 L222,486 L198,486 Z" fill={p.micDark} />
                <ellipse cx="210" cy="488" rx="34" ry="7" fill={p.mic} />
                <circle cx="210" cy="432" r="33" fill={p.mic} />
                <g stroke={p.micDark} strokeWidth="2.4" opacity=".8">
                  <path d="M182,420 L238,420 M179,432 L241,432 M182,444 L238,444" />
                  <path d="M198,402 L198,462 M210,399 L210,465 M222,402 L222,462" />
                </g>
                <path d="M186,412 A32,32 0 0 1 208,400" fill="none" stroke={p.micLight}
                  strokeWidth="4" strokeLinecap="round" opacity=".8" />

                {/* legs + claws on the grille */}
                <path d="M200,382 L202,402 M198,404 L206,404" stroke={p.leg} strokeWidth="4.5"
                  strokeLinecap="round" fill="none" />
                <path d="M220,382 L218,402 M214,404 L222,404" stroke={p.leg} strokeWidth="4.5"
                  strokeLinecap="round" fill="none" />

                {/* wings behind the body */}
                <g transform={`translate(${WING_L.join(",")})`}>
                  <path d={wings.l} fill="none" stroke={p.wing} strokeWidth="16"
                    strokeLinecap="round" />
                </g>
                <g transform={`translate(${WING_R.join(",")})`}>
                  <animateTransform attributeName="transform" type="rotate" additive="sum"
                    values="1.6;-1.6;1.6" dur="3.8s" repeatCount="indefinite" />
                  <path d={wings.r} fill="none" stroke={p.wing} strokeWidth="16"
                    strokeLinecap="round" />
                </g>

                {/* body + breast + head, one elegant silhouette */}
                <path d="M210,232 C238,232 252,254 252,278 C252,296 244,308 240,322 C236,346 258,352 258,362 C258,384 236,394 210,394 C184,394 162,384 162,362 C162,352 184,346 180,322 C176,308 168,296 168,278 C168,254 182,232 210,232 Z"
                  fill={p.body} />
                <ellipse cx="210" cy="352" rx="30" ry="32" fill={p.breast} />
                {/* crest wisps */}
                <path d="M198,236 Q194,224 200,216 M210,234 Q210,220 217,214" fill="none"
                  stroke={p.crest} strokeWidth="4" strokeLinecap="round" />
                {/* blush */}
                <circle cx="184" cy="276" r="6.5" fill={p.blush} opacity=".55" />
                <circle cx="236" cy="276" r="6.5" fill={p.blush} opacity=".55" />

                {/* face */}
                <g className="lv-eyes" ref={eyesRef}>
                  <g key={g.key} className="lv-pop" transform={`translate(${look[0]},${look[1]})`}>
                    <Brows kind={g.brow} p={p} />
                    <Eye kind={g.eyeL} x={EYE_L_X} p={p} />
                    <Eye kind={g.eyeR} x={EYE_R_X} p={p} />
                  </g>
                </g>
                <g key={`b-${g.key}`}>
                  <Beak kind={g.beak} p={p} />
                </g>

                {/* the prop that removes all doubt */}
                <g key={`p-${g.key}`} className="lv-pop">
                  <Props g={g} p={p} score={score} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ---------- nine-bar strip: the SAME data the tail reads ---------- */
function ScoreWave({ score }) {
  const feathers = computeFeathers(score);
  return (
    <svg viewBox="0 0 220 46" width="164" height="34" aria-hidden="true">
      {feathers.map((f) => (
        <rect key={f.i} x={12 + f.i * 22} y={40 - f.len * 0.24} width="10"
          height={f.len * 0.24 + 2} rx="5" fill={f.color} />
      ))}
    </svg>
  );
}

/* ---------- animated score: JS spring, zero CSS transforms ---------- */
function useAnimatedNumber(target, speed = 5.5) {
  const [v, setV] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    let raf, last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ref.current += (target - ref.current) * Math.min(1, speed * dt);
      if (Math.abs(target - ref.current) < 0.15) {
        ref.current = target; setV(target); return;
      }
      setV(ref.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return v;
}

/* ---------- tap-burst shapes (overlay, never exported) ---------- */
const SPARK_PATHS = {
  star: "M0,-7 L1.9,-1.9 L7,0 L1.9,1.9 L0,7 L-1.9,1.9 L-7,0 L-1.9,-1.9 Z",
  note: "M0,-6 L0,4 A3,3 0 1,1 -1,1 Z",
  dot: "M0,-2.8 A2.8,2.8 0 1,0 0.01,-2.8 Z",
};

/* ============================================================
   STUDIO SHELL
   ============================================================ */
export default function LyraStudio() {
  const [themeKey, setThemeKey] = useState("slate");
  const [custom, setCustom] = useState({ ...THEMES.slate, name: "Custom" });
  const [glow, setGlow] = useState(0.4);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [gesture, setGesture] = useState("idle");
  const [score, setScore] = useState(68);
  const sAnim = useAnimatedNumber(score);
  const [sparks, setSparks] = useState([]);
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);
  const eyesRef = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const theme = themeKey === "custom" ? custom : THEMES[themeKey];
  const p = useMemo(() => derive(theme), [theme]);
  const activeG = byKey(gesture);

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

  const pickGesture = (g) => {
    setGesture(g.key);
    if (g.score != null) setScore(g.score);
  };

  /* eye drift toward the cursor */
  const onTrack = useCallback((e) => {
    const svg = svgRef.current, eyes = eyesRef.current;
    if (!svg || !eyes || paused || !activeG.track) return;
    const r = svg.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * 420;
    const sy = ((e.clientY - r.top) / r.height) * 520;
    let dx = sx - 210, dy = sy - 262;
    const len = Math.hypot(dx, dy) || 1;
    const m = Math.min(len / 46, 1) * 3.5;
    eyes.style.transform = `translate(${(dx / len) * m}px, ${(dy / len) * m}px)`;
  }, [paused, activeG]);
  useEffect(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
  }, [gesture]);

  /* tap burst — notes & sparks in ramp colours */
  const delight = useCallback(() => {
    const burst = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.5;
      const d = 55 + Math.random() * 65;
      return {
        key: Math.random().toString(36).slice(2),
        kind: i % 3 === 0 ? "star" : i % 3 === 1 ? "note" : "dot",
        dx: Math.cos(a) * d, dy: Math.sin(a) * d - 30,
        color: rampColor(20 + Math.random() * 80),
        rot: Math.random() * 360,
      };
    });
    setSparks((s) => [...s, ...burst]);
    later(() => setSparks((s) => s.filter((k) => !burst.some((b) => b.key === k.key))), 1000);
  }, []);

  useEffect(() => {
    if (!["bravo", "proud", "milestone"].includes(gesture) || paused) return;
    delight();
    const iv = setInterval(delight, 1600);
    return () => clearInterval(iv);
  }, [gesture, paused, delight]);

  /* export */
  const buildExport = useCallback(() => {
    const node = svgRef.current.cloneNode(true);
    node.setAttribute("class", `lv-svg lv-g-${gesture}`);
    node.setAttribute("width", "420");
    node.setAttribute("height", "520");
    node.removeAttribute("data-paused");
    const eyes = node.querySelector(".lv-eyes");
    if (eyes) eyes.style.transform = "";
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      new XMLSerializer().serializeToString(node);
  }, [gesture]);

  const downloadSVG = useCallback(() => {
    const blob = new Blob([buildExport()], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lyra-${gesture}-${Math.round(score)}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildExport, gesture, score]);

  const copySVG = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildExport());
      setCopied(true);
      later(() => setCopied(false), 1400);
    } catch (e) { /* clipboard unavailable */ }
  }, [buildExport]);

  const zone = score < 34 ? "Flat" : score < 67 ? "Building" : "Commanding";
  const swatchBg = (t) =>
    `linear-gradient(135deg, ${t.body} 0 62%, ${t.breast} 62% 82%, ${t.mic} 82% 100%)`;

  return (
    <div className="ly-root">
      <style>{SHELL_CSS}</style>

      <header className="max-w-6xl mx-auto px-5 pt-8 pb-2 flex items-center gap-4">
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: rgba(AMBER, 0.13),
          border: `1px solid ${rgba(AMBER, 0.4)}`, display: "grid", placeItems: "center",
        }}>
          {/* mini lyre-fan mark */}
          <svg viewBox="0 0 40 40" width="30" height="30">
            {[-2, -1, 0, 1, 2].map((k) => (
              <path key={k} d="M0,0 L0,-15" stroke={rampColor(50 + k * 12)} strokeWidth="3"
                strokeLinecap="round" transform={`translate(20,32) rotate(${k * 26})`} />
            ))}
            <circle cx="20" cy="33" r="4.5" fill="#F1EADB" />
          </svg>
        </div>
        <div>
          <h1 className="ly-display" style={{ fontSize: 24, fontWeight: 640 }}>
            Lyra <span style={{ color: AMBER }}>·</span> Orator AI
          </h1>
          <p style={{ fontSize: 13, color: "#B5AC9A" }}>
            The lyrebird speech coach — her tail is the product's waveform
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* ---------- stage ---------- */}
        <section className="ly-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="ly-eyebrow">Stage</span>
            <div className="flex gap-2">
              <button className={`ly-pill ${transparent ? "on" : ""}`}
                onClick={() => setTransparent(true)}>Transparent</button>
              <button className={`ly-pill ${!transparent ? "on" : ""}`}
                onClick={() => setTransparent(false)}>In-app</button>
            </div>
          </div>

          <div
            className={`relative rounded-2xl overflow-hidden ${transparent ? "ly-checker" : ""}`}
            style={{
              background: transparent
                ? "rgba(255,255,255,.02)"
                : `radial-gradient(640px 430px at 50% 120%, ${rgba(rampColor(score), 0.22)}, transparent 62%), ${theme.stage}`,
              minHeight: 440,
            }}
            onPointerMove={onTrack}
            onPointerDown={delight}
          >
            <div className="mx-auto" style={{ maxWidth: 350, padding: "10px 10px 0" }}>
              <LyraSVG
                p={p} glow={glow} paused={paused}
                gesture={gesture} score={sAnim}
                svgRef={svgRef} eyesRef={eyesRef}
              />
            </div>
            {sparks.map((s) => (
              <span key={s.key} className="ly-spark"
                style={{ left: "50%", top: "52%", "--dx": `${s.dx}px`, "--dy": `${s.dy}px` }}>
                <svg width="15" height="15" viewBox="-8 -8 16 16"
                  style={{ transform: `rotate(${s.rot}deg)` }}>
                  <path d={SPARK_PATHS[s.kind]} fill={s.color} />
                </svg>
              </span>
            ))}
            {/* the same nine values, rendered as the product's waveform */}
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 8,
              display: "flex", justifyContent: "center", pointerEvents: "none",
            }}>
              <ScoreWave score={sAnim} />
            </div>
          </div>

          <p style={{ fontSize: 12.5, color: "#B5AC9A", textAlign: "center" }}>
            drag Delivery — the tail and the strip read the same nine values &nbsp;·&nbsp;
            tap — bounce &amp; notes &nbsp;·&nbsp; her eyes follow your cursor
          </p>
        </section>

        {/* ---------- controls ---------- */}
        <section className="ly-card p-5 sm:p-6 flex flex-col gap-6">
          {/* THE instrument control */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <span className="ly-eyebrow">Delivery</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: rampColor(score) }}>
                {Math.round(score)} · {zone}
              </span>
            </div>
            <input type="range" min="0" max="100" step="1" value={score}
              className="ly-range w-full"
              onChange={(e) => setScore(parseInt(e.target.value, 10))} />
            <div className="flex justify-between" style={{ fontSize: 10.5, color: "#8D8472", marginTop: 5 }}>
              <span>Flat · violet</span><span>Building</span><span>Commanding · amber</span>
            </div>
            <p style={{ fontSize: 11.5, color: "#8D8472", marginTop: 7, lineHeight: 1.5 }}>
              One 0–100 input drives all nine feathers' spread, length and colour — on the same
              spectrogram ramp as every score, gauge and waveform in Orator.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-3">
              <span className="ly-eyebrow">Gesture</span>
              <span style={{ fontSize: 11, color: "#8D8472" }}>{GESTURES.length} poses</span>
            </div>
            <div className="flex flex-col gap-2">
              {CATS.map((cat) => (
                <div key={cat}>
                  <div style={{ fontSize: 10, letterSpacing: ".16em", color: "#8D8472",
                    textTransform: "uppercase", margin: "4px 0 6px 2px" }}>{cat}</div>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.filter((gg) => gg.cat === cat).map((gg) => (
                      <button
                        key={gg.key}
                        title={gg.tip}
                        className={`ly-pill ${gesture === gg.key ? "on" : ""}`}
                        onClick={() => pickGesture(gg)}
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
              <div className="ly-eyebrow" style={{ fontSize: 10, marginBottom: 4 }}>
                {activeG.use}
              </div>
              <p style={{ fontSize: 12.5, color: "#C6BCA7", lineHeight: 1.5 }}>{activeG.tip}</p>
            </div>
          </div>

          <div>
            <div className="ly-eyebrow mb-3">Theme <span style={{ color: "#8D8472",
              textTransform: "none", letterSpacing: 0 }}>— plumage only; the ramp is brand-fixed</span></div>
            <div className="flex flex-wrap gap-2 items-center">
              {Object.entries(THEMES).map(([k, t]) => (
                <button key={k} title={t.name}
                  className={`ly-swatch ${themeKey === k ? "on" : ""}`}
                  style={{ background: swatchBg(t) }}
                  onClick={() => setThemeKey(k)} />
              ))}
              <button title="Custom"
                className={`ly-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBg(custom), display: "grid", placeItems: "center",
                  color: "#251603", fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}>+</button>
            </div>
            {themeKey === "custom" && (
              <div className="flex gap-4 mt-3">
                {[["body", "Plumage"], ["breast", "Breast"], ["mic", "Mic"]].map(([k, label]) => (
                  <label key={k} style={{ fontSize: 12, color: "#C6BCA7" }}
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
              <span className="ly-eyebrow">Spotlight</span>
              <span style={{ fontSize: 12, color: "#C6BCA7" }}>{Math.round(glow * 100)}%</span>
            </div>
            <input type="range" min="0" max="1" step="0.05" value={glow}
              className="ly-range w-full" style={{ background: "#3A3548" }}
              onChange={(e) => setGlow(parseFloat(e.target.value))} />
          </div>

          <div className="flex items-center justify-between">
            <span className="ly-eyebrow">Motion</span>
            <button className={`ly-pill ${paused ? "" : "on"}`}
              onClick={() => setPaused((v) => !v)}>
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <div className="flex gap-3">
            <button className="ly-btn flex-1" onClick={downloadSVG}>Download SVG</button>
            <button className="ly-btn ghost flex-1" onClick={copySVG}>
              {copied ? "Copied ✓" : "Copy SVG code"}
            </button>
          </div>
          <p style={{ fontSize: 11.5, color: "#8D8472", lineHeight: 1.5 }}>
            Exports the selected pose at the current delivery score — the filename carries both,
            one file per app state.
          </p>
        </section>
      </main>
    </div>
  );
}
