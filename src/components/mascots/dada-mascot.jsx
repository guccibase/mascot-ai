"use client";

/**
 * DADA: a bright-eyed rose who blooms with every little joy.
 *
 * Pink rose head, cream flower face, green stem and leaf bow, stick limbs for
 * wave/point/clap, and a Rose Radiance meter. Full 37-gesture set.
 */

const ACCENT = "#E63956";

const THEMES = {
  primary: {
    name: "Rosy Dada",
    top: "#F45B78",
    mid: "#E63956",
    base: "#2F9E57",
    core: "#FFD6A5",
    stage: "#FFF4F6",
    features: "#321E26",
  },
  garden: {
    name: "Garden Party",
    top: "#FF7A94",
    mid: "#E84B6A",
    base: "#3BB06A",
    core: "#FFE2B8",
    stage: "#FFF0F3",
    features: "#3A2430",
  },
  dusk: {
    name: "Dusk Bloom",
    top: "#C94A68",
    mid: "#A91F3D",
    base: "#1F7A4A",
    core: "#FFC9A0",
    stage: "#1A1418",
    features: "#1A1014",
  },
};

/** @type {import("@/lib/types").StudioInstrument} */
const INSTRUMENT = {
  label: "Rose Radiance",
  description:
    "Controls how brightly Dada's rosy personality blooms, from a quiet bud to a full celebratory spark trail.",
  lowLabel: "Bud",
  midLabel: "Blossom",
  highLabel: "Full Bloom",
  defaultValue: 68,
  hidden: false,
  ramp: ["#FFD6DE", "#FF9CAF", "#F45B78", "#E63956", "#A91F3D"],
};

/* Limb end targets relative to shoulder joints. */
const A = {
  restL: "M145 307Q120 334 132 360",
  restR: "M275 307Q300 334 288 360",
  waveL: "M145 307Q105 280 92 230",
  waveR: "M275 307Q299 333 288 359",
  upL: "M145 307Q118 250 110 210",
  upR: "M275 307Q302 250 310 210",
  pointL: "M145 307Q95 300 70 285",
  pointR: "M275 307Q325 300 350 285",
  droopL: "M145 307Q130 350 140 390",
  droopR: "M275 307Q290 350 280 390",
  shrugL: "M145 307Q120 290 105 275",
  shrugR: "M275 307Q300 290 315 275",
  clapL: "M145 307Q185 320 200 340",
  clapR: "M275 307Q235 320 220 340",
  writeL: "M145 307Q170 340 195 350",
  writeR: "M275 307Q250 340 225 350",
  chinL: "M145 307Q165 280 185 255",
  flyL: "M145 307Q105 287 74 261",
  flyR: "M275 307Q324 278 356 242",
  runL: "M145 307Q110 320 95 350",
  runR: "M275 307Q310 290 330 260",
  palmL: "M145 307Q175 260 195 230",
};

const SVG_CSS = `
  .ms-root{display:block;user-select:none;-webkit-user-select:none;
    --ms-top:#F45B78;--ms-mid:#E63956;--ms-base:#2F9E57;--ms-core:#FFD6A5;
    --ms-stage:#FFF4F6;--ms-features:#321E26;--ms-accent:${ACCENT};
    --ms-glow:.45;--gf:1}
  .dd-g-alarm{--gf:1.75}
  .dd-g-celebrate,.dd-g-success,.dd-g-flying{--gf:1.45}
  .dd-g-proud,.dd-g-love,.dd-g-happy{--gf:1.25}
  .dd-g-grumpy,.dd-g-sad{--gf:.65}
  .dd-g-crying,.dd-g-empty,.dd-g-sleepy{--gf:.48}
  .dd-float{animation:dd-float 3.4s ease-in-out infinite}
  .dd-g-sleepy .dd-float,.dd-g-waiting .dd-float{animation-duration:6s}
  .dd-g-celebrate .dd-float,.dd-g-dancing .dd-float{animation:dd-dance 1.15s ease-in-out infinite}
  .dd-g-running .dd-float{animation:dd-run .32s ease-in-out infinite}
  .dd-g-flying .dd-float{animation:dd-soar 1.35s ease-in-out infinite}
  .dd-g-alarm .dd-float{animation:dd-shake .12s ease-in-out infinite}
  .dd-shadow{animation:dd-shadow 3.4s ease-in-out infinite}
  .dd-g-flying .dd-shadow{opacity:.1;animation:none;transform:scaleX(.55)}
  .dd-g-running .dd-shadow{animation:dd-runShadow .32s ease-in-out infinite}
  .ms-glow-halo{animation:dd-glow 3s ease-in-out infinite;opacity:calc(.18 + var(--ms-glow) * .72 * var(--gf))}
  .dd-g-alarm .ms-glow-halo{animation-duration:.85s}
  .dd-pop{animation:dd-pop .28s ease-out}
  .dd-drift{animation:dd-drift 2.4s ease-out infinite}
  .dd-spin{animation:dd-spin 1.4s linear infinite;transform-box:fill-box;transform-origin:center}
  .dd-pulse{animation:dd-pulse 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  .dd-twinkle{animation:dd-twinkle 1.5s ease-in-out infinite}
  .dd-tear{animation:dd-tear 2.6s ease-in infinite}
  .dd-rise{animation:dd-rise 2.3s ease-out infinite}
  .ms-eyes{transition:transform .12s ease-out}
  .ms-root[data-paused] *{animation-play-state:paused!important}
  @keyframes dd-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes dd-dance{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(4deg) translateY(-12px)}}
  @keyframes dd-run{0%,100%{transform:translate(5px,2px) rotate(-2deg)}50%{transform:translate(-4px,-10px) rotate(3deg)}}
  @keyframes dd-soar{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-20px) rotate(2deg)}}
  @keyframes dd-shake{0%,100%{transform:translate(-2px,0)}50%{transform:translate(2px,0)}}
  @keyframes dd-shadow{0%,100%{transform:scaleX(1);opacity:.16}50%{transform:scaleX(.9);opacity:.12}}
  @keyframes dd-runShadow{0%,100%{transform:translateX(6px) scaleX(.95)}50%{transform:translateX(-4px) scaleX(.85)}}
  @keyframes dd-glow{0%,100%{opacity:calc(.18 + var(--ms-glow) * .55 * var(--gf))}50%{opacity:calc(.18 + var(--ms-glow) * .9 * var(--gf))}}
  @keyframes dd-pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
  @keyframes dd-drift{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
  @keyframes dd-spin{to{transform:rotate(360deg)}}
  @keyframes dd-pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
  @keyframes dd-twinkle{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes dd-tear{0%{opacity:0;transform:translateY(0)}18%{opacity:1}85%{opacity:.8}100%{opacity:0;transform:translateY(40px)}}
  @keyframes dd-rise{0%{opacity:0;transform:translateY(10px)}22%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}
  @media (prefers-reduced-motion:reduce){.ms-root *{animation:none!important}}
`;

const STAR = "M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z";
const HEART = "M0 8 C-10 0 -11 -7 -4.5 -9 C-1.5 -10 0 -6.5 0 -4.5 C0 -6.5 1.5 -10 4.5 -9 C11 -7 10 0 0 8 Z";

const GESTURES = [
  { key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Soft bob, blink, and a gentle rose sway.",
    armL: A.restL, armR: A.restR, eye: "open", mouth: "smile", track: true, prop: "petal", signal: 68 },
  { key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "Left limb flaps high with a friendly hello.",
    armL: A.waveL, armR: A.waveR, wave: true, eye: "open", mouth: "grin", brow: "up", prop: "spark", signal: 82 },
  { key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased eyes and a warm cream-face grin.",
    armL: A.upL, armR: A.upR, eye: "arch", mouth: "grin", prop: "bloom", signal: 86 },
  { key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "Gaze drifts up while a petal mote spins overhead.",
    armL: A.chinL, armR: A.restR, eye: "open", mouth: "flat", brow: "oneUp", look: [2, -5], prop: "think", signal: 58 },
  { key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with soft focus as radiance bars breathe.",
    armL: A.restL, armR: A.restR, lean: 4, eye: "open", mouth: "tiny", prop: "listen", signal: 64 },
  { key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with soft speech arcs of rose light.",
    armL: A.pointL, armR: A.restR, eye: "open", mouth: "talk", brow: "up", prop: "speech", signal: 74 },
  { key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "Left limb out, directing attention to the next step.",
    armL: A.pointL, armR: A.restR, eye: "open", mouth: "smile", brow: "up", look: [-5, -2], prop: "point", signal: 72 },
  { key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Limbs tuck in while a tiny petal notepad gets a caret blink.",
    armL: A.writeL, armR: A.writeR, eye: "open", mouth: "flat", look: [0, 4], prop: "pad", signal: 60 },

  { key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Arms up and rose stars raining after a win.",
    armL: A.upL, armR: A.upR, eye: "arch", mouth: "grin", prop: "confetti", signal: 92 },
  { key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart eyes with soft hearts floating off the petals.",
    armL: A.shrugL, armR: A.shrugR, eye: "heart", mouth: "smile", prop: "hearts", signal: 88 },
  { key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Soft eyes and a gentle droop. Never mean about it.",
    armL: A.droopL, armR: A.droopR, eye: "open", mouth: "frown", brow: "sad", look: [0, 3], signal: 42 },
  { key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Tears on the cream face. Bigger sorrow than sad.",
    armL: A.droopL, armR: A.droopR, eye: "cry", mouth: "frown", brow: "sad", prop: "tears", signal: 38 },
  { key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, small pout. The thorn side of the rose.",
    armL: A.restL, armR: A.restR, lean: 3, eye: "flat", mouth: "frown", brow: "angry", prop: "steam", signal: 44 },
  { key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a soft Z drifting off a petal.",
    armL: A.droopL, armR: A.droopR, eye: "half", mouth: "tiny", prop: "zzz", signal: 36 },
  { key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up, bright bloom, limbs open wide.",
    armL: A.pointL, armR: A.pointR, eye: "open", mouth: "grin", brow: "up", prop: "proud", signal: 90 },
  { key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile, one limb up, a dropped petal. Soft fail.",
    armL: A.upL, armR: A.restR, eye: "open", mouth: "wry", brow: "oneUp", look: [3, 2], prop: "oops", signal: 52 },
  { key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Wide eyes and a small jump. Something bloomed unexpectedly.",
    armL: A.pointL, armR: A.pointR, eye: "wide", mouth: "o", brow: "up", prop: "spark", signal: 84 },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "A soft kiss blown toward the viewer on a rose heart.",
    armL: A.chinL, armR: A.restR, eye: "arch", mouth: "kiss", brow: "up", look: [5, -2], prop: "kiss", signal: 80 },
  { key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "Limb flat against the cream face over a classic slip.",
    armL: A.palmL, armR: A.droopR, eye: "flat", mouth: "wry", brow: "sad", signal: 48 },
  { key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "Limbs swinging and body swaying after a streak hit.",
    armL: A.upL, armR: A.pointR, sway: true, eye: "arch", mouth: "grin", prop: "notes", signal: 88 },

  { key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes, ringing energy, whole bloom rattling.",
    armL: A.pointL, armR: A.pointR, shake: true, eye: "wide", mouth: "o", brow: "up", prop: "alarm", signal: 94 },
  { key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Limbs open and a warm face. You've got this.",
    armL: A.pointL, armR: A.pointR, eye: "open", mouth: "grin", brow: "up", prop: "encourage", signal: 78 },
  { key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "A magnifier of rose light, scanning for the next clue.",
    armL: A.pointL, armR: A.restR, eye: "open", mouth: "flat", brow: "oneUp", look: [-6, -3], prop: "search", signal: 62 },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "Left limb curled into a clear yes.",
    armL: A.upL, armR: A.restR, eye: "arch", mouth: "grin", prop: "yes", signal: 84 },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Left limb tipped down. Try another path.",
    armL: A.droopL, armR: A.restR, eye: "flat", mouth: "frown", brow: "sad", prop: "no", signal: 40 },
  { key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Limbs up, unsure. A little lost in the garden.",
    armL: A.shrugL, armR: A.shrugR, eye: "open", mouth: "flat", brow: "oneUp", prop: "question", signal: 50 },
  { key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Focused busy posture with a tiny bloom checklist.",
    armL: A.writeL, armR: A.writeR, eye: "open", mouth: "flat", look: [0, 3], prop: "work", signal: 66 },
  { key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Mid-sprint energy, limbs pumping, dust kicking up.",
    armL: A.runL, armR: A.runR, lean: 12, look: [10, -2], eye: "wide", mouth: "o", brow: "up", prop: "speed", signal: 76 },
  { key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Superman cape and a rose trail. Lifted and soaring.",
    armL: A.flyL, armR: A.flyR, lift: -56, cape: true, eye: "wide", mouth: "o", brow: "up", look: [0, -5], prop: "trail", signal: 90 },
  { key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "Left limb raised and waiting for your palm.",
    armL: A.upL, armR: A.restR, eye: "arch", mouth: "grin", prop: "highFive", signal: 86 },
  { key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Limbs meeting mid-clap for a job well done.",
    armL: A.clapL, armR: A.clapR, clap: true, eye: "arch", mouth: "grin", brow: "up", prop: "clap", signal: 85 },

  { key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Crooked mouth, uneven eyes, a question petal hovering.",
    armL: A.chinL, armR: A.shrugR, lean: -3, eye: "uneven", mouth: "wry", brow: "oneUp", prop: "question", signal: 46 },
  { key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "Clear win pose with a bright check in the rose glow.",
    armL: A.upL, armR: A.upR, eye: "arch", mouth: "grin", prop: "success", signal: 93 },
  { key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert. Concerned, not scary.",
    armL: A.pointL, armR: A.pointR, eye: "wide", mouth: "o", brow: "up", prop: "error", signal: 54 },
  { key: "empty", label: "Empty", cat: "Feedback", use: "Empty state",
    tip: "Gentle nothing here yet. A wilted petal mote.",
    armL: A.droopL, armR: A.droopR, eye: "open", mouth: "tiny", brow: "sad", prop: "empty", signal: 34 },
  { key: "loading", label: "Loading", cat: "Feedback", use: "In progress",
    tip: "Soft wait with a spinning petal mote beside the head.",
    armL: A.restL, armR: A.restR, eye: "open", mouth: "flat", prop: "loading", signal: 56 },
  { key: "waiting", label: "Waiting", cat: "Feedback", use: "Queued · hold on",
    tip: "Patient pause, eyes soft, three rose dots breathing.",
    armL: A.clapL, armR: A.clapR, eye: "half", mouth: "tiny", prop: "waiting", signal: 48 },
];

const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];

function Brows({ kind }) {
  if (!kind) {
    return (
      <g data-ms-part="brows">
        <path d="M162 181Q181 169 200 180" fill="none" stroke="var(--ms-features)" strokeWidth="6" strokeLinecap="round" />
        <path d="M220 180Q239 169 258 181" fill="none" stroke="var(--ms-features)" strokeWidth="6" strokeLinecap="round" />
      </g>
    );
  }
  const stroke = { fill: "none", stroke: "var(--ms-features)", strokeWidth: 6, strokeLinecap: "round" };
  if (kind === "up") {
    return (
      <g data-ms-part="brows">
        <path d="M162 176Q181 164 200 175" {...stroke} />
        <path d="M220 175Q239 164 258 176" {...stroke} />
      </g>
    );
  }
  if (kind === "oneUp") {
    return (
      <g data-ms-part="brows">
        <path d="M162 182Q181 176 200 182" {...stroke} />
        <path d="M220 172Q239 162 258 174" {...stroke} />
      </g>
    );
  }
  if (kind === "sad") {
    return (
      <g data-ms-part="brows">
        <path d="M162 174Q181 184 200 180" {...stroke} />
        <path d="M220 180Q239 184 258 174" {...stroke} />
      </g>
    );
  }
  if (kind === "angry") {
    return (
      <g data-ms-part="brows">
        <path d="M162 176Q181 182 200 178" {...stroke} />
        <path d="M220 178Q239 182 258 176" {...stroke} />
      </g>
    );
  }
  return null;
}

function Eyes({ kind, look = [0, 0] }) {
  const [lx, ly] = look;
  if (kind === "arch") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <path d="M161 214 Q181 192 201 214" fill="none" stroke="var(--ms-features)" strokeWidth="8" strokeLinecap="round" />
        <path d="M219 214 Q239 192 259 214" fill="none" stroke="var(--ms-features)" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "heart") {
    return (
      <g className="ms-eyes" data-ms-part="eyes" fill="#E63956">
        <g transform="translate(181 214)">
          <path transform="scale(1.15)" d={HEART} />
        </g>
        <g transform="translate(239 214)">
          <path transform="scale(1.15)" d={HEART} />
        </g>
      </g>
    );
  }
  if (kind === "cry") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <g data-ms-part="eye-whites" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="5">
          <ellipse cx="181" cy="211" rx="20" ry="20" />
          <ellipse cx="239" cy="211" rx="20" ry="20" />
        </g>
        <g data-ms-part="pupils" fill="var(--ms-features)">
          <ellipse cx="186" cy="218" rx="9" ry="8" />
          <ellipse cx="244" cy="218" rx="9" ry="8" />
        </g>
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <path d="M161 211 L201 211" stroke="var(--ms-features)" strokeWidth="8" strokeLinecap="round" />
        <path d="M219 211 L259 211" stroke="var(--ms-features)" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "half") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <path d="M161 208 Q181 222 201 208" fill="none" stroke="var(--ms-features)" strokeWidth="7" strokeLinecap="round" />
        <path d="M219 208 Q239 222 259 208" fill="none" stroke="var(--ms-features)" strokeWidth="7" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "uneven") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <g data-ms-part="eye-whites" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="5">
          <ellipse cx="181" cy="208" rx="20" ry="28" />
          <ellipse cx="239" cy="214" rx="20" ry="18" />
        </g>
        <g data-ms-part="pupils" fill="var(--ms-features)" transform={`translate(${lx},${ly})`}>
          <ellipse cx="186" cy="214" rx="9" ry="12" />
          <ellipse cx="244" cy="216" rx="9" ry="8" />
        </g>
      </g>
    );
  }
  const ry = kind === "wide" ? 30 : 25;
  const cy = kind === "wide" ? 208 : 211;
  return (
    <g className="ms-eyes" data-ms-part="eyes">
      <g data-ms-part="eye-whites" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="5">
        <ellipse cx="181" cy={cy} rx="20" ry={ry} />
        <ellipse cx="239" cy={cy} rx="20" ry={ry} />
        <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1 .08;1 1;1 1" keyTimes="0;.91;.94;.97;1" dur="4.8s" repeatCount="indefinite" additive="sum" />
      </g>
      <g data-ms-part="pupils" fill="var(--ms-features)" transform={`translate(${lx},${ly})`}>
        <ellipse cx="186" cy={cy + 4} rx="9" ry="12" />
        <ellipse cx="244" cy={cy + 4} rx="9" ry="12" />
        {kind === "open" && (
          <animateTransform attributeName="transform" type="translate" values="0 0;3 1;0 0;-3 1;0 0" dur="6s" repeatCount="indefinite" />
        )}
      </g>
      <g data-ms-part="eye-highlights" fill="#FFFFFF">
        <circle cx="182" cy={cy - 4} r="3.5" />
        <circle cx="240" cy={cy - 4} r="3.5" />
      </g>
    </g>
  );
}

function Mouth({ kind }) {
  const common = { fill: "none", stroke: "var(--ms-features)", strokeWidth: 7, strokeLinecap: "round" };
  if (kind === "grin") {
    return (
      <g data-ms-part="mouth">
        <path d="M185 250Q210 278 235 250Q210 260 185 250Z" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="6" strokeLinejoin="round" />
      </g>
    );
  }
  if (kind === "frown") {
    return (
      <g data-ms-part="mouth">
        <path d="M190 262Q210 248 230 262" {...common} />
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g data-ms-part="mouth">
        <path d="M192 254 L228 254" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "o") {
    return (
      <g data-ms-part="mouth">
        <ellipse cx="210" cy="256" rx="11" ry="13" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="5" />
      </g>
    );
  }
  if (kind === "tiny") {
    return (
      <g data-ms-part="mouth">
        <path d="M197 254Q210 260 223 254" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "wry") {
    return (
      <g data-ms-part="mouth">
        <path d="M188 252 Q210 262 232 248" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "kiss") {
    return (
      <g data-ms-part="mouth">
        <path d="M204 252 Q210 260 216 252" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "talk") {
    return (
      <g data-ms-part="mouth">
        <ellipse cx="210" cy="256" rx="10" ry="8" fill="#FFF4F6" stroke="var(--ms-features)" strokeWidth="5">
          <animate attributeName="ry" values="8;12;8" dur="0.45s" repeatCount="indefinite" />
        </ellipse>
      </g>
    );
  }
  return (
    <g data-ms-part="mouth">
      <path d="M190 254Q210 270 230 254" {...common}>
        <animate attributeName="d" values="M190 254Q210 270 230 254;M192 256Q210 266 228 256;M190 254Q210 270 230 254" dur="3.4s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function Props({ g, uid }) {
  const prop = g.prop;
  if (!prop) return null;

  if (prop === "petal" || prop === "bloom") {
    return (
      <g data-ms-part="accessory" className="dd-pop">
        <g>
          <circle cx="349" cy="126" r="12" fill="var(--ms-core)" stroke="var(--ms-mid)" strokeWidth="4" />
          <animateTransform attributeName="transform" type="translate" values="0 0;-6 10;0 20;6 10;0 0" dur="5s" repeatCount="indefinite" />
        </g>
      </g>
    );
  }
  if (prop === "spark") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <g transform="translate(67 198) scale(1)">
          <path fill="var(--ms-core)" stroke="var(--ms-mid)" strokeWidth="3" d="M0 -17 L9 -6 L20 2 L9 8 L0 23 L-9 8 L-20 2 L-9 -6 Z" className="dd-twinkle" />
        </g>
        <g data-ms-part="accessory">
          <circle cx="94" cy="224" r="9" fill="#FF9CAF" stroke="var(--ms-features)" strokeWidth="3" />
        </g>
      </g>
    );
  }
  if (prop === "think" || prop === "loading") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <g transform="translate(340 110)">
          <circle className={prop === "loading" ? "dd-spin" : "dd-pulse"} cx="0" cy="0" r="16" fill="var(--ms-core)" stroke="var(--ms-mid)" strokeWidth="4" />
        </g>
      </g>
    );
  }
  if (prop === "confetti") {
    return (
      <g data-ms-part="prop" className="dd-pop" fill="var(--ms-mid)">
        {[[90, 90], [320, 80], [110, 140], [340, 150], [70, 200], [350, 210]].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(.75)`}>
            <path className="dd-rise" style={{ animationDelay: `${i * 0.18}s` }} d={STAR} />
          </g>
        ))}
      </g>
    );
  }
  if (prop === "hearts" || prop === "kiss") {
    return (
      <g data-ms-part="prop" className="dd-pop" fill="#E63956">
        <g transform="translate(330 120) scale(1.1)">
          <path className="dd-drift" d={HEART} />
        </g>
        <g transform="translate(90 130) scale(.9)">
          <path className="dd-drift" style={{ animationDelay: ".4s" }} d={HEART} />
        </g>
        {prop === "kiss" && (
          <g transform="translate(300 180) scale(.75)">
            <path className="dd-drift" style={{ animationDelay: ".7s" }} d={HEART} />
          </g>
        )}
      </g>
    );
  }
  if (prop === "tears") {
    return (
      <g data-ms-part="prop" className="dd-pop" fill="#8EC8FF">
        <ellipse className="dd-tear" cx="188" cy="236" rx="4" ry="6" />
        <ellipse className="dd-tear" style={{ animationDelay: ".5s" }} cx="232" cy="236" rx="4" ry="6" />
      </g>
    );
  }
  if (prop === "zzz") {
    return (
      <g data-ms-part="prop" className="dd-pop" fill="var(--ms-mid)" fontFamily="Outfit,sans-serif" fontWeight="700" fontSize="22">
        <text className="dd-drift" x="320" y="120">Z</text>
        <text className="dd-drift" style={{ animationDelay: ".5s" }} x="340" y="95" fontSize="16">z</text>
      </g>
    );
  }
  if (prop === "steam") {
    return (
      <g data-ms-part="prop" className="dd-pop" stroke="var(--ms-mid)" strokeWidth="3" fill="none" opacity="0.7">
        <path className="dd-rise" d="M160 150 Q154 130 162 110" />
        <path className="dd-rise" style={{ animationDelay: ".3s" }} d="M260 150 Q266 130 258 110" />
      </g>
    );
  }
  if (prop === "question" || prop === "oops") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <circle cx="340" cy="120" r="18" fill="var(--ms-core)" stroke="var(--ms-mid)" strokeWidth="3" />
        <text x="340" y="127" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--ms-features)" fontFamily="Outfit,sans-serif">
          {prop === "oops" ? "!" : "?"}
        </text>
      </g>
    );
  }
  if (prop === "alarm" || prop === "error") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <path d="M340 100 L355 140 L325 140 Z" fill="var(--ms-mid)" stroke="var(--ms-features)" strokeWidth="3" strokeLinejoin="round" className="dd-pulse" />
        <circle cx="340" cy="132" r="2.5" fill="var(--ms-features)" />
        <path d="M340 112 L340 124" stroke="var(--ms-features)" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (prop === "success" || prop === "yes" || prop === "proud") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <circle cx="340" cy="120" r="22" fill={`url(#${uid}-glow)`} />
        <circle cx="340" cy="120" r="16" fill="var(--ms-core)" stroke="var(--ms-mid)" strokeWidth="3" />
        <path d="M330 120 L337 128 L352 110" fill="none" stroke="var(--ms-features)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (prop === "no" || prop === "empty") {
    return (
      <g data-ms-part="prop" className="dd-pop" opacity={prop === "empty" ? 0.55 : 1}>
        <circle cx="340" cy="130" r="16" fill="none" stroke="var(--ms-mid)" strokeWidth="3" strokeDasharray={prop === "empty" ? "4 4" : undefined} />
        {prop === "no" && <path d="M332 122 L348 138 M348 122 L332 138" stroke="var(--ms-features)" strokeWidth="3" strokeLinecap="round" />}
      </g>
    );
  }
  if (prop === "search") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <circle cx="330" cy="130" r="14" fill="none" stroke="var(--ms-mid)" strokeWidth="4" />
        <path d="M340 140 L354 156" stroke="var(--ms-mid)" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (prop === "pad" || prop === "work") {
    return (
      <g data-ms-part="prop" className="dd-pop">
        <rect x="318" y="300" width="44" height="52" rx="6" fill="var(--ms-core)" stroke="var(--ms-features)" strokeWidth="3" />
        <path d="M328 316 H352 M328 328 H348 M328 340 H344" stroke="var(--ms-features)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
        <rect x="346" y="310" width="2" height="10" fill="var(--ms-mid)">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
        </rect>
      </g>
    );
  }
  if (prop === "speech" || prop === "listen" || prop === "notes" || prop === "encourage") {
    return (
      <g data-ms-part="prop" className="dd-pop" stroke="var(--ms-mid)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85">
        <path className="dd-twinkle" d="M320 170 Q340 160 352 172" />
        <path className="dd-twinkle" style={{ animationDelay: ".2s" }} d="M322 188 Q344 182 356 196" />
        <path className="dd-twinkle" style={{ animationDelay: ".4s" }} d="M324 206 Q346 204 356 218" />
      </g>
    );
  }
  if (prop === "point" || prop === "highFive" || prop === "clap") {
    return (
      <g data-ms-part="crest" className="dd-pop" fill="var(--ms-mid)">
        <g transform="translate(80 150) scale(.8)">
          <path className="dd-twinkle" d={STAR} />
        </g>
        <g transform="translate(340 100) scale(.65)">
          <path className="dd-twinkle" style={{ animationDelay: ".35s" }} d={STAR} />
        </g>
      </g>
    );
  }
  if (prop === "speed" || prop === "trail") {
    return (
      <g data-ms-part="prop" className="dd-pop" stroke="var(--ms-mid)" strokeWidth="8" fill="none" strokeLinecap="round">
        <path d="M104 330Q65 329 34 342" opacity="0.9" />
        <path d="M107 348Q66 352 36 369" opacity="0.85" />
        <path d="M112 366Q72 376 43 396" opacity="0.75" />
        <path d="M120 384Q82 400 57 422" opacity="0.6" />
        <animate attributeName="opacity" values="1;0.7;1" dur="1.4s" repeatCount="indefinite" />
      </g>
    );
  }
  if (prop === "waiting") {
    return (
      <g data-ms-part="prop" className="dd-pop" fill="var(--ms-mid)">
        <circle className="dd-pulse" cx="320" cy="130" r="5" />
        <circle className="dd-pulse" style={{ animationDelay: ".2s" }} cx="338" cy="130" r="5" />
        <circle className="dd-pulse" style={{ animationDelay: ".4s" }} cx="356" cy="130" r="5" />
      </g>
    );
  }
  return null;
}

function RoseMeter({ signal, flying }) {
  const right = [
    ["M315 316Q345 298 370 304", "#A91F3D", 0.9],
    ["M321 332Q353 318 378 327", "var(--ms-mid)", 0.9],
    ["M325 348Q358 341 383 353", "var(--ms-top)", 0.9],
    ["M326 364Q359 364 382 379", "#FF9CAF", 0.8],
    ["M324 380Q355 386 376 402", "#FFD6DE", 0.7],
    ["M319 396Q347 408 365 425", "#FF9CAF", 0.55],
    ["M312 411Q336 428 349 445", "var(--ms-core)", 0.4],
  ];
  const left = [
    ["M104 330Q65 329 34 342", "#A91F3D", 0.9],
    ["M107 348Q66 352 36 369", "var(--ms-mid)", 0.9],
    ["M112 366Q72 376 43 396", "var(--ms-top)", 0.9],
    ["M120 384Q82 400 57 422", "#FF9CAF", 0.8],
    ["M130 401Q96 422 77 445", "#FFD6DE", 0.7],
    ["M142 417Q114 440 99 461", "#FF9CAF", 0.55],
    ["M156 431Q134 452 123 469", "var(--ms-core)", 0.4],
  ];
  const blades = flying ? left : right;
  const lit = Math.max(1, Math.round((signal / 100) * blades.length));
  return (
    <g className="ms-signal-fan" data-ms-part="instrument" fill="none" strokeLinecap="round" strokeWidth="9">
      {blades.map(([d, stroke, baseOp], i) => (
        <path key={i} d={d} stroke={stroke} opacity={i < lit ? baseOp : 0.12} />
      ))}
      <animate attributeName="opacity" values="1;0.75;1" dur="3.4s" repeatCount="indefinite" />
    </g>
  );
}

function Limbs({ armL, armR, wave, clap }) {
  return (
    <g data-ms-part="limbs">
      <g>
        {wave && (
          <animateTransform attributeName="transform" type="rotate" values="-8 145 307;13 145 307;-8 145 307" dur="1.1s" repeatCount="indefinite" />
        )}
        <path d={armL} fill="none" stroke="var(--ms-features)" strokeWidth={wave ? 14 : 12} strokeLinecap="round">
          {clap && (
            <animate attributeName="d" values={`${armL};${A.clapL};${armL}`} dur="0.42s" repeatCount="indefinite" />
          )}
        </path>
        <path d={armL} fill="none" stroke="var(--ms-core)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      </g>
      <g>
        <path d={armR} fill="none" stroke="var(--ms-features)" strokeWidth="12" strokeLinecap="round">
          {clap && (
            <animate attributeName="d" values={`${armR};${A.clapR};${armR}`} dur="0.42s" repeatCount="indefinite" />
          )}
        </path>
        <path d={armR} fill="none" stroke="var(--ms-core)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
      </g>
    </g>
  );
}

function Cape() {
  return (
    <g data-ms-part="prop">
      <path
        d="M171 292C120 325 81 378 65 442C105 418 127 427 134 451C159 422 181 432 185 456C213 414 220 352 213 308Z"
        fill="url(#dd-cape)"
        stroke="var(--ms-features)"
        strokeWidth="7"
        strokeLinejoin="round"
      >
        <animate
          attributeName="d"
          values="M171 292C120 325 81 378 65 442C105 418 127 427 134 451C159 422 181 432 185 456C213 414 220 352 213 308Z;M171 292C114 318 74 366 58 430C100 412 122 424 130 446C156 414 178 426 185 450C213 410 220 352 213 308Z;M171 292C120 325 81 378 65 442C105 418 127 427 134 451C159 422 181 432 185 456C213 414 220 352 213 308Z"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </path>
    </g>
  );
}

export function DadaSVG({ gesture = "idle", paused = false }) {
  const g = byKey(gesture);
  const look = g.look || [0, 0];
  const lift = g.lift || 0;
  const uid = `dd-${g.key}`;
  const flying = !!g.cape;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Dada, ${g.label}`}
      className={`ms-root dd-svg dd-g-${g.key}`}
      style={{ "--ms-glow": 0.45 }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="44%" r="55%">
          <stop offset="0" stopColor="var(--ms-core)" />
          <stop offset="0.58" stopColor="#FF9CAF" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--ms-mid)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="dd-petal" x2="0" y2="1">
          <stop stopColor="var(--ms-top)" />
          <stop offset="1" stopColor="var(--ms-mid)" />
        </linearGradient>
        <linearGradient id="dd-cape" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="var(--ms-top)" />
          <stop offset="1" stopColor="#A91F3D" />
        </linearGradient>
      </defs>

      <g data-ms-part="halo">
        <ellipse className="ms-glow-halo" cx="210" cy="238" rx="150" ry="164" fill={`url(#${uid}-glow)`} />
      </g>

      <g data-ms-part="shadow">
        <ellipse className="dd-shadow" cx="210" cy="470" rx="82" ry="14" fill="var(--ms-features)" opacity="0.16" />
      </g>

      <g id="ms-hit">
        <rect x="45" y="28" width="330" height="442" fill="transparent" />
      </g>

      <g transform={`translate(0,${lift})`}>
        <g className="dd-float">
          <g transform={`rotate(${g.lean || (flying ? -11 : 0)} 210 250)`}>
            {g.sway && (
              <animateTransform attributeName="transform" type="rotate" additive="sum" values="-3;3;-3" dur="1.1s" repeatCount="indefinite" />
            )}
            {g.shake && (
              <animateTransform attributeName="transform" type="translate" additive="sum" values="-2 0;2 0;-2 0" dur="0.11s" repeatCount="indefinite" />
            )}

            {flying && <Cape />}

            <g data-ms-part="body">
              <path
                d="M190 330C181 367 181 425 210 445C239 425 239 367 230 330Z"
                fill="var(--ms-base)"
                stroke="var(--ms-features)"
                strokeWidth="8"
              />
            </g>

            <g data-ms-part="leaves">
              <path
                d="M207 387C173 357 125 352 88 371C111 381 111 397 99 411C143 424 181 410 208 397Z"
                fill="var(--ms-base)"
                stroke="var(--ms-features)"
                strokeWidth="7"
              />
              <path
                d="M213 387C247 357 295 352 332 371C309 381 309 397 321 411C277 424 239 410 212 397Z"
                fill="var(--ms-base)"
                stroke="var(--ms-features)"
                strokeWidth="7"
              />
            </g>

            <Limbs armL={g.armL || A.restL} armR={g.armR || A.restR} wave={!!g.wave} clap={!!g.clap} />

            <g data-ms-part="outer-petals" fill="url(#dd-petal)" stroke="var(--ms-features)" strokeWidth="8">
              <circle cx="210" cy="108" r="52" />
              <circle cx="130" cy="146" r="52" />
              <circle cx="290" cy="146" r="52" />
              <circle cx="104" cy="226" r="52" />
              <circle cx="316" cy="226" r="52" />
              <circle cx="146" cy="300" r="52" />
              <circle cx="274" cy="300" r="52" />
            </g>

            <g data-ms-part="inner-petals">
              <circle cx="210" cy="222" r="108" fill="var(--ms-top)" stroke="var(--ms-features)" strokeWidth="8" />
            </g>

            <g data-ms-part="flower-face">
              <circle cx="210" cy="222" r="73" fill="var(--ms-core)" stroke="var(--ms-features)" strokeWidth="8" />
            </g>

            <g data-ms-part="crest">
              <path d="M178 165Q210 146 242 165" fill="none" stroke="var(--ms-mid)" strokeWidth="7" strokeLinecap="round" />
            </g>

            <g className="dd-pop" transform={`translate(${look[0]},${look[1]})`}>
              <Brows kind={g.brow} />
              <Eyes kind={g.eye} look={look} />
              <g data-ms-part="blush" fill="var(--ms-mid)" opacity="0.45">
                <ellipse cx="155" cy="246" rx="13" ry="7" />
                <ellipse cx="265" cy="246" rx="13" ry="7" />
              </g>
              <Mouth kind={g.mouth} />
            </g>

            <RoseMeter signal={g.signal ?? 68} flying={flying} />
            <Props g={g} uid={uid} />
          </g>
        </g>
      </g>
    </svg>
  );
}

export const POSE_SOURCE = {
  slug: "dada",
  meta: {
    name: "Dada",
    tagline: "A bright-eyed rose who blooms with every little joy.",
    product: "Joyful onboarding companion",
    accent: ACCENT,
    stage: THEMES.primary.stage,
    glowLabel: "Bloom",
    themes: THEMES,
    instrument: INSTRUMENT,
  },
  poses: GESTURES.map((g) => ({
    key: g.key,
    label: g.label,
    cat: g.cat,
    tip: g.tip,
    use: g.use,
    track: !!g.track,
    signal: g.signal ?? 68,
  })),
  renderPose: (key) => <DadaSVG gesture={key} />,
};

export default function DadaMascot() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <DadaSVG gesture="idle" />
    </div>
  );
}
