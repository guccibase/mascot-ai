"use client";

/**
 * PIXEL POPPY: cheerful app flower for onboarding, empty states, and rewards.
 *
 * Rounded red poppy head, charcoal seed face, green leaf bow that acts as limbs,
 * and a seven-blade pollen meter. Full 37-gesture Core / Moods / Action / Feedback set.
 */

const ACCENT = "#FFB347";

const THEMES = {
  primary: {
    name: "Poppy Pop",
    top: "#E84A4A",
    mid: "#C73434",
    base: "#2FA84F",
    core: "#FFE3A3",
    stage: "#FFF6EC",
    features: "#1C1C1C",
  },
  dune: {
    name: "Sun-Dried Dune",
    top: "#E8674A",
    mid: "#C74E34",
    base: "#8FA83A",
    core: "#FFEBC2",
    stage: "#F3E3C6",
    features: "#2A211C",
  },
  night: {
    name: "Midnight Meadow",
    top: "#B23A4E",
    mid: "#8C2B3D",
    base: "#1F7A44",
    core: "#FFC97A",
    stage: "#141824",
    features: "#0E0E12",
  },
};

const INSTRUMENT = {
  label: "Pollen Meter",
  description:
    "A seven-blade fan of pollen strips arcing off Pixel Poppy's right side. Each blade lights up as momentum builds, from a faint dust drift to a full celebratory spark trail.",
  lowLabel: "Dust Drift",
  midLabel: "Steady Bloom",
  highLabel: "Spark Trail",
  defaultValue: 68,
  hidden: false,
  ramp: ["#FFE3A3", "#FFD27A", "#FFB347", "#F5942E", "#E87A1E"],
};

/* Leaf rotate angles around the stem joint (screen-left = character right for wave). */
const L = {
  rest: -4,
  wave: -42,
  point: -28,
  up: -55,
  droop: 18,
  shrug: -16,
  clap: -22,
  fly: 12,
  write: 8,
  chin: -12,
};

const SVG_CSS = `
  .ms-root{display:block;user-select:none;-webkit-user-select:none;
    --ms-top:#E84A4A;--ms-mid:#C73434;--ms-base:#2FA84F;--ms-core:#FFE3A3;
    --ms-stage:#FFF6EC;--ms-features:#1C1C1C;--ms-accent:${ACCENT};
    --ms-glow:.45;--gf:1}
  .pp-g-alarm{--gf:1.75}
  .pp-g-celebrate,.pp-g-success,.pp-g-flying{--gf:1.45}
  .pp-g-proud,.pp-g-love,.pp-g-happy{--gf:1.25}
  .pp-g-grumpy,.pp-g-sad{--gf:.65}
  .pp-g-crying,.pp-g-empty,.pp-g-sleepy{--gf:.48}
  .pp-float{animation:pp-float 3.4s ease-in-out infinite}
  .pp-g-sleepy .pp-float,.pp-g-waiting .pp-float{animation-duration:6s}
  .pp-g-celebrate .pp-float,.pp-g-dancing .pp-float{animation:pp-dance 1.15s ease-in-out infinite}
  .pp-g-running .pp-float{animation:pp-run .32s ease-in-out infinite}
  .pp-g-flying .pp-float{animation:pp-soar 1.35s ease-in-out infinite}
  .pp-g-alarm .pp-float{animation:pp-shake .12s ease-in-out infinite}
  .pp-shadow{animation:pp-shadow 3.4s ease-in-out infinite}
  .pp-g-flying .pp-shadow{opacity:.1;animation:none;transform:scaleX(.55)}
  .pp-g-running .pp-shadow{animation:pp-runShadow .32s ease-in-out infinite}
  .ms-glow-halo{animation:pp-glow 3s ease-in-out infinite;opacity:calc(.18 + var(--ms-glow) * .72 * var(--gf))}
  .pp-g-alarm .ms-glow-halo{animation-duration:.85s}
  .pp-pop{animation:pp-pop .28s ease-out}
  .pp-drift{animation:pp-drift 2.4s ease-out infinite}
  .pp-spin{animation:pp-spin 1.4s linear infinite;transform-box:fill-box;transform-origin:center}
  .pp-pulse{animation:pp-pulse 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
  .pp-twinkle{animation:pp-twinkle 1.5s ease-in-out infinite}
  .pp-tear{animation:pp-tear 2.6s ease-in infinite}
  .pp-rise{animation:pp-rise 2.3s ease-out infinite}
  .ms-eyes{transition:transform .12s ease-out}
  .ms-root[data-paused] *{animation-play-state:paused!important}
  @keyframes pp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes pp-dance{0%,100%{transform:rotate(-3deg) translateY(0)}50%{transform:rotate(4deg) translateY(-12px)}}
  @keyframes pp-run{0%,100%{transform:translate(5px,2px) rotate(-2deg)}50%{transform:translate(-4px,-10px) rotate(3deg)}}
  @keyframes pp-soar{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-20px) rotate(2deg)}}
  @keyframes pp-shake{0%,100%{transform:translate(-2px,0)}50%{transform:translate(2px,0)}}
  @keyframes pp-shadow{0%,100%{transform:scaleX(1);opacity:.16}50%{transform:scaleX(.9);opacity:.12}}
  @keyframes pp-runShadow{0%,100%{transform:translateX(6px) scaleX(.95)}50%{transform:translateX(-4px) scaleX(.85)}}
  @keyframes pp-glow{0%,100%{opacity:calc(.18 + var(--ms-glow) * .55 * var(--gf))}50%{opacity:calc(.18 + var(--ms-glow) * .9 * var(--gf))}}
  @keyframes pp-pop{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}
  @keyframes pp-drift{0%{opacity:0;transform:translateY(8px)}20%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
  @keyframes pp-spin{to{transform:rotate(360deg)}}
  @keyframes pp-pulse{0%,100%{opacity:.4;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)}}
  @keyframes pp-twinkle{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes pp-tear{0%{opacity:0;transform:translateY(0)}18%{opacity:1}85%{opacity:.8}100%{opacity:0;transform:translateY(40px)}}
  @keyframes pp-rise{0%{opacity:0;transform:translateY(10px)}22%{opacity:1}100%{opacity:0;transform:translateY(-40px)}}
  @media (prefers-reduced-motion:reduce){.ms-root *{animation:none!important}}
`;

const STAR = "M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z";
const HEART = "M0 8 C-10 0 -11 -7 -4.5 -9 C-1.5 -10 0 -6.5 0 -4.5 C0 -6.5 1.5 -10 4.5 -9 C11 -7 10 0 0 8 Z";

const GESTURES = [
  { key: "idle", label: "Idle", cat: "Core", use: "Home screen",
    tip: "Soft bob, blink, and a pollen mote drifting nearby.",
    leafL: L.rest, leafR: 4, eye: "open", mouth: "smile", track: true, prop: "mote", signal: 68 },
  { key: "wave", label: "Wave", cat: "Core", use: "Hello · goodbye",
    tip: "Left leaf flaps hard with a friendly hello.",
    leafL: L.wave, leafR: 10, wave: true, eye: "open", mouth: "grin", brow: "up", prop: "spark", signal: 82 },
  { key: "happy", label: "Happy", cat: "Core", use: "Good news",
    tip: "Creased eyes and a warm seed-center grin.",
    leafL: L.up, leafR: -L.up, eye: "arch", mouth: "grin", prop: "happyMote", signal: 86 },
  { key: "thinking", label: "Thinking", cat: "Core", use: "Loading · AI planning",
    tip: "Gaze drifts up while a pollen mote spins overhead.",
    leafL: L.chin, leafR: 6, eye: "open", mouth: "flat", brow: "oneUp", look: [2, -5], prop: "think", signal: 58 },
  { key: "listening", label: "Listening", cat: "Core", use: "Voice input",
    tip: "Leans in with soft focus as pollen bars breathe.",
    leafL: L.rest, leafR: 4, lean: 4, eye: "open", mouth: "tiny", prop: "listen", signal: 64 },
  { key: "talking", label: "Talking", cat: "Core", use: "AI reply",
    tip: "Mouth mid-word with soft speech arcs of pollen.",
    leafL: L.point, leafR: 6, eye: "open", mouth: "talk", brow: "up", prop: "speech", signal: 74 },
  { key: "pointing", label: "Pointing", cat: "Core", use: "Tour · callout",
    tip: "Left leaf out, directing attention to the next step.",
    leafL: L.point, leafR: 4, eye: "open", mouth: "smile", brow: "up", look: [-5, -2], prop: "point", signal: 72 },
  { key: "writing", label: "Writing", cat: "Core", use: "Compose · notes",
    tip: "Leaves tuck in while a tiny petal notepad gets a caret blink.",
    leafL: L.write, leafR: -L.write, eye: "open", mouth: "flat", look: [0, 4], prop: "pad", signal: 60 },

  { key: "celebrate", label: "Celebrate", cat: "Moods", use: "Streak · success",
    tip: "Leaves up and pollen stars raining after a win.",
    leafL: L.up, leafR: -L.up, eye: "arch", mouth: "grin", prop: "confetti", signal: 92 },
  { key: "love", label: "Love", cat: "Moods", use: "Thanks · rating",
    tip: "Heart eyes with soft hearts floating off the petals.",
    leafL: L.shrug, leafR: -L.shrug, eye: "heart", mouth: "smile", prop: "hearts", signal: 88 },
  { key: "sad", label: "Sad", cat: "Moods", use: "Missed goal, kindly",
    tip: "Soft eyes and a gentle petal droop. Never mean about it.",
    leafL: L.droop, leafR: -L.droop, eye: "open", mouth: "frown", brow: "sad", look: [0, 3], signal: 42 },
  { key: "crying", label: "Crying", cat: "Moods", use: "Bad news · empathy",
    tip: "Tears on the seed face. Bigger sorrow than sad.",
    leafL: L.droop, leafR: -L.droop, eye: "cry", mouth: "frown", brow: "sad", prop: "tears", signal: 38 },
  { key: "grumpy", label: "Grumpy", cat: "Moods", use: "Too early · friction",
    tip: "Brows down, small pout. The task felt heavier than it should.",
    leafL: L.rest, leafR: 4, lean: 3, eye: "flat", mouth: "frown", brow: "angry", prop: "steam", signal: 44 },
  { key: "sleepy", label: "Sleepy", cat: "Moods", use: "Night mode",
    tip: "Heavy lids and a soft Z drifting off a petal.",
    leafL: L.droop, leafR: -L.droop, eye: "half", mouth: "tiny", prop: "zzz", signal: 36 },
  { key: "proud", label: "Proud", cat: "Moods", use: "Milestone",
    tip: "Chin up, bright pollen glow, leaves open wide.",
    leafL: L.point, leafR: -L.point, eye: "open", mouth: "grin", brow: "up", prop: "proud", signal: 90 },
  { key: "oops", label: "Oops", cat: "Moods", use: "Rough take, kindly",
    tip: "Sheepish smile, one leaf up, a dropped pollen mote. Soft fail.",
    leafL: L.up, leafR: 6, eye: "open", mouth: "wry", brow: "oneUp", look: [3, 2], prop: "oops", signal: 52 },
  { key: "surprised", label: "Surprised", cat: "Moods", use: "Wow · discovery",
    tip: "Wide eyes and a small jump. Something bloomed unexpectedly.",
    leafL: L.point, leafR: -L.point, eye: "wide", mouth: "o", brow: "up", prop: "spark", signal: 84 },
  { key: "blowing_kiss", label: "Blowing kiss", cat: "Moods", use: "Thanks · affection",
    tip: "A soft kiss blown toward the viewer on a pollen heart.",
    leafL: L.chin, leafR: 6, eye: "arch", mouth: "kiss", brow: "up", look: [5, -2], prop: "kiss", signal: 80 },
  { key: "facepalm", label: "Facepalm", cat: "Moods", use: "Facepalm moment",
    tip: "Leaf flat against the seed face over a classic slip.",
    leafL: -70, leafR: L.droop, eye: "flat", mouth: "wry", brow: "sad", signal: 48 },
  { key: "dancing", label: "Dancing", cat: "Moods", use: "Fun · celebration",
    tip: "Leaves swinging and body swaying after a streak hit.",
    leafL: L.up, leafR: L.point, sway: true, eye: "arch", mouth: "grin", prop: "notes", signal: 88 },

  { key: "alarm", label: "Alarm!", cat: "Action", use: "Notification · alarm",
    tip: "Wide eyes, ringing energy, whole bloom rattling.",
    leafL: L.point, leafR: -L.point, shake: true, eye: "wide", mouth: "o", brow: "up", prop: "alarm", signal: 94 },
  { key: "encourage", label: "Encourage", cat: "Action", use: "Nudge · coaching",
    tip: "Leaves open and a warm face. You've got this.",
    leafL: L.point, leafR: -L.point, eye: "open", mouth: "grin", brow: "up", prop: "encourage", signal: 78 },
  { key: "searching", label: "Searching", cat: "Action", use: "Search · find",
    tip: "A magnifier of pollen light, scanning for the next clue.",
    leafL: L.point, leafR: 4, eye: "open", mouth: "flat", brow: "oneUp", look: [-6, -3], prop: "search", signal: 62 },
  { key: "thumbs_up", label: "Thumbs up", cat: "Action", use: "Approve · yes",
    tip: "Left leaf curled into a clear yes.",
    leafL: L.up, leafR: 4, eye: "arch", mouth: "grin", prop: "yes", signal: 84 },
  { key: "thumbs_down", label: "Thumbs down", cat: "Action", use: "Reject · no",
    tip: "Left leaf tipped down. Try another path.",
    leafL: L.droop, leafR: 4, eye: "flat", mouth: "frown", brow: "sad", prop: "no", signal: 40 },
  { key: "shrug", label: "Shrug", cat: "Action", use: "Unknown · maybe",
    tip: "Leaves up, unsure. A little lost in the garden.",
    leafL: L.shrug, leafR: -L.shrug, eye: "open", mouth: "flat", brow: "oneUp", prop: "question", signal: 50 },
  { key: "working", label: "Working", cat: "Action", use: "Processing · busy",
    tip: "Focused busy posture with a tiny bloom checklist.",
    leafL: L.write, leafR: -L.write, eye: "open", mouth: "flat", look: [0, 3], prop: "work", signal: 66 },
  { key: "running", label: "Running", cat: "Action", use: "Hurry · progress",
    tip: "Mid-sprint energy, leaves pumping, dust kicking up.",
    leafL: -20, leafR: 20, lean: 12, look: [10, -2], eye: "wide", mouth: "o", brow: "up", prop: "speed", signal: 76 },
  { key: "flying", label: "Flying", cat: "Action", use: "Delight · upgrade",
    tip: "Superman cape and a pollen trail. Lifted and soaring.",
    leafL: L.fly, leafR: -L.fly, lift: -56, cape: true, eye: "wide", mouth: "o", brow: "up", look: [0, -5], prop: "trail", signal: 90 },
  { key: "high_five", label: "High five", cat: "Action", use: "Team win · connect",
    tip: "Left leaf raised and waiting for your palm.",
    leafL: L.up, leafR: 6, eye: "arch", mouth: "grin", prop: "highFive", signal: 86 },
  { key: "clapping", label: "Clapping", cat: "Action", use: "Applause · praise",
    tip: "Leaves meeting mid-clap for a job well done.",
    leafL: L.clap, leafR: -L.clap, clap: true, eye: "arch", mouth: "grin", brow: "up", prop: "clap", signal: 85 },

  { key: "confused", label: "Confused", cat: "Feedback", use: "Error · not found",
    tip: "Crooked mouth, uneven eyes, a question mote hovering.",
    leafL: L.chin, leafR: L.shrug, lean: -3, eye: "uneven", mouth: "wry", brow: "oneUp", prop: "question", signal: 46 },
  { key: "success", label: "Success", cat: "Feedback", use: "Done · completed",
    tip: "Clear win pose with a bright check in the pollen glow.",
    leafL: L.up, leafR: -L.up, eye: "arch", mouth: "grin", prop: "success", signal: 93 },
  { key: "error", label: "Error", cat: "Feedback", use: "Failed request",
    tip: "Soft alert. Concerned, not scary.",
    leafL: L.point, leafR: -L.point, eye: "wide", mouth: "o", brow: "up", prop: "error", signal: 54 },
  { key: "empty", label: "Empty", cat: "Feedback", use: "Empty state",
    tip: "Gentle nothing here yet. A wilted pollen mote.",
    leafL: L.droop, leafR: -L.droop, eye: "open", mouth: "tiny", brow: "sad", prop: "empty", signal: 34 },
  { key: "loading", label: "Loading", cat: "Feedback", use: "In progress",
    tip: "Soft wait with a spinning pollen mote beside the head.",
    leafL: L.rest, leafR: 4, eye: "open", mouth: "flat", prop: "loading", signal: 56 },
  { key: "waiting", label: "Waiting", cat: "Feedback", use: "Queued · hold on",
    tip: "Patient pause, eyes soft, three pollen dots breathing.",
    leafL: L.rest, leafR: 4, eye: "half", mouth: "tiny", prop: "waiting", signal: 48 },
];

const byKey = (k) => GESTURES.find((g) => g.key === k) || GESTURES[0];

function Brows({ kind }) {
  if (!kind) return null;
  const stroke = { fill: "none", stroke: "#fff", strokeWidth: 6, strokeLinecap: "round", opacity: 0.85 };
  if (kind === "up") {
    return (
      <g data-ms-part="brows">
        <path d="M172 180 Q187 170 202 178" {...stroke} />
        <path d="M218 178 Q233 170 248 180" {...stroke} />
      </g>
    );
  }
  if (kind === "oneUp") {
    return (
      <g data-ms-part="brows">
        <path d="M172 184 Q187 178 202 184" {...stroke} />
        <path d="M218 176 Q233 168 248 178" {...stroke} />
      </g>
    );
  }
  if (kind === "sad") {
    return (
      <g data-ms-part="brows">
        <path d="M172 176 Q187 186 202 182" {...stroke} />
        <path d="M218 182 Q233 186 248 176" {...stroke} />
      </g>
    );
  }
  if (kind === "angry") {
    return (
      <g data-ms-part="brows">
        <path d="M172 178 Q187 184 202 180" {...stroke} />
        <path d="M218 180 Q233 184 248 178" {...stroke} />
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
        <path d="M172 210 Q187 192 202 210" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
        <path d="M218 210 Q233 192 248 210" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "heart") {
    return (
      <g className="ms-eyes" data-ms-part="eyes" fill="#FF8AA0">
        <path transform="translate(189 206) scale(1.05)" d={HEART} />
        <path transform="translate(235 206) scale(1.05)" d={HEART} />
      </g>
    );
  }
  if (kind === "cry") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <rect x="176" y="196" width="22" height="18" rx="8" fill="#fff" />
        <rect x="222" y="196" width="22" height="18" rx="8" fill="#fff" />
        <rect x="184" y="204" width="9" height="8" rx="4" fill="var(--ms-features)" />
        <rect x="230" y="204" width="9" height="8" rx="4" fill="var(--ms-features)" />
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <path d="M176 206 L202 206" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
        <path d="M222 206 L248 206" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "half") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <path d="M176 204 Q189 214 202 204" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
        <path d="M222 204 Q235 214 248 204" fill="none" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "uneven") {
    return (
      <g className="ms-eyes" data-ms-part="eyes">
        <rect x="176" y="190" width="22" height="28" rx="8" fill="#fff" />
        <rect x="222" y="196" width="22" height="18" rx="8" fill="#fff" />
        <g transform={`translate(${lx},${ly})`}>
          <rect x="184" y="200" width="9" height="12" rx="4" fill="var(--ms-features)" />
          <rect x="230" y="202" width="9" height="8" rx="4" fill="var(--ms-features)" />
        </g>
      </g>
    );
  }
  const h = kind === "wide" ? 30 : 24;
  const y = kind === "wide" ? 188 : 192;
  const py = kind === "wide" ? 198 : 200;
  return (
    <g className="ms-eyes" data-ms-part="eyes">
      <g>
        <rect x="176" y={y} width="22" height={h} rx="8" fill="#fff" />
        <rect x="222" y={y} width="22" height={h} rx="8" fill="#fff" />
        <animate attributeName="opacity" values="1;1;0;1;1" keyTimes="0;0.9;0.94;0.98;1" dur="4.5s" repeatCount="indefinite" />
      </g>
      <g transform={`translate(${lx},${ly})`}>
        <rect x="184" y={py} width="9" height="11" rx="4" fill="var(--ms-features)" />
        <rect x="230" y={py} width="9" height="11" rx="4" fill="var(--ms-features)" />
        {kind === "open" && (
          <animateTransform attributeName="transform" type="translate" values="0 0;3 1;0 0;-3 1;0 0" dur="6s" repeatCount="indefinite" />
        )}
      </g>
      <circle cx="181" cy={y + 5} r="2.5" fill="#fff" />
      <circle cx="227" cy={y + 5} r="2.5" fill="#fff" />
    </g>
  );
}

function Mouth({ kind }) {
  const common = { fill: "none", stroke: "#fff", strokeWidth: 9, strokeLinecap: "round" };
  if (kind === "grin") {
    return (
      <g data-ms-part="mouth">
        <path d="M180 244 Q210 276 240 244 Q226 254 210 254 Q194 254 180 244 Z" fill="#fff" stroke="#fff" strokeWidth="4" strokeLinejoin="round" />
      </g>
    );
  }
  if (kind === "frown") {
    return (
      <g data-ms-part="mouth">
        <path d="M188 256 Q210 242 232 256" {...common} />
      </g>
    );
  }
  if (kind === "flat") {
    return (
      <g data-ms-part="mouth">
        <path d="M190 250 L230 250" {...common} strokeWidth="7" />
      </g>
    );
  }
  if (kind === "o") {
    return (
      <g data-ms-part="mouth">
        <ellipse cx="210" cy="252" rx="10" ry="12" fill="#fff" />
      </g>
    );
  }
  if (kind === "tiny") {
    return (
      <g data-ms-part="mouth">
        <path d="M198 250 Q210 256 222 250" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "wry") {
    return (
      <g data-ms-part="mouth">
        <path d="M188 248 Q210 258 232 244" {...common} strokeWidth="7" />
      </g>
    );
  }
  if (kind === "kiss") {
    return (
      <g data-ms-part="mouth">
        <path d="M204 248 Q210 256 216 248" {...common} strokeWidth="6" />
      </g>
    );
  }
  if (kind === "talk") {
    return (
      <g data-ms-part="mouth">
        <ellipse cx="210" cy="252" rx="9" ry="7" fill="#fff">
          <animate attributeName="ry" values="7;11;7" dur="0.45s" repeatCount="indefinite" />
        </ellipse>
      </g>
    );
  }
  return (
    <g data-ms-part="mouth">
      <path d="M186 246 Q210 264 234 246" {...common}>
        <animate attributeName="d" values="M186 246 Q210 264 234 246;M188 248 Q210 260 232 248;M186 246 Q210 264 234 246" dur="3.4s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function Mote({ x, y, uid, spin = false, ring = false }) {
  return (
    <g transform={`translate(${x} ${y})`} className={spin ? "pp-spin" : undefined}>
      <circle cx="0" cy="0" r="22" fill={`url(#${uid}-glow)`} />
      <rect x="-8" y="-8" width="16" height="16" rx="5" fill="var(--ms-core)" stroke="var(--ms-accent)" strokeWidth="3" />
      {ring && (
        <circle cx="0" cy="0" r="14" fill="none" stroke="var(--ms-accent)" strokeWidth="2" opacity="0.55" className="pp-pulse" />
      )}
    </g>
  );
}

function Props({ g, uid }) {
  const prop = g.prop;
  if (!prop) return null;

  if (prop === "mote") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <g>
          <Mote x={352} y={148} uid={uid} />
          <animateTransform attributeName="transform" type="translate" values="0 0;-8 12;0 24;8 12;0 0" dur="5s" repeatCount="indefinite" />
        </g>
      </g>
    );
  }
  if (prop === "spark" || prop === "happyMote") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <Mote x={96} y={140} uid={uid} ring />
        <g fill="var(--ms-accent)">
          <g transform="translate(62 96) scale(.7)">
            <path className="pp-twinkle" d={STAR} />
          </g>
          <g transform="translate(120 88) scale(.55)">
            <path className="pp-twinkle" d={STAR} />
          </g>
          <g transform="translate(330 70) scale(.65)">
            <path className="pp-twinkle" d={STAR} />
          </g>
        </g>
      </g>
    );
  }
  if (prop === "think" || prop === "loading") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <Mote x={340} y={110} uid={uid} spin ring={prop === "loading"} />
      </g>
    );
  }
  if (prop === "confetti") {
    return (
      <g data-ms-part="prop" className="pp-pop" fill="var(--ms-accent)">
        {[
          [90, 90], [320, 80], [110, 140], [340, 150], [70, 200], [350, 210],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(.7)`}>
            <path className="pp-rise" style={{ animationDelay: `${i * 0.18}s` }} d={STAR} />
          </g>
        ))}
      </g>
    );
  }
  if (prop === "hearts" || prop === "kiss") {
    return (
      <g data-ms-part="prop" className="pp-pop" fill="#FF8AA0">
        <g transform="translate(330 120) scale(1.1)">
          <path className="pp-drift" d={HEART} />
        </g>
        <g transform="translate(90 130) scale(.9)">
          <path className="pp-drift" style={{ animationDelay: ".4s" }} d={HEART} />
        </g>
        {prop === "kiss" && (
          <g transform="translate(300 180) scale(.75)">
            <path className="pp-drift" style={{ animationDelay: ".7s" }} d={HEART} />
          </g>
        )}
      </g>
    );
  }
  if (prop === "tears") {
    return (
      <g data-ms-part="prop" className="pp-pop" fill="#8EC8FF">
        <ellipse className="pp-tear" cx="188" cy="230" rx="4" ry="6" />
        <ellipse className="pp-tear" style={{ animationDelay: ".5s" }} cx="232" cy="230" rx="4" ry="6" />
      </g>
    );
  }
  if (prop === "zzz") {
    return (
      <g data-ms-part="prop" className="pp-pop" fill="var(--ms-accent)" fontFamily="Outfit,sans-serif" fontWeight="700" fontSize="22">
        <text className="pp-drift" x="320" y="120">Z</text>
        <text className="pp-drift" style={{ animationDelay: ".5s" }} x="340" y="95" fontSize="16">z</text>
      </g>
    );
  }
  if (prop === "steam") {
    return (
      <g data-ms-part="prop" className="pp-pop" stroke="var(--ms-accent)" strokeWidth="3" fill="none" opacity="0.7">
        <path className="pp-rise" d="M160 150 Q154 130 162 110" />
        <path className="pp-rise" style={{ animationDelay: ".3s" }} d="M260 150 Q266 130 258 110" />
      </g>
    );
  }
  if (prop === "question" || prop === "oops") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <circle cx="340" cy="120" r="18" fill="var(--ms-core)" stroke="var(--ms-accent)" strokeWidth="3" />
        <text x="340" y="127" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--ms-features)" fontFamily="Outfit,sans-serif">
          {prop === "oops" ? "!" : "?"}
        </text>
      </g>
    );
  }
  if (prop === "alarm" || prop === "error") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <path d="M340 100 L355 140 L325 140 Z" fill="var(--ms-accent)" stroke="var(--ms-features)" strokeWidth="3" strokeLinejoin="round" className="pp-pulse" />
        <circle cx="340" cy="132" r="2.5" fill="var(--ms-features)" />
        <path d="M340 112 L340 124" stroke="var(--ms-features)" strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (prop === "success" || prop === "yes" || prop === "proud") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <circle cx="340" cy="120" r="22" fill={`url(#${uid}-glow)`} />
        <circle cx="340" cy="120" r="16" fill="var(--ms-core)" stroke="var(--ms-accent)" strokeWidth="3" />
        <path d="M330 120 L337 128 L352 110" fill="none" stroke="var(--ms-features)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  if (prop === "no" || prop === "empty") {
    return (
      <g data-ms-part="prop" className="pp-pop" opacity={prop === "empty" ? 0.55 : 1}>
        <circle cx="340" cy="130" r="16" fill="none" stroke="var(--ms-accent)" strokeWidth="3" strokeDasharray={prop === "empty" ? "4 4" : undefined} />
        {prop === "no" && <path d="M332 122 L348 138 M348 122 L332 138" stroke="var(--ms-features)" strokeWidth="3" strokeLinecap="round" />}
      </g>
    );
  }
  if (prop === "search") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <circle cx="330" cy="130" r="14" fill="none" stroke="var(--ms-accent)" strokeWidth="4" />
        <path d="M340 140 L354 156" stroke="var(--ms-accent)" strokeWidth="4" strokeLinecap="round" />
      </g>
    );
  }
  if (prop === "pad" || prop === "work") {
    return (
      <g data-ms-part="prop" className="pp-pop">
        <rect x="318" y="300" width="44" height="52" rx="6" fill="var(--ms-core)" stroke="var(--ms-features)" strokeWidth="3" />
        <path d="M328 316 H352 M328 328 H348 M328 340 H344" stroke="var(--ms-features)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
        <rect x="346" y="310" width="2" height="10" fill="var(--ms-accent)">
          <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
        </rect>
      </g>
    );
  }
  if (prop === "speech" || prop === "listen" || prop === "notes" || prop === "encourage") {
    return (
      <g data-ms-part="prop" className="pp-pop" stroke="var(--ms-accent)" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.85">
        <path className="pp-twinkle" d="M320 170 Q340 160 352 172" />
        <path className="pp-twinkle" style={{ animationDelay: ".2s" }} d="M322 188 Q344 182 356 196" />
        <path className="pp-twinkle" style={{ animationDelay: ".4s" }} d="M324 206 Q346 204 356 218" />
      </g>
    );
  }
  if (prop === "point" || prop === "highFive" || prop === "clap") {
    return (
      <g data-ms-part="crest" className="pp-pop" fill="var(--ms-accent)">
        <g transform="translate(80 150) scale(.8)">
          <path className="pp-twinkle" d={STAR} />
        </g>
        <g transform="translate(340 100) scale(.65)">
          <path className="pp-twinkle" style={{ animationDelay: ".35s" }} d={STAR} />
        </g>
      </g>
    );
  }
  if (prop === "speed" || prop === "trail") {
    return (
      <g data-ms-part="prop" className="pp-pop" stroke="var(--ms-accent)" strokeWidth="8" fill="none" strokeLinecap="round">
        <path d="M90 330 Q56 336 30 352" opacity="0.9" />
        <path d="M96 350 Q56 360 32 378" opacity="0.85" />
        <path d="M100 370 Q62 384 40 404" opacity="0.75" />
        <path d="M108 390 Q72 408 54 428" opacity="0.6" />
        <animate attributeName="opacity" values="1;0.7;1" dur="1.4s" repeatCount="indefinite" />
      </g>
    );
  }
  if (prop === "waiting") {
    return (
      <g data-ms-part="prop" className="pp-pop" fill="var(--ms-accent)">
        <circle className="pp-pulse" cx="320" cy="130" r="5" />
        <circle className="pp-pulse" style={{ animationDelay: ".2s" }} cx="338" cy="130" r="5" />
        <circle className="pp-pulse" style={{ animationDelay: ".4s" }} cx="356" cy="130" r="5" />
      </g>
    );
  }
  return null;
}

function PollenMeter({ signal }) {
  const blades = [
    ["M320 320 Q346 306 366 314", "#E87A1E", 0.9],
    ["M324 336 Q354 328 374 338", "#F5942E", 0.9],
    ["M326 352 Q358 350 378 362", "var(--ms-accent)", 0.9],
    ["M326 368 Q358 372 376 386", "var(--ms-accent)", 0.8],
    ["M324 384 Q354 394 370 408", "#FFD27A", 0.7],
    ["M320 400 Q346 414 360 428", "var(--ms-core)", 0.55],
    ["M314 414 Q334 430 344 444", "var(--ms-core)", 0.4],
  ];
  const lit = Math.max(1, Math.round((signal / 100) * blades.length));
  return (
    <g className="ms-signal-fan" data-ms-part="instrument">
      {blades.map(([d, stroke, baseOp], i) => (
        <path
          key={i}
          d={d}
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          opacity={i < lit ? baseOp : 0.12}
        />
      ))}
      <animate attributeName="opacity" values="1;0.75;1" dur="3.4s" repeatCount="indefinite" />
    </g>
  );
}

function Leaves({ leafL, leafR, wave, clap }) {
  const leftDur = wave ? "1.6s" : clap ? "0.42s" : "3.4s";
  const leftValues = wave
    ? `0 206 386;${leafL} 206 386;-10 206 386;${leafL} 206 386;0 206 386`
    : clap
      ? `0 206 386;${leafL} 206 386;${leafL} 206 386;0 206 386`
      : `0 206 386;${leafL - 2} 206 386;${leafL + 2} 206 386;0 206 386`;
  return (
    <g data-ms-part="leaves">
      <g>
        <animateTransform attributeName="transform" type="rotate" values={leftValues} dur={leftDur} repeatCount="indefinite" />
        <path
          d="M206 386 C178 362 134 352 94 366 C106 374 108 382 100 390 C112 394 114 402 106 412 C144 422 182 410 206 398 Z"
          fill="var(--ms-base)"
          stroke="var(--ms-features)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path d="M200 390 Q156 380 108 388" fill="none" stroke="#248746" strokeWidth="4" strokeLinecap="round" />
        <path d="M168 384 Q160 374 148 368 M168 384 Q158 394 144 400" fill="none" stroke="#248746" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      </g>
      <g>
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`0 214 386;${leafR} 214 386;${-leafR * 0.3} 214 386;0 214 386`}
          dur={clap ? "0.42s" : "3s"}
          begin="0.35s"
          repeatCount="indefinite"
        />
        <path
          d="M214 386 C242 362 286 352 326 366 C314 374 312 382 320 390 C308 394 306 402 314 412 C276 422 238 410 214 398 Z"
          fill="#248746"
          stroke="var(--ms-features)"
          strokeWidth="7"
          strokeLinejoin="round"
        />
        <path d="M220 390 Q264 380 312 388" fill="none" stroke="var(--ms-base)" strokeWidth="4" strokeLinecap="round" />
        <path d="M252 384 Q260 374 272 368 M252 384 Q262 394 276 400" fill="none" stroke="var(--ms-base)" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      </g>
      <circle cx="210" cy="388" r="16" fill="var(--ms-base)" stroke="var(--ms-features)" strokeWidth="7" />
    </g>
  );
}

function Petals() {
  return (
    <g data-ms-part="body" stroke="var(--ms-features)" strokeWidth="8">
      <circle cx="210" cy="110" r="52" fill="var(--ms-top)" />
      <circle cx="130" cy="146" r="52" fill="var(--ms-mid)" />
      <circle cx="290" cy="146" r="52" fill="var(--ms-mid)" />
      <circle cx="104" cy="226" r="52" fill="var(--ms-top)" />
      <circle cx="316" cy="226" r="52" fill="var(--ms-top)" />
      <circle cx="146" cy="300" r="52" fill="var(--ms-mid)" />
      <circle cx="274" cy="300" r="52" fill="var(--ms-mid)" />
      <circle cx="210" cy="222" r="108" fill="var(--ms-top)" />
      <circle cx="210" cy="222" r="72" fill={`url(#pp-seed)`} stroke="var(--ms-features)" strokeWidth="8" />
      <path d="M158 176 Q184 158 214 162" fill="none" stroke="#3A3A3A" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
    </g>
  );
}

function Cape() {
  return (
    <g data-ms-part="cape">
      <path
        d="M164 296 C120 330 84 386 76 440 C110 414 128 424 132 444 C158 420 176 428 178 450 C204 416 216 352 216 316 Z"
        fill="#F5942E"
        stroke="var(--ms-features)"
        strokeWidth="7"
        strokeLinejoin="round"
      >
        <animate
          attributeName="d"
          values="M164 296 C120 330 84 386 76 440 C110 414 128 424 132 444 C158 420 176 428 178 450 C204 416 216 352 216 316 Z;M164 296 C114 324 78 372 64 428 C102 408 122 420 128 440 C154 412 174 422 178 446 C204 412 216 352 216 316 Z;M164 296 C120 330 84 386 76 440 C110 414 128 424 132 444 C158 420 176 428 178 450 C204 416 216 352 216 316 Z"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </path>
      <path d="M176 320 Q140 366 118 414" fill="none" stroke="#C73434" strokeWidth="4" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

export function PoppySVG({ gesture = "idle", paused = false }) {
  const g = byKey(gesture);
  const look = g.look || [0, 0];
  const lift = g.lift || 0;
  const uid = `pp-${g.key}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-label={`Pixel Poppy, ${g.label}`}
      className={`ms-root pp-svg pp-g-${g.key}`}
      style={{ "--ms-glow": 0.45 }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id="pp-seed" cx="0.5" cy="0.38" r="0.85">
          <stop offset="0" stopColor="#3A3A3A" />
          <stop offset="1" stopColor="var(--ms-features)" />
        </radialGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--ms-core)" />
          <stop offset="0.6" stopColor="var(--ms-accent)" />
          <stop offset="1" stopColor="var(--ms-accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g data-ms-part="halo">
        <ellipse className="ms-glow-halo" cx="210" cy="236" rx="150" ry="160" fill={`url(#${uid}-glow)`} />
      </g>

      <g data-ms-part="shadow">
        <ellipse className="pp-shadow" cx="210" cy="470" rx="84" ry="14" fill="var(--ms-features)" opacity="0.16" />
      </g>

      <g id="ms-hit">
        <rect x="50" y="30" width="320" height="440" fill="transparent" />
      </g>

      <g transform={`translate(0,${lift})`}>
        <g className="pp-float">
          <g transform={`rotate(${g.lean || 0} 210 388)`}>
            {g.sway && (
              <animateTransform attributeName="transform" type="rotate" additive="sum" values="-3;3;-3" dur="1.1s" repeatCount="indefinite" />
            )}
            {g.shake && (
              <animateTransform attributeName="transform" type="translate" additive="sum" values="-2 0;2 0;-2 0" dur="0.11s" repeatCount="indefinite" />
            )}

            {g.cape && <Cape />}
            <Leaves leafL={g.leafL ?? L.rest} leafR={g.leafR ?? 4} wave={!!g.wave} clap={!!g.clap} />
            <Petals />

            <g className="pp-pop" transform={`translate(${look[0]},${look[1]})`}>
              <Brows kind={g.brow} />
              <Eyes kind={g.eye} look={look} />
              <g data-ms-part="blush" opacity="0.55">
                <ellipse cx="166" cy="236" rx="11" ry="6" fill="#E87A1E" />
                <ellipse cx="254" cy="236" rx="11" ry="6" fill="#E87A1E" />
              </g>
              <Mouth kind={g.mouth} />
            </g>

            <PollenMeter signal={g.signal ?? 68} />
            <Props g={g} uid={uid} />

            <g data-ms-part="accessory" opacity="0.85">
              {(g.key === "celebrate" || g.key === "flying" || g.key === "proud") && (
                <g>
                  <circle cx="346" cy="120" r="13" fill="none" stroke="var(--ms-accent)" strokeWidth="2" className="pp-pulse" />
                </g>
              )}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export const POSE_SOURCE = {
  slug: "poppy",
  meta: {
    name: "Pixel Poppy",
    tagline: "Small flower, big cheer. Keep going.",
    product: "Onboarding and micro-interaction companion",
    accent: ACCENT,
    stage: THEMES.primary.stage,
    glowLabel: "Pollen Glow",
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
  renderPose: (key) => <PoppySVG gesture={key} />,
};

export default function PoppyMascot() {
  return (
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <PoppySVG gesture="idle" />
    </div>
  );
}
