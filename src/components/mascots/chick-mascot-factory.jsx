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
  .ck-float{animation:ck-float 3.6s ease-in-out infinite}
  .ck-halo{animation:ck-glow 3.1s ease-in-out infinite}
  .ck-pool{animation:ck-pool 3.6s ease-in-out infinite}
  .ck-dance,.ck-run{transform-box:fill-box;transform-origin:center bottom}
  .ck-fly,.ck-spin,.ck-pulse,.ck-blink{transform-box:fill-box;transform-origin:center}
  .ck-dance{animation:ck-dance .82s ease-in-out infinite}
  .ck-run{animation:ck-run .34s ease-in-out infinite}
  .ck-fly{animation:ck-fly 1.35s ease-in-out infinite}
  .ck-spin{animation:ck-spin 1.15s linear infinite}
  .ck-pulse{animation:ck-pulse 1.2s ease-in-out infinite}
  .ck-drift{animation:ck-drift 2s ease-out infinite;opacity:.9}
  .ck-blink{animation:ck-blink 4.8s ease-in-out infinite}
  .ck-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes ck-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes ck-glow{0%,100%{opacity:.22}50%{opacity:.5}}
  @keyframes ck-pool{0%,100%{opacity:.72}50%{opacity:.42}}
  @keyframes ck-dance{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(5deg) translateY(-10px)}}
  @keyframes ck-run{0%,100%{transform:rotate(-3deg) translate(5px,2px)}50%{transform:rotate(4deg) translate(-4px,-12px)}}
  @keyframes ck-fly{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-24px) rotate(3deg)}}
  @keyframes ck-spin{to{transform:rotate(360deg)}}
  @keyframes ck-pulse{0%,100%{opacity:.35;transform:scale(.86)}50%{opacity:1;transform:scale(1.08)}}
  @keyframes ck-drift{0%{opacity:.55;transform:translateY(12px)}25%{opacity:1}100%{opacity:0;transform:translateY(-34px)}}
  @keyframes ck-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.08)}}
  @media (prefers-reduced-motion:reduce){.ck-svg *{animation:none!important}}
`;

const TRACKING_KEYS = new Set(["idle", "wave", "thinking", "listening", "talking", "pointing"]);
const HAPPY_KEYS = new Set(["happy", "celebrate", "proud", "dancing", "success", "encourage", "clapping", "high_five"]);
const CLOSED_KEYS = new Set(["happy", "sleepy", "blowing_kiss", "dancing", "clapping"]);
const WIDE_KEYS = new Set(["surprised", "alarm", "error"]);
const SAD_KEYS = new Set(["sad", "crying", "empty"]);
const ANGRY_KEYS = new Set(["grumpy", "thumbs_down"]);
const UP_LEFT = new Set(["wave", "celebrate", "proud", "alarm", "thumbs_up", "high_five", "flying"]);
const UP_RIGHT = new Set(["celebrate", "proud", "alarm", "encourage", "flying"]);
const OUT_LEFT = new Set(["pointing", "talking", "searching", "thumbs_down", "running"]);
const OUT_RIGHT = new Set(["encourage", "running"]);
const PROP_KEYS = new Set(["working", "writing", "searching", "thumbs_up", "thumbs_down", "empty"]);
const MOBILE_KEYS = new Set(["running", "flying"]);
const FACE_LAYOUTS = {
  owl: { lx: 170, rx: 250, y: 258, blushR: 13, blushY: 28 },
  hummingbird: { lx: 194, rx: 226, y: 236, blushR: 5.5, blushY: 12 },
  magpie: { lx: 186, rx: 234, y: 228, blushR: 7, blushY: 20 },
  puffin: { lx: 178, rx: 242, y: 236, blushR: 7, blushY: 18 },
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
      return <path d="M131 178 q79-57 158 0" fill="none" stroke={core} strokeWidth="8" strokeDasharray="8 15" strokeLinecap="round" />;
    case "dancing":
      return <g className="ck-drift"><path d="M91 229 q23-14 19-38 q25 10 40-9 v45 q-17-10-31 3 M307 213 q20-12 16-34 q23 9 36-8 v42 q-16-9-28 3" fill={core} stroke={feature} strokeWidth="5" /></g>;
    case "encourage":
      return <g><path d="M210 113 l8 18 20 2-15 13 5 19-18-10-18 10 5-19-15-13 20-2Z" fill={core} stroke={feature} strokeWidth="5" /></g>;
    case "searching":
      return <g><circle cx="105" cy="257" r="33" fill="#FFFDF7" fillOpacity=".45" stroke={feature} strokeWidth="8" /><path d="M80 281 l-25 26" {...stroke} /></g>;
    case "thumbs_up":
    case "thumbs_down":
      return (
        <g transform={keyName === "thumbs_down" ? "translate(-4 403) scale(.55 -.55)" : "translate(-4 75) scale(.55)"}>
          <path d="M87 286 h42 l17-34 q8-15 20-8 q8 5 1 25 l-5 15 h30 v70 h-66 l-39-15Z" fill={core} stroke={feature} strokeWidth="7" strokeLinejoin="round" />
        </g>
      );
    case "shrug":
      return <g><path d="M75 218 q28-25 56 0 M289 218 q28-25 56 0" {...stroke} /></g>;
    case "working":
      return <g><path d="M118 371 h184 l-18 87 h-148Z" fill="#FFFDF7" stroke={feature} strokeWidth="7" /><path d="M99 458 h222" {...stroke} /><circle cx="210" cy="415" r="10" fill={core} /></g>;
    case "running":
      return <g><path d="M49 287 h75 M36 322 h67 M58 357 h49" {...stroke} /></g>;
    case "flying":
      return <g fill="#FFFDF7" stroke={feature} strokeWidth="5"><path d="M40 411 q12-28 38-12 q15-27 39 0 q28-5 30 21 H40Z" /><path d="M279 139 q12-26 35-11 q15-24 36 2 q25-4 28 18 h-99Z" /></g>;
    case "high_five":
    case "clapping":
      return <g className="ck-pulse"><path d="M210 126 l8 18 20 2-15 13 5 19-18-10-18 10 5-19-15-13 20-2Z" fill={core} stroke={feature} strokeWidth="5" /></g>;
    case "success":
      return <g><circle cx="325" cy="222" r="36" fill={core} stroke={feature} strokeWidth="6" /><path d="M307 222 l13 13 25-30" {...stroke} /></g>;
    case "error":
      return <g><path d="M325 177 l39 70 h-78Z" fill={core} stroke={feature} strokeWidth="6" strokeLinejoin="round" /><path d="M325 201 v22 M325 236 v2" {...stroke} /></g>;
    case "empty":
      return <g><path d="M121 393 h178 l-18 58 h-142Z" fill="#FFFDF7" fillOpacity=".35" stroke={feature} strokeWidth="7" /><path d="M176 418 h68" {...stroke} /></g>;
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
  /* Tiny dark beads in a mint orbital — zero white sclera. */
  const rx = wide ? 7.5 : 6.2;
  const ry = wide ? 9 : 7.4;
  return (
    <g className="ck-blink">
      <ellipse cx={x} cy={y} rx={rx + 4} ry={ry + 3.5} fill={core} opacity=".55" />
      <ellipse cx={x} cy={y} rx={rx + 4} ry={ry + 3.5} fill="none" stroke={feature} strokeWidth="1.4" opacity=".35" />
      <g className="ms-eyes">
        <ellipse cx={x + lookX * 0.35} cy={y + lookY * 0.35} rx={rx} ry={ry} fill={feature} />
        <ellipse cx={x - 1.8 + lookX * 0.25} cy={y - 2.2 + lookY * 0.25} rx="2.1" ry="2.5" fill="#FFF8E8" opacity=".92" />
        <circle cx={x + 1.4 + lookX * 0.25} cy={y + 1.8 + lookY * 0.25} r="0.9" fill="#FFF8E8" opacity=".5" />
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
  /* Tall clever almonds — narrow white, tall dark pupil. Never round like owl. */
  const rx = wide ? 11 : 9.5;
  const ry = wide ? 22 : 19;
  return (
    <g className="ck-blink">
      <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#FFFDF8" stroke={feature} strokeWidth="4.2" />
      <g className="ms-eyes">
        <ellipse cx={x + lookX * 0.6} cy={y + 1 + lookY} rx={rx * 0.55} ry={ry * 0.62} fill={feature} />
        <ellipse cx={x - 2.2 + lookX * 0.5} cy={y - 5 + lookY} rx="2.2" ry="3.2" fill="#fff" />
        <circle cx={x + 2 + lookX * 0.5} cy={y + 5 + lookY} r="1.1" fill="#fff" opacity=".6" />
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
  /* Compact round eyes sunk in mirrored charcoal face wedges — puffin mark. */
  const r = wide ? 8.5 : 7.2;
  const patch =
    side === "left"
      ? `M${x - 22} ${y - 20} L${x + 8} ${y - 2} L${x - 8} ${y + 18} Z`
      : `M${x + 22} ${y - 20} L${x - 8} ${y - 2} L${x + 8} ${y + 18} Z`;
  return (
    <g className="ck-blink">
      <path d={patch} fill={mid} opacity=".95" />
      <circle cx={x} cy={y} r={r + 2.2} fill="#FFFDF8" stroke={feature} strokeWidth="3.2" />
      <g className="ms-eyes">
        <circle cx={x + lookX * 0.45} cy={y + 1 + lookY * 0.45} r={r * 0.78} fill={feature} />
        <circle cx={x - 2 + lookX * 0.35} cy={y - 2.2 + lookY * 0.35} r="1.9" fill="#fff" />
      </g>
    </g>
  );
}

/**
 * Front-facing bills. Talking uses a static open silhouette, matching Lyra and
 * Granary: no bill transform, path morph, bounce, or reduced-motion leak.
 */
function FrontBeak({ species, open, beak, beakTip, beakBand, feature, top, mid, base, accent }) {
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
    /* Inverted triangle bill — sits BELOW the eyes, tip down. Never covers the face. */
    const left = 172, right = 248, baseY = 268, tipY = open ? 334 : 318;
    const upperTip = 300;
    const lowerPath = (depth) =>
      `M${left + 10},${baseY + 18} L210,${depth} L${right - 10},${baseY + 18} Z`;
    const restingLower = lowerPath(tipY);
    return (
      <g data-ms-part="beak">
        {open && (
          <path
            data-ck-beak="cavity"
            d={`M${left + 16},${baseY + 20} L210,${tipY - 6} L${right - 16},${baseY + 20} Z`}
            fill={feature}
            opacity=".82"
          />
        )}
        <path
          data-ck-beak="lower"
          d={restingLower}
          fill={beakTip}
          stroke={feature}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          data-ck-beak="upper"
          d={`M${left},${baseY} Q210,${upperTip} ${right},${baseY} L${left},${baseY} Z`}
          fill={beak}
          stroke={feature}
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        {/* Horizontal color bands — theme tokens only */}
        <path d={`M${left + 8},${baseY + 14} L${right - 8},${baseY + 14}`} fill="none" stroke={top} strokeWidth="7" strokeLinecap="round" opacity=".95" />
        <path d={`M${left + 18},${baseY + 26} L${right - 18},${baseY + 26}`} fill="none" stroke={beakBand || accent} strokeWidth="6" strokeLinecap="round" opacity=".92" />
        <path d={`M${left + 28},${baseY + 38} L${right - 28},${baseY + 38}`} fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" opacity=".88" />
        <path d={`M${left + 12},${baseY + 6} L${right - 12},${baseY + 6}`} fill="none" stroke={top} strokeWidth="2.2" strokeLinecap="round" opacity=".45" />
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

  /* Magpie — pointed dagger beak */
  const left = 196, right = 224, billTop = 248, seam = 264, bottom = open ? 292 : 280;
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
        d={`M${left},${seam} Q210,${billTop} ${right},${seam} Q210,${seam + 7} ${left},${seam} Z`}
        fill={beak}
        stroke={feature}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path d={`M${left + 4},${seam - 1} Q210,${billTop + 6} ${right - 4},${seam - 1}`} fill="none" stroke={top} strokeWidth="1.6" strokeLinecap="round" opacity=".3" />
    </g>
  );
}

function SpeciesFace({ species, pose, feature, core, beak, beakTip, beakBand, blush, iris, mid, top, base, accent }) {
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
        beakBand={beakBand}
        feature={feature}
        top={top}
        mid={mid}
        base={base}
        accent={accent}
      />
    </>
  );
}

function wingMode(key, side) {
  if (key === "flying") return "flap";
  if (key === "shrug") return "out";
  if (key === "facepalm" && side === "left") return "face";
  if ((key === "thinking" || key === "blowing_kiss") && side === "right") return "face";
  if (key === "writing" || key === "working" || key === "clapping") return "front";
  if ((side === "left" ? UP_LEFT : UP_RIGHT).has(key)) return "up";
  if ((side === "left" ? OUT_LEFT : OUT_RIGHT).has(key)) return "out";
  return "rest";
}

const FOREGROUND_WING_MODES = new Set(["up", "front"]);
const FACE_WING_MODES = new Set(["face"]);
/** Left-shoulder pivot in canvas space; right wing mirrors X. */
const WING_SHOULDER = {
  owl: [154, 296],
  hummingbird: [178, 268],
  magpie: [158, 302],
  puffin: [158, 308],
};

/**
 * Left-wing paths in shoulder-local space (0,0 = hinge on body).
 * Negative X = outboard. Kept tucked so tips never float off the silhouette.
 */
const WING_LOCAL = {
  owl: {
    rest: "M0,0 C-10,14 -18,46 -12,82 C-6,102 8,96 10,62 C8,34 4,12 0,0 Z",
    up: "M0,0 C-16,-10 -40,-40 -52,-70 C-36,-78 -14,-52 -2,-22 C0,-10 0,0 0,0 Z",
    down: "M0,0 C-22,10 -50,34 -66,28 C-54,48 -24,42 -4,14 C-1,6 0,0 0,0 Z",
    out: "M0,0 C-34,2 -64,18 -78,40 C-58,52 -28,42 -4,14 C-1,6 0,0 0,0 Z",
    front: "M0,0 C6,22 18,48 34,62 C40,50 28,28 14,12 C6,4 0,0 0,0 Z",
    face: "M0,0 C4,-18 14,-36 28,-42 C24,-24 14,-10 4,-2 Z",
    coverts: "M0,2 C-8,18 -10,40 -4,58 C2,48 4,24 0,2 Z",
    barbs: ["M-2,8 C-14,28 -16,52 -10,72", "M-4,16 C-20,36 -28,56 -24,70"],
  },
  hummingbird: {
    rest: "M0,0 C-36,-10 -70,-6 -92,8 C-74,18 -40,16 -8,6 C-2,2 0,0 0,0 Z",
    up: "M0,0 C-28,-24 -54,-52 -66,-70 C-48,-62 -22,-36 -4,-12 C-1,-4 0,0 0,0 Z",
    down: "M0,0 C-30,16 -58,34 -74,30 C-56,44 -26,28 -4,8 C-1,3 0,0 0,0 Z",
    out: "M0,0 C-38,-4 -72,2 -96,14 C-76,24 -42,18 -8,6 C-2,2 0,0 0,0 Z",
    front: "M0,0 C4,18 12,40 24,52 C28,40 18,20 8,8 C3,3 0,0 0,0 Z",
    face: "M0,0 C2,-12 8,-24 16,-28 C14,-16 8,-6 2,-1 Z",
    coverts: "M0,1 C-18,-2 -36,0 -48,6 C-34,10 -16,8 0,1 Z",
    barbs: ["M-6,0 C-40,-8 -68,-4 -86,6", "M-10,4 C-44,0 -70,8 -84,16"],
  },
  magpie: {
    rest: "M0,0 C-8,18 -14,52 -8,92 C-2,112 10,104 12,68 C10,36 4,12 0,0 Z",
    up: "M0,0 C-14,-12 -36,-44 -48,-74 C-32,-80 -12,-52 -2,-22 C0,-10 0,0 0,0 Z",
    down: "M0,0 C-20,12 -46,38 -60,34 C-48,52 -22,44 -4,14 C-1,6 0,0 0,0 Z",
    out: "M0,0 C-32,4 -60,22 -74,44 C-54,54 -26,44 -4,14 C-1,6 0,0 0,0 Z",
    front: "M0,0 C6,24 16,50 30,64 C36,52 24,28 12,12 C5,4 0,0 0,0 Z",
    face: "M0,0 C4,-20 12,-40 24,-46 C20,-28 12,-12 4,-2 Z",
    coverts: "M0,2 C-6,20 -8,46 -2,68 C4,54 4,24 0,2 Z",
    barbs: ["M-2,10 C-12,34 -14,62 -8,84", "M-4,20 C-18,44 -26,68 -20,86"],
  },
  puffin: {
    rest: "M0,0 C-8,12 -16,38 -10,64 C-4,78 8,72 10,46 C8,24 4,8 0,0 Z",
    up: "M0,0 C-12,-8 -30,-30 -40,-52 C-26,-58 -10,-38 -2,-16 C0,-6 0,0 0,0 Z",
    down: "M0,0 C-16,8 -36,26 -48,22 C-38,36 -18,32 -4,12 C-1,5 0,0 0,0 Z",
    out: "M0,0 C-24,2 -46,16 -56,32 C-40,40 -20,32 -4,12 C-1,5 0,0 0,0 Z",
    front: "M0,0 C5,18 14,40 26,52 C30,42 20,22 10,10 C4,4 0,0 0,0 Z",
    face: "M0,0 C3,-14 10,-28 20,-32 C16,-18 10,-8 3,-2 Z",
    coverts: "M0,2 C-6,14 -8,34 -2,50 C4,40 4,18 0,2 Z",
    barbs: ["M-2,8 C-12,24 -14,44 -8,58", "M-4,14 C-16,30 -22,48 -16,58"],
  },
};

/** Rotate amplitude / tempo at the shoulder hinge. */
function wingFlap(poseKey, species, side) {
  if (poseKey === "flying") {
    const dur = species === "hummingbird" ? "0.09s" : species === "owl" ? "0.2s" : "0.14s";
    const amp = species === "hummingbird" ? 38 : species === "puffin" ? 26 : 32;
    const sign = side === "left" ? 1 : -1;
    return {
      values: `${-amp * sign};${amp * sign};${-amp * sign}`,
      dur,
      begin: side === "right" ? "-0.02s" : "0s",
    };
  }
  if (poseKey === "dancing" || poseKey === "celebrate" || poseKey === "clapping") {
    const sign = side === "left" ? 1 : -1;
    return { values: `${-10 * sign};${14 * sign};${-10 * sign}`, dur: "0.42s", begin: "0s" };
  }
  if (poseKey === "running" || poseKey === "wave" || poseKey === "high_five") {
    const sign = side === "left" ? 1 : -1;
    return { values: `${-8 * sign};${12 * sign};${-8 * sign}`, dur: poseKey === "running" ? "0.28s" : "0.55s", begin: "0s" };
  }
  if (poseKey === "idle" || poseKey === "listening" || poseKey === "happy" || poseKey === "proud") {
    const sign = side === "left" ? 1 : -1;
    return { values: `${-3 * sign};${4 * sign};${-3 * sign}`, dur: "2.6s", begin: side === "right" ? "-0.8s" : "0s" };
  }
  return null;
}

function WingFeathers({ species, mode, mid, top, accent, markFill, layer }) {
  const kit = WING_LOCAL[species];
  const primary = mode === "flap" ? kit.up : kit[mode] || kit.rest;
  const detail =
    species === "magpie" ? markFill || top
      : species === "hummingbird" || species === "owl" ? top
        : accent;
  const outline = species === "puffin" ? accent : top;
  const strokeFront = layer === "front" || mode === "flap";

  return (
    <>
      {/* Soft under-wing so the hinge reads attached to the body */}
      <ellipse cx={-2} cy={6} rx={10} ry={14} fill={mid} opacity=".55" />
      <path
        data-ck-wing-primary="1"
        d={primary}
        fill={mid}
        stroke={strokeFront ? outline : "none"}
        strokeWidth={strokeFront ? (species === "hummingbird" ? "2" : "2.8") : undefined}
        strokeOpacity={strokeFront ? ".7" : undefined}
        strokeLinejoin="round"
      >
        {mode === "flap" && (
          <animate
            attributeName="d"
            values={`${kit.up};${kit.down};${kit.up}`}
            dur={species === "hummingbird" ? "0.09s" : "0.14s"}
            repeatCount="indefinite"
          />
        )}
      </path>
      <path d={kit.coverts} fill={top} opacity={species === "magpie" ? ".55" : ".38"} />
      {species === "hummingbird" && mode === "flap" && (
        <path d={kit.out} fill={top} opacity=".22">
          <animate attributeName="opacity" values=".08;.28;.08" dur="0.09s" repeatCount="indefinite" />
        </path>
      )}
      <g fill="none" stroke={detail} strokeLinecap="round" opacity={species === "magpie" ? ".7" : ".42"}>
        {kit.barbs.map((d) => (
          <path key={d} d={d} strokeWidth={species === "hummingbird" ? "2.2" : "2.8"} />
        ))}
      </g>
    </>
  );
}

function SpeciesWings({ species, poseKey, mid, top, accent, markFill, layer }) {
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
        : // flap/rest/out sit behind the body so feathers insert at the shoulder
          !FOREGROUND_WING_MODES.has(mode) && !FACE_WING_MODES.has(mode)
  );

  return (
    <g data-ms-part="wings" data-ck-wing-layer={layer}>
      {wings.map(({ side, mode }) => {
        const x = side === "left" ? sx : 420 - sx;
        const flap = wingFlap(poseKey, species, side);
        return (
          <g key={side} data-ck-wing={side} data-ck-wing-mode={mode} transform={`translate(${x},${sy})`}>
            <g>
              {flap && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  additive="sum"
                  values={flap.values}
                  dur={flap.dur}
                  begin={flap.begin}
                  repeatCount="indefinite"
                />
              )}
              <g transform={side === "right" ? "scale(-1,1)" : undefined}>
                <WingFeathers
                  species={species}
                  mode={mode}
                  mid={mid}
                  top={top}
                  accent={accent}
                  markFill={markFill}
                  layer={layer}
                />
              </g>
            </g>
          </g>
        );
      })}
    </g>
  );
}

function SpeciesBody({ species, top, mid, base, feature, core, accent, config, poseKey, face, gid, gorget }) {
  const showAccessory =
    !MOBILE_KEYS.has(poseKey) && !PROP_KEYS.has(poseKey);
  if (species === "owl") {
    return (
      <>
        <g data-ms-part="accessory">
          {showAccessory && (
            <>
              {/* Side hourglass — classic X bulbs, unmistakably a timer */}
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
            </>
          )}
        </g>
        <g data-ms-part="body">
          {/* Wide soft pear — Duo owl proportions */}
          <path
            d="M210 188 C274 188 308 246 304 302 C300 348 278 388 262 418 C246 448 230 458 210 460 C190 458 174 448 158 418 C142 388 120 348 116 302 C112 246 146 188 210 188Z"
            fill={`url(#${gid}-body)`}
          />
          {/* Shoulder saddle — wings hinge out of this, not thin air */}
          <ellipse cx="148" cy="300" rx="22" ry="28" fill={mid} opacity=".55" />
          <ellipse cx="272" cy="300" rx="22" ry="28" fill={mid} opacity=".55" />
          <path d="M132 286 C140 318 148 348 156 372" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" opacity=".22" />
          <path d="M288 286 C280 318 272 348 264 372" fill="none" stroke={base} strokeWidth="5" strokeLinecap="round" opacity=".22" />
          {/* Heart facial disk */}
          <path
            d="M210 198 C246 198 278 222 286 258 C292 292 278 318 248 332 C228 342 210 346 210 346 C210 346 192 342 172 332 C142 318 128 292 134 258 C142 222 174 198 210 198Z"
            fill={face}
          />
          <ellipse cx="210" cy="268" rx="68" ry="58" fill="none" stroke={feature} strokeWidth="2" opacity=".12" />
          <ellipse cx="210" cy="268" rx="50" ry="42" fill="none" stroke={feature} strokeWidth="1.4" opacity=".08" />
          <ellipse cx="210" cy="372" rx="50" ry="52" fill={top} opacity=".95" />
          <path d="M188 354 Q210 362 232 354 M184 374 Q210 384 236 374 M190 394 Q210 402 230 394" fill="none" stroke={feature} strokeWidth="2" opacity=".12" strokeLinecap="round" />
          <path d="M162 206 Q210 186 258 206" fill="none" stroke={top} strokeWidth="6" strokeLinecap="round" opacity=".28" />
        </g>
        <g data-ms-part="app-badge" transform="translate(0,18)"><AppMark mark={config.mark} core={core} feature={feature} /></g>
        <g data-ms-part="tuft">
          <path d="M148 208 C128 168 138 132 168 128 C172 162 182 186 196 206" fill={mid} />
          <path d="M272 208 C292 168 282 132 252 128 C248 162 238 186 224 206" fill={mid} />
          <path d="M156 176 Q166 154 176 174" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".5" />
          <path d="M264 176 Q254 154 244 174" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".5" />
          <path d="M160 150 Q168 136 174 152" fill="none" stroke={core} strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
          <path d="M260 150 Q252 136 246 152" fill="none" stroke={core} strokeWidth="2.4" strokeLinecap="round" opacity=".45" />
        </g>
      </>
    );
  }

  if (species === "hummingbird") {
    return (
      <>
        <g data-ms-part="accessory">
          {showAccessory && (
            <g transform="translate(210 412)">
              <ellipse cx="0" cy="22" rx="3.2" ry="18" fill={base} />
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse key={deg} cx="0" cy="-11" rx="9.5" ry="15" fill={core} opacity=".95" transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="8" fill={top} />
              <circle cx="0" cy="0" r="3.2" fill={feature} opacity=".28" />
            </g>
          )}
        </g>
        <g data-ms-part="body">
          {/* Compact jewel — smallest silhouette, floats high */}
          <path
            d="M210 196 C234 196 250 228 248 274 C246 314 232 344 210 354 C188 344 174 314 172 274 C170 228 186 196 210 196Z"
            fill={`url(#${gid}-body)`}
          />
          {/* Tiny shoulder pads where the blur-wings attach */}
          <ellipse cx="176" cy="268" rx="10" ry="12" fill={mid} opacity=".5" />
          <ellipse cx="244" cy="268" rx="10" ry="12" fill={mid} opacity=".5" />
          {/* Iridescent gorget collar — below the needle beak */}
          <path
            d="M188 276 C200 264 220 264 232 276 C226 296 216 308 210 312 C204 308 194 296 188 276Z"
            fill={gorget || core}
            opacity=".95"
          />
          <ellipse cx="210" cy="292" rx="16" ry="9" fill={top} opacity=".35" />
          {/* Forked scissor tail */}
          <path d="M202 344 Q184 368 166 380" fill="none" stroke={base} strokeWidth="11" strokeLinecap="round" />
          <path d="M218 344 Q236 368 254 380" fill="none" stroke={base} strokeWidth="11" strokeLinecap="round" />
          <path d="M202 344 Q184 368 166 380" fill="none" stroke={mid} strokeWidth="5" strokeLinecap="round" opacity=".7" />
          <path d="M218 344 Q236 368 254 380" fill="none" stroke={mid} strokeWidth="5" strokeLinecap="round" opacity=".7" />
          <path d="M192 210 Q210 196 228 210" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".32" />
        </g>
        <g data-ms-part="app-badge">
          <circle cx="210" cy="332" r="15" fill={core} stroke={feature} strokeWidth="3.5" />
          <path d="M202 332 l5 5 10-12" fill="none" stroke={feature} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <g data-ms-part="tuft">
          <path d="M202 202 Q210 184 218 202" fill="none" stroke={core} strokeWidth="5" strokeLinecap="round" />
          <path d="M206 198 Q210 188 214 198" fill="none" stroke={top} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
        </g>
      </>
    );
  }

  if (species === "magpie") {
    return (
      <>
        <g data-ms-part="accessory">
          {showAccessory && (
            <>
              {/* Round inkwell pot + dipping quill — journal ritual */}
              <ellipse cx="278" cy="496" rx="34" ry="6" fill={base} opacity=".32" />
              <ellipse cx="278" cy="478" rx="32" ry="14" fill={mid} stroke={feature} strokeWidth="3" />
              <ellipse cx="278" cy="468" rx="28" ry="11" fill={base} />
              <ellipse cx="278" cy="464" rx="18" ry="7" fill={feature} />
              <ellipse cx="278" cy="462" rx="10" ry="3.5" fill={base} opacity=".8" />
              <path d="M292 458 L312 392" stroke={feature} strokeWidth="3.6" strokeLinecap="round" />
              <path d="M312 392 C326 382 340 396 326 410 C312 418 300 400 312 392Z" fill={top} stroke={feature} strokeWidth="2.2" />
              <path d="M304 398 L320 406" fill="none" stroke={core} strokeWidth="2" strokeLinecap="round" opacity=".7" />
            </>
          )}
        </g>
        <g data-ms-part="body">
          {/* Tall narrow collector — longest silhouette */}
          <path
            d="M210 178 C248 178 268 228 266 292 C264 348 250 392 232 424 C224 438 196 438 188 424 C170 392 156 348 154 292 C152 228 172 178 210 178Z"
            fill={`url(#${gid}-body)`}
          />
          {/* Scapulars — dark wing roots glued to the tall torso */}
          <ellipse cx="154" cy="304" rx="16" ry="30" fill={base} opacity=".55" />
          <ellipse cx="266" cy="304" rx="16" ry="30" fill={base} opacity=".55" />
          <path d="M148 280 C150 320 154 360 160 392" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".28" />
          <path d="M272 280 C270 320 266 360 260 392" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".28" />
          {/* White face half-mask + vertical bib */}
          <ellipse cx="210" cy="238" rx="44" ry="40" fill={top} opacity=".98" />
          <ellipse cx="210" cy="312" rx="24" ry="58" fill={top} opacity=".96" />
          {/* Single graduated magpie tail — one wedge, never a tripod of legs */}
          <path
            d="M188 418 C196 448 200 478 204 508 L210 516 L216 508 C220 478 224 448 232 418 C220 424 200 424 188 418Z"
            fill={mid}
          />
          <path
            d="M196 422 C202 452 206 480 208 506 L210 512 L212 506 C214 480 218 452 224 422 C214 426 206 426 196 422Z"
            fill={base}
          />
          <path d="M206 500 L210 514 L214 500" fill={top} opacity=".75" />
          <path d="M200 456 L220 456" fill="none" stroke={top} strokeWidth="3" strokeLinecap="round" opacity=".35" />
          <path d="M202 478 L218 478" fill="none" stroke={top} strokeWidth="2.5" strokeLinecap="round" opacity=".28" />
          <path d="M178 198 Q210 178 242 198" fill="none" stroke={top} strokeWidth="3.2" strokeLinecap="round" opacity=".2" />
        </g>
        <g data-ms-part="app-badge"><AppMark mark={config.mark} core={core} feature={feature} /></g>
        <g data-ms-part="tuft">
          <path d="M196 188 Q204 164 214 186" fill="none" stroke={top} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M208 186 Q218 160 228 184" fill="none" stroke={top} strokeWidth="3.4" strokeLinecap="round" opacity=".85" />
          <path d="M212 182 Q220 168 224 182" fill="none" stroke={core} strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
        </g>
      </>
    );
  }

  /* Puffin */
  return (
    <>
      <g data-ms-part="accessory">
        {showAccessory && (
          <>
            {/* Striped buoy + flag — team signal, not a flat pedestal */}
            <ellipse cx="210" cy="500" rx="56" ry="9" fill={base} opacity=".32" />
            <ellipse cx="210" cy="470" rx="58" ry="24" fill={core} stroke={feature} strokeWidth="3" />
            <path d="M152 462 Q210 448 268 462 Q210 476 152 462Z" fill={top} />
            <path d="M158 470 Q210 458 262 470 Q210 482 158 470Z" fill={accent} opacity=".85" />
            <path d="M164 478 Q210 468 256 478 Q210 488 164 478Z" fill={top} />
            <rect x="205" y="398" width="10" height="52" rx="3" fill={feature} />
            <path d="M215 404 L248 416 L215 428Z" fill={core} stroke={feature} strokeWidth="2.5" />
            <circle cx="210" cy="396" r="9" fill={top} stroke={feature} strokeWidth="2.5" />
          </>
        )}
      </g>
      <g data-ms-part="body">
        {/* Chunky upright football — widest short silhouette */}
        <path
          d="M210 186 C268 186 298 248 298 318 C298 386 260 438 210 452 C160 438 122 386 122 318 C122 248 152 186 210 186Z"
          fill={`url(#${gid}-body)`}
        />
        {/* Stub wing roots — short puffin wings grow from here */}
        <ellipse cx="148" cy="312" rx="20" ry="24" fill={mid} opacity=".62" />
        <ellipse cx="272" cy="312" rx="20" ry="24" fill={mid} opacity=".62" />
        <path d="M138 300 C142 328 148 352 156 372" fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round" opacity=".35" />
        <path d="M282 300 C278 328 272 352 264 372" fill="none" stroke={accent} strokeWidth="3.5" strokeLinecap="round" opacity=".35" />
        {/* White face + belly mask */}
        <ellipse cx="210" cy="250" rx="62" ry="54" fill={face} />
        <ellipse cx="210" cy="356" rx="50" ry="66" fill={top} />
        <path d="M182 430 Q210 462 238 430" fill={base} />
        <path d="M164 204 Q210 182 256 204" fill="none" stroke={top} strokeWidth="4" strokeLinecap="round" opacity=".14" />
      </g>
      <g data-ms-part="app-badge"><AppMark mark={config.mark} core={core} feature={feature} /></g>
      <g data-ms-part="tuft">
        {/* Dark crown peak — puffin widow's peak */}
        <path d="M152 236 C168 188 194 168 210 168 C226 168 252 188 268 236 C250 214 230 202 210 202 C190 202 170 214 152 236Z" fill={mid} />
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
      <g data-ms-part="feet" stroke={feature} strokeWidth="2.8" strokeLinecap="round" fill="none" opacity=".45">
        <path d={poseKey === "running" ? "M204 348 L190 364" : "M204 348 L202 358"} />
        <path d={poseKey === "running" ? "M216 348 L232 360" : "M216 348 L218 358"} />
      </g>
    );
  }
  if (species === "puffin") {
    if (poseKey === "running") {
      return (
        <g data-ms-part="feet" fill={fill} stroke={feature} strokeWidth="2.6" strokeLinecap="round">
          <path d="M170 424 C150 440 126 445 112 438 C132 434 150 422 164 414Z" />
          <path d="M250 426 C270 444 294 452 309 447 C288 442 270 428 256 416Z" />
        </g>
      );
    }
    return (
      <g data-ms-part="feet" fill={fill}>
        <path d="M168 422 C150 446 130 458 124 456 C140 448 156 432 164 420Z" />
        <path d="M252 422 C270 446 290 458 296 456 C280 448 264 432 256 420Z" />
        <ellipse cx="140" cy="458" rx="24" ry="9" />
        <ellipse cx="280" cy="458" rx="24" ry="9" />
        <path d="M128 456 L118 466 M140 460 L140 470 M152 456 L162 466" fill="none" stroke={feature} strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
        <path d="M268 456 L258 466 M280 460 L280 470 M292 456 L302 466" fill="none" stroke={feature} strokeWidth="2.6" strokeLinecap="round" opacity=".5" />
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
  const beakBand = accent;
  const feet = species === "puffin" ? accent : core;
  const markFill = top;
  const gorget = core;
  const bodyClass =
    pose.key === "dancing" ? "ck-dance"
      : pose.key === "running" ? "ck-run"
        : pose.key === "flying" ? "ck-fly"
          : "ck-float";
  const gid = `${config.slug}-${pose.key}`;
  const hovering = species === "hummingbird" || pose.key === "flying";
  const isPropPose = PROP_KEYS.has(pose.key);

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
          cx="210"
          cy={hovering ? 498 : 492}
          rx={hovering ? 64 : 98}
          ry={hovering ? 12 : 14}
          fill={`url(#${gid}-pool)`}
        />
        <ellipse
          cx="210"
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
      <g className={bodyClass}>
        <SpeciesWings
          species={species}
          poseKey={pose.key}
          mid={mid}
          top={top}
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
          accent={accent}
          config={config}
          poseKey={pose.key}
          face={face}
          gid={gid}
          gorget={gorget}
        />
        <SpeciesWings
          species={species}
          poseKey={pose.key}
          mid={mid}
          top={top}
          accent={accent}
          markFill={markFill}
          layer="front"
        />
        <SpeciesFeet species={species} core={core} feature={feature} poseKey={pose.key} feet={feet} />
        <SpeciesFace
          species={species}
          pose={pose}
          feature={feature}
          core={core}
          beak={beak}
          beakTip={beakTip}
          beakBand={beakBand}
          blush={blush}
          iris={iris}
          mid={mid}
          top={top}
          base={base}
          accent={accent}
        />
        <SpeciesWings
          species={species}
          poseKey={pose.key}
          mid={mid}
          top={top}
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
