import { GESTURE_PRESETS } from "@/lib/gesture-presets";

/**
 * SOL ORB FAMILY — four light-native companions.
 *
 * Like Sol: no arms. Expression is photonic — breathing silhouette, sun-core
 * behind the face, light pool (never a hard shadow), gleam, and light props.
 * Species diverge in silhouette, eyes, crown rays, and badge — not by bolting
 * on paddle "hands".
 *
 *   aura   — tall soft drop · crescent lids · meditation
 *   glint  — soft gem kite · rhombus eyes · photo filters
 *   trove  — plump vault · coin-slot eyes · savings
 *   zephyr — real cumulus cloud · round eyes · weather
 *
 * Toggle contract (every pose): body, core, eyes, brows, mouth, blush, gleam,
 * rays, badge, halo, pool, props, effects.
 */

const SVG_CSS = `
  .ob-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .ob-g-alarm{--gf:1.85}
  .ob-g-celebrate,.ob-g-success{--gf:1.4}
  .ob-g-love,.ob-g-wave,.ob-g-high_five{--gf:1.25}
  .ob-g-grumpy,.ob-g-sad,.ob-g-crying{--gf:.55}
  .ob-g-sleepy,.ob-g-waiting,.ob-g-empty{--gf:.42}
  .ob-float{animation:ob-float 3.8s ease-in-out infinite}
  .ob-g-sleepy .ob-float,.ob-g-waiting .ob-float{animation-duration:6.2s}
  .ob-g-dancing .ob-float{animation:ob-dance .9s ease-in-out infinite}
  .ob-g-running .ob-float{animation:ob-run .34s ease-in-out infinite}
  .ob-g-flying .ob-float{animation:ob-soar 1.5s ease-in-out infinite}
  .ob-g-alarm .ob-float{animation:none}
  .ob-g-wave .ob-glow,.ob-g-high_five .ob-glow{animation-duration:1.5s}
  .ob-g-wave .ob-gleam,.ob-g-high_five .ob-gleam{animation-duration:2.2s}
  .ob-pool{animation:ob-pool 3.8s ease-in-out infinite}
  .ob-glow{animation:ob-glow 3s ease-in-out infinite}
  .ob-gleam{animation:ob-gleam 6.4s ease-in-out infinite}
  .ob-pop{animation:ob-pop .28s ease-out}
  .ob-drift{animation:ob-drift 2.2s ease-out infinite}
  .ob-rise{animation:ob-rise 2.5s ease-out infinite}
  .ob-pulse{animation:ob-pulse 1.15s ease-in-out infinite}
  .ob-spin{animation:ob-spin 1.2s linear infinite;transform-origin:center}
  .ob-ray{animation:ob-ray 2.4s ease-in-out infinite}
  .ob-tick{animation:ob-tick .55s ease-out infinite}
  .ob-twinkle{animation:ob-twinkle 1.4s ease-in-out infinite}
  .ob-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes ob-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes ob-dance{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(5deg) translateY(-11px)}}
  @keyframes ob-run{0%,100%{transform:translate(6px,3px) rotate(-3deg)}50%{transform:translate(-5px,-12px) rotate(4deg)}}
  @keyframes ob-soar{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-22px) rotate(3deg)}}
  @keyframes ob-pool{0%,100%{opacity:.82}50%{opacity:.48}}
  @keyframes ob-glow{0%,100%{opacity:calc(var(--ms-glow,.5)*var(--gf,1)*.45)}50%{opacity:calc(var(--ms-glow,.5)*var(--gf,1))}}
  @keyframes ob-gleam{0%,28%,100%{transform:translateX(-90px);opacity:0}10%{opacity:.55}20%{transform:translateX(90px);opacity:0}}
  @keyframes ob-pop{from{opacity:0}to{opacity:1}}
  @keyframes ob-drift{0%{opacity:0;transform:translateY(10px)}22%{opacity:1}100%{opacity:0;transform:translateY(-36px)}}
  @keyframes ob-rise{0%{opacity:0;transform:translateY(12px)}20%{opacity:1}100%{opacity:0;transform:translateY(-44px)}}
  @keyframes ob-pulse{0%,100%{opacity:.35;transform:scale(.88)}50%{opacity:1;transform:scale(1.06)}}
  @keyframes ob-spin{to{transform:rotate(360deg)}}
  @keyframes ob-ray{0%,100%{opacity:.2;transform:translateY(3px)}50%{opacity:.9;transform:translateY(-3px)}}
  @keyframes ob-tick{0%{opacity:0}28%{opacity:1}100%{opacity:0}}
  @keyframes ob-twinkle{0%,100%{opacity:.25}50%{opacity:1}}
  @media (prefers-reduced-motion:reduce){.ob-svg *{animation:none!important}}
`;

const CORE_KEYS = new Set(["idle", "wave", "happy", "thinking", "listening", "talking", "pointing", "writing"]);
const HAPPY_KEYS = new Set(["happy", "celebrate", "proud", "dancing", "success", "encourage", "clapping", "high_five", "love"]);
const CLOSED_KEYS = new Set(["happy", "dancing", "clapping"]);
const WIDE_KEYS = new Set(["surprised", "alarm", "error"]);
const SAD_KEYS = new Set(["sad", "crying"]);
const ANGRY_KEYS = new Set(["grumpy", "thumbs_down"]);
const HALF_KEYS = new Set(["waiting"]);

const STAR4 = "M0,-9 L2.4,-2.4 L9,0 L2.4,2.4 L0,9 L-2.4,2.4 L-9,0 L-2.4,-2.4 Z";
const HEART = "M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z";

const ORB_VARIANTS = {
  aura: {
    slug: "aura",
    name: "Aura",
    species: "pillar",
    tagline: "A tall dawn drop that breathes with you",
    product: "Meditation App",
    brand: "#B8A0E0",
    accent: "#B8A0E0",
    stage: "#1A1628",
    mark: "lotus",
    eyeStyle: "crescent",
    colors: {
      top: "#F0E6FF", mid: "#C4A8E8", base: "#7A62B0", core: "#FFF6DE",
      features: "#3A2A58", blush: "#E8A8C8",
    },
    themes: {
      twilight: { name: "Twilight Breath", top: "#F0E6FF", mid: "#C4A8E8", base: "#7A62B0", core: "#FFF6DE", stage: "#1A1628", features: "#3A2A58", blush: "#E8A8C8" },
      mist: { name: "Morning Mist", top: "#E8F4F0", mid: "#A8D4C8", base: "#5A9088", core: "#FFF8E8", stage: "#14201C", features: "#2A4038", blush: "#D8A8A0" },
      dusk: { name: "Soft Dusk", top: "#FFE8F0", mid: "#E0A0B8", base: "#A06888", core: "#FFF0E0", stage: "#241820", features: "#4A2838", blush: "#F0A0B0" },
      aurora: { name: "Aurora Quiet", top: "#E0F0FF", mid: "#90B8E8", base: "#5878B0", core: "#FFF8E8", stage: "#141C28", features: "#283850", blush: "#E0A8C0" },
      ember: { name: "Warm Ember", top: "#FFF0E0", mid: "#E8B888", base: "#B07858", core: "#FFF8E8", stage: "#241810", features: "#4A3020", blush: "#E8A090" },
    },
  },
  glint: {
    slug: "glint",
    name: "Glint",
    species: "diamond",
    tagline: "A living aperture that catches every good light",
    product: "Photo Filters App",
    brand: "#E07898",
    accent: "#E07898",
    stage: "#241018",
    mark: "aperture",
    eyeStyle: "rhombus",
    colors: {
      top: "#FFE0EC", mid: "#E07898", base: "#A04068", core: "#FFF0D0",
      features: "#3A1830", blush: "#F0A0B8",
    },
    themes: {
      blush: { name: "Blush Filter", top: "#FFE0EC", mid: "#E07898", base: "#A04068", core: "#FFF0D0", stage: "#241018", features: "#3A1830", blush: "#F0A0B8" },
      citrus: { name: "Citrus Pop", top: "#FFF4C8", mid: "#F0A848", base: "#C06830", core: "#FFF8E0", stage: "#241810", features: "#4A2810", blush: "#F0A888" },
      noir: { name: "Noir Gloss", top: "#E8E0F0", mid: "#786888", base: "#3A3048", core: "#F0E8FF", stage: "#18141E", features: "#1A1420", blush: "#C898A8" },
      teal: { name: "Teal Grade", top: "#D8F4F0", mid: "#48B0A8", base: "#287870", core: "#FFF0D8", stage: "#101C1A", features: "#183838", blush: "#E0A0A0" },
      violet: { name: "Violet Fade", top: "#F0E0FF", mid: "#9870D0", base: "#583888", core: "#FFE8F0", stage: "#1A1428", features: "#2A1840", blush: "#E8A0C0" },
    },
  },
  trove: {
    slug: "trove",
    name: "Trove",
    species: "squircle",
    tagline: "A soft vault that grows every quiet deposit",
    product: "Savings App",
    brand: "#D4A84B",
    accent: "#D4A84B",
    stage: "#1C1A14",
    mark: "coin",
    eyeStyle: "slot",
    colors: {
      top: "#FFF2C8", mid: "#E0C060", base: "#8A7840", core: "#FFF8E0",
      features: "#3A3020", blush: "#E8B090",
    },
    themes: {
      goldleaf: { name: "Gold Leaf", top: "#FFF2C8", mid: "#E0C060", base: "#8A7840", core: "#FFF8E0", stage: "#1C1A14", features: "#3A3020", blush: "#E8B090" },
      sage: { name: "Sage Nest Egg", top: "#E8F4D8", mid: "#98B870", base: "#587848", core: "#FFF8E0", stage: "#141C14", features: "#283820", blush: "#D8A898" },
      mint: { name: "Mint Vault", top: "#E0F8F0", mid: "#68C0A0", base: "#387860", core: "#FFF8E8", stage: "#101C18", features: "#183830", blush: "#E0A898" },
      copper: { name: "Copper Cache", top: "#FFE8D0", mid: "#D08858", base: "#885030", core: "#FFF4E0", stage: "#1E1410", features: "#3A2418", blush: "#F0A080" },
      slate: { name: "Slate Reserve", top: "#E8ECF0", mid: "#8898A8", base: "#485868", core: "#FFF4E0", stage: "#14181C", features: "#243040", blush: "#D0A0A0" },
    },
  },
  zephyr: {
    slug: "zephyr",
    name: "Zephyr",
    species: "cloud",
    tagline: "A weather puff that always knows which way the wind is",
    product: "Weather App",
    brand: "#5AA8E0",
    accent: "#5AA8E0",
    stage: "#121C28",
    mark: "weather",
    eyeStyle: "bubble",
    colors: {
      top: "#F4FAFF", mid: "#9AD0F4", base: "#4A88C0", core: "#FFE8A0",
      features: "#1A3048", blush: "#F0A8A0",
    },
    themes: {
      clear: { name: "Clear Sky", top: "#F4FAFF", mid: "#9AD0F4", base: "#4A88C0", core: "#FFE8A0", stage: "#121C28", features: "#1A3048", blush: "#F0A8A0" },
      sunset: { name: "Soft Sunset", top: "#FFE8D8", mid: "#F0A070", base: "#C06048", core: "#FFF0C0", stage: "#241410", features: "#402018", blush: "#F09888" },
      storm: { name: "Storm Soft", top: "#E0E8F0", mid: "#6888A8", base: "#385068", core: "#E8F0FF", stage: "#141820", features: "#1A2838", blush: "#D09898" },
      spring: { name: "Spring Breeze", top: "#E8FFF4", mid: "#68C898", base: "#388860", core: "#FFF4C8", stage: "#101C16", features: "#183828", blush: "#E8A898" },
      night: { name: "Night Air", top: "#D8E0F8", mid: "#5870B0", base: "#304070", core: "#F0D080", stage: "#10141E", features: "#1A2438", blush: "#C890A0" },
    },
  },
};

/* ---------- silhouettes: Sol-crafted light bodies (no limbs) ---------- */
const BODY = {
  // Tall soft dawn drop — meditation breath (narrower Sol sibling)
  pillar: {
    d: "M210,448 C168,448 128,416 112,372 C96,328 96,278 118,238 C140,198 172,176 210,176 C248,176 280,198 302,238 C324,278 324,328 308,372 C292,416 252,448 210,448 Z",
    breath:
      "M210,448 C168,448 128,416 112,372 C96,328 96,278 118,238 C140,198 172,176 210,176 C248,176 280,198 302,238 C324,278 324,328 308,372 C292,416 252,448 210,448 Z;" +
      "M210,446 C164,446 122,414 106,370 C90,326 92,276 116,236 C140,196 170,172 210,172 C250,172 280,196 304,236 C328,276 330,326 314,370 C298,414 256,446 210,446 Z;" +
      "M210,448 C168,448 128,416 112,372 C96,328 96,278 118,238 C140,198 172,176 210,176 C248,176 280,198 302,238 C324,278 324,328 308,372 C292,416 252,448 210,448 Z",
    clip: "M210,438 C174,438 140,410 126,372 C112,334 112,288 130,252 C148,216 176,198 210,198 C244,198 272,216 290,252 C308,288 308,334 294,372 C280,410 246,438 210,438 Z",
    faceY: 286,
    eyeSpread: 36,
    coreY: 318,
    coreR: 52,
    blushY: 318,
    blushX: 52,
    badgeY: 378,
  },
  // Soft gem kite — aperture character (pointed crown, plump belly)
  diamond: {
    d: "M210,158 C248,198 298,248 306,318 C314,388 262,450 210,456 C158,450 106,388 114,318 C122,248 172,198 210,158 Z",
    breath:
      "M210,158 C248,198 298,248 306,318 C314,388 262,450 210,456 C158,450 106,388 114,318 C122,248 172,198 210,158 Z;" +
      "M210,150 C252,194 304,246 312,318 C320,390 264,454 210,460 C156,454 100,390 108,318 C116,246 168,194 210,150 Z;" +
      "M210,158 C248,198 298,248 306,318 C314,388 262,450 210,456 C158,450 106,388 114,318 C122,248 172,198 210,158 Z",
    clip: "M210,176 C242,210 284,254 290,318 C296,378 254,434 210,440 C166,434 124,378 130,318 C136,254 178,210 210,176 Z",
    faceY: 278,
    eyeSpread: 38,
    coreY: 318,
    coreR: 48,
    blushY: 312,
    blushX: 54,
    badgeY: 382,
  },
  // Wide vault — clearly broader than tall (nest egg, not another circle)
  squircle: {
    d: "M64,300 C64,230 120,188 210,188 C300,188 356,230 356,300 L356,380 C356,430 300,456 210,456 C120,456 64,430 64,380 Z",
    breath:
      "M64,300 C64,230 120,188 210,188 C300,188 356,230 356,300 L356,380 C356,430 300,456 210,456 C120,456 64,430 64,380 Z;" +
      "M58,298 C58,224 116,180 210,180 C304,180 362,224 362,298 L362,382 C362,434 304,460 210,460 C116,460 58,434 58,382 Z;" +
      "M64,300 C64,230 120,188 210,188 C300,188 356,230 356,300 L356,380 C356,430 300,456 210,456 C120,456 64,430 64,380 Z",
    clip: "M80,302 C80,244 130,206 210,206 C290,206 340,244 340,302 L340,376 C340,416 290,440 210,440 C130,440 80,416 80,376 Z",
    faceY: 268,
    eyeSpread: 56,
    coreY: 324,
    coreR: 40,
    blushY: 298,
    blushX: 78,
    badgeY: 392,
  },
  // Real cumulus — classic soft weather puff (lobed crown, plump belly, soft floor)
  cloud: {
    d:
      "M78,352" +
      " C58,352 48,318 68,298" +
      " C52,268 78,238 118,242" +
      " C122,198 168,172 214,182" +
      " C248,158 304,168 322,208" +
      " C360,204 392,242 382,286" +
      " C404,318 390,368 348,378" +
      " L108,378" +
      " C72,374 58,364 78,352 Z",
    breath:
      "M78,352 C58,352 48,318 68,298 C52,268 78,238 118,242 C122,198 168,172 214,182 C248,158 304,168 322,208 C360,204 392,242 382,286 C404,318 390,368 348,378 L108,378 C72,374 58,364 78,352 Z;" +
      "M74,350 C52,350 42,314 64,292 C46,260 74,230 116,236 C118,190 166,164 216,176 C252,150 310,162 328,204 C368,198 400,238 388,284 C412,316 396,370 352,380 L104,380 C68,376 52,362 74,350 Z;" +
      "M78,352 C58,352 48,318 68,298 C52,268 78,238 118,242 C122,198 168,172 214,182 C248,158 304,168 322,208 C360,204 392,242 382,286 C404,318 390,368 348,378 L108,378 C72,374 58,364 78,352 Z",
    clip:
      "M92,348 C78,348 70,322 86,306 C74,282 96,258 128,262 C132,228 170,208 210,216 C240,198 286,206 300,238 C330,236 356,264 348,296 C364,320 354,358 322,366 L118,366 C92,364 84,358 92,348 Z",
    faceY: 278,
    eyeSpread: 48,
    coreY: 312,
    coreR: 36,
    blushY: 308,
    blushX: 68,
    badgeY: 352,
  },
};

function Star4({ x, y, s = 1, fill, cls, delay }) {
  return (
    <path
      className={cls}
      transform={`translate(${x},${y}) scale(${s})`}
      fill={fill}
      style={delay ? { animationDelay: delay } : undefined}
      d={STAR4}
    />
  );
}

function AppMark({ mark, core, feature, y }) {
  if (mark === "lotus") {
    return (
      <g transform={`translate(210,${y})`} opacity=".92">
        <path d="M0,-14 C7,-7 9,3 0,12 C-9,3 -7,-7 0,-14 Z" fill={core} stroke={feature} strokeWidth="3" />
        <path d="M-12,-1 C-5,-8 5,-8 12,-1 C5,2 -5,2 -12,-1 Z" fill={core} opacity=".75" stroke={feature} strokeWidth="2.5" />
      </g>
    );
  }
  if (mark === "aperture") {
    return (
      <g transform={`translate(210,${y})`} opacity=".92">
        <circle r="15" fill="none" stroke={feature} strokeWidth="3.5" />
        <circle r="6" fill={core} stroke={feature} strokeWidth="2.5" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path key={a} d="M0,-15 L5,-7 L0,-4 Z" fill={core} opacity=".8" transform={`rotate(${a})`} />
        ))}
      </g>
    );
  }
  if (mark === "coin") {
    return (
      <g transform={`translate(210,${y})`} opacity=".92">
        <circle r="15" fill={core} stroke={feature} strokeWidth="3.5" />
        <circle r="10" fill="none" stroke={feature} strokeWidth="2" opacity=".5" />
        <path d="M-2,-7 C4,-8 6,-2 2,0 C6,2 4,8 -2,7 M-2,-7 V7" fill="none" stroke={feature} strokeWidth="2.6" strokeLinecap="round" />
      </g>
    );
  }
  // Compact sun — never a mini-cloud (reads as fake hands at badge scale)
  return (
    <g transform={`translate(210,${y})`} opacity=".92">
      <circle r="9" fill={core} stroke={feature} strokeWidth="2.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <path key={a} d="M0,-14 L0,-18" stroke={feature} strokeWidth="2.4" strokeLinecap="round"
          transform={`rotate(${a})`} />
      ))}
    </g>
  );
}

function SpeciesRays({ species, p }) {
  if (species === "pillar") {
    return (
      <g data-ms-part="rays" fill="none" stroke={p.top} strokeLinecap="round">
        <ellipse className="ob-ray" cx="210" cy="152" rx="48" ry="12" strokeWidth="5" opacity=".7" />
        <ellipse className="ob-ray" cx="210" cy="138" rx="30" ry="8" strokeWidth="4" opacity=".5" style={{ animationDelay: ".35s" }} />
        <path className="ob-ray" d="M210,122 L210,98" strokeWidth="5" style={{ animationDelay: ".2s" }} />
      </g>
    );
  }
  if (species === "diamond") {
    const blades = [
      [210, 132, 210, 98], [168, 152, 146, 120], [252, 152, 274, 120],
      [148, 196, 118, 178], [272, 196, 302, 178],
    ];
    return (
      <g data-ms-part="rays" stroke={p.top} strokeLinecap="round" fill="none">
        {blades.map(([a, b, c, d], i) => (
          <path key={i} className="ob-ray" d={`M${a},${b} L${c},${d}`} strokeWidth="5.5"
            style={{ animationDelay: `${(i % 3) * 0.2}s` }} />
        ))}
        <circle cx="210" cy="120" r="6" fill={p.core} />
      </g>
    );
  }
  if (species === "squircle") {
    return (
      <g data-ms-part="rays">
        <path d="M192,156 C192,136 200,124 210,120 C220,124 228,136 228,156" fill={p.mid} opacity=".45" />
        <path d="M200,158 C198,140 204,128 210,124 C216,128 222,140 220,158" fill={p.core} stroke={p.features} strokeWidth="2.5" />
        <path d="M210,124 C218,112 232,116 234,130" fill="none" stroke={p.top} strokeWidth="3.5" strokeLinecap="round" className="ob-ray" />
      </g>
    );
  }
  // High wind ticks near the crown — sparkle language, not side "arms"
  return (
    <g data-ms-part="rays" fill="none" stroke={p.top} strokeLinecap="round" opacity=".85">
      <path className="ob-ray" d="M96,198 Q78,188 72,198" strokeWidth="3.5" />
      <path className="ob-ray" d="M328,192 Q348,182 356,194" strokeWidth="3.5" style={{ animationDelay: ".2s" }} />
      <circle cx="88" cy="216" r="2.8" fill={p.core} className="ob-twinkle" />
      <circle cx="338" cy="210" r="2.6" fill={p.core} className="ob-twinkle" style={{ animationDelay: ".4s" }} />
      <circle cx="210" cy="148" r="3" fill={p.core} className="ob-twinkle" style={{ animationDelay: ".15s" }} />
    </g>
  );
}

/** Sol-style eyes: dark features + core sparkle. Species only changes shape. */
function Eye({ style, kind, x, y, p }) {
  const at = `translate(${x},${y})`;
  const line = { fill: "none", stroke: p.features, strokeWidth: 8.5, strokeLinecap: "round" };

  if (kind === "heart") {
    return <path transform={`${at} scale(1.15)`} fill={p.features} d={HEART} />;
  }
  if (kind === "star") {
    return <path transform={at} fill={p.features} d="M0,-16 L4,-4 L16,0 L4,4 L0,16 L-4,4 L-16,0 L-4,-4 Z" />;
  }
  if (kind === "spiral") {
    return (
      <path transform={at} {...line} strokeWidth="6"
        d="M2,1 q5,-4 4,2 q-1.5,7 -9,6 q-9,-1.5 -8,-11 q1.5,-11.5 13,-10.5 q13,1.5 12,14" />
    );
  }
  if (kind === "arch" || kind === "closed") {
    return <path d="M-16,3 Q0,-13 16,3" transform={at} {...line} />;
  }
  if (kind === "sleep") {
    return <path d="M-16,-3 Q0,13 16,-3" transform={at} {...line} />;
  }
  if (kind === "sad") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="2" rx="11" ry="14" fill={p.features} />
        <circle cx="-3.2" cy="-3.2" r="2.6" fill={p.core} />
      </g>
    );
  }

  const wide = kind === "wide";
  const half = kind === "half";

  if (style === "crescent") {
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={wide ? 13.5 : 11.5} ry={wide ? 19 : 15.5} fill={p.features} />
        {!half && (
          <>
            <circle cx="-3.4" cy="-4.6" r={wide ? 3.8 : 3.2} fill={p.core} opacity=".95" />
            <circle cx="3" cy="3" r="1.5" fill={p.core} opacity=".5" />
          </>
        )}
        {half && <rect x="-15" y="-20" width="30" height="16" fill={p.mid} />}
        <path
          d={wide ? "M-13.5,-4 Q0,-16 13.5,-4" : "M-11.5,-3 Q0,-13 11.5,-3"}
          fill="none" stroke={p.top} strokeWidth="3.5" strokeLinecap="round" opacity=".55"
        />
      </g>
    );
  }

  if (style === "rhombus") {
    const s = wide ? 1.25 : 1.05;
    return (
      <g transform={`${at} scale(${s})`}>
        <path d="M0,-18 L14,0 L0,18 L-14,0 Z" fill={p.features} />
        {!half && (
          <>
            <path d="M0,-8 L5.5,0 L0,8 L-5.5,0 Z" fill={p.core} opacity=".95" />
            <circle cx="2.2" cy="-2.5" r="1.6" fill="#fff" opacity=".75" />
          </>
        )}
        {half && <path d="M-12,0 L12,0" stroke={p.mid} strokeWidth="9" strokeLinecap="round" />}
      </g>
    );
  }

  if (style === "slot") {
    const rx = wide ? 20 : 16;
    const ry = wide ? 9 : half ? 4.5 : 7;
    return (
      <g transform={at}>
        <ellipse cx="0" cy="0" rx={rx} ry={ry + 2} fill={p.features} />
        {!half && (
          <>
            <ellipse cx="-4" cy="-1.2" rx="4.5" ry="2.8" fill={p.core} />
            <circle cx="5" cy="1.2" r="1.4" fill={p.core} opacity=".55" />
          </>
        )}
      </g>
    );
  }

  // bubble — Sol rounds, soft and big
  const r = wide ? 15 : half ? 11 : 13;
  return (
    <g transform={at}>
      <circle cx="0" cy="0" r={r} fill={p.features} />
      <circle cx={wide ? -3.6 : -3} cy={half ? 1.5 : -3.8} r={half ? 3.2 : 4.4} fill={p.core} opacity=".95" />
      <circle cx="3.2" cy="3" r="1.5" fill={p.core} opacity=".5" />
    </g>
  );
}

function Brows({ kind, xL, xR, y, p }) {
  if (!kind) return <g data-ms-part="brows" />;
  const paths = {
    up: [`M${xL - 16},${y} Q${xL},${y - 12} ${xL + 16},${y - 2}`, `M${xR - 16},${y - 2} Q${xR},${y - 12} ${xR + 16},${y}`],
    sad: [`M${xL - 16},${y + 4} Q${xL},${y - 6} ${xL + 16},${y - 8}`, `M${xR - 16},${y - 8} Q${xR},${y - 6} ${xR + 16},${y + 4}`],
    angry: [`M${xL - 16},${y - 8} Q${xL},${y - 2} ${xL + 16},${y + 6}`, `M${xR - 16},${y + 6} Q${xR},${y - 2} ${xR + 16},${y - 8}`],
    oneUp: [`M${xL - 14},${y + 2} Q${xL},${y - 2} ${xL + 14},${y}`, `M${xR - 14},${y - 4} Q${xR},${y - 14} ${xR + 14},${y - 2}`],
  }[kind];
  if (!paths) return <g data-ms-part="brows" />;
  return (
    <g data-ms-part="brows" fill="none" stroke={p.features} strokeWidth="6.5" strokeLinecap="round">
      <path d={paths[0]} /><path d={paths[1]} />
    </g>
  );
}

function Mouth({ kind, y, p }) {
  const s = { fill: "none", stroke: p.features, strokeWidth: 7.5, strokeLinecap: "round" };
  if (kind === "smile") return <path d={`M188,${y} Q210,${y + 22} 232,${y}`} {...s} />;
  if (kind === "grin") return <path d={`M184,${y - 2} Q210,${y + 28} 236,${y - 2} Q210,${y + 8} 184,${y - 2} Z`} fill={p.features} />;
  if (kind === "bigGrin") {
    return (
      <g>
        <path d={`M178,${y - 4} Q210,${y + 36} 242,${y - 4} Q210,${y + 8} 178,${y - 4} Z`} fill={p.features} />
        <path d={`M196,${y + 28} Q210,${y + 36} 224,${y + 28} Q210,${y + 24} 196,${y + 28} Z`} fill={p.blush} opacity=".9" />
      </g>
    );
  }
  if (kind === "open") {
    return (
      <g>
        <ellipse cx="210" cy={y + 8} rx="15" ry="17" fill={p.features} />
        <path d={`M200,${y + 18} Q210,${y + 12} 220,${y + 18} Q210,${y + 26} 200,${y + 18} Z`} fill={p.blush} opacity=".85" />
      </g>
    );
  }
  if (kind === "o") return <ellipse cx="210" cy={y + 6} rx="10" ry="12" fill={p.features} />;
  if (kind === "flat") return <path d={`M194,${y + 4} Q210,${y + 8} 226,${y + 4}`} {...s} />;
  if (kind === "frown") return <path d={`M188,${y + 14} Q210,${y - 6} 232,${y + 14}`} {...s} />;
  if (kind === "tiny") return <path d={`M202,${y + 4} Q210,${y + 10} 218,${y + 4}`} {...s} />;
  return null;
}

/** Soft sun-core behind the face — Sol order, never a face sticker. */
function CoreNucleus({ species, p, y, r, gid }) {
  return (
    <g data-ms-part="core" className="ob-pop">
      <circle cx="210" cy={y} r={r} fill={`url(#${gid}-core)`} />
      <circle cx={210 - r * 0.26} cy={y - r * 0.3} r={r * 0.16} fill={p.core} opacity=".9" />
      {species === "diamond" && (
        <circle cx="210" cy={y} r={r * 0.42} fill="none" stroke={p.features} strokeWidth="2.5" opacity=".22" />
      )}
      {species === "squircle" && (
        <circle cx="210" cy={y} r={r * 0.55} fill="none" stroke={p.features} strokeWidth="2" opacity=".18" />
      )}
      {species === "pillar" && (
        <path d={`M${210 + r * 0.12},${y - r * 0.5} A${r * 0.5},${r * 0.5} 0 1,0 ${210 + r * 0.12},${y + r * 0.5}`}
          fill="none" stroke={p.top} strokeWidth="3.5" opacity=".3" />
      )}
    </g>
  );
}

/** Photonic gesture language — light doing the talking, never stub hands. */
function PoseVisuals({ keyName, p }) {
  const stroke = { fill: "none", stroke: p.features, strokeWidth: 6, strokeLinecap: "round", strokeLinejoin: "round" };

  switch (keyName) {
    case "wave":
    case "high_five":
      return (
        <g>
          <Star4 x={292} y={148} s={1.35} fill={p.top} cls="ob-rise" />
          <Star4 x={322} y={178} s={1} fill={p.core} cls="ob-rise" delay=".35s" />
          <Star4 x={268} y={118} s={0.85} fill={p.base} cls="ob-rise" delay=".7s" />
          <circle cx="248" cy="196" r="4" fill={p.core} className="ob-twinkle" />
        </g>
      );
    case "happy":
      return (
        <g>
          <Star4 x={118} y={150} s={0.85} fill={p.core} cls="ob-twinkle" />
          <Star4 x={304} y={142} s={1} fill={p.top} cls="ob-twinkle" delay=".4s" />
        </g>
      );
    case "thinking":
    case "confused":
      return (
        <g className="ob-drift">
          <path d="M300 178 Q324 150 346 172 Q356 188 338 202 L322 216" {...stroke} />
          <circle cx="316" cy="236" r="4.5" fill={p.features} />
        </g>
      );
    case "listening":
      return (
        <g fill="none" stroke={p.top} strokeWidth="4">
          <circle className="ob-tick" cx="210" cy="300" r="150">
            <animate attributeName="r" values="140;190" dur="1.6s" repeatCount="indefinite" />
          </circle>
          <circle className="ob-tick" cx="210" cy="300" r="150" style={{ animationDelay: ".8s" }}>
            <animate attributeName="r" values="140;190" dur="1.6s" begin="0.8s" repeatCount="indefinite" />
          </circle>
        </g>
      );
    case "talking":
      return (
        <g fill="none" stroke={p.top} strokeLinecap="round">
          <path className="ob-tick" d="M286,290 Q300,308 286,326" strokeWidth="5" />
          <path className="ob-tick" d="M308,278 Q328,308 308,338" strokeWidth="5" style={{ animationDelay: ".2s" }} />
          <circle cx="334" cy="308" r="3.2" fill={p.top} className="ob-twinkle" />
        </g>
      );
    case "pointing":
      return (
        <g>
          <Star4 x={338} y={250} s={1.2} fill={p.core} cls="ob-twinkle" />
          <Star4 x={362} y={268} s={0.9} fill={p.top} cls="ob-rise" />
          <path d="M300 278 Q328 268 352 272" fill="none" stroke={p.top} strokeWidth="4" strokeLinecap="round" className="ob-tick" />
        </g>
      );
    case "writing":
      return (
        <g>
          <rect x="130" y="400" width="160" height="70" rx="12" fill="#FFFDF8" stroke={p.features} strokeWidth="5.5" />
          <path d="M152 424 h70 M152 444 h48" {...stroke} />
          <path d="M268 412 l-28 40" stroke={p.core} strokeWidth="8" strokeLinecap="round" />
        </g>
      );
    case "celebrate":
    case "success":
      return (
        <g>
          <g fill="none" strokeLinecap="round" strokeWidth="8">
            <path d="M130,150 A78,78 0 0 1 290,150" stroke="#F2694B" />
            <path d="M144,154 A64,64 0 0 1 276,154" stroke="#FFC148" />
            <path d="M158,158 A50,50 0 0 1 262,158" stroke="#8FD0A8" />
            <path d="M172,162 A36,36 0 0 1 248,162" stroke="#8FB4E8" />
          </g>
          <Star4 x={110} y={120} s={1.1} fill={p.core} cls="ob-twinkle" />
          <Star4 x={310} y={116} s={1.2} fill={p.top} cls="ob-twinkle" delay=".4s" />
        </g>
      );
    case "love":
      return (
        <g>
          <path className="ob-rise" d={HEART} fill={p.base} transform="translate(306,178) scale(1.25)" />
          <path className="ob-rise" d={HEART} fill={p.top} opacity=".85" transform="translate(118,158) scale(0.8)" style={{ animationDelay: ".9s" }} />
        </g>
      );
    case "blowing_kiss":
      return (
        <g>
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".9">
            <path className="ob-tick" d="M228,250 Q252,238 278,242" strokeWidth="3.4" />
            <path className="ob-tick" d="M230,258 Q258,252 286,254" strokeWidth="2.4" style={{ animationDelay: ".18s" }} />
          </g>
          <path className="ob-rise" d={HEART} fill="#FF6B8A" transform="translate(278,240) scale(1.3)" />
          <path className="ob-rise" d={HEART} fill={p.base} transform="translate(320,198) scale(1)" style={{ animationDelay: ".4s" }} />
          <path className="ob-rise" d={HEART} fill={p.top} transform="translate(354,162) scale(0.75)" style={{ animationDelay: ".8s" }} />
        </g>
      );
    case "crying":
    case "sad":
      return (
        <g>
          <path className="ob-drift" transform="translate(158,310)" fill={p.core} stroke={p.top} strokeWidth="2"
            d="M0,-10 Q7,-2 7,4 A7,7 0 1,1 -7,4 Q-7,-2 0,-10 Z" />
          {keyName === "crying" && (
            <path className="ob-drift" transform="translate(260,310)" fill={p.core} stroke={p.top} strokeWidth="2"
              d="M0,-10 Q7,-2 7,4 A7,7 0 1,1 -7,4 Q-7,-2 0,-10 Z" style={{ animationDelay: ".45s" }} />
          )}
        </g>
      );
    case "sleepy":
      return (
        <g fill="none" stroke={p.top} strokeLinecap="round" strokeLinejoin="round">
          <path className="ob-drift" d="M286,140 L304,140 L286,158 L304,158" strokeWidth="5" />
          <path className="ob-drift" d="M314,110 L328,110 L314,124 L328,124" strokeWidth="4.5" style={{ animationDelay: ".6s" }} />
        </g>
      );
    case "proud":
    case "encourage":
      return <Star4 x={210} y={118} s={1.6} fill={p.core} cls="ob-pulse" />;
    case "oops":
      return (
        <g>
          <circle cx="324" cy="220" r="26" fill="#FFFDF8" stroke={p.features} strokeWidth="5" />
          <path d="M324 206 v18 M324 234 v2" {...stroke} />
        </g>
      );
    case "surprised":
    case "alarm":
      return (
        <g stroke={p.core} strokeLinecap="round" fill="none">
          {[[210, 118, 210, 86], [140, 150, 118, 128], [280, 150, 302, 128], [100, 230, 72, 220], [320, 230, 348, 220]].map(([a, b, c, d], i) => (
            <path key={i} className="ob-tick" d={`M${a},${b} L${c},${d}`} strokeWidth="6" style={{ animationDelay: `${(i % 3) * 0.1}s` }} />
          ))}
        </g>
      );
    case "facepalm":
      return <path d="M140 170 q70-50 140 0" fill="none" stroke={p.core} strokeWidth="7" strokeDasharray="7 14" strokeLinecap="round" opacity=".75" />;
    case "dancing":
      return (
        <g>
          <Star4 x={96} y={210} s={1.1} fill={p.core} cls="ob-rise" />
          <Star4 x={318} y={196} s={1} fill={p.top} cls="ob-rise" delay=".35s" />
          <path className="ob-tick" d="M110 240 q16-18 8-34" fill="none" stroke={p.features} strokeWidth="4" strokeLinecap="round" />
          <path className="ob-tick" d="M312 228 q14-16 6-30" fill="none" stroke={p.features} strokeWidth="4" strokeLinecap="round" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "searching":
      return (
        <g>
          <circle cx="100" cy="250" r="30" fill="#FFFDF8" fillOpacity=".35" stroke={p.features} strokeWidth="6" />
          <path d="M122 272 l22 24" {...stroke} />
        </g>
      );
    case "thumbs_up":
      return (
        <g>
          <Star4 x={210} y={128} s={1.7} fill={p.core} cls="ob-pulse" />
          <Star4 x={168} y={158} s={0.9} fill={p.top} cls="ob-rise" />
          <Star4 x={252} y={158} s={0.9} fill={p.top} cls="ob-rise" delay=".3s" />
        </g>
      );
    case "thumbs_down":
      return (
        <g opacity=".85">
          <Star4 x={210} y={400} s={1.3} fill={p.base} cls="ob-drift" />
          <path d="M180 360 Q210 380 240 360" fill="none" stroke={p.features} strokeWidth="5" strokeLinecap="round" opacity=".5" />
        </g>
      );
    case "shrug":
      return (
        <g fill="none" stroke={p.top} strokeWidth="5" strokeLinecap="round" opacity=".8">
          <path className="ob-tick" d="M96 210 q20-18 40 0" />
          <path className="ob-tick" d="M284 210 q20-18 40 0" style={{ animationDelay: ".15s" }} />
          <circle cx="116" cy="188" r="3" fill={p.core} className="ob-twinkle" />
          <circle cx="304" cy="188" r="3" fill={p.core} className="ob-twinkle" style={{ animationDelay: ".3s" }} />
        </g>
      );
    case "working":
      return (
        <g>
          <path d="M118 368 h184 l-16 84 h-152Z" fill="#FFFDF8" stroke={p.features} strokeWidth="5.5" />
          <circle cx="210" cy="412" r="9" fill={p.core} />
        </g>
      );
    case "running":
      return (
        <g fill="none" stroke={p.top} strokeWidth="5" strokeLinecap="round" opacity=".85">
          <path className="ob-tick" d="M48 280 h56" />
          <path className="ob-tick" d="M40 314 h48" style={{ animationDelay: ".12s" }} />
          <path className="ob-tick" d="M56 348 h36" style={{ animationDelay: ".24s" }} />
        </g>
      );
    case "flying":
      return (
        <g>
          <Star4 x={90} y={220} s={1} fill={p.core} cls="ob-rise" />
          <Star4 x={330} y={140} s={1.15} fill={p.top} cls="ob-rise" delay=".35s" />
          <path className="ob-tick" d="M60 360 q40-20 70 4" fill="none" stroke={p.top} strokeWidth="4" strokeLinecap="round" />
          <path className="ob-tick" d="M300 120 q36-16 64 2" fill="none" stroke={p.top} strokeWidth="4" strokeLinecap="round" style={{ animationDelay: ".2s" }} />
        </g>
      );
    case "clapping":
      return (
        <g className="ob-pulse">
          <Star4 x={210} y={120} s={1.5} fill={p.core} />
          <Star4 x={170} y={148} s={0.85} fill={p.top} />
          <Star4 x={250} y={148} s={0.85} fill={p.top} />
        </g>
      );
    case "error":
      return (
        <g>
          <path d="M324 170 l38 66 h-76Z" fill={p.core} stroke={p.features} strokeWidth="5" strokeLinejoin="round" />
          <path d="M324 194 v20 M324 226 v2" {...stroke} />
        </g>
      );
    case "empty":
      return (
        <g>
          <path d="M124 390 h172 l-16 54 h-140Z" fill="#FFFDF8" fillOpacity=".28" stroke={p.features} strokeWidth="5.5" />
          <path d="M176 414 h68" {...stroke} />
        </g>
      );
    case "loading":
      return (
        <g className="ob-spin">
          <circle cx="324" cy="210" r="30" fill="none" stroke={p.features} strokeOpacity=".25" strokeWidth="8" />
          <path d="M324 180 a30 30 0 0 1 28 24" fill="none" stroke={p.core} strokeWidth="8" strokeLinecap="round" />
        </g>
      );
    case "waiting":
      return (
        <g>
          <circle cx="324" cy="210" r="32" fill="#FFFDF8" fillOpacity=".28" stroke={p.features} strokeWidth="5.5" />
          <path d="M324 188 v24 l16 10" {...stroke} />
        </g>
      );
    case "grumpy":
      return (
        <g stroke={p.features} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".75">
          <path className="ob-tick" d="M130 150 L140 160 L130 170" />
          <path className="ob-tick" d="M290 144 L280 154 L290 164" style={{ animationDelay: ".25s" }} />
        </g>
      );
    default:
      return null;
  }
}

function faceForPose(poseKey) {
  if (poseKey === "blowing_kiss") return { eye: "heart", mouth: "o" };
  if (poseKey === "love") return { eye: "heart", mouth: "smile" };
  if (poseKey === "sleepy") return { eye: "sleep", mouth: "tiny" };
  if (CLOSED_KEYS.has(poseKey)) return { eye: "arch", mouth: "grin" };
  if (poseKey === "celebrate" || poseKey === "success") return { eye: "star", mouth: "bigGrin" };
  if (WIDE_KEYS.has(poseKey)) return { eye: "wide", mouth: "o", brow: "up" };
  if (poseKey === "confused") return { eye: "spiral", mouth: "o", brow: "oneUp" };
  if (SAD_KEYS.has(poseKey)) return { eye: "sad", mouth: "frown", brow: "sad" };
  if (ANGRY_KEYS.has(poseKey)) return { eye: "half", mouth: "frown", brow: "angry" };
  if (poseKey === "empty") return { eye: "half", mouth: "tiny", brow: "sad" };
  if (HALF_KEYS.has(poseKey)) return { eye: "half", mouth: "tiny" };
  if (poseKey === "thinking") return { eye: "open", mouth: "flat", brow: "oneUp", look: [4, -6] };
  if (poseKey === "talking") return { eye: "open", mouth: "open", brow: "up" };
  if (poseKey === "listening") return { eye: "open", mouth: "tiny" };
  if (poseKey === "oops" || poseKey === "facepalm") return { eye: "half", mouth: "flat", brow: "sad" };
  if (poseKey === "proud") return { eye: "open", mouth: "grin", brow: "up" };
  if (poseKey === "loading" || poseKey === "working" || poseKey === "writing") return { eye: "open", mouth: "flat" };
  if (poseKey === "wave" || poseKey === "high_five") return { eye: "open", mouth: "grin", brow: "up" };
  return { eye: "open", mouth: "smile" };
}

function renderOrb(config, key) {
  const pose = GESTURE_PRESETS.find((item) => item.key === key) ?? GESTURE_PRESETS[0];
  const species = config.species;
  const body = BODY[species];
  const c = config.colors;
  const p = {
    top: c.top, mid: c.mid, base: c.base, core: c.core,
    features: c.features, blush: c.blush || "#E8A8A0",
  };
  const face = faceForPose(pose.key);
  const gid = `${config.slug}-${pose.key}`;
  const eyeL = 210 - body.eyeSpread;
  const eyeR = 210 + body.eyeSpread;
  const mouthY = body.faceY + (species === "cloud" ? 44 : species === "squircle" ? 36 : 40);

  const bodyClass =
    pose.key === "dancing" ? "ob-float ob-g-dancing"
      : pose.key === "running" ? "ob-float ob-g-running"
        : pose.key === "flying" ? "ob-float ob-g-flying"
          : pose.key === "alarm" ? "ob-float ob-g-alarm"
            : pose.key === "sleepy" || pose.key === "waiting" ? "ob-float ob-g-sleepy"
              : "ob-float";
  const look = face.look || [0, 0];
  const propHeavy = ["writing", "working", "searching", "empty"].includes(pose.key);

  return (
    <svg
      className={`ob-svg ob-${config.slug} ob-${species} ob-g-${pose.key}`}
      viewBox="0 0 420 520"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${config.name}: ${pose.label}`}
      style={{ "--ms-glow": 0.5, cursor: "pointer" }}
    >
      <title>{`${config.name} — ${pose.label}`}</title>
      <style>{SVG_CSS}</style>
      <defs>
        <linearGradient id={`${gid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.top} />
          <stop offset=".52" stopColor={p.mid} />
          <stop offset="1" stopColor={p.base} />
        </linearGradient>
        <radialGradient id={`${gid}-core`} cx="50%" cy="42%" r="62%">
          <stop offset="0" stopColor={p.core} />
          <stop offset=".65" stopColor={p.core} stopOpacity=".8" />
          <stop offset="1" stopColor={p.core} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-halo`} cx="50%" cy="48%" r="58%">
          <stop offset="0" stopColor={p.mid} stopOpacity=".88" />
          <stop offset="1" stopColor={p.mid} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${gid}-pool`} cx="50%" cy="50%" r="52%">
          <stop offset="0" stopColor={p.mid} stopOpacity=".85" />
          <stop offset="1" stopColor={p.mid} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${gid}-clip`}>
          <path d={body.clip} />
        </clipPath>
        <filter id={`${gid}-grain`} x="-20%" y="-15%" width="140%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" result="a" />
          <feComposite in="a" in2="SourceGraphic" operator="in" result="gg" />
          <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="gg" /></feMerge>
        </filter>
      </defs>

      <g data-ms-part="pool" transform="translate(210,472)">
        <ellipse className="ob-pool" cx="0" cy="0" rx={species === "cloud" ? 128 : 104} ry="12" fill={`url(#${gid}-pool)`} />
        <ellipse cx="0" cy="0" rx="42" ry="5" fill={p.core} opacity=".32" />
      </g>

      {/* ob-glow only — avoid ms-glow-halo static opacity fighting the pulse */}
      <ellipse data-ms-part="halo" className="ob-glow" cx="210" cy="300" rx="168" ry="160" fill={`url(#${gid}-halo)`} />

      <g className={bodyClass}>
        <g transform="translate(210,466)">
          {(pose.key === "alarm" || pose.key === "surprised") && (
            <animateTransform attributeName="transform" type="translate" additive="sum"
              values="-2 0;2 0;-2 0" dur="0.12s" repeatCount="indefinite" />
          )}
          <g transform="translate(-210,-466)" filter={`url(#${gid}-grain)`}>
            <SpeciesRays species={species} p={p} />

            <g data-ms-part="body">
              <path d={body.d} fill={`url(#${gid}-body)`}>
                <animate attributeName="d" values={body.breath} dur="7s" repeatCount="indefinite" />
              </path>
              <path d={body.clip} fill="none" stroke={p.top} strokeWidth="3" opacity=".28" />
            </g>

            {/* Sol order: core behind face */}
            <CoreNucleus species={species} p={p} y={body.coreY} r={body.coreR} gid={gid} />

            <g data-ms-part="gleam" clipPath={`url(#${gid}-clip)`}>
              <ellipse className="ob-gleam" cx="210" cy="300" rx="12" ry="110" fill={p.top} opacity="0" />
            </g>

            <g data-ms-part="blush" fill={p.blush} opacity=".55">
              <circle cx={210 - body.blushX} cy={body.blushY} r="11" />
              <circle cx={210 + body.blushX} cy={body.blushY} r="11" />
            </g>

            {/* Track brows + eyes together (Sol); mouth stays put */}
            <g className="ms-eyes" transform={`translate(${look[0]},${look[1]})`}>
              <Brows kind={face.brow} xL={eyeL} xR={eyeR} y={body.faceY - 28} p={p} />
              <g data-ms-part="eyes" className="ob-pop">
                <Eye style={config.eyeStyle} kind={face.eye} x={eyeL} y={body.faceY} p={p} />
                <Eye style={config.eyeStyle} kind={face.eye} x={eyeR} y={body.faceY} p={p} />
              </g>
            </g>
            <g data-ms-part="mouth">
              <Mouth kind={face.mouth} y={mouthY} p={p} />
            </g>

            <g data-ms-part="badge">
              <AppMark mark={config.mark} core={p.core} feature={p.features} y={body.badgeY} />
            </g>
          </g>
        </g>
      </g>

      <g data-ms-part="props" className="ob-pop">
        {propHeavy && <PoseVisuals keyName={pose.key} p={p} />}
      </g>
      <g data-ms-part="effects" className="ob-pop">
        {!propHeavy && <PoseVisuals keyName={pose.key} p={p} />}
      </g>
    </svg>
  );
}

export function createOrbPoseSource(slug) {
  const config = ORB_VARIANTS[slug];
  if (!config) throw new Error(`Unknown orb mascot: ${slug}`);
  return {
    slug,
    poses: GESTURE_PRESETS.map((pose) => ({
      ...pose,
      track: CORE_KEYS.has(pose.key),
      signal: HAPPY_KEYS.has(pose.key) ? 78 : SAD_KEYS.has(pose.key) ? 28 : 55,
    })),
    renderPose: (key) => renderOrb(config, key),
    meta: {
      name: config.name,
      tagline: config.tagline,
      product: config.product,
      accent: config.brand,
      stage: config.stage,
      glowLabel: "Wake light",
      themes: config.themes,
      instrument: null,
    },
  };
}

export function OrbPreview({ slug }) {
  return renderOrb(ORB_VARIANTS[slug], "idle");
}

export { ORB_VARIANTS };
