import { GESTURE_PRESETS } from "@/lib/gesture-presets";

/**
 * Four DISTINCT fledgling mascots — Sol-grade craft for different apps.
 *
 * Nox  = barn-owl chick   · Focus Timer
 * Zest = hummingbird chick · Habit Tracker
 * Quill = magpie chick    · Journal
 * Pip  = puffin chick     · Team Check-in
 *
 * Not recolors. Not adult costume birds. Each has its own silhouette, eye
 * construction, beak, wings, feet, and product perch — polished to the same
 * light-first bar as Sol (soft gradients, rim light, glow pool).
 *
 * Toggle contract (always present): accessory, app-badge, beak, body, effects,
 * eyes, feet, halo, prop, shadow, tuft, wings.
 *
 * Layout: pose packs feed GeneratedStudio (create-path shell).
 */

const SVG_CSS = `
  .ck-svg{display:block;user-select:none;-webkit-user-select:none}
  .ck-float{transform-box:fill-box;transform-origin:center bottom;
    animation:ck-breathe 3.8s cubic-bezier(.45,0,.55,1) infinite}
  .ck-hummingbird .ck-float{transform-origin:center;
    animation:ck-hover 2.2s cubic-bezier(.45,0,.55,1) infinite}
  .ck-halo{animation:ck-glow 3.1s ease-in-out infinite}
  .ck-pool{animation:ck-pool 3.6s ease-in-out infinite}
  .ck-dance,.ck-run{transform-box:fill-box;transform-origin:center bottom}
  .ck-fly,.ck-spin,.ck-pulse,.ck-blink{transform-box:fill-box;transform-origin:center}
  .ck-dance{animation:ck-dance .9s cubic-bezier(.45,.05,.55,.95) infinite}
  .ck-run{animation:ck-run .46s cubic-bezier(.45,0,.55,1) infinite}
  .ck-fly{animation:ck-fly 1.45s cubic-bezier(.45,0,.55,1) infinite}
  .ck-spin{animation:ck-spin 1.15s linear infinite}
  .ck-pulse{animation:ck-pulse 1.2s ease-in-out infinite}
  .ck-drift{animation:ck-drift 2s ease-out infinite;opacity:.9}
  .ck-blink{animation:ck-blink 4.8s ease-in-out infinite}
  .ck-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes ck-breathe{0%,100%{transform:translateY(0) scale(1)}
    50%{transform:translateY(1px) scale(1.008,.994)}}
  @keyframes ck-hover{0%,100%{transform:translateY(2px) rotate(-.6deg)}
    50%{transform:translateY(-4px) rotate(.6deg)}}
  @keyframes ck-glow{0%,100%{opacity:.22}50%{opacity:.5}}
  @keyframes ck-pool{0%,100%{opacity:.72}50%{opacity:.42}}
  @keyframes ck-dance{0%,100%{transform:rotate(-3deg) translateY(1px)}
    25%{transform:rotate(1deg) translateY(-6px)}
    50%{transform:rotate(4deg) translateY(-9px)}
    75%{transform:rotate(0) translateY(-4px)}}
  @keyframes ck-run{0%,100%{transform:translate(0,1px) rotate(-1deg)}
    25%{transform:translate(3px,-5px) rotate(1deg)}
    50%{transform:translate(7px,-10px) rotate(3deg)}
    75%{transform:translate(3px,-4px) rotate(1deg)}}
  @keyframes ck-fly{0%,100%{transform:translateY(2px) rotate(-1.5deg)}
    50%{transform:translateY(-17px) rotate(2deg)}}
  @keyframes ck-spin{to{transform:rotate(360deg)}}
  @keyframes ck-pulse{0%,100%{opacity:.35;transform:scale(.86)}50%{opacity:1;transform:scale(1.08)}}
  @keyframes ck-drift{0%{opacity:.55;transform:translateY(12px)}25%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
  @keyframes ck-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.08)}}
  @media (prefers-reduced-motion:reduce){.ck-svg *{animation:none!important}}
`;

const TRACKING_KEYS = new Set(["idle", "wave", "thinking", "listening", "talking", "pointing"]);
const HAPPY_KEYS = new Set(["happy", "celebrate", "proud", "dancing", "success", "encourage", "clapping", "high_five"]);
const CLOSED_KEYS = new Set(["happy", "sleepy", "blowing_kiss", "dancing", "clapping", "success"]);
const WIDE_KEYS = new Set(["surprised", "alarm", "error"]);
const SAD_KEYS = new Set(["sad", "crying", "empty"]);
const ANGRY_KEYS = new Set(["grumpy", "thumbs_down"]);
const UP_LEFT = new Set(["wave", "celebrate", "proud", "alarm", "thumbs_up", "high_five"]);
const UP_RIGHT = new Set(["celebrate", "proud", "alarm", "encourage"]);
const OUT_LEFT = new Set(["pointing", "talking", "searching", "thumbs_down", "running"]);
const OUT_RIGHT = new Set(["encourage", "running"]);
const PROP_KEYS = new Set(["working", "writing", "searching", "thumbs_up", "thumbs_down", "empty"]);
const MOBILE_KEYS = new Set(["running", "flying"]);
const FACE_LAYOUTS = {
  owl: { lx: 170, rx: 250, y: 258, blushR: 13, blushY: 28 },
  hummingbird: { lx: 188, rx: 232, y: 228, blushR: 7, blushY: 17 },
  magpie: { lx: 186, rx: 234, y: 228, blushR: 7, blushY: 20 },
  puffin: { lx: 178, rx: 242, y: 240, blushR: 6, blushY: 20 },
};

/**
 * Static weight shifts make each pose read before animation starts. Motion
 * classes run on the nested group so these composition-level stances remain
 * stable and props, wings, face, and feet stay physically connected.
 */
const POSE_STANCE = {
  happy: { translate: "translate(0 -2)" },
  thinking: { lean: "rotate(2 210 424)", shadowX: 3 },
  listening: { lean: "rotate(2 210 424)", shadowX: 2 },
  pointing: { translate: "translate(-4 0)", lean: "rotate(-3 210 424)", shadowX: -5 },
  writing: { translate: "translate(0 5)" },
  celebrate: { translate: "translate(0 -7)" },
  love: { translate: "translate(0 -2)" },
  sad: { translate: "translate(0 5)", lean: "rotate(-1 210 424)" },
  crying: { translate: "translate(0 6)", lean: "rotate(-1 210 424)" },
  grumpy: { translate: "translate(0 2)", lean: "rotate(1 210 424)" },
  sleepy: { translate: "translate(0 4)", lean: "rotate(3 210 424)", shadowX: 3 },
  proud: { translate: "translate(0 -4)" },
  oops: { lean: "rotate(-2 210 424)", shadowX: -2 },
  surprised: { translate: "translate(0 -4)" },
  facepalm: { lean: "rotate(-3 210 424)", shadowX: -4 },
  dancing: { translate: "translate(0 -3)", lean: "rotate(-2 210 424)", shadowX: -2 },
  alarm: { translate: "translate(0 -5)" },
  encourage: { translate: "translate(0 -2)", lean: "rotate(2 210 424)", shadowX: 2 },
  searching: { translate: "translate(-5 1)", lean: "rotate(-4 210 424)", shadowX: -6 },
  thumbs_up: { lean: "rotate(-2 210 424)", shadowX: -2 },
  thumbs_down: { translate: "translate(0 3)", lean: "rotate(-3 210 424)", shadowX: -3 },
  shrug: { translate: "translate(0 4)" },
  working: { translate: "translate(0 7)" },
  running: { translate: "translate(18 -4)", lean: "rotate(7 210 424)", shadowX: 18 },
  flying: { translate: "translate(0 -11)", lean: "rotate(-2 210 340)" },
  high_five: { lean: "rotate(-3 210 424)", shadowX: -3 },
  clapping: { translate: "translate(0 -3)" },
  confused: { lean: "rotate(2 210 424)", shadowX: 2 },
  success: { translate: "translate(0 -3)" },
  error: { translate: "translate(0 3)" },
  empty: { translate: "translate(0 6)" },
};

const BIRD_VARIANTS = {
  nox: {
    slug: "nox",
    name: "Nox",
    species: "owl",
    tagline: "Barn owl chick who guards the deep-work hour",
    product: "Focus Timer App",
    accent: "#C4A35A",
    stage: "#1A1624",
    mark: "timer",
    colors: {
      top: "#F6EBD4",
      mid: "#D2B892",
      base: "#8A6E4C",
      core: "#F0C060",
      features: "#2E2838",
      beak: "#E8C48A",
      face: "#F7F0E4",
      iris: "#E8B45A",
      blush: "#E2A090",
    },
    themes: {
      moonlight: {
        name: "Moonlight Focus",
        top: "#F6EBD4", mid: "#D2B892", base: "#8A6E4C", core: "#F0C060",
        stage: "#1A1624", features: "#2E2838",
      },
      deep_work: {
        name: "Deep Work Indigo",
        top: "#EDE8F8", mid: "#A29ACF", base: "#615B91", core: "#F0B965",
        stage: "#17182A", features: "#303048",
      },
      paper: {
        name: "Warm Paper",
        top: "#F8EAD0", mid: "#D9B98A", base: "#9B7357", core: "#E69C57",
        stage: "#261D19", features: "#4A372D",
      },
    },
  },
  zest: {
    slug: "zest",
    name: "Zest",
    species: "hummingbird",
    tagline: "Hummingbird chick who never drops a streak",
    product: "Habit Tracker App",
    accent: "#3DB88A",
    stage: "#122018",
    mark: "check",
    colors: {
      top: "#C8F8DE",
      mid: "#2EB87E",
      base: "#1A5E44",
      core: "#F2C76E",
      features: "#14281E",
      beak: "#1A2430",
      face: "#5EC4A0",
      gorget: "#F0C060",
      blush: "#F0A090",
    },
    themes: {
      sprout: {
        name: "Fresh Sprout",
        top: "#C8F8DE", mid: "#2EB87E", base: "#1A5E44", core: "#F2C76E",
        stage: "#122018", features: "#14281E",
      },
      citrus: {
        name: "Citrus Streak",
        top: "#FFF2B0", mid: "#E0B44A", base: "#C57C38", core: "#F07455",
        stage: "#2A2014", features: "#543D23",
      },
      berry: {
        name: "Berry Habit",
        top: "#F4CEE4", mid: "#C45A7A", base: "#8A4A6E", core: "#F0BB64",
        stage: "#281823", features: "#523047",
      },
    },
  },
  quill: {
    slug: "quill",
    name: "Quill",
    species: "magpie",
    tagline: "Magpie chick who collects every useful thought",
    product: "Journal App",
    accent: "#6B7AB8",
    stage: "#14161E",
    mark: "notebook",
    colors: {
      top: "#F5F1E9",
      mid: "#22222C",
      base: "#101016",
      core: "#E9B66A",
      features: "#0C0C12",
      beak: "#1A1A22",
      face: "#2A2A34",
      mark: "#F0ECE4",
      blush: "#D09090",
    },
    themes: {
      ink: {
        name: "Blue Ink",
        top: "#F5F1E9", mid: "#22222C", base: "#101016", core: "#E9B66A",
        stage: "#14161E", features: "#0C0C12",
      },
      plum: {
        name: "Plum Margin",
        top: "#F8E8F0", mid: "#3A2A3A", base: "#1E141E", core: "#E7AE67",
        stage: "#211925", features: "#2A1A28",
      },
      sepia: {
        name: "Sepia Notes",
        top: "#F8E8D4", mid: "#3A2A22", base: "#1E1410", core: "#D98755",
        stage: "#241C16", features: "#2A1E18",
      },
    },
  },
  pip: {
    slug: "pip",
    name: "Pip",
    species: "puffin",
    tagline: "Puffin chick who keeps the crew in sync",
    product: "Team Check-in App",
    accent: "#E07A5A",
    stage: "#141C24",
    mark: "chat",
    colors: {
      top: "#FFF6EC",
      mid: "#1A2430",
      base: "#0E141C",
      core: "#FFD36B",
      features: "#121820",
      beak: "#E85A3A",
      beakTip: "#F0C05A",
      beakBand: "#F07848",
      face: "#F8F2E8",
      feet: "#E07A4A",
      blush: "#E8A090",
    },
    themes: {
      standup: {
        name: "Standup Coral",
        top: "#FFF6EC", mid: "#1A2430", base: "#0E141C", core: "#FFD36B",
        stage: "#141C24", features: "#121820",
      },
      huddle: {
        name: "Huddle Teal",
        top: "#EAF6F6", mid: "#1A3040", base: "#102028", core: "#F4C86A",
        stage: "#112526", features: "#142028",
      },
      async: {
        name: "Async Blue",
        top: "#F4F8FC", mid: "#2A3448", base: "#161C28", core: "#F2B968",
        stage: "#151D31", features: "#1A2438",
      },
    },
  },
};

function AppMark({ mark, core, feature }) {
  if (mark === "chat") {
    return (
      <path
        d="M186 348 h48 a10 10 0 0 1 10 10 v20 a10 10 0 0 1-10 10 h-20 l-13 12 2-12 h-17 a10 10 0 0 1-10-10 v-20 a10 10 0 0 1 10-10Z"
        fill={core}
        stroke={feature}
        strokeWidth="5"
      />
    );
  }
  if (mark === "timer") {
    return (
      <g>
        <path d="M193 343 h34 M210 343 v12" fill="none" stroke={feature} strokeWidth="6" strokeLinecap="round" />
        <circle cx="210" cy="377" r="27" fill={core} stroke={feature} strokeWidth="5" />
        <path d="M210 377 l10-14 M210 377 v-17" fill="none" stroke={feature} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  }
  if (mark === "check") {
    return (
      <g>
        <circle cx="210" cy="371" r="29" fill={core} stroke={feature} strokeWidth="5" />
        <path d="M194 371 l11 11 23-27" fill="none" stroke={feature} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  return (
    <g>
      <rect x="181" y="341" width="58" height="61" rx="7" fill={core} stroke={feature} strokeWidth="5" />
      <path d="M193 341 v61 M202 359 h25 M202 374 h20" fill="none" stroke={feature} strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function PoseVisuals({ keyName, core, feature, species }) {
  const stroke = { fill: "none", stroke: feature, strokeWidth: 7, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (keyName) {
    case "thinking":
    case "confused":
      return <g className="ck-drift"><path d="M306 190 Q329 160 349 184 Q358 199 340 213 L324 228" {...stroke} /><circle cx="319" cy="249" r="5" fill={feature} /></g>;
    case "listening":
      return <g><path d="M307 234 Q335 252 307 270 M321 218 Q365 252 321 286" {...stroke} /></g>;
    case "talking":
      return <g><path d="M292 189 h64 a13 13 0 0 1 13 13 v34 a13 13 0 0 1-13 13 h-24 l-19 16 4-16 h-25 a13 13 0 0 1-13-13 v-34 a13 13 0 0 1 13-13Z" fill="#FFFDF7" stroke={feature} strokeWidth="6" /><circle cx="310" cy="220" r="5" fill={core} /><circle cx="329" cy="220" r="5" fill={core} /><circle cx="348" cy="220" r="5" fill={core} /></g>;
    case "pointing":
      return <path d="M72 289 h68 M72 289 l22-19 M72 289 l22 19" {...stroke} />;
    case "writing":
      return <g><rect x="128" y="383" width="164" height="76" rx="13" fill="#FFFDF7" stroke={feature} strokeWidth="7" /><path d="M153 410 h77 M153 431 h54 M260 398 l-30 43" {...stroke} /><path d="M257 395 l10 9" stroke={core} strokeWidth="9" strokeLinecap="round" /></g>;
    case "celebrate":
      return <g className="ck-drift"><path d="M91 154 l9 20 M329 152 l-10 20 M65 228 l22 2 M333 228 l22-2" stroke={core} strokeWidth="9" strokeLinecap="round" /><circle cx="112" cy="126" r="8" fill={core} /><circle cx="308" cy="119" r="8" fill={core} /></g>;
    case "love":
      return <g className="ck-drift"><path d="M314 189 C301 171 277 188 314 220 C351 188 327 171 314 189Z" fill={core} stroke={feature} strokeWidth="4" /></g>;
    case "blowing_kiss":
      return (
        <g>
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".9">
            <path className="ck-pulse" d="M236 268 Q262 254 292 258" strokeWidth="3.4" />
            <path className="ck-pulse" d="M238 278 Q268 270 298 272" strokeWidth="2.4" style={{ animationDelay: ".18s" }} />
          </g>
          <g transform="translate(286,248)">
            <path className="ck-drift" d="M0 12 C-14 1 -16 -9 -8.5 -13.5 C-3.5 -16.5 0 -12 0 -8 C0 -12 3.5 -16.5 8.5 -13.5 C16 -9 14 1 0 12Z" fill="#FF6B8A" stroke={feature} strokeWidth="3" />
          </g>
          <g transform="translate(328,208) scale(.85)">
            <path className="ck-drift" d="M0 12 C-14 1 -16 -9 -8.5 -13.5 C-3.5 -16.5 0 -12 0 -8 C0 -12 3.5 -16.5 8.5 -13.5 C16 -9 14 1 0 12Z" fill={core} stroke={feature} strokeWidth="3" style={{ animationDelay: ".45s" }} />
          </g>
        </g>
      );
    case "crying":
      {
        const { lx, rx, y } = FACE_LAYOUTS[species];
        const tear = (x) =>
          `M${x},${y + 18} C${x - 10},${y + 36} ${x - 6},${y + 46} ${x + 2},${y + 46} C${x + 12},${y + 46} ${x + 14},${y + 35} ${x},${y + 18}Z`;
        return (
          <g className="ck-drift">
            <path d={`${tear(lx - 4)} ${tear(rx + 4)}`} fill="#75C9F0" />
          </g>
        );
      }
    case "grumpy":
      return <g className="ck-drift"><path d="M304 255 q25-23 41 2 M316 274 q28-17 39 8" {...stroke} /></g>;
    case "sleepy":
      return <g className="ck-drift"><path d="M299 213 h33 l-31 34 h35" {...stroke} /><path d="M336 171 h25 l-23 27 h27" {...stroke} /></g>;
    case "proud":
      return <g><circle cx="324" cy="249" r="30" fill={core} stroke={feature} strokeWidth="6" /><path d="M309 249 l11 11 21-25" {...stroke} /></g>;
    case "oops":
      return <g><circle cx="326" cy="244" r="27" fill="#FFFDF7" stroke={feature} strokeWidth="6" /><path d="M326 229 v20 M326 260 v2" {...stroke} /></g>;
    case "surprised":
    case "alarm":
      return <g className="ck-pulse"><path d="M93 198 l-21-24 M327 198 l21-24 M64 244 h34 M322 244 h34" {...stroke} />{keyName === "alarm" && <><path d="M310 156 q21-25 42 0" {...stroke} /><circle cx="331" cy="177" r="23" fill={core} stroke={feature} strokeWidth="6" /></>}</g>;
    case "facepalm":
      return null;
    case "dancing":
      return <g className="ck-drift"><path d="M91 229 q23-14 19-38 q25 10 40-9 v45 q-17-10-31 3 M307 213 q20-12 16-34 q23 9 36-8 v42 q-16-9-28 3" fill={core} stroke={feature} strokeWidth="5" /></g>;
    case "encourage":
      return <g><path d="M210 113 l8 18 20 2-15 13 5 19-18-10-18 10 5-19-15-13 20-2Z" fill={core} stroke={feature} strokeWidth="5" /></g>;
    case "searching":
      return <g><circle cx="105" cy="257" r="33" fill="#FFFDF7" fillOpacity=".45" stroke={feature} strokeWidth="8" /><path d="M80 281 l-25 26" {...stroke} /></g>;
    case "thumbs_up":
    case "thumbs_down": {
      const down = keyName === "thumbs_down";
      const anchor = {
        owl: down ? [69, 350] : [70, 198],
        hummingbird: down ? [72, 304] : [98, 181],
        magpie: down ? [70, 353] : [75, 187],
        puffin: down ? [84, 350] : [72, 231],
      }[species];
      return (
        <g transform={`translate(${anchor[0]} ${anchor[1]})`}>
          <path
            d={down ? "M20 0 H36" : "M19 19 L35 35"}
            fill="none"
            stroke={feature}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={down ? "M20 0 H36" : "M19 19 L35 35"}
            fill="none"
            stroke={core}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle r="28" fill="#FFFDF7" fillOpacity=".96" stroke={feature} strokeWidth="5" />
          <g transform={down ? "rotate(180)" : undefined}>
            <path
              d="M-15 1 H-4 L2-10 Q6-17 12-13 Q16-9 11 1 H21 V17 H-3 L-15 12Z"
              fill={core}
              stroke={feature}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
          </g>
        </g>
      );
    }
    case "shrug":
      return <g><path d="M75 218 q28-25 56 0 M289 218 q28-25 56 0" {...stroke} /></g>;
    case "working":
      return <g><path d="M118 371 h184 l-18 87 h-148Z" fill="#FFFDF7" stroke={feature} strokeWidth="7" /><path d="M99 458 h222" {...stroke} /><circle cx="210" cy="415" r="10" fill={core} /></g>;
    case "running":
      return <g><path d="M49 287 h75 M36 322 h67 M58 357 h49" {...stroke} /></g>;
    case "flying":
      return <g fill="#FFFDF7" stroke={feature} strokeWidth="5"><path d="M40 411 q12-28 38-12 q15-27 39 0 q28-5 30 21 H40Z" /><path d="M279 139 q12-26 35-11 q15-24 36 2 q25-4 28 18 h-99Z" /></g>;
    case "high_five": {
      const [x, y] = {
        owl: [92, 205],
        hummingbird: [116, 190],
        magpie: [98, 195],
        puffin: [98, 248],
      }[species];
      return (
        <g className="ck-pulse" transform={`translate(${x} ${y})`}>
          <path d="M0 -20 L6 -7 L20 -6 L9 3 L13 17 L0 10 L-13 17 L-9 3 L-20 -6 L-6 -7Z" fill={core} stroke={feature} strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M-28 -2 L-38 -2 M28 -2 L38 -2 M0 -28 L0 -38" fill="none" stroke={core} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    }
    case "clapping":
      return (
        <g className="ck-pulse" fill="none" stroke={core} strokeWidth="5" strokeLinecap="round">
          <path d="M210 344 v-16 M193 349 l-12-12 M227 349 l12-12" />
          <path d="M195 365 Q210 355 225 365" stroke={feature} strokeWidth="3.5" opacity=".5" />
        </g>
      );
    case "success":
      return <g><circle cx="325" cy="222" r="36" fill={core} stroke={feature} strokeWidth="6" /><path d="M307 222 l13 13 25-30" {...stroke} /></g>;
    case "error":
      return <g><path d="M325 177 l39 70 h-78Z" fill={core} stroke={feature} strokeWidth="6" strokeLinejoin="round" /><path d="M325 201 v22 M325 236 v2" {...stroke} /></g>;
    case "empty":
      return <g><path d="M121 393 h178 l-18 58 h-142Z" fill="#FFFDF7" fillOpacity=".92" stroke={feature} strokeWidth="7" /><path d="M176 418 h68" {...stroke} /></g>;
    case "loading":
      return <g className="ck-spin"><circle cx="325" cy="221" r="32" fill="none" stroke={feature} strokeOpacity=".25" strokeWidth="9" /><path d="M325 189 a32 32 0 0 1 31 25" fill="none" stroke={core} strokeWidth="9" strokeLinecap="round" /></g>;
    case "waiting":
      return <g><circle cx="325" cy="221" r="34" fill="#FFFDF7" fillOpacity=".35" stroke={feature} strokeWidth="7" /><path d="M325 198 v25 l17 11" {...stroke} /></g>;
    default:
      return null;
  }
}

/* ---------- eyes: four completely different constructions ---------- */

function OwlEye({ x, y, lookX, lookY, wide, closed, love, feature, iris, core }) {
  if (love) {
    return <path d={`M${x} ${y} C${x - 16} ${y - 20} ${x - 42} ${y - 2} ${x} ${y + 34} C${x + 42} ${y - 2} ${x + 16} ${y - 20} ${x} ${y}Z`} fill={core} />;
  }
  if (closed) {
    return <path d={`M${x - 28} ${y + 4} Q${x} ${y - 16} ${x + 28} ${y + 4}`} fill="none" stroke={feature} strokeWidth="7.5" strokeLinecap="round" />;
  }
  /* Duo-scale round eyes: thin rim, big amber iris — never reads as glasses. */
  const rx = wide ? 32 : 28;
  const ry = wide ? 34 : 30;
  return (
    <g className="ck-blink">
      <ellipse cx={x} cy={y} rx={rx + 8} ry={ry + 8} fill="none" stroke={feature} strokeWidth="1.6" opacity=".12" />
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFDF8" stroke={feature} strokeWidth="3.6" />
      <g className="ms-eyes">
        <ellipse cx={x + lookX} cy={y + 1 + lookY} rx={rx * 0.72} ry={ry * 0.72} fill={iris} />
        <ellipse cx={x + lookX} cy={y + 1 + lookY} rx={rx * 0.52} ry={ry * 0.52} fill={feature} opacity=".34" />
        <circle cx={x + lookX} cy={y + 2 + lookY} r={wide ? 10 : 8.5} fill={feature} />
        <circle cx={x - 7 + lookX} cy={y - 6 + lookY} r="4.6" fill="#fff" />
        <circle cx={x + 5 + lookX} cy={y + 6 + lookY} r="1.9" fill="#fff" opacity=".75" />
      </g>
    </g>
  );
}

function HumEye({ x, y, lookX, lookY, wide, closed, love, feature, core }) {
  if (love) {
    return <path d={`M${x} ${y} C${x - 10} ${y - 12} ${x - 26} ${y - 1} ${x} ${y + 20} C${x + 26} ${y - 1} ${x + 10} ${y - 12} ${x} ${y}Z`} fill={core} />;
  }
  if (closed) {
    return <path d={`M${x - 9} ${y + 2} Q${x} ${y - 7} ${x + 9} ${y + 2}`} fill="none" stroke={feature} strokeWidth="5.5" strokeLinecap="round" />;
  }
  /* Bright bead eyes, enlarged just enough to keep the tiny bird juvenile. */
  const rx = wide ? 9.4 : 8;
  const ry = wide ? 11.2 : 9.4;
  return (
    <g className="ck-blink">
      <ellipse cx={x} cy={y} rx={rx + 4.5} ry={ry + 4} fill={core} opacity=".48" />
      <ellipse cx={x} cy={y} rx={rx + 4.5} ry={ry + 4} fill="none" stroke={feature} strokeWidth="1.6" opacity=".32" />
      <g className="ms-eyes">
        <ellipse cx={x + lookX * 0.35} cy={y + lookY * 0.35} rx={rx} ry={ry} fill={feature} />
        <ellipse cx={x - 2.4 + lookX * 0.25} cy={y - 3 + lookY * 0.25} rx="2.6" ry="3.1" fill="#FFF8E8" opacity=".94" />
        <circle cx={x + 2 + lookX * 0.25} cy={y + 2.4 + lookY * 0.25} r="1.1" fill="#FFF8E8" opacity=".55" />
      </g>
    </g>
  );
}

function MagEye({ x, y, lookX, lookY, wide, closed, love, feature, core }) {
  if (love) {
    return <path d={`M${x} ${y} C${x - 12} ${y - 16} ${x - 34} ${y - 1} ${x} ${y + 28} C${x + 34} ${y - 1} ${x + 12} ${y - 16} ${x} ${y}Z`} fill={core} />;
  }
  if (closed) {
    return <path d={`M${x - 14} ${y + 3} Q${x} ${y - 12} ${x + 14} ${y + 3}`} fill="none" stroke={feature} strokeWidth="6.5" strokeLinecap="round" />;
  }
  /* Clever soft almonds: distinct from the owl without becoming mechanical. */
  const rx = wide ? 12.5 : 11;
  const ry = wide ? 19 : 16.5;
  return (
    <g className="ck-blink">
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFDF8" stroke={feature} strokeWidth="3.4" />
      <g className="ms-eyes">
        <ellipse cx={x + lookX * 0.6} cy={y + 1 + lookY} rx={rx * 0.52} ry={ry * 0.62} fill={feature} />
        <ellipse cx={x - 2.4 + lookX * 0.5} cy={y - 4.5 + lookY} rx="2.4" ry="3.1" fill="#fff" />
        <circle cx={x + 2.2 + lookX * 0.5} cy={y + 4.4 + lookY} r="1.15" fill="#fff" opacity=".65" />
      </g>
    </g>
  );
}

function PufEye({ x, y, lookX, lookY, wide, closed, love, feature, core, mid, side = "left" }) {
  if (love) {
    return <path d={`M${x} ${y} C${x - 11} ${y - 14} ${x - 30} ${y - 1} ${x} ${y + 24} C${x + 30} ${y - 1} ${x + 11} ${y - 14} ${x} ${y}Z`} fill={core} />;
  }
  if (closed) {
    return <path d={`M${x - 11} ${y + 2} Q${x} ${y - 9} ${x + 11} ${y + 2}`} fill="none" stroke={feature} strokeWidth="6" strokeLinecap="round" />;
  }
  /* Soft eye patches and round pupils keep Pip fledgling-like, not made-up. */
  const r = wide ? 10 : 8.7;
  const patchX = side === "left" ? x - 2 : x + 2;
  return (
    <g className="ck-blink">
      <ellipse cx={patchX} cy={y} rx={r + 8} ry={r + 7} fill={mid} opacity=".13" />
      <circle cx={x} cy={y} r={r + 2.6} fill="#FFFDF8" stroke={feature} strokeWidth="2.8" />
      <g className="ms-eyes">
        <circle cx={x + lookX * 0.45} cy={y + 1 + lookY * 0.45} r={r * 0.78} fill={feature} />
        <circle cx={x - 2.5 + lookX * 0.35} cy={y - 2.8 + lookY * 0.35} r="2.2" fill="#fff" />
        <circle cx={x + 2.2 + lookX * 0.35} cy={y + 2.4 + lookY * 0.35} r="1" fill="#fff" opacity=".6" />
      </g>
    </g>
  );
}

/**
 * Front-facing bills. Talking uses a static open silhouette, matching Lyra and
 * Granary: no bill transform, path morph, bounce, or reduced-motion leak.
 */
function FrontBeak({ species, open, beak, beakTip, feature, top, mid, base }) {
  if (species === "hummingbird") {
    /* Frontal needle bill is foreshortened; keep it centered and off the chest. */
    const tipY = open ? 274 : 270;
    const cavity = open
      ? "M203,260 Q210,266 217,260 L214,270 Q210,274 206,270 Z"
      : null;
    const lowerRest = `M203,264 Q210,${tipY} 217,264 Q210,270 203,264 Z`;
    return (
      <g data-ms-part="beak">
        {cavity && <path data-ck-beak="cavity" d={cavity} fill={feature} opacity=".85" />}
        <path
          data-ck-beak="lower"
          d={lowerRest}
          fill={beak}
          stroke={feature}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          data-ck-beak="upper"
          d="M201,258 Q210,248 219,258 L214,268 Q210,272 206,268 Z"
          fill={beak}
          stroke={feature}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path d="M207,260 L209,266" fill="none" stroke={mid} strokeWidth="1.8" opacity=".55" strokeLinecap="round" />
      </g>
    );
  }

  if (species === "puffin") {
    /* Compact puffin wedge; the lower mandible appears only while open. */
    return (
      <g data-ms-part="beak">
        <path
          data-ck-beak="upper"
          d="M187,272 C197,265 223,265 233,272 Q223,286 210,299 Q197,286 187,272 Z"
          fill={beak}
          stroke={feature}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path d="M198,283 Q210,280 222,283" fill="none" stroke={beakTip} strokeWidth="3.4" strokeLinecap="round" opacity=".9" />
        <ellipse cx="196" cy="273.5" rx="2.2" ry="1.3" fill={base} opacity=".68" />
        <ellipse cx="224" cy="273.5" rx="2.2" ry="1.3" fill={base} opacity=".68" />
        {open && (
          <>
            <path
              data-ck-beak="cavity"
              d="M200,294 Q210,300 220,294 Q217,306 210,310 Q203,306 200,294 Z"
              fill={feature}
              opacity=".84"
            />
            <path
              data-ck-beak="lower"
              d="M201,299 Q210,312 219,299 Q217,308 210,311 Q203,308 201,299 Z"
              fill={beak}
              stroke={feature}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
          </>
        )}
      </g>
    );
  }

  if (species === "owl") {
    /* Tiny hooked pale beak — sits low in the facial disk */
    const left = 198, right = 222, billTop = 276, seam = 290, bottom = open ? 312 : 302;
    const lowerPath = (depth) =>
      `M${left + 3},${seam + 1} Q210,${depth} ${right - 3},${seam + 1} Q210,${seam + 6} ${left + 3},${seam + 1} Z`;
    const restingLower = lowerPath(bottom);
    return (
      <g data-ms-part="beak">
        {open && (
          <path
            data-ck-beak="cavity"
            d={`M${left + 4},${seam + 1} Q210,${seam + 7} ${right - 4},${seam + 1} Q210,${bottom - 1} ${left + 4},${seam + 1} Z`}
            fill={feature}
            opacity=".8"
          />
        )}
        <path
          data-ck-beak="lower"
          d={restingLower}
          fill={beak}
          stroke={feature}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          data-ck-beak="upper"
          d={`M${left},${seam} Q210,${billTop} ${right},${seam} Q210,${seam + 7} ${left},${seam} Z`}
          fill={beak}
          stroke={feature}
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        {/* hook tip */}
        <path d="M210 290 Q214 298 210 304 Q206 298 210 290" fill={feature} opacity=".48" />
        <path d={`M${left + 4},${seam - 1} Q210,${billTop + 6} ${right - 4},${seam - 1}`} fill="none" stroke={top} strokeWidth="1.8" strokeLinecap="round" opacity=".45" />
      </g>
    );
  }

  /* Magpie — compact pointed kite with a subtle center ridge. */
  const left = 199, right = 221, billTop = 250, seam = 262, bottom = open ? 286 : 276;
  const lowerPath = (depth) =>
    `M${left + 2},${seam + 2} Q210,${depth} ${right - 2},${seam + 2} Q210,${seam + 7} ${left + 2},${seam + 2} Z`;
  const restingLower = lowerPath(bottom);
  return (
    <g data-ms-part="beak">
      {open && (
        <path
          data-ck-beak="cavity"
          d={`M${left + 3},${seam + 2} Q210,${seam + 8} ${right - 3},${seam + 2} Q210,${bottom - 1} ${left + 3},${seam + 2} Z`}
          fill={feature}
          opacity=".82"
        />
      )}
      <path
        data-ck-beak="lower"
        d={restingLower}
        fill={beak}
        stroke={feature}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        data-ck-beak="upper"
        d={`M${left},${seam} Q210,${billTop} ${right},${seam} Q216,${seam + 8} 210,${seam + 13} Q204,${seam + 8} ${left},${seam} Z`}
        fill={beak}
        stroke={feature}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d={`M210,${billTop + 4} L210,${seam + 9}`} fill="none" stroke={top} strokeWidth="1.6" strokeLinecap="round" opacity=".34" />
    </g>
  );
}

function SpeciesFace({ species, pose, feature, core, beak, beakTip, blush, iris, mid, top, base }) {
  const key = pose.key;
  const closed = CLOSED_KEYS.has(key);
  const wide = WIDE_KEYS.has(key);
  const sad = SAD_KEYS.has(key);
  const angry = ANGRY_KEYS.has(key);
  const love = key === "love";
  const lookX = key === "thinking" ? 4 : key === "searching" ? -5 : key === "pointing" ? -4 : 0;
  const lookY = key === "writing" || key === "working" ? 4 : key === "thinking" ? -4 : 0;
  const open = wide || key === "talking";

  const layout = FACE_LAYOUTS[species];

  return (
    <>
      <g data-ms-part="eyes" className="ck-eyes">
        <circle cx={layout.lx - 14} cy={layout.y + layout.blushY} r={layout.blushR} fill={blush} opacity=".48" />
        <circle cx={layout.rx + 14} cy={layout.y + layout.blushY} r={layout.blushR} fill={blush} opacity=".48" />
        {species === "owl" && (
          <>
            <OwlEye x={layout.lx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} iris={iris} core={core} />
            <OwlEye x={layout.rx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} iris={iris} core={core} />
          </>
        )}
        {species === "hummingbird" && (
          <>
            <HumEye x={layout.lx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} />
            <HumEye x={layout.rx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} />
          </>
        )}
        {species === "magpie" && (
          <>
            <MagEye x={layout.lx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} />
            <MagEye x={layout.rx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} />
          </>
        )}
        {species === "puffin" && (
          <>
            <PufEye x={layout.lx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} mid={mid} side="left" />
            <PufEye x={layout.rx} y={layout.y} lookX={lookX} lookY={lookY} wide={wide} closed={closed} love={love} feature={feature} core={core} mid={mid} side="right" />
          </>
        )}
        {(sad || angry || key === "confused" || key === "oops") && (
          <>
            <path
              d={
                angry
                  ? `M${layout.lx - (species === "hummingbird" ? 10 : 20)} ${layout.y - (species === "hummingbird" ? 12 : 28)} L${layout.lx + (species === "hummingbird" ? 9 : 16)} ${layout.y - (species === "hummingbird" ? 7 : 14)}`
                  : `M${layout.lx - (species === "hummingbird" ? 10 : 20)} ${layout.y - (species === "hummingbird" ? 8 : 18)} Q${layout.lx} ${layout.y - (species === "hummingbird" ? 17 : 32)} ${layout.lx + (species === "hummingbird" ? 9 : 16)} ${layout.y - (species === "hummingbird" ? 9 : 20)}`
              }
              fill="none"
              stroke={feature}
              strokeWidth={species === "hummingbird" ? "3.4" : "5.5"}
              strokeLinecap="round"
            />
            <path
              d={
                angry
                  ? `M${layout.rx - (species === "hummingbird" ? 9 : 16)} ${layout.y - (species === "hummingbird" ? 7 : 14)} L${layout.rx + (species === "hummingbird" ? 10 : 20)} ${layout.y - (species === "hummingbird" ? 12 : 28)}`
                  : `M${layout.rx - (species === "hummingbird" ? 9 : 16)} ${layout.y - (species === "hummingbird" ? 9 : 20)} Q${layout.rx} ${layout.y - (species === "hummingbird" ? 17 : 32)} ${layout.rx + (species === "hummingbird" ? 10 : 20)} ${layout.y - (species === "hummingbird" ? 8 : 18)}`
              }
              fill="none"
              stroke={feature}
              strokeWidth={species === "hummingbird" ? "3.4" : "5.5"}
              strokeLinecap="round"
            />
          </>
        )}
      </g>
      <FrontBeak
        species={species}
        open={open}
        beak={beak}
        beakTip={beakTip}
        feature={feature}
        top={top}
        mid={mid}
        base={base}
      />
    </>
  );
}

function wingMode(key, side) {
  if (key === "flying") return "flap";
  if (key === "shrug") return "out";
  if (key === "facepalm" && side === "left") return "facepalm";
  if ((key === "thinking" || key === "blowing_kiss") && side === "right") return "chin";
  if (key === "writing") return side === "left" ? "support" : "write";
  if (key === "working") return "type";
  if (key === "clapping") return "clap";
  if (key === "searching" && side === "left") return "grip";
  if ((side === "left" ? UP_LEFT : UP_RIGHT).has(key)) return "up";
  if ((side === "left" ? OUT_LEFT : OUT_RIGHT).has(key)) return "out";
  return "rest";
}

/**
 * Raised / flying / held-forward wings paint above the body (hinge visible).
 * Rest + out stay behind so they can't cover the app badge.
 */
const FOREGROUND_WING_MODES = new Set([
  "up",
  "front",
  "support",
  "write",
  "type",
  "clap",
  "grip",
  "flap",
]);
const FACE_WING_MODES = new Set(["facepalm", "chin"]);
const REAR_WING_MODES = new Set(["rest", "out"]);
/** Left-shoulder pivot in canvas space; right wing mirrors X. */
const WING_SHOULDER = {
  owl: [148, 300],
  hummingbird: [160, 268],
  magpie: [150, 294],
  puffin: [144, 312],
};

/**
 * Left-wing paths in shoulder-local space (0,0 = hinge on body).
 * Negative X = outboard. Roots start a few px into +X so they plant under the
 * body silhouette. `upCovert` is the smaller inner flight feather.
 */
const WING_LOCAL = {
  owl: {
    rest: "M10,2 C-6,18 -28,40 -34,78 C-36,108 -18,124 4,118 C18,112 22,78 20,48 C18,22 16,6 10,2 Z",
    up: "M8,4 C-18,-8 -48,-36 -62,-78 C-48,-92 -18,-70 2,-34 C10,-16 12,-2 8,4 Z",
    upCovert: "M6,6 C-8,-2 -24,-22 -34,-44 C-24,-50 -8,-34 2,-14 C6,-4 8,4 6,6 Z",
    out: "M8,4 C-36,8 -72,28 -92,56 C-74,74 -36,66 -2,28 C6,14 12,6 8,4 Z",
    front: "M6,2 C14,28 28,58 48,78 C56,62 40,34 22,14 C12,6 6,2 6,2 Z",
    support: "M6,2 C5,25 7,59 13,82 C15,91 24,94 29,87 C32,78 25,52 18,26 C14,12 9,4 6,2 Z",
    write: "M6,2 C8,30 9,67 13,91 C15,101 24,104 29,96 C31,86 26,56 18,28 C14,12 9,4 6,2 Z",
    type: "M6,2 C10,25 19,56 28,76 C32,85 42,87 47,79 C50,69 36,43 21,20 C14,9 8,3 6,2 Z",
    clap: "M6,2 C17,12 35,28 51,38 C59,43 66,39 66,32 C65,24 43,12 22,5 C13,2 7,1 6,2 Z",
    grip: "M6,2 C-15,-4 -41,-8 -61,-3 C-70,0 -73,9 -67,15 C-60,21 -38,17 -18,12 C-4,8 4,4 6,2 Z",
    facepalm: "M4,0 C10,-24 32,-52 56,-58 C62,-42 48,-24 22,-10 C13,-5 7,-1 4,0 Z",
    chin: "M4,0 C8,-12 16,-25 27,-34 C34,-40 42,-38 44,-31 C46,-24 39,-19 31,-18 C22,-14 16,-6 12,3 C10,8 6,6 4,0 Z",
    coverts: "M8,8 C-4,28 -10,58 2,82 C12,70 16,36 8,8 Z",
    barbs: ["M6,18 C-8,40 -12,68 -4,92", "M4,28 C-14,52 -22,78 -12,98"],
  },
  hummingbird: {
    rest: "M12,2 C-11,0 -40,6 -69,18 C-82,24 -83,35 -72,41 C-47,48 -20,36 4,18 C10,12 14,5 12,2 Z",
    up: "M10,4 C-8,-15 -31,-46 -44,-78 C-49,-92 -43,-101 -34,-92 C-12,-69 4,-35 10,-5 C12,0 12,3 10,4 Z",
    upCovert: "M8,4 C-3,-9 -17,-29 -26,-49 C-18,-46 -5,-29 3,-12 C7,-4 9,2 8,4 Z",
    out: "M12,2 C-16,-6 -56,1 -94,21 C-88,40 -51,43 -16,28 C0,17 12,7 12,2 Z",
    front: "M7,0 C15,32 30,72 50,104 C58,86 43,48 20,14 C12,4 8,0 7,0 Z",
    support: "M7,0 C5,32 5,76 9,108 C10,119 18,122 23,113 C26,103 21,66 16,32 C13,12 9,2 7,0 Z",
    write: "M7,0 C6,38 6,88 9,120 C10,132 19,135 24,125 C27,113 22,72 16,35 C13,13 9,2 7,0 Z",
    type: "M7,0 C9,35 14,80 18,105 C20,116 28,119 33,110 C36,100 29,64 20,31 C15,12 10,2 7,0 Z",
    clap: "M7,0 C14,22 26,52 41,70 C47,78 56,77 59,69 C61,60 43,35 23,14 C14,5 9,1 7,0 Z",
    grip: "M8,0 C-12,-3 -37,2 -56,10 C-65,14 -66,23 -59,28 C-51,33 -31,27 -13,18 C0,11 7,3 8,0 Z",
    facepalm: "M3,0 C8,-19 22,-39 38,-44 C41,-31 31,-15 11,-4 C7,-2 4,0 3,0 Z",
    chin: "M3,0 C7,-9 14,-20 23,-27 C29,-32 35,-30 37,-25 C39,-20 34,-16 28,-15 C20,-11 15,-5 11,2 C8,6 5,5 3,0 Z",
    coverts: "M10,4 C-10,-2 -36,2 -59,12 C-37,19 -11,16 10,4 Z",
    barbs: ["M7,6 C-23,0 -52,7 -75,18", "M6,12 C-22,11 -48,20 -66,29"],
  },
  magpie: {
    rest: "M10,2 C-8,18 -24,49 -26,82 C-28,112 -12,132 5,122 C20,111 24,75 20,42 C18,18 14,5 10,2 Z",
    up: "M8,4 C-16,-14 -42,-50 -58,-88 C-40,-96 -14,-68 2,-30 C10,-12 12,0 8,4 Z",
    upCovert: "M6,6 C-8,-4 -22,-28 -32,-50 C-22,-54 -8,-36 2,-14 C6,-4 8,4 6,6 Z",
    out: "M8,4 C-34,10 -68,34 -86,60 C-66,76 -30,68 -2,28 C6,14 12,6 8,4 Z",
    front: "M6,2 C14,30 28,62 46,80 C54,64 38,34 20,14 C10,6 6,2 6,2 Z",
    support: "M6,2 C6,27 8,63 14,87 C16,97 25,100 30,92 C33,83 27,55 19,28 C14,12 9,4 6,2 Z",
    write: "M6,2 C8,31 10,72 15,99 C17,109 26,112 31,103 C34,92 28,59 19,29 C14,12 9,4 6,2 Z",
    type: "M6,2 C10,27 19,60 28,81 C32,90 42,92 47,84 C50,74 37,47 21,22 C14,10 8,3 6,2 Z",
    clap: "M6,2 C17,14 35,31 51,42 C59,48 67,44 67,36 C66,28 44,14 22,6 C13,3 7,1 6,2 Z",
    grip: "M6,2 C-16,-5 -44,-9 -65,-4 C-75,-1 -78,9 -71,16 C-63,23 -40,18 -19,12 C-4,8 4,4 6,2 Z",
    facepalm: "M4,0 C7,-27 16,-60 25,-79 C29,-88 38,-90 44,-83 C50,-76 46,-66 38,-61 C31,-55 27,-43 24,-30 C21,-17 14,-6 4,0 Z",
    chin: "M4,0 C8,-14 15,-31 24,-43 C29,-50 37,-51 41,-46 C45,-40 41,-34 35,-31 C27,-26 20,-15 15,-2 C12,6 7,7 4,0 Z",
    coverts: "M8,10 C-2,34 -6,68 6,96 C14,80 16,40 8,10 Z",
    barbs: ["M6,22 C-6,50 -8,84 0,110", "M4,34 C-14,64 -20,96 -10,118"],
  },
  puffin: {
    rest: "M6,2 C-18,8 -40,26 -48,50 C-42,66 -18,64 0,42 C8,26 12,8 6,2 Z",
    up: "M6,2 C-16,-8 -42,-34 -56,-57 C-43,-69 -18,-55 -2,-29 C7,-14 12,-1 6,2 Z",
    upCovert: "M4,4 C-8,-2 -24,-18 -34,-32 C-25,-40 -10,-29 1,-14 C5,-7 7,1 4,4 Z",
    out: "M6,2 C-24,4 -46,20 -58,38 C-44,50 -20,44 -2,18 C4,8 10,2 6,2 Z",
    front: "M4,0 C13,25 34,56 66,71 C70,54 49,27 20,9 C10,3 5,0 4,0 Z",
    support: "M4,0 C5,23 8,52 14,70 C17,79 27,82 33,75 C37,67 28,42 19,22 C12,8 6,1 4,0 Z",
    write: "M4,0 C6,27 10,61 16,80 C19,90 29,93 35,85 C39,76 30,49 20,24 C12,8 6,1 4,0 Z",
    type: "M4,0 C9,21 22,49 34,63 C40,71 51,71 56,63 C59,54 42,31 22,14 C12,5 6,1 4,0 Z",
    clap: "M4,0 C18,8 39,22 56,29 C64,33 71,28 69,20 C67,13 43,5 22,1 C12,-1 6,-1 4,0 Z",
    grip: "M4,0 C-16,-8 -42,-13 -61,-9 C-71,-7 -75,2 -69,9 C-62,17 -39,14 -18,9 C-4,6 3,2 4,0 Z",
    facepalm: "M2,0 C5,-32 11,-70 20,-91 C24,-100 32,-103 37,-96 C42,-89 38,-78 32,-71 C26,-61 24,-44 22,-27 C19,-13 10,-4 2,0 Z",
    chin: "M2,0 C6,-18 12,-38 20,-52 C24,-60 31,-62 35,-57 C39,-52 36,-45 31,-41 C25,-35 21,-25 18,-13 C15,-3 10,4 6,5 C3,4 2,2 2,0 Z",
    coverts: "M4,6 C-10,16 -18,36 -8,52 C2,44 8,22 4,6 Z",
    barbs: ["M2,12 C-10,28 -14,46 -6,58", "M0,18 C-14,34 -20,50 -12,60"],
  },
};

const WING_ACTION_DETAILS = {
  front: "M9,8 C15,27 25,49 37,65",
  support: "M9,8 C10,30 13,56 17,75",
  write: "M9,8 C10,34 13,65 17,84",
  type: "M9,8 C14,30 21,53 29,69",
  clap: "M10,5 C24,13 39,24 51,31",
  grip: "M0,4 C-18,1 -38,4 -53,9",
  facepalm: "M7,-7 C10,-27 16,-49 23,-65",
  chin: "M7,-3 C11,-16 17,-29 24,-38",
};

/**
 * Shoulder rotate — gated by wing *mode* so a folded rest wing on wave
 * doesn't thrash with the raised wing.
 */
function wingFlap(poseKey, species, side, mode) {
  if (FACE_WING_MODES.has(mode) || mode === "front") return null;
  const sign = side === "left" ? 1 : -1;

  if (mode === "flap") {
    const dur =
      species === "hummingbird" ? "0.12s"
        : species === "owl" ? "0.46s"
          : species === "puffin" ? "0.26s"
            : "0.32s";
    const amp =
      species === "hummingbird" ? 28
        : species === "owl" ? 22
          : species === "puffin" ? 18
            : 22;
    return {
      values: `${-amp * sign};${amp * sign};${-amp * sign}`,
      dur,
      begin: "0s",
      keyTimes: "0;.36;1",
      keySplines: ".32 0 .68 1;.22 .6 .36 1",
    };
  }

  if (mode === "up") {
    if (poseKey === "celebrate") {
      return { values: `${-10 * sign};${14 * sign};${-10 * sign}`, dur: "0.52s", begin: "0s" };
    }
    if (poseKey === "wave" || poseKey === "high_five" || poseKey === "thumbs_up" || poseKey === "alarm") {
      return { values: `${-8 * sign};${12 * sign};${-8 * sign}`, dur: "0.78s", begin: "0s" };
    }
    if (poseKey === "proud" || poseKey === "encourage") {
      return { values: `${-4 * sign};${6 * sign};${-4 * sign}`, dur: "1.8s", begin: side === "right" ? "-0.4s" : "0s" };
    }
    return null;
  }

  if (mode === "out" && (poseKey === "running" || poseKey === "pointing" || poseKey === "searching")) {
    return {
      values: `${-6 * sign};${8 * sign};${-6 * sign}`,
      dur: poseKey === "running" ? "0.46s" : "1.2s",
      begin: "0s",
    };
  }

  return null;
}

function WingFeathers({ species, mode, mid, top, base, accent, markFill }) {
  const kit = WING_LOCAL[species];
  const flapping = mode === "flap";
  const primary = flapping ? kit.up : kit[mode] || kit.rest;
  const fill =
    species === "magpie" || species === "puffin" ? base || mid
      : mid;
  const detail =
    species === "magpie" ? markFill || top
      : species === "hummingbird" || species === "owl" ? top
        : accent;
  const outline =
    species === "puffin" ? (FACE_WING_MODES.has(mode) ? top : accent)
      : species === "magpie" ? top
        : base || top;

  return (
    <>
      <path
        data-ck-wing-primary="1"
        d={primary}
        fill={fill}
        stroke={outline}
        strokeWidth={species === "hummingbird" ? "2.4" : "3.2"}
        strokeOpacity={
          species === "magpie" ? ".36"
            : FACE_WING_MODES.has(mode) ? ".42"
              : ".55"
        }
        strokeLinejoin="round"
      />
      {flapping ? (
        <path
          data-ck-wing-covert="1"
          d={kit.upCovert}
          fill={top}
          opacity=".45"
        />
      ) : mode === "up" ? (
        <path
          data-ck-wing-covert="1"
          d={kit.upCovert}
          fill={top}
          opacity=".4"
        />
      ) : mode === "rest" || mode === "out" ? (
        <>
          <path data-ck-wing-covert="1" d={kit.coverts} fill={top} opacity=".34" />
          <g fill="none" stroke={detail} strokeLinecap="round" opacity=".24">
            {kit.barbs.slice(0, species === "magpie" ? 1 : undefined).map((d) => (
              <path key={d} d={d} strokeWidth={species === "hummingbird" ? "1.8" : "2.2"} />
            ))}
          </g>
        </>
      ) : (
        <path
          data-ck-wing-covert="1"
          d={WING_ACTION_DETAILS[mode] || WING_ACTION_DETAILS.front}
          fill="none"
          stroke={detail}
          strokeWidth={species === "hummingbird" ? "1.8" : "2.2"}
          strokeLinecap="round"
          opacity=".18"
        />
      )}
    </>
  );
}

function SpeciesWings({ species, poseKey, mid, top, base, accent, markFill, layer }) {
  const leftMode = wingMode(poseKey, "left");
  const rightMode = wingMode(poseKey, "right");
  const [sx, sy] = WING_SHOULDER[species];
  const wings = [
    { side: "left", mode: leftMode },
    { side: "right", mode: rightMode },
  ].filter(({ mode }) =>
    layer === "face"
      ? FACE_WING_MODES.has(mode)
      : layer === "front"
        ? FOREGROUND_WING_MODES.has(mode)
        : REAR_WING_MODES.has(mode)
  );

  return (
    <g data-ms-part="wings" data-ck-wing-layer={layer}>
      {wings.map(({ side, mode }) => {
        const x = side === "left" ? sx : 420 - sx;
        const flap = wingFlap(poseKey, species, side, mode);
        return (
          <g key={side} data-ck-wing={side} data-ck-wing-mode={mode} transform={`translate(${x},${sy})`}>
            <g>
              {flap && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  values={flap.values}
                  dur={flap.dur}
                  begin={flap.begin}
                  calcMode="spline"
                  keyTimes={flap.keyTimes || "0;.5;1"}
                  keySplines={flap.keySplines || ".42 0 .58 1;.42 0 .58 1"}
                  repeatCount="indefinite"
                />
              )}
              <g transform={side === "right" ? "scale(-1,1)" : undefined}>
                <WingFeathers
                  species={species}
                  mode={mode}
                  mid={mid}
                  top={top}
                  base={base}
                  accent={accent}
                  markFill={markFill}
                />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

/**
 * Stage furniture is intentionally outside the character motion/stance rig.
 * It stays planted while the chick breathes, dances, tilts, or changes pose.
 */
function SpeciesAccessory({ species, poseKey, top, mid, base, feature, core, accent }) {
  const visible = !MOBILE_KEYS.has(poseKey) && !PROP_KEYS.has(poseKey);
  return (
    <g data-ms-part="accessory">
      {visible && species === "owl" && (
        <g transform="translate(304 438) scale(.72) translate(-292 -432)">
          <ellipse cx="292" cy="456" rx="28" ry="6" fill={base} opacity=".3" />
          <path
            d="M268 392 H316 L300 424 H284 Z M284 440 H300 L316 472 H268 Z"
            fill={core}
            stroke={feature}
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path d="M278 404 H306 L298 418 H286 Z" fill={mid} opacity=".7" />
          <path d="M276 452 H304 L312 468 H272 Z" fill={top} opacity=".55" />
          <ellipse cx="292" cy="392" rx="26" ry="5" fill={feature} />
          <ellipse cx="292" cy="472" rx="26" ry="5" fill={feature} />
          <rect x="286" y="424" width="12" height="16" rx="2" fill={feature} />
        </g>
      )}
      {visible && species === "hummingbird" && (
        <g transform="translate(292 416) rotate(8)">
          <path d="M0 13 C-5 27 -5 43 -2 57" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" />
          <path d="M-2 43 Q-18 34 -19 49 Q-10 53 -2 48" fill={mid} opacity=".78" />
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse key={deg} cx="0" cy="-11" rx="9.5" ry="15" fill={core} opacity=".95" transform={`rotate(${deg})`} />
          ))}
          <circle cx="0" cy="0" r="8" fill={top} />
          <circle cx="0" cy="0" r="3.2" fill={feature} opacity=".28" />
        </g>
      )}
      {visible && species === "magpie" && (
        <g transform="translate(298 462) scale(.78) translate(-278 -464)">
          <ellipse cx="278" cy="496" rx="34" ry="6" fill={base} opacity=".32" />
          <path
            d="M248 468 C250 489 258 494 278 494 C298 494 306 489 308 468Z"
            fill={mid}
            stroke={feature}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <ellipse cx="278" cy="468" rx="30" ry="11" fill={core} stroke={feature} strokeWidth="3" />
          <ellipse cx="278" cy="467" rx="20" ry="6" fill={feature} />
          <ellipse cx="274" cy="465" rx="8" ry="2.5" fill={top} opacity=".35" />
          <path d="M291 461 Q300 424 313 392" fill="none" stroke={core} strokeWidth="4.4" strokeLinecap="round" />
          <path d="M313 392 C327 381 341 395 328 410 C316 421 301 403 313 392Z" fill={top} stroke={feature} strokeWidth="2.4" />
          <path d="M307 398 Q317 401 326 408" fill="none" stroke={core} strokeWidth="2.2" strokeLinecap="round" opacity=".82" />
        </g>
      )}
      {visible && species === "puffin" && (
        <g transform="translate(322 410) scale(.68)">
          <ellipse cx="0" cy="72" rx="42" ry="8" fill={base} opacity=".3" />
          <circle cx="0" cy="28" r="38" fill={core} stroke={feature} strokeWidth="4" />
          <path d="M-26 2 L-13 16 M26 2 L13 16 M-26 54 L-13 41 M26 54 L13 41" fill="none" stroke={top} strokeWidth="12" strokeLinecap="round" />
          <circle cx="0" cy="28" r="17" fill={top} stroke={feature} strokeWidth="3" />
          <path d="M0 11 V45" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" opacity=".65" />
          <path d="M17 19 V-42" fill="none" stroke={feature} strokeWidth="5" strokeLinecap="round" />
          <path d="M19 -39 L55 -27 L19 -14Z" fill={core} stroke={feature} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="17" cy="-45" r="7" fill={top} stroke={feature} strokeWidth="3" />
        </g>
      )}
    </g>
  );
}

function SpeciesBody({ species, top, mid, base, feature, core, config, face, gid, gorget }) {
  if (species === "owl") {
    return (
      <>
        <g data-ms-part="body">
          {/* Soft fledgling pear with continuous shoulder and belly tangents. */}
          <path
            d="M210 186 C266 186 301 228 304 286 C308 345 282 405 242 442 C224 459 196 459 178 442 C138 405 112 345 116 286 C119 228 154 186 210 186Z"
            fill={`url(#${gid}-body)`}
          />
          {/* Shoulder saddle — wings hinge out of this, not thin air */}
          <ellipse cx="148" cy="298" rx="19" ry="25" fill={mid} opacity=".38" />
          <ellipse cx="272" cy="298" rx="19" ry="25" fill={mid} opacity=".38" />
          <path d="M132 286 C140 318 148 348 156 372" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" opacity=".22" />
          <path d="M288 286 C280 318 272 348 264 372" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" opacity=".22" />
          {/* Heart facial disk */}
          <path
            d="M210 198 C246 198 278 222 286 258 C292 292 278 318 248 332 C228 342 210 346 210 346 C210 346 192 342 172 332 C142 318 128 292 134 258 C142 222 174 198 210 198Z"
            fill={face}
          />
          <ellipse cx="210" cy="372" rx="50" ry="52" fill={top} opacity=".95" />
          <path d="M188 354 Q210 362 232 354 M184 374 Q210 384 236 374 M190 394 Q210 402 230 394" fill="none" stroke={feature} strokeWidth="2.4" opacity=".16" strokeLinecap="round" />
          <path d="M162 206 Q210 186 258 206" fill="none" stroke={top} strokeWidth="6" strokeLinecap="round" opacity=".28" />
        </g>
        <g data-ms-part="app-badge" transform="translate(210 382) scale(.76) translate(-210 -377)">
          <AppMark mark={config.mark} core={core} feature={feature} />
        </g>
        <g data-ms-part="tuft">
          <path d="M178 205 C181 184 190 169 202 168 C202 182 206 195 211 207 C199 198 188 198 178 205Z" fill={mid} />
          <path d="M198 204 C201 178 210 162 219 171 C223 183 218 198 212 209 C209 197 205 190 198 204Z" fill={mid} />
          <path d="M218 205 C225 184 234 174 243 178 C243 191 235 202 219 209Z" fill={mid} />
          <path d="M192 187 Q201 176 207 185 M218 184 Q225 176 231 185" fill="none" stroke={top} strokeWidth="2.8" strokeLinecap="round" opacity=".42" />
        </g>
      </>
    );
  }

  if (species === "hummingbird") {
    return (
      <>
        <g data-ms-part="body">
          {/* Rounded jewel-chick: compact, but substantial enough to carry expression. */}
          <path
            d="M194 346 C188 363 176 379 160 393 C180 390 199 378 208 355 C204 351 200 348 194 346Z"
            fill={base}
          />
          <path
            d="M226 346 C232 363 244 379 260 393 C240 390 221 378 212 355 C216 351 220 348 226 346Z"
            fill={base}
          />
          <path d="M192 353 C181 371 172 382 164 388" fill="none" stroke={mid} strokeWidth="4" strokeLinecap="round" opacity=".62" />
          <path d="M228 353 C239 371 248 382 256 388" fill="none" stroke={mid} strokeWidth="4" strokeLinecap="round" opacity=".62" />
          <path
            d="M210 184 C246 184 265 220 264 270 C263 319 245 357 210 372 C175 357 157 319 156 270 C155 220 174 184 210 184Z"
            fill={`url(#${gid}-body)`}
          />
          <ellipse cx="163" cy="267" rx="10" ry="14" fill={mid} opacity=".34" />
          <ellipse cx="257" cy="267" rx="10" ry="14" fill={mid} opacity=".34" />
          {/* Iridescent gorget collar — below the needle beak */}
          <path
            d="M184 270 C198 259 222 259 236 270 C230 294 218 308 210 314 C202 308 190 294 184 270Z"
            fill={gorget || core}
            opacity=".95"
          />
          <ellipse cx="210" cy="292" rx="20" ry="10" fill={top} opacity=".3" />
          <path d="M184 216 Q210 191 236 216" fill="none" stroke={top} strokeWidth="4" strokeLinecap="round" opacity=".3" />
          <path d="M174 310 C184 337 197 352 210 358 C223 352 236 337 246 310" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".15" />
        </g>
        <g data-ms-part="app-badge">
          <circle cx="210" cy="338" r="15" fill={core} stroke={feature} strokeWidth="3.5" />
          <path d="M202 338 l5 5 10-12" fill="none" stroke={feature} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g data-ms-part="tuft">
          <path d="M198 195 Q202 178 210 184 Q218 176 222 197 Q211 189 198 195Z" fill={core} />
          <path d="M205 190 Q210 183 215 190" fill="none" stroke={top} strokeWidth="2.4" strokeLinecap="round" opacity=".7" />
        </g>
      </>
    );
  }

  if (species === "magpie") {
    return (
      <>
        <g data-ms-part="body">
          {/* Splayed tail sits behind the torso and clears both planted feet. */}
          <path
            d="M190 402 C181 429 172 455 164 476 C181 471 197 447 205 414 C200 408 196 404 190 402Z"
            fill={mid}
          />
          <path
            d="M230 402 C239 429 248 455 256 476 C239 471 223 447 215 414 C220 408 224 404 230 402Z"
            fill={mid}
          />
          <path d="M187 420 C180 441 173 459 168 471" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".34" />
          <path d="M233 420 C240 441 247 459 252 471" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".34" />
          {/* Tall fledgling collector with rounded head and real lower-body mass. */}
          <path
            d="M210 174 C255 174 282 218 280 280 C279 339 260 397 230 434 C220 447 200 447 190 434 C160 397 141 339 140 280 C138 218 165 174 210 174Z"
            fill={`url(#${gid}-body)`}
          />
          <ellipse cx="148" cy="294" rx="14" ry="26" fill={base} opacity=".36" />
          <ellipse cx="272" cy="294" rx="14" ry="26" fill={base} opacity=".36" />
          <path d="M148 280 C150 320 154 360 160 392" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".28" />
          <path d="M272 280 C270 320 266 360 260 392" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".28" />
          <path
            d="M210 192 C239 192 258 209 261 235 C265 260 246 282 210 290 C174 282 155 260 159 235 C162 209 181 192 210 192Z"
            fill={top}
            opacity=".98"
          />
          <path
            d="M180 282 C194 272 226 272 240 282 C248 326 245 381 229 416 C219 432 201 432 191 416 C175 381 172 326 180 282Z"
            fill={top}
            opacity=".96"
          />
          <path d="M181 319 Q210 304 239 319 M180 350 Q210 338 240 350" fill="none" stroke={feature} strokeWidth="2.2" strokeLinecap="round" opacity=".12" />
          <path d="M178 198 Q210 178 242 198" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".2" />
        </g>
        <g data-ms-part="app-badge" transform="translate(210 366) scale(.76) translate(-210 -372)">
          <AppMark mark={config.mark} core={core} feature={feature} />
        </g>
        <g data-ms-part="tuft">
          <path d="M191 188 Q199 165 209 184 Q217 159 229 184 Q213 176 191 188Z" fill={top} />
          <path d="M204 181 Q210 170 216 181" fill="none" stroke={core} strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
        </g>
      </>
    );
  }

  /* Puffin */
  return (
    <>
      <g data-ms-part="body">
        {/* Rounded puffin chick with one continuous face-to-belly patch. */}
        <path
          d="M210 188 C263 188 292 235 294 302 C296 370 264 423 226 444 C216 451 204 451 194 444 C156 423 124 370 126 302 C128 235 157 188 210 188Z"
          fill={`url(#${gid}-body)`}
        />
        <ellipse cx="146" cy="310" rx="17" ry="22" fill={mid} opacity=".38" />
        <ellipse cx="274" cy="310" rx="17" ry="22" fill={mid} opacity=".38" />
        <path
          d="M210 207 C246 207 268 229 269 258 C270 282 256 299 237 310 C252 342 248 391 225 425 C216 438 204 438 195 425 C172 391 168 342 183 310 C164 299 150 282 151 258 C152 229 174 207 210 207Z"
          fill={face}
        />
        <path d="M174 326 C188 309 232 309 246 326" fill="none" stroke={top} strokeWidth="5" strokeLinecap="round" opacity=".3" />
        <path d="M183 421 Q210 445 237 421" fill={base} opacity=".7" />
        <path d="M164 204 Q210 182 256 204" fill="none" stroke={top} strokeWidth="4" strokeLinecap="round" opacity=".14" />
      </g>
      <g data-ms-part="app-badge" transform="translate(210 366) scale(.72) translate(-210 -374)">
        <AppMark mark={config.mark} core={core} feature={feature} />
      </g>
      <g data-ms-part="tuft">
        {/* Soft charcoal hood, rounded at the crown like downy plumage. */}
        <path d="M150 247 C156 207 177 178 210 174 C243 178 264 207 270 247 C253 225 233 213 210 212 C187 213 167 225 150 247Z" fill={mid} />
        <path d="M187 195 Q210 180 233 195" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".16" />
      </g>
    </>
  );
}

function SpeciesFeet({ species, core, feature, poseKey, feet }) {
  const fill = feet || core;
  if (poseKey === "flying") {
    return <g data-ms-part="feet" />;
  }
  if (species === "hummingbird") {
    return (
      <g data-ms-part="feet" stroke={feature} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".58">
        <path d={poseKey === "running" ? "M198 360 Q186 373 174 381 M174 381 l-7 2 M174 381 l-3 7" : "M198 360 Q197 369 191 375 M191 375 l-6 2 M191 375 l-2 6"} />
        <path d={poseKey === "running" ? "M222 360 Q233 370 244 377 M244 377 l7 1 M244 377 l3 7" : "M222 360 Q223 369 229 375 M229 375 l6 2 M229 375 l2 6"} />
      </g>
    );
  }
  if (species === "puffin") {
    if (poseKey === "running") {
      return (
        <g data-ms-part="feet" fill={fill} stroke={feature} strokeWidth="2.6" strokeLinecap="round">
          <path d="M184 426 C170 439 151 447 136 444 C151 438 166 425 178 414Z" />
          <path d="M236 428 C249 441 266 450 280 448 C266 441 252 428 242 416Z" />
          <path d="M145 442 l-8 7 M154 439 l-2 10 M266 444 l7 7 M258 440 l1 10" />
        </g>
      );
    }
    return (
      <g data-ms-part="feet" fill={fill} strokeLinejoin="round">
        <path d="M184 424 C181 438 171 450 158 456 C166 466 184 466 197 456 C196 442 192 431 184 424Z" />
        <path d="M236 424 C239 438 249 450 262 456 C254 466 236 466 223 456 C224 442 228 431 236 424Z" />
        <path d="M164 458 l-8 8 M177 461 l-1 9 M190 458 l7 8" fill="none" stroke={feature} strokeWidth="2.4" strokeLinecap="round" opacity=".48" />
        <path d="M256 458 l8 8 M243 461 l1 9 M230 458 l-7 8" fill="none" stroke={feature} strokeWidth="2.4" strokeLinecap="round" opacity=".48" />
      </g>
    );
  }
  if (species === "owl") {
    return (
      <g data-ms-part="feet" fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round">
        <path d={poseKey === "running" ? "M186 428 L158 454 M158 454 L140 458 M158 454 L150 468 M158 454 L172 464" : "M186 428 L178 458 M178 458 L162 468 M178 458 L178 472 M178 458 L194 468"} />
        <path d={poseKey === "running" ? "M234 428 L254 446 M254 446 L270 444 M254 446 L264 458 M254 446 L244 460" : "M234 428 L242 458 M242 458 L226 468 M242 458 L242 472 M242 458 L258 468"} />
      </g>
    );
  }
  /* Magpie — slender charcoal toes clear of the side inkwell */
  return (
    <g data-ms-part="feet" fill="none" stroke={fill} strokeWidth="4.5" strokeLinecap="round">
      <path d={poseKey === "running" ? "M178 430 L150 456 M150 456 L138 452 M150 456 L148 466 M150 456 L162 462" : "M184 434 L176 462 M176 462 L162 470 M176 462 L176 474 M176 462 L190 470"} />
      <path d={poseKey === "running" ? "M226 430 L244 456 M244 456 L256 452 M244 456 L246 466 M244 456 L232 462" : "M220 434 L228 462 M228 462 L214 470 M228 462 L228 474 M228 462 L242 470"} />
    </g>
  );
}

function renderBird(config, key) {
  const pose = GESTURE_PRESETS.find((item) => item.key === key);
  if (!pose) throw new Error(`Unknown chick pose: ${key}`);
  const { colors, species } = config;
  const top = `var(--ms-top,${colors.top})`;
  const mid = `var(--ms-mid,${colors.mid})`;
  const base = `var(--ms-base,${colors.base})`;
  const core = `var(--ms-core,${colors.core})`;
  const feature = `var(--ms-features,${colors.features})`;
  const stage = `var(--ms-stage,${config.stage})`;
  const accent = `var(--ms-accent,${config.accent})`;
  // Secondary fills derive from theme tokens so studio theme switches recolor them.
  const face = species === "owl" || species === "puffin" ? top : mid;
  const iris = core;
  const blush = accent;
  const beak =
    species === "puffin" ? accent
      : species === "owl" ? core
        : feature;
  const beakTip = core;
  const feet = species === "puffin" ? accent : core;
  const markFill = top;
  const gorget = core;
  const bodyClass =
    pose.key === "dancing" ? "ck-dance"
      : pose.key === "running" ? "ck-run"
        : pose.key === "flying" ? "ck-fly"
          : pose.key === "talking" ? undefined
            : "ck-float";
  const gid = `${config.slug}-${pose.key}`;
  const hovering = species === "hummingbird" || pose.key === "flying";
  const isPropPose = PROP_KEYS.has(pose.key);
  const stance = POSE_STANCE[pose.key] || {};
  const shadowX = 210 + (stance.shadowX || 0);

  return (
    <svg
      className={`ms-root ck-svg ck-${config.slug} ck-${species} ck-pose-${pose.key}`}
      viewBox="0 0 420 520"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${config.name} the ${species} chick: ${pose.label}`}
    >
      <title>{`${config.name} the ${species} chick — ${pose.label}`}</title>
      <desc>{pose.tip}</desc>
      <style>{SVG_CSS}</style>
      <defs>
        <radialGradient id={`${gid}-halo`} cx="50%" cy="46%" r="58%">
          <stop offset="0" stopColor={core} stopOpacity=".78" />
          <stop offset="1" stopColor={core} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-pool`} cx="50%" cy="50%" r="52%">
          <stop offset="0" stopColor={core} stopOpacity=".55" />
          <stop offset="1" stopColor={core} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset=".42" stopColor={mid} />
          <stop offset="1" stopColor={base} />
        </linearGradient>
      </defs>
      <rect width="420" height="520" fill={stage} opacity=".001" />
      {/* Sol-style light pool — both ellipses share the shadow toggle */}
      <g data-ms-part="shadow">
        <ellipse
          className="ck-pool"
          cx={shadowX}
          cy={hovering ? 498 : 492}
          rx={hovering ? 64 : 98}
          ry={hovering ? 12 : 14}
          fill={`url(#${gid}-pool)`}
        />
        <ellipse
          cx={shadowX}
          cy={hovering ? 498 : 492}
          rx={hovering ? 40 : 70}
          ry="7"
          fill="#000"
          opacity={hovering ? ".1" : ".18"}
        />
      </g>
      <ellipse
        data-ms-part="halo"
        className="ck-halo ms-glow-halo"
        cx="210"
        cy="286"
        rx="168"
        ry="172"
        fill={`url(#${gid}-halo)`}
      />
      <SpeciesAccessory
        species={species}
        poseKey={pose.key}
        top={top}
        mid={mid}
        base={base}
        feature={feature}
        core={core}
        accent={accent}
      />
      <g transform={stance.translate}>
        {species !== "hummingbird" && (
          <SpeciesFeet species={species} core={core} feature={feature} poseKey={pose.key} feet={feet} />
        )}
        <g transform={stance.lean}>
          <g className={bodyClass}>
            <SpeciesWings
              species={species}
              poseKey={pose.key}
              mid={mid}
              top={top}
              base={base}
              accent={accent}
              markFill={markFill}
              layer="rear"
            />
            <SpeciesBody
              species={species}
              top={top}
              mid={mid}
              base={base}
              feature={feature}
              core={core}
              config={config}
              face={face}
              gid={gid}
              gorget={gorget}
            />
            <SpeciesWings
              species={species}
              poseKey={pose.key}
              mid={mid}
              top={top}
              base={base}
              accent={accent}
              markFill={markFill}
              layer="front"
            />
            {species === "hummingbird" && (
              <SpeciesFeet species={species} core={core} feature={feature} poseKey={pose.key} feet={feet} />
            )}
            <SpeciesFace
              species={species}
              pose={pose}
              feature={feature}
              core={core}
              beak={beak}
              beakTip={beakTip}
              blush={blush}
              iris={iris}
              mid={mid}
              top={top}
              base={base}
            />
            <SpeciesWings
              species={species}
              poseKey={pose.key}
              mid={mid}
              top={top}
              base={base}
              accent={accent}
              markFill={markFill}
              layer="face"
            />
            <g data-ms-part="prop">
              {isPropPose && (
                <PoseVisuals
                  keyName={pose.key}
                  core={core}
                  feature={feature}
                  species={species}
                />
              )}
            </g>
          </g>
        </g>
      </g>
      <g data-ms-part="effects">
        {!isPropPose && (
          <PoseVisuals
            keyName={pose.key}
            core={core}
            feature={feature}
            species={species}
          />
        )}
      </g>
    </svg>
  );
}

export function createChickPoseSource(slug) {
  const config = BIRD_VARIANTS[slug];
  if (!config) throw new Error(`Unknown bird mascot: ${slug}`);
  return {
    slug,
    poses: GESTURE_PRESETS.map((pose) => ({
      ...pose,
      track: TRACKING_KEYS.has(pose.key),
      signal: HAPPY_KEYS.has(pose.key) ? 78 : SAD_KEYS.has(pose.key) ? 28 : 52,
    })),
    renderPose: (key) => renderBird(config, key),
    meta: {
      name: config.name,
      tagline: config.tagline,
      product: config.product,
      accent: config.accent,
      stage: config.stage,
      glowLabel: "Warmth",
      themes: config.themes,
      instrument: null,
    },
  };
}

export function ChickPreview({ slug }) {
  const config = BIRD_VARIANTS[slug];
  if (!config) throw new Error(`Unknown bird mascot: ${slug}`);
  return renderBird(config, "idle");
}
