"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/*
 * GRANARY — an acorn woodpecker for a knowledge workspace.
 *
 * The character's product metaphor is biological: acorn woodpeckers maintain
 * communal granaries, storing acorns in individually drilled holes. A single
 * 0–100 cache value drives both the tree inventory and the product meter.
 *
 * Pose data describes intent; Bird, Wing, Face, and PoseProp own the drawing.
 * This keeps 24 performances consistent without duplicating the illustration.
 */

/* ---------- colour helpers ---------- */
const hexToRgb = (hex) => {
  const raw = hex.replace("#", "");
  const value =
    raw.length === 3
      ? raw
          .split("")
          .map((character) => character + character)
          .join("")
      : raw;
  const number = Number.parseInt(value, 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
};

const toHex = (red, green, blue) =>
  `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;

const mix = (from, to, amount) => {
  const [fromR, fromG, fromB] = hexToRgb(from);
  const [toR, toG, toB] = hexToRgb(to);
  return toHex(
    fromR + (toR - fromR) * amount,
    fromG + (toG - fromG) * amount,
    fromB + (toB - fromB) * amount
  );
};

const darken = (colour, amount) => mix(colour, "#080B0F", amount);
const lighten = (colour, amount) => mix(colour, "#FFF9EA", amount);
const rgba = (colour, alpha) => {
  const [red, green, blue] = hexToRgb(colour);
  return `rgba(${red},${green},${blue},${alpha})`;
};

/* ---------- brand themes ---------- */
const THEMES = {
  oak: {
    name: "Oak Archive",
    plumage: "#202A31",
    crown: "#D84A3A",
    cream: "#F3E8CD",
    acorn: "#C98A3B",
    stage: "#18241F",
  },
  ink: {
    name: "Ink & Paper",
    plumage: "#252735",
    crown: "#E05445",
    cream: "#F5EBDD",
    acorn: "#C68D55",
    stage: "#1B1C28",
  },
  canyon: {
    name: "Canyon Oak",
    plumage: "#302A29",
    crown: "#C94735",
    cream: "#F1DFC5",
    acorn: "#D59A4B",
    stage: "#2A1F1B",
  },
  blueOak: {
    name: "Blue Oak",
    plumage: "#1D3440",
    crown: "#E35D49",
    cream: "#EDF0E6",
    acorn: "#C18A42",
    stage: "#13262C",
  },
  moss: {
    name: "Moss Library",
    plumage: "#26342D",
    crown: "#CF4E3E",
    cream: "#EFE6CE",
    acorn: "#B9823D",
    stage: "#17251D",
  },
};

const BRAND = "#E8A84A";
const SHELL_INK = "#11150F";

const derive = (theme) => ({
  ...theme,
  ink: darken(theme.plumage, 0.58),
  wing: darken(theme.plumage, 0.08),
  wingEdge: lighten(theme.plumage, 0.16),
  crownLight: lighten(theme.crown, 0.24),
  creamShade: darken(theme.cream, 0.12),
  acornLight: lighten(theme.acorn, 0.25),
  acornDark: darken(theme.acorn, 0.28),
  bill: mix(theme.plumage, theme.cream, 0.14),
  billDark: darken(theme.plumage, 0.34),
  foot: "#667174",
  claw: "#30383A",
  bark: darken(theme.acorn, 0.24),
  barkLight: mix(theme.acorn, theme.cream, 0.28),
  leaf: "#70935B",
  leafDark: "#405D38",
  sky: "#92C9CF",
  blush: "#D77B68",
});

/* ---------- studio styling ---------- */
const SHELL_CSS = `
  .gr-root{min-height:100vh;color:#F5EEDC;font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif;
    background:#101611;
    background-image:radial-gradient(900px 520px at 12% -10%,rgba(232,168,74,.13),transparent 62%),
      radial-gradient(760px 440px at 94% 106%,rgba(93,139,99,.12),transparent 64%)}
  .gr-card{background:rgba(255,249,232,.042);border:1px solid rgba(232,168,74,.17);
    border-radius:22px;box-shadow:0 18px 60px rgba(0,0,0,.16);backdrop-filter:blur(9px)}
  .gr-eyebrow{font-size:11px;line-height:1.2;letter-spacing:.22em;text-transform:uppercase;color:${BRAND}}
  .gr-pill{border:1px solid rgba(232,168,74,.3);border-radius:999px;padding:7px 13px;
    min-height:32px;font-size:12.5px;font-weight:650;line-height:1;color:#F5EEDC;background:transparent;
    cursor:pointer;transition:border-color .16s ease,background .16s ease,color .16s ease,transform .16s ease}
  .gr-pill:hover{border-color:${BRAND};transform:translateY(-1px)}
  .gr-pill:focus-visible,.gr-swatch:focus-visible{outline:2px solid #FFF0C9;outline-offset:3px}
  .gr-pill.on{border-color:${BRAND};background:${BRAND};color:${SHELL_INK}}
  .gr-swatch{width:38px;height:38px;border:2px solid transparent;border-radius:12px;cursor:pointer;
    transition:transform .15s ease,border-color .15s ease}
  .gr-swatch:hover{transform:scale(1.08)}
  .gr-swatch.on{border-color:#FFF2D0}
  .gr-checker{background-image:linear-gradient(45deg,rgba(255,255,255,.045) 25%,transparent 25%),
    linear-gradient(-45deg,rgba(255,255,255,.045) 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,rgba(255,255,255,.045) 75%),
    linear-gradient(-45deg,transparent 75%,rgba(255,255,255,.045) 75%);
    background-size:22px 22px;background-position:0 0,0 11px,11px -11px,-11px 0}
  .gr-range{appearance:none;height:9px;border-radius:999px;outline:none;cursor:pointer;
    background:linear-gradient(90deg,#76502C 0%,#C88938 50%,#E7B45E 100%)}
  .gr-range::-webkit-slider-thumb{appearance:none;width:20px;height:20px;border-radius:50%;
    border:3px solid #1A160F;background:#FFF0CC;cursor:pointer}
  .gr-range::-moz-range-thumb{width:16px;height:16px;border-radius:50%;
    border:3px solid #1A160F;background:#FFF0CC;cursor:pointer}
  .gr-spark{position:absolute;pointer-events:none;animation:gr-shell-spark .9s cubic-bezier(.2,.75,.25,1) forwards}
  @keyframes gr-shell-spark{0%{opacity:0;transform:translate(0,0) scale(.35)}
    18%{opacity:1}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(1)}}
  @media (prefers-reduced-motion:reduce){
    .gr-root *{scroll-behavior:auto!important}
    .gr-pill,.gr-swatch{transition:none}
    .gr-pill:hover,.gr-swatch:hover{transform:none}
    .gr-spark{display:none}
  }
`;

/* SVG animations use transforms only where their coordinate system is explicit. */
const SVG_CSS = `
  .gw-svg{display:block;user-select:none;-webkit-user-select:none}
  .gw-g-flying .gw-float{animation:gw-float 2.4s ease-in-out infinite}
  .gw-shadow{opacity:.18}
  .gw-g-flying .gw-shadow{animation:gw-shadow 2.4s ease-in-out infinite}
  .gw-eyes{transition:transform .12s ease-out}
  .gw-pop{animation:gw-pop .22s ease-out}
  .gw-pulse{animation:gw-pulse 1.7s ease-in-out infinite}
  .gw-ring{animation:gw-ring 1.55s ease-out infinite}
  .gw-rise{animation:gw-rise 2.5s ease-out infinite}
  .gw-fall{animation:gw-fall 2.8s linear infinite}
  .gw-drift{animation:gw-drift 3s ease-out infinite}
  .gw-tick{animation:gw-tick .62s ease-out infinite}
  .gw-shine{animation:gw-shine 2.1s ease-in-out infinite}
  .gw-write{animation:gw-write 1.2s ease-in-out infinite}
  .gw-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes gw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
  @keyframes gw-shadow{0%,100%{opacity:.22}50%{opacity:.12}}
  @keyframes gw-pop{from{opacity:0}to{opacity:1}}
  @keyframes gw-pulse{0%,100%{opacity:.32}50%{opacity:1}}
  @keyframes gw-ring{0%{opacity:.9}72%,100%{opacity:0;transform:translateX(8px)}}
  @keyframes gw-rise{0%{opacity:.42;transform:translateY(10px)}24%{opacity:1}
    82%{opacity:.85}100%{opacity:.28;transform:translateY(-42px)}}
  @keyframes gw-fall{0%{opacity:.3;transform:translateY(-20px)}12%{opacity:1}
    84%{opacity:.9}100%{opacity:.2;transform:translateY(145px)}}
  @keyframes gw-drift{0%{opacity:.42;transform:translate(0,8px)}22%{opacity:1}
    82%{opacity:.82}100%{opacity:.24;transform:translate(14px,-30px)}}
  @keyframes gw-tick{0%,100%{opacity:.2}45%{opacity:1}}
  @keyframes gw-shine{0%,100%{opacity:.3}50%{opacity:1}}
  @keyframes gw-write{0%,100%{transform:translateX(0)}50%{transform:translateX(-7px)}}
  @media (prefers-reduced-motion:reduce){.gw-svg *{animation:none!important;transition:none!important}}
`;

/* ---------- performance library: 24 distinct use cases ---------- */
const GESTURES = [
  {
    key: "idle",
    label: "Idle",
    cat: "Core",
    use: "Home · ready state",
    tip: "Alert on the branch, breathing softly while the pale eyes follow your cursor.",
    eyes: "open",
    beak: "closed",
    wings: "rest",
    track: true,
  },
  {
    key: "greet",
    label: "Hello",
    cat: "Core",
    use: "Welcome · onboarding",
    tip: "Bright eyes and a small waka-waka greeting.",
    eyes: "happy",
    beak: "smile",
    wings: "wave",
    prop: "hello",
  },
  {
    key: "listening",
    label: "Listening",
    cat: "Core",
    use: "Voice input · feedback",
    tip: "Head cocked toward the sound as listening rings gather nearby.",
    eyes: "open",
    beak: "closed",
    wings: "listen",
    tilt: 6,
    look: [4, -2],
    prop: "sound",
  },
  {
    key: "thinking",
    label: "Thinking",
    cat: "Core",
    use: "Processing · reflection",
    tip: "Eyes search upward as one acorn of an idea takes shape.",
    eyes: "open",
    beak: "flat",
    wings: "think",
    look: [4, -6],
    brow: "oneUp",
    prop: "thought",
  },
  {
    key: "searching",
    label: "Searching",
    cat: "Core",
    use: "Query · lookup",
    tip: "Granary scans the archive through a leaf-shaped magnifier.",
    eyes: "focus",
    beak: "closed",
    wings: "inspect",
    look: [5, 1],
    prop: "magnifier",
  },
  {
    key: "focused",
    label: "Focused",
    cat: "Core",
    use: "Deep work",
    tip: "Low stance, steady gaze, and a quiet focus frame with no distracting motion.",
    eyes: "focus",
    beak: "flat",
    wings: "tuck",
    brow: "focus",
    prop: "focus",
  },
  {
    key: "flying",
    label: "In flight",
    cat: "Core",
    use: "Transfer · sync",
    tip: "Wings fully spread; the three white field marks read clearly in motion.",
    eyes: "open",
    beak: "smile",
    wings: "flight",
    lift: -13,
    prop: "wind",
  },
  {
    key: "collect",
    label: "Collect",
    cat: "Granary",
    use: "Save item",
    tip: "A fresh acorn settles at the breast, ready to join the collection.",
    eyes: "happy",
    beak: "smile",
    wings: "carry",
    prop: "acorn",
  },
  {
    key: "stash",
    label: "Stash",
    cat: "Granary",
    use: "Store · archive",
    tip: "The signature action: a precise peck seats an acorn into the oak granary.",
    eyes: "focus",
    beak: "closed",
    wings: "brace",
    tilt: 8,
    prop: "stash",
    peck: true,
  },
  {
    key: "retrieve",
    label: "Retrieve",
    cat: "Granary",
    use: "Restore · open",
    tip: "One cached acorn comes back out, intact and exactly where it was left.",
    eyes: "open",
    beak: "smile",
    wings: "present",
    look: [5, 2],
    prop: "retrieve",
  },
  {
    key: "inspect",
    label: "Inspect",
    cat: "Granary",
    use: "Review detail",
    tip: "A careful quality check before the find joins the shared store.",
    eyes: "focus",
    beak: "flat",
    wings: "inspect",
    look: [5, 2],
    prop: "acornInspect",
  },
  {
    key: "sort",
    label: "Sort",
    cat: "Granary",
    use: "Organize · filter",
    tip: "Three finds settle into clear groups instead of one untidy pile.",
    eyes: "open",
    beak: "smile",
    wings: "sort",
    prop: "sort",
  },
  {
    key: "catalog",
    label: "Catalog",
    cat: "Granary",
    use: "Add metadata",
    tip: "Granary labels the entry with a bark-pencil and a tidy index card.",
    eyes: "focus",
    beak: "closed",
    wings: "write",
    look: [2, 5],
    prop: "catalog",
  },
  {
    key: "share",
    label: "Share",
    cat: "Granary",
    use: "Send · collaborate",
    tip: "A find is offered outward; the communal granary works because knowledge moves.",
    eyes: "happy",
    beak: "smile",
    wings: "present",
    prop: "share",
  },
  {
    key: "protect",
    label: "Protect",
    cat: "Granary",
    use: "Private · secured",
    tip: "The oak shield locks into place around the protected store.",
    eyes: "focus",
    beak: "flat",
    wings: "guard",
    brow: "focus",
    prop: "shield",
  },
  {
    key: "cacheFull",
    label: "Cache full",
    cat: "Granary",
    use: "Storage milestone",
    tip: "Every slot glows warm: a full season of useful finds, safely stored.",
    eyes: "happy",
    beak: "smile",
    wings: "cheer",
    cache: 100,
    prop: "full",
  },
  {
    key: "found",
    label: "Found it",
    cat: "Signals",
    use: "Search success",
    tip: "The exact result pops forward with a crisp little discovery spark.",
    eyes: "wide",
    beak: "smile",
    wings: "point",
    prop: "found",
  },
  {
    key: "celebrate",
    label: "Celebrate",
    cat: "Signals",
    use: "Goal complete",
    tip: "Crown high, oak leaves and gold confetti fall around the celebration.",
    eyes: "happy",
    beak: "open",
    wings: "cheer",
    prop: "confetti",
  },
  {
    key: "proud",
    label: "Proud",
    cat: "Signals",
    use: "Personal best",
    tip: "Chest forward, chin high, and a polished acorn badge at the heart.",
    eyes: "happy",
    beak: "smile",
    wings: "hips",
    tilt: -4,
    prop: "badge",
  },
  {
    key: "curious",
    label: "Curious",
    cat: "Signals",
    use: "Suggestion · explore",
    tip: "A deep head tilt and one lifted brow invite a closer look.",
    eyes: "open",
    beak: "smile",
    wings: "ponder",
    tilt: 10,
    look: [4, -2],
    brow: "oneUp",
    prop: "question",
  },
  {
    key: "confused",
    label: "Confused",
    cat: "Signals",
    use: "No match · unclear",
    tip: "The eyes disagree while a crooked question mark hangs nearby.",
    eyes: "uneven",
    beak: "flat",
    wings: "shrug",
    tilt: -5,
    brow: "oneUp",
    prop: "question",
  },
  {
    key: "warning",
    label: "Heads up",
    cat: "Signals",
    use: "Important notice",
    tip: "Eyes widen as an acorn-shaped alert stays firm but friendly.",
    eyes: "wide",
    beak: "open",
    wings: "brace",
    brow: "up",
    prop: "warning",
  },
  {
    key: "sorry",
    label: "Sorry",
    cat: "Signals",
    use: "Recoverable error",
    tip: "Soft eyes and one rain-blue tear—never a dead-end screen.",
    eyes: "sad",
    beak: "frown",
    wings: "fold",
    brow: "sad",
    prop: "tear",
  },
  {
    key: "rest",
    label: "Rest",
    cat: "Signals",
    use: "Paused · offline",
    tip: "Crown settled, eyes closed, and the archive quiet beneath an oak leaf.",
    eyes: "sleep",
    beak: "closed",
    wings: "fold",
    tilt: 4,
    prop: "sleep",
  },
];

const CATEGORIES = ["Core", "Granary", "Signals"];
const gestureByKey = (key) =>
  GESTURES.find((gesture) => gesture.key === key) ?? GESTURES[0];

/* ---------- small drawing primitives ---------- */
const STAR_PATH =
  "M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z";

function Star({ x, y, scale = 1, fill, className, delay }) {
  return (
    <g transform={`translate(${x},${y}) scale(${scale})`}>
      <path
        d={STAR_PATH}
        fill={fill}
        className={className}
        style={delay ? { animationDelay: delay } : undefined}
      />
    </g>
  );
}

function Acorn({ x, y, scale = 1, rotate = 0, palette, className }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale})`}>
      <g className={className}>
        <path
          d="M0,-10 C11,-10 15,-2 12,8 C9,20 0,27 0,27 C0,27 -9,20 -12,8 C-15,-2 -11,-10 0,-10 Z"
          fill={palette.acorn}
        />
        <path
          d="M-13,-7 Q0,-18 13,-7 L10,-1 Q0,-8 -10,-1 Z"
          fill={palette.acornDark}
        />
        <path
          d="M0,-13 Q1,-21 7,-23"
          fill="none"
          stroke={palette.acornDark}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M-5,3 Q0,-1 5,3"
          fill="none"
          stroke={palette.acornLight}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity=".75"
        />
      </g>
    </g>
  );
}

function OakLeaf({ x, y, scale = 1, rotate = 0, palette, className, delay }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale})`}>
      <g
        className={className}
        style={delay ? { animationDelay: delay } : undefined}
      >
        <path
          d="M0,15 C-10,9 -12,2 -7,-2 C-14,-9 -7,-16 0,-12 C7,-16 14,-9 7,-2 C12,2 10,9 0,15 Z"
          fill={palette.leaf}
        />
        <path
          d="M0,-11 L0,20"
          stroke={palette.leafDark}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

function Eye({ kind, x, palette }) {
  const closed = kind === "sleep" || kind === "happy";
  if (closed) {
    const bend = kind === "happy" ? -7 : 7;
    return (
      <path
        d={`M${x - 10},265 Q${x},${265 + bend} ${x + 10},265`}
        fill="none"
        stroke={palette.ink}
        strokeWidth="6"
        strokeLinecap="round"
      />
    );
  }

  const sad = kind === "sad";
  const uneven = kind === "uneven";
  const wide = kind === "wide";
  const focus = kind === "focus";
  const radiusX = uneven && x > 210 ? 7 : wide ? 12 : focus ? 8 : 10;
  const radiusY = uneven && x > 210 ? 9 : wide ? 14 : focus ? 11 : 13;
  const pupilX = focus ? 4.5 : 5.5;
  const pupilY = focus ? 7 : 8;

  return (
    <g transform={sad ? `rotate(${x < 210 ? -8 : 8} ${x} 265)` : undefined}>
      <ellipse
        cx={x}
        cy="265"
        rx={radiusX}
        ry={radiusY}
        fill={palette.cream}
        stroke={palette.ink}
        strokeWidth="3"
      >
        {kind === "open" && (
          <animate
            attributeName="ry"
            values={`${radiusY};${radiusY};1;${radiusY};${radiusY}`}
            keyTimes="0;0.9;0.925;0.95;1"
            dur="5.4s"
            repeatCount="indefinite"
          />
        )}
      </ellipse>
      <ellipse
        cx={x + (focus ? 2 : 0)}
        cy={268}
        rx={pupilX}
        ry={pupilY}
        fill={palette.ink}
      />
      <circle cx={x - 2} cy="262" r="2.2" fill="#FFFFFF" opacity=".92" />
    </g>
  );
}

function Brows({ kind, palette }) {
  if (!kind) return null;
  const paths = {
    oneUp: ["M180,244 Q191,240 201,243", "M219,242 Q230,233 241,238"],
    focus: ["M180,240 Q191,236 202,243", "M218,243 Q229,236 240,240"],
    sad: ["M179,244 Q190,236 201,239", "M219,239 Q230,236 241,244"],
    up: ["M179,240 Q190,232 202,239", "M218,239 Q230,232 241,240"],
  }[kind];
  return (
    <g
      data-ms-part="brows"
      fill="none"
      stroke={palette.ink}
      strokeWidth="4.5"
      strokeLinecap="round"
    >
      <path d={paths[0]} />
      <path d={paths[1]} />
    </g>
  );
}

function Beak({ kind, palette }) {
  const shell =
    "M202,283 Q210,275 218,283 Q215,295 210,312 Q205,295 202,283 Z";

  if (kind === "open") {
    return (
      <g>
        <path
          d={shell}
          fill={palette.bill}
          stroke={palette.billDark}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M204,283 Q210,279 216,283 Q210,289 204,283 Z"
          fill={palette.billDark}
        />
      </g>
    );
  }

  return (
    <g>
      <path
        d={shell}
        fill={palette.bill}
        stroke={palette.billDark}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </g>
  );
}

function Foot({ x, mirrored = false, palette }) {
  return (
    <g
      transform={`translate(${x},0)${mirrored ? " scale(-1 1)" : ""}`}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M0,429 C0,433 -1,436 0,439"
        stroke={palette.foot}
        strokeWidth="4.2"
      />
      <g stroke={palette.claw} strokeWidth="2.3">
        <path
          d="M0,439 C-5,437 -10,437 -15,440 M0,439 C5,437 10,437 14,440"
          opacity=".72"
        />
        <path d="M-1,439 C-5,442 -7,446 -6,449 Q-5,451 -3,449" />
        <path d="M1,439 C5,442 7,446 6,449 Q5,451 3,449" />
      </g>
    </g>
  );
}

function Feet({ inFlight, palette }) {
  // Woodpeckers retract their feet into the belly plumage in flight.
  if (inFlight) return null;

  return (
    <g data-ms-part="limbs">
      <Foot x={190} palette={palette} />
      <Foot x={230} mirrored palette={palette} />
    </g>
  );
}

function Tail({ inFlight, palette }) {
  // The perched tail is occluded by the body and branch from this front view.
  if (!inFlight) return null;

  return (
    <g
      data-ms-part="tail"
      fill={palette.plumage}
      stroke={palette.wingEdge}
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path
        d="M187,398 C190,425 194,447 201,459 C205,443 207,423 208,404 Z"
      />
      <path
        d="M213,404 C214,423 216,443 220,459 C226,447 230,425 233,398 Z"
      />
      <path d="M201,402 C202,431 205,453 210,466 C215,453 218,431 219,402 Z" />
    </g>
  );
}

function FlightWing({ side, palette }) {
  const left = side === "left";
  const shoulderX = left ? 166 : 244;
  const wingPath = left
    ? "M0,7 C-20,-6 -48,-22 -80,-34 C-66,-10 -48,17 -17,29 C-8,27 -3,17 0,7 Z"
    : "M0,7 C20,-6 48,-22 80,-34 C66,-10 48,17 17,29 C8,27 3,17 0,7 Z";
  const patchPath = left
    ? "M-20,4 C-34,-5 -50,-14 -64,-18 C-57,-7 -47,3 -34,11 Z"
    : "M20,4 C34,-5 50,-14 64,-18 C57,-7 47,3 34,11 Z";

  return (
    <g data-ms-part="limbs" transform={`translate(${shoulderX},342)`}>
      <animateTransform
        attributeName="transform"
        type="rotate"
        additive="sum"
        values={left ? "0;-4;3;0" : "0;4;-3;0"}
        dur="1.25s"
        repeatCount="indefinite"
      />
      <path
        d={wingPath}
        fill={palette.wing}
        stroke={palette.ink}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path d={patchPath} fill={palette.cream} />
      <path
        d={
          left
            ? "M-57,-21 L-76,-28 M-51,-11 L-72,-15"
            : "M57,-21 L76,-28 M51,-11 L72,-15"
        }
        fill="none"
        stroke={palette.wingEdge}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function GranaryLog({ palette, cache, compact = false }) {
  const holes = [
    [0, -43],
    [-15, -30],
    [13, -25],
    [-5, -10],
    [17, 2],
    [-17, 12],
    [3, 25],
    [18, 38],
  ];
  const filled = Math.round((Math.max(0, Math.min(100, cache)) / 100) * holes.length);
  return (
    <g
      className="gw-cache"
      data-ms-part="instrument"
      transform={compact ? "translate(306,348) scale(.72)" : "translate(326,346)"}
    >
      <path
        d="M-30,-66 Q-22,-75 -13,-68 Q-3,-78 7,-69 Q19,-75 28,-64 L25,66 Q4,76 -25,65 Z"
        fill={palette.bark}
      />
      <path
        d="M-18,-62 Q-8,-69 -2,-62 L-5,62"
        fill="none"
        stroke={palette.barkLight}
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".7"
      />
      <path
        d="M17,-59 Q10,-20 17,59"
        fill="none"
        stroke={palette.acornDark}
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".65"
      />
      {holes.map(([x, y], index) => (
        <g key={`${x}-${y}`}>
          <ellipse cx={x} cy={y} rx="6.5" ry="5" fill={palette.ink} opacity=".78" />
          {index < filled && (
            <ellipse
              cx={x}
              cy={y}
              rx="5"
              ry="3.7"
              fill={index === filled - 1 ? palette.acornLight : palette.acorn}
            />
          )}
        </g>
      ))}
    </g>
  );
}

function PoseProp({ gesture, palette, cache }) {
  switch (gesture.prop) {
    case "hello":
      return (
        <g
          data-ms-part="effects"
          fill="none"
          stroke={palette.acornLight}
          strokeLinecap="round"
        >
          <path className="gw-ring" d="M114,226 Q99,240 111,255" strokeWidth="4" />
          <path
            className="gw-ring"
            d="M99,214 Q76,239 97,269"
            strokeWidth="3.5"
            style={{ animationDelay: ".35s" }}
          />
        </g>
      );
    case "sound":
      return (
        <g
          data-ms-part="effects"
          fill="none"
          stroke={palette.sky}
          strokeLinecap="round"
        >
          <path className="gw-ring" d="M273,226 Q290,240 278,258" strokeWidth="4" />
          <path
            className="gw-ring"
            d="M289,216 Q313,240 292,270"
            strokeWidth="3.5"
            style={{ animationDelay: ".42s" }}
          />
        </g>
      );
    case "thought":
      return (
        <g data-ms-part="effects">
          <circle cx="273" cy="215" r="5" fill={palette.cream} opacity=".55" />
          <circle cx="290" cy="194" r="8" fill={palette.cream} opacity=".72" />
          <Acorn x={311} y={164} scale={0.65} rotate={12} palette={palette} className="gw-pulse" />
        </g>
      );
    case "magnifier":
      return (
        <g data-ms-part="prop" transform="translate(294,302) rotate(-8)">
          <circle
            cx="0"
            cy="0"
            r="25"
            fill={rgba(palette.sky, 0.14)}
            stroke={palette.acornLight}
            strokeWidth="6"
          />
          <path d="M17,19 L36,42" stroke={palette.acornDark} strokeWidth="8" strokeLinecap="round" />
          <OakLeaf x={0} y={0} scale={0.55} rotate={18} palette={palette} />
        </g>
      );
    case "focus":
      return (
        <g
          data-ms-part="effects"
          fill="none"
          stroke={palette.acornLight}
          strokeWidth="4"
          strokeLinecap="round"
        >
          <path d="M151,229 L151,213 L169,213" />
          <path d="M251,213 L269,213 L269,229" />
          <path d="M151,299 L151,315 L169,315" />
          <path d="M251,315 L269,315 L269,299" />
        </g>
      );
    case "wind":
      return (
        <g
          data-ms-part="effects"
          fill="none"
          stroke={palette.sky}
          strokeWidth="4"
          strokeLinecap="round"
          opacity=".8"
        >
          <path className="gw-ring" d="M78,302 Q103,290 126,302" />
          <path className="gw-ring" d="M286,319 Q313,307 337,319" style={{ animationDelay: ".4s" }} />
        </g>
      );
    case "acorn":
      return (
        <g data-ms-part="prop">
          <Acorn
            x={210}
            y={391}
            scale={1.05}
            palette={palette}
            className="gw-pulse"
          />
        </g>
      );
    case "stash":
      return (
        <g>
          <GranaryLog palette={palette} cache={cache} />
          <g data-ms-part="prop">
            <Acorn x={293} y={283} scale={0.62} rotate={82} palette={palette} />
            <g
              className="gw-tick"
              stroke={palette.acornLight}
              strokeWidth="3"
              strokeLinecap="round"
            >
              <path d="M303,270 L313,260" />
              <path d="M308,278 L323,276" />
            </g>
          </g>
        </g>
      );
    case "retrieve":
      return (
        <g>
          <GranaryLog palette={palette} cache={cache} compact />
          <g data-ms-part="prop">
            <Acorn
              x={304}
              y={353}
              scale={0.75}
              rotate={-10}
              palette={palette}
              className="gw-rise"
            />
          </g>
        </g>
      );
    case "acornInspect":
      return (
        <g>
          <g data-ms-part="prop">
            <Acorn x={302} y={311} scale={0.88} rotate={-12} palette={palette} />
          </g>
          <g data-ms-part="effects">
            <Star
              x={325}
              y={280}
              scale={0.65}
              fill={palette.acornLight}
              className="gw-shine"
            />
          </g>
        </g>
      );
    case "sort":
      return (
        <g data-ms-part="prop">
          <Acorn x={138} y={411} scale={0.55} rotate={-10} palette={palette} />
          <Acorn x={210} y={416} scale={0.7} palette={palette} />
          <Acorn x={282} y={411} scale={0.55} rotate={10} palette={palette} />
          <path
            d="M151,388 Q210,370 269,388"
            fill="none"
            stroke={palette.leaf}
            strokeWidth="3"
            strokeDasharray="4 7"
          />
        </g>
      );
    case "catalog":
      return (
        <g data-ms-part="prop" transform="translate(210,389)">
          <rect x="-43" y="-22" width="86" height="55" rx="8" fill={palette.cream} />
          <circle cx="-25" cy="-5" r="6" fill={palette.acorn} />
          <path
            d="M-12,-8 L28,-8 M-12,3 L22,3 M-26,16 L27,16"
            stroke={palette.creamShade}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <g className="gw-write">
            <path d="M40,-3 L60,-22" stroke={palette.acornDark} strokeWidth="6" strokeLinecap="round" />
            <path d="M59,-23 L66,-28" stroke={palette.acornLight} strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      );
    case "share":
      return (
        <g data-ms-part="prop">
          <Acorn x={302} y={346} scale={0.72} rotate={-10} palette={palette} className="gw-rise" />
          <path
            d="M278,366 Q305,349 330,330"
            fill="none"
            stroke={palette.leaf}
            strokeWidth="3"
            strokeDasharray="4 7"
          />
        </g>
      );
    case "shield":
      return (
        <g data-ms-part="prop" transform="translate(210,386)">
          <path
            d="M0,-44 Q31,-32 39,-25 Q35,16 0,42 Q-35,16 -39,-25 Q-31,-32 0,-44 Z"
            fill={palette.bark}
            stroke={palette.acornLight}
            strokeWidth="4"
          />
          <path
            d="M-10,-3 L-2,7 L17,-15"
            fill="none"
            stroke={palette.cream}
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      );
    case "full":
      return (
        <g>
          <GranaryLog palette={palette} cache={100} compact />
          <g data-ms-part="effects">
            <Star
              x={292}
              y={270}
              scale={0.75}
              fill={palette.acornLight}
              className="gw-shine"
            />
            <Star
              x={342}
              y={296}
              scale={0.55}
              fill={palette.cream}
              className="gw-shine"
              delay=".55s"
            />
          </g>
        </g>
      );
    case "found":
      return (
        <g>
          <g data-ms-part="prop">
            <Acorn
              x={304}
              y={286}
              scale={0.82}
              rotate={10}
              palette={palette}
              className="gw-pulse"
            />
          </g>
          <g data-ms-part="effects">
            <Star
              x={335}
              y={253}
              scale={1}
              fill={palette.acornLight}
              className="gw-shine"
            />
            <Star
              x={278}
              y={245}
              scale={0.55}
              fill={palette.cream}
              className="gw-shine"
              delay=".45s"
            />
          </g>
        </g>
      );
    case "confetti":
      return (
        <g data-ms-part="effects">
          {[
            [112, 92, 0],
            [163, 61, 0.35],
            [222, 73, 0.7],
            [279, 54, 1.05],
            [326, 102, 1.4],
            [82, 142, 1.75],
            [348, 151, 2.1],
          ].map(([x, y, delay], index) =>
            index % 2 ? (
              <OakLeaf
                key={`${x}-${y}`}
                x={x}
                y={y}
                scale={0.55}
                rotate={index * 23}
                palette={palette}
                className="gw-fall"
                delay={`${delay}s`}
              />
            ) : (
              <circle
                key={`${x}-${y}`}
                className="gw-fall"
                cx={x}
                cy={y}
                r="5"
                fill={index % 3 ? palette.crown : palette.acornLight}
                style={{ animationDelay: `${delay}s` }}
              />
            )
          )}
        </g>
      );
    case "badge":
      return (
        <g data-ms-part="prop" transform="translate(210,357)">
          <circle r="25" fill={palette.acornLight} stroke={palette.acornDark} strokeWidth="4" />
          <OakLeaf x={0} y={-2} scale={0.6} palette={palette} />
          <path d="M-14,20 L-9,39 L1,27 L12,40 L15,19" fill={palette.crown} />
        </g>
      );
    case "question":
      return (
        <g
          data-ms-part="effects"
          className="gw-drift"
          fill="none"
          stroke={palette.acornLight}
          strokeWidth="6"
          strokeLinecap="round"
        >
          <path d="M293,202 Q296,184 313,185 Q330,186 329,201 Q328,211 315,217 L315,226" />
          <circle cx="315" cy="240" r="3" fill={palette.acornLight} stroke="none" />
        </g>
      );
    case "warning":
      return (
        <g data-ms-part="effects" transform="translate(306,220)">
          <path
            d="M0,-28 Q22,-12 25,18 Q0,31 -25,18 Q-22,-12 0,-28 Z"
            fill={palette.acornLight}
            stroke={palette.acornDark}
            strokeWidth="4"
          />
          <path d="M0,-11 L0,10" stroke={palette.ink} strokeWidth="6" strokeLinecap="round" />
          <circle cx="0" cy="20" r="3.3" fill={palette.ink} />
        </g>
      );
    case "tear":
      return (
        <g data-ms-part="effects" transform="translate(246,302)">
          <path
            className="gw-drift"
            d="M0,-11 Q8,-1 8,6 A8,8 0 1,1 -8,6 Q-8,-1 0,-11 Z"
            fill={palette.sky}
          />
        </g>
      );
    case "sleep":
      return (
        <g>
          <g data-ms-part="prop">
            <OakLeaf x={210} y={205} scale={0.9} rotate={-8} palette={palette} />
          </g>
          <g
            data-ms-part="effects"
            fill="none"
            stroke={palette.cream}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path className="gw-drift" d="M276,224 L292,224 L276,239 L292,239" />
            <path
              className="gw-drift"
              d="M302,192 L314,192 L302,204 L314,204"
              style={{ animationDelay: ".7s" }}
            />
          </g>
        </g>
      );
    default:
      return null;
  }
}

function CacheMeter({ cache, palette }) {
  const cells = 10;
  const active = Math.round((Math.max(0, Math.min(100, cache)) / 100) * cells);
  return (
    <svg viewBox="0 0 230 38" width="178" height="30" aria-hidden="true">
      {Array.from({ length: cells }, (_, index) => (
        <g key={index} transform={`translate(${13 + index * 22},19)`}>
          <ellipse
            rx="8"
            ry="10"
            fill={index < active ? palette.acorn : rgba(palette.cream, 0.12)}
            stroke={index < active ? palette.acornLight : rgba(palette.cream, 0.22)}
            strokeWidth="2"
          />
          {index < active && (
            <path d="M0,-10 Q1,-15 5,-16" stroke={palette.acornDark} strokeWidth="2" strokeLinecap="round" />
          )}
        </g>
      ))}
    </svg>
  );
}

/* ---------- the mascot ---------- */
function GranarySVG({
  palette,
  cache,
  paused,
  gesture,
  svgRef,
  eyesRef,
}) {
  const performance = gestureByKey(gesture);
  const inFlight = performance.wings === "flight";
  const effectiveCache = performance.cache ?? cache;
  const look = performance.look ?? [0, 0];
  const titleId = `gw-title-${gesture}`;
  const descriptionId = `gw-description-${gesture}`;
  const haloId = `gw-halo-${gesture}`;
  const breastId = `gw-breast-${gesture}`;
  const crownId = `gw-crown-${gesture}`;
  const shadowId = `gw-shadow-${gesture}`;
  const hitId = `gw-hit-${gesture}`;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 420 520"
      width="100%"
      role="img"
      aria-labelledby={`${titleId} ${descriptionId}`}
      className={`ms-root gw-svg gw-g-${gesture}`}
      style={{ cursor: "pointer" }}
      {...(paused ? { "data-paused": "1" } : {})}
    >
      <title id={titleId}>
        {`Granary the acorn woodpecker — ${performance.label}`}
      </title>
      <desc id={descriptionId}>{performance.tip}</desc>
      <style>{SVG_CSS}</style>

      <defs>
        <radialGradient id={haloId} cx="50%" cy="48%" r="54%">
          <stop offset="0" stopColor={palette.acornLight} stopOpacity=".2" />
          <stop offset="1" stopColor={palette.acornLight} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={breastId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.cream} />
          <stop offset="1" stopColor={palette.creamShade} />
        </linearGradient>
        <linearGradient id={crownId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.crownLight} />
          <stop offset=".72" stopColor={palette.crown} />
          <stop offset="1" stopColor={darken(palette.crown, 0.22)} />
        </linearGradient>
        <filter id={shadowId} x="-30%" y="-30%" width="160%" height="170%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <ellipse
        className="gw-shadow"
        data-ms-part="shadow"
        cx="210"
        cy="484"
        rx="91"
        ry="10"
        fill="#000000"
        filter={`url(#${shadowId})`}
      />
      <ellipse
        className="gw-halo ms-glow-halo"
        data-ms-part="halo"
        cx="210"
        cy="304"
        rx="164"
        ry="161"
        fill={`url(#${haloId})`}
      />

      {!inFlight && (
        <g data-ms-part="accessory">
          <path
            d="M91,446 Q149,437 208,447 Q270,437 337,449"
            fill="none"
            stroke={palette.bark}
            strokeWidth="19"
            strokeLinecap="round"
          />
          <path
            d="M105,440 Q171,432 235,443"
            fill="none"
            stroke={palette.barkLight}
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".78"
          />
          <path
            d="M292,447 Q310,430 327,425"
            fill="none"
            stroke={palette.bark}
            strokeWidth="10"
            strokeLinecap="round"
          />
          <OakLeaf x={329} y={419} scale={0.65} rotate={54} palette={palette} />
        </g>
      )}

      <g transform={`translate(0,${performance.lift ?? 0})`}>
        <g className="gw-float">
        <g transform="translate(210,468)">
          <animateTransform
            attributeName="transform"
            type="translate"
            additive="sum"
            begin={`${hitId}.click`}
            dur=".62s"
            values="0 0;0 7;0 -12;0 3;0 0"
            keyTimes="0;.24;.54;.8;1"
          />
          <animateTransform
            attributeName="transform"
            type="scale"
            additive="sum"
            begin={`${hitId}.click`}
            dur=".62s"
            values="1 1;1.05 .93;.97 1.05;1.02 .98;1 1"
            keyTimes="0;.24;.54;.8;1"
          />
          <g transform="translate(-210,-468)">
              <g id={hitId}>
                <Tail inFlight={inFlight} palette={palette} />
                {inFlight && (
                  <>
                    <FlightWing side="left" palette={palette} />
                    <FlightWing side="right" palette={palette} />
                  </>
                )}

                {/* body: black mantle, warm white belly, white rump flash */}
                <g data-ms-part="body">
                  <path
                    d="M210,286 C252,286 276,321 269,369 C265,414 241,438 210,438 C179,438 155,414 151,369 C144,321 168,286 210,286 Z"
                    fill={palette.plumage}
                    stroke={palette.ink}
                    strokeWidth="3"
                  />
                  <path
                    d="M173,326 Q210,305 247,326 Q254,359 244,406 Q228,427 210,429 Q192,427 176,406 Q166,359 173,326 Z"
                    fill={`url(#${breastId})`}
                  />
                  <path
                    d="M166,372 Q179,350 192,349 L182,391 Q171,395 160,389 Z"
                    fill={palette.cream}
                    opacity=".95"
                  />
                  <path
                    d="M254,372 Q241,350 228,349 L238,391 Q249,395 260,389 Z"
                    fill={palette.cream}
                    opacity=".95"
                  />

                  {inFlight && (
                    <path
                      d="M186,405 Q210,422 234,405 Q230,426 210,434 Q190,426 186,405 Z"
                      fill={palette.cream}
                    />
                  )}
                </g>
                <Feet inFlight={inFlight} palette={palette} />

                {/* only the head tilts; the feet and branch stay physically planted */}
                <g transform={`rotate(${performance.tilt ?? 0} 210 265)`}>
                  <g>
                    {performance.peck && (
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        values="0 210 265;5 210 265;10 210 265;2 210 265;10 210 265;0 210 265"
                        keyTimes="0;.25;.38;.55;.68;1"
                        dur="1.15s"
                        repeatCount="indefinite"
                      />
                    )}
                    {/* head and the species-defining clown mask */}
                    <g data-ms-part="body">
                      <ellipse
                        cx="210"
                        cy="265"
                        rx="71"
                        ry="74"
                        fill={palette.plumage}
                        stroke={palette.ink}
                        strokeWidth="3"
                      />
                      <path
                        d="M151,257 C157,223 178,207 210,207 C239,207 257,220 268,247
                          C249,238 236,235 224,236 C218,241 214,247 210,255
                          C205,247 199,241 193,236 C181,235 167,242 151,257 Z"
                        fill={palette.cream}
                      />
                      <path
                        d="M157,251 Q177,228 195,239 Q207,247 210,263 Q213,247 225,239
                          Q244,230 263,251 L255,291 Q236,309 210,298 Q184,309 165,291 Z"
                        fill={palette.cream}
                      />
                      <path
                        d="M210,250 Q223,268 229,279 Q226,302 210,317
                          Q194,302 187,279 Q197,268 210,250 Z"
                        fill={palette.plumage}
                      />
                      <path
                        d="M198,318 C206,320 214,320 222,318 C222,330 218,338 210,343
                          C202,338 198,330 198,318 Z"
                        fill={palette.cream}
                      />
                    </g>

                    <g data-ms-part="crest">
                      <path
                        d="M158,221 Q174,187 211,187 Q246,187 263,218
                          Q242,207 225,211 Q211,214 197,210 Q178,206 158,221 Z"
                        fill={`url(#${crownId})`}
                      />
                      <path
                        d="M169,224 Q187,214 201,217"
                        fill="none"
                        stroke={palette.crownLight}
                        strokeWidth="5"
                        strokeLinecap="round"
                        opacity=".72"
                      />
                    </g>

                    {/* eyes and expression */}
                    <g key={performance.key} className="gw-pop">
                      <Brows kind={performance.brow} palette={palette} />
                      <g
                        ref={eyesRef}
                        className="ms-eyes gw-eyes"
                        data-ms-part="eyes"
                        transform={`translate(${look[0]},${look[1]})`}
                      >
                        <Eye kind={performance.eyes} x={187} palette={palette} />
                        <Eye
                          kind={
                            performance.eyes === "uneven"
                              ? "uneven"
                              : performance.eyes
                          }
                          x={233}
                          palette={palette}
                        />
                      </g>
                    </g>
                    <g
                      key={`beak-${performance.key}`}
                      className="gw-pop"
                      data-ms-part="mouth"
                    >
                      <Beak kind={performance.beak} palette={palette} />
                    </g>
                  </g>
                </g>

                <g key={`prop-${performance.key}`} className="gw-pop">
                  <PoseProp gesture={performance} palette={palette} cache={effectiveCache} />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ---------- build-time pose source ---------- */
export const POSE_SOURCE = {
  slug: "granary",
  poses: GESTURES.map((gesture) => ({
    key: gesture.key,
    label: gesture.label,
    cat: gesture.cat,
    tip: gesture.tip,
    use: gesture.use,
    track: Boolean(gesture.track),
    signal: gesture.cache ?? 64,
  })),
  renderPose: (key) => (
    <GranarySVG
      palette={derive(THEMES.oak)}
      cache={gestureByKey(key).cache ?? 64}
      gesture={key}
    />
  ),
  meta: {
    name: "Granary",
    tagline: "Acorn woodpecker who keeps every useful find",
    product: "Knowledge workspace",
    accent: BRAND,
    stage: THEMES.oak.stage,
    themes: Object.fromEntries(
      Object.entries(THEMES).map(([key, t]) => [
        key,
        {
          name: t.name,
          top: lighten(t.acorn, 0.25),
          mid: t.acorn,
          base: t.plumage,
          core: t.cream,
          stage: t.stage,
          features: darken(t.plumage, 0.58),
        },
      ])
    ),
    /**
     * The oak cache is baked into each snapshot at that pose's level, so an
     * exported pack has no live cache to drive — no slider is offered.
     */
    instrument: null,
  },
};

/* ---------- interactive studio ---------- */
const BURST_PATHS = {
  star: STAR_PATH,
  leaf: "M0,7 C-6,4 -7,-1 -3,-4 C-7,-8 -1,-12 3,-7 C8,-10 11,-4 7,0 C10,4 6,8 0,7 Z",
  dot: "M0,-3 A3,3 0 1,0 .01,-3 Z",
};

export default function GranaryStudio() {
  const [themeKey, setThemeKey] = useState("oak");
  const [customTheme, setCustomTheme] = useState({
    ...THEMES.oak,
    name: "Custom",
  });
  const [cache, setCache] = useState(64);
  const [paused, setPaused] = useState(false);
  const [transparent, setTransparent] = useState(true);
  const [gesture, setGesture] = useState("idle");
  const [sparks, setSparks] = useState([]);
  const svgRef = useRef(null);
  const eyesRef = useRef(null);
  const timersRef = useRef(new Set());

  const theme = themeKey === "custom" ? customTheme : THEMES[themeKey];
  const palette = useMemo(() => derive(theme), [theme]);
  const activeGesture = gestureByKey(gesture);
  const visibleCache = activeGesture.cache ?? cache;

  useEffect(
    () => () => {
      for (const timer of timersRef.current) window.clearTimeout(timer);
      timersRef.current.clear();
    },
    []
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const initialTimer = media.matches
      ? window.setTimeout(() => setPaused(true), 0)
      : undefined;
    const handleChange = (event) => setPaused(event.matches);
    media.addEventListener?.("change", handleChange);
    return () => {
      if (initialTimer !== undefined) window.clearTimeout(initialTimer);
      media.removeEventListener?.("change", handleChange);
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (paused) svg.pauseAnimations();
      else svg.unpauseAnimations();
    } catch {
      // Some SVG hosts do not expose the SMIL pause API; CSS pause still applies.
    }
  }, [gesture, paused]);

  useEffect(() => {
    if (eyesRef.current) eyesRef.current.style.transform = "translate(0,0)";
  }, [gesture]);

  const selectGesture = (nextGesture) => {
    setGesture(nextGesture.key);
    if (nextGesture.cache != null) setCache(nextGesture.cache);
  };

  const trackPointer = useCallback(
    (event) => {
      const svg = svgRef.current;
      const eyes = eyesRef.current;
      if (!svg || !eyes || paused || !activeGesture.track) return;
      const bounds = svg.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 420;
      const y = ((event.clientY - bounds.top) / bounds.height) * 520;
      const deltaX = x - 210;
      const deltaY = y - 265;
      const length = Math.hypot(deltaX, deltaY) || 1;
      const distance = Math.min(length / 48, 1) * 4;
      eyes.style.transform = `translate(${(deltaX / length) * distance}px, ${(deltaY / length) * distance}px)`;
    },
    [activeGesture.track, paused]
  );

  const delight = useCallback(() => {
    if (paused) return;
    const burst = Array.from({ length: 10 }, (_, index) => {
      const angle = (index / 10) * Math.PI * 2 + Math.random() * 0.35;
      const distance = 52 + Math.random() * 62;
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
        kind: index % 3 === 0 ? "leaf" : index % 3 === 1 ? "star" : "dot",
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 25,
        rotation: Math.random() * 180,
        colour:
          index % 3 === 0
            ? palette.leaf
            : index % 3 === 1
              ? palette.acornLight
              : palette.crown,
      };
    });
    const ids = new Set(burst.map((spark) => spark.id));
    setSparks((current) => [...current, ...burst]);
    const timer = window.setTimeout(() => {
      setSparks((current) => current.filter((spark) => !ids.has(spark.id)));
      timersRef.current.delete(timer);
    }, 950);
    timersRef.current.add(timer);
  }, [palette, paused]);

  const swatchBackground = (swatch) =>
    `linear-gradient(135deg,${swatch.plumage} 0 45%,${swatch.cream} 45% 68%,${swatch.crown} 68% 82%,${swatch.acorn} 82%)`;

  return (
    <div className="gr-root">
      <style>{SHELL_CSS}</style>

      <header className="mx-auto flex max-w-6xl items-center gap-4 px-5 pb-2 pt-4 sm:pt-6">
        <div
          className="grid size-[52px] shrink-0 place-items-center rounded-2xl"
          style={{
            background: rgba(BRAND, 0.13),
            border: `1px solid ${rgba(BRAND, 0.4)}`,
          }}
        >
          <svg viewBox="0 0 40 40" width="31" height="31" aria-hidden="true">
            <path d="M20,7 Q31,12 31,23 Q31,34 20,36 Q9,34 9,23 Q9,12 20,7 Z" fill={BRAND} />
            <path d="M12,13 Q20,5 28,13" fill="none" stroke="#795125" strokeWidth="5" strokeLinecap="round" />
            <circle cx="20" cy="22" r="4" fill="#FFF0CA" />
          </svg>
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
            Granary <span style={{ color: BRAND }}>·</span> Acorn Woodpecker
          </h1>
          <p className="text-[13px] text-[#BEB39B]">
            The knowledge keeper whose cache is the product&apos;s memory
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl items-start gap-6 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section className="gr-card flex min-w-0 flex-col gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="gr-eyebrow">Stage</span>
            <div className="flex gap-2" aria-label="Stage background">
              <button
                type="button"
                className={`gr-pill ${transparent ? "on" : ""}`}
                aria-pressed={transparent}
                onClick={() => setTransparent(true)}
              >
                Transparent
              </button>
              <button
                type="button"
                className={`gr-pill ${transparent ? "" : "on"}`}
                aria-pressed={!transparent}
                onClick={() => setTransparent(false)}
              >
                In-app
              </button>
            </div>
          </div>

          <div
            className={`relative min-h-[430px] overflow-hidden rounded-2xl sm:min-h-[450px] ${
              transparent ? "gr-checker" : ""
            }`}
            style={{
              background: transparent
                ? "rgba(255,255,255,.018)"
                : `radial-gradient(640px 420px at 50% 105%,${rgba(theme.acorn, 0.22)},transparent 62%),${theme.stage}`,
            }}
            onPointerMove={trackPointer}
            onPointerDown={delight}
          >
            <div className="mx-auto max-w-[360px] px-2 pb-2 pt-1">
              <GranarySVG
                palette={palette}
                cache={visibleCache}
                paused={paused}
                gesture={gesture}
                svgRef={svgRef}
                eyesRef={eyesRef}
              />
            </div>
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className="gr-spark"
                style={{
                  left: "50%",
                  top: "52%",
                  "--dx": `${spark.x}px`,
                  "--dy": `${spark.y}px`,
                }}
              >
                <svg
                  viewBox="-9 -9 18 18"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  style={{ transform: `rotate(${spark.rotation}deg)` }}
                >
                  <path d={BURST_PATHS[spark.kind]} fill={spark.colour} />
                </svg>
              </span>
            ))}
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <CacheMeter cache={visibleCache} palette={palette} />
            </div>
          </div>

          <p className="text-center text-[12.5px] leading-relaxed text-[#BEB39B]">
            move to meet Granary&apos;s gaze &nbsp;·&nbsp; tap for oak-leaf sparks
            &nbsp;·&nbsp; the cache powers both character and interface
          </p>
        </section>

        <section className="gr-card flex min-w-0 flex-col gap-6 p-5 sm:p-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <span className="gr-eyebrow">Granary cache</span>
              <span className="text-xs font-semibold text-[#DCCBA9]">{Math.round(visibleCache)}%</span>
            </div>
            <input
              className="gr-range w-full"
              type="range"
              min="0"
              max="100"
              step="1"
              value={visibleCache}
              aria-label="Granary cache level"
              onChange={(event) => {
                setCache(Number.parseInt(event.target.value, 10));
                if (gesture === "cacheFull") setGesture("idle");
              }}
            />
            <p className="mt-2 text-[11.5px] leading-relaxed text-[#938976]">
              One value fills the oak slots and the ten-acorn product meter.
            </p>
          </div>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <span className="gr-eyebrow">Gesture</span>
              <span className="text-[11px] text-[#938976]">{GESTURES.length} poses</span>
            </div>
            <div className="flex flex-col gap-2">
              {CATEGORIES.map((category) => (
                <div key={category}>
                  <div className="mb-1.5 ml-0.5 mt-1 text-[10px] uppercase tracking-[.16em] text-[#938976]">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {GESTURES.filter((item) => item.cat === category).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        title={item.tip}
                        className={`gr-pill ${gesture === item.key ? "on" : ""}`}
                        aria-pressed={gesture === item.key}
                        onClick={() => selectGesture(item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className="mt-3 rounded-xl px-3 py-2.5"
              style={{
                background: "rgba(255,249,232,.045)",
                border: `1px solid ${rgba(BRAND, 0.16)}`,
              }}
              aria-live="polite"
            >
              <div className="gr-eyebrow mb-1 text-[10px]">{activeGesture.use}</div>
              <p className="text-[12.5px] leading-relaxed text-[#D2C6AC]">{activeGesture.tip}</p>
            </div>
          </div>

          <div>
            <div className="gr-eyebrow mb-3">Plumage</div>
            <div className="flex flex-wrap items-center gap-2">
              {Object.entries(THEMES).map(([key, swatch]) => (
                <button
                  key={key}
                  type="button"
                  title={swatch.name}
                  aria-label={swatch.name}
                  aria-pressed={themeKey === key}
                  className={`gr-swatch ${themeKey === key ? "on" : ""}`}
                  style={{ background: swatchBackground(swatch) }}
                  onClick={() => setThemeKey(key)}
                />
              ))}
              <button
                type="button"
                title="Custom palette"
                aria-label="Custom palette"
                aria-pressed={themeKey === "custom"}
                className={`gr-swatch ${themeKey === "custom" ? "on" : ""}`}
                style={{
                  background: swatchBackground(customTheme),
                  color: SHELL_INK,
                  fontWeight: 800,
                }}
                onClick={() => setThemeKey("custom")}
              >
                +
              </button>
            </div>
            {themeKey === "custom" && (
              <div className="mt-3 flex flex-wrap gap-3">
                {[
                  ["plumage", "Plumage"],
                  ["crown", "Crown"],
                  ["cream", "Face"],
                  ["acorn", "Acorn"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs text-[#D2C6AC]">
                    <input
                      type="color"
                      value={customTheme[key]}
                      aria-label={`${label} colour`}
                      className="size-8 cursor-pointer border-0 bg-transparent"
                      onChange={(event) =>
                        setCustomTheme((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="gr-eyebrow">Motion</span>
            <button
              type="button"
              className={`gr-pill ${paused ? "" : "on"}`}
              aria-pressed={!paused}
              onClick={() => setPaused((current) => !current)}
            >
              {paused ? "Paused" : "Playing"}
            </button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-[#938976]">
            Examples are for browsing. Build your own to download and export.
          </p>
        </section>
      </main>
    </div>
  );
}
