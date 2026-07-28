import { GESTURE_PRESETS } from "@/lib/gesture-presets";


/**
 * SOL ORB FAMILY — four light-native companions, each a different species of glow.
 *
 * Sol stays the sunrise alarm orb. These siblings keep the photonic language
 * (breathing body, sun-core, light pool, gleam) but diverge hard in silhouette,
 * eyes, crown, and product badge so none read as a recolor.
 *
 *   aura   — tall soft pill · crescent eyes · meditation
 *   glint  — rounded diamond · rhombus eyes · photo filters
 *   trove  — wide squircle · coin-slot eyes · savings
 *   zephyr — scalloped cloud · bubbly rounds · weather
 *
 * Toggle contract (every pose): body, core, eyes, brows, mouth, blush, gleam,
 * rays, badge, limbs, halo, pool, props, effects.
 */

const SVG_CSS = `
  .ob-svg{display:block;user-select:none;-webkit-user-select:none;--gf:1}
  .ob-float{animation:ob-float 3.8s ease-in-out infinite}
  .ob-g-sleepy .ob-float,.ob-g-waiting .ob-float{animation-duration:6.2s}
  .ob-g-dancing .ob-float{animation:ob-dance .9s ease-in-out infinite}
  .ob-g-running .ob-float{animation:ob-run .34s ease-in-out infinite}
  .ob-g-flying .ob-float{animation:ob-soar 1.5s ease-in-out infinite}
  .ob-g-alarm .ob-float{animation:none}
  .ob-pool{animation:ob-pool 3.8s ease-in-out infinite}
  .ob-glow{animation:ob-glow 3s ease-in-out infinite}
  .ob-gleam{animation:ob-gleam 6.4s ease-in-out infinite}
  .ob-pop{animation:ob-pop .28s ease-out}
  .ob-blink{animation:ob-blink 5s ease-in-out infinite;transform-origin:center}
  .ob-drift{animation:ob-drift 2.1s ease-out infinite;opacity:.9}
  .ob-pulse{animation:ob-pulse 1.15s ease-in-out infinite}
  .ob-spin{animation:ob-spin 1.2s linear infinite;transform-origin:center}
  .ob-ray{animation:ob-ray 2.4s ease-in-out infinite}
  .ob-tick{animation:ob-tick .55s ease-out infinite}
  .ob-limb{transform-origin:center}
  .ob-svg[data-paused] *{animation-play-state:paused!important}
  @keyframes ob-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
  @keyframes ob-dance{0%,100%{transform:rotate(-4deg) translateY(0)}50%{transform:rotate(5deg) translateY(-11px)}}
  @keyframes ob-run{0%,100%{transform:translate(6px,3px) rotate(-3deg)}50%{transform:translate(-5px,-12px) rotate(4deg)}}
  @keyframes ob-soar{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-22px) rotate(3deg)}}
  @keyframes ob-pool{0%,100%{opacity:.82}50%{opacity:.48}}
  @keyframes ob-glow{0%,100%{opacity:calc(var(--ms-glow,.5)*var(--gf,1)*.45)}50%{opacity:calc(var(--ms-glow,.5)*var(--gf,1))}}
  @keyframes ob-gleam{0%,28%,100%{transform:translateX(-90px);opacity:0}10%{opacity:.55}20%{transform:translateX(90px);opacity:0}}
  @keyframes ob-pop{from{opacity:0}to{opacity:1}}
  @keyframes ob-blink{0%,44%,48%,100%{transform:scaleY(1)}46%{transform:scaleY(.08)}}
  @keyframes ob-drift{0%{opacity:.55;transform:translateY(10px)}22%{opacity:1}100%{opacity:0;transform:translateY(-36px)}}
  @keyframes ob-pulse{0%,100%{opacity:.35;transform:scale(.88)}50%{opacity:1;transform:scale(1.06)}}
  @keyframes ob-spin{to{transform:rotate(360deg)}}
  @keyframes ob-ray{0%,100%{opacity:.2;transform:translateY(3px)}50%{opacity:.9;transform:translateY(-3px)}}
  @keyframes ob-tick{0%{opacity:0}28%{opacity:1}100%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.ob-svg *{animation:none!important}}
`;

const CORE_KEYS = new Set(["idle", "wave", "happy", "thinking", "listening", "talking", "pointing", "writing"]);
const HAPPY_KEYS = new Set(["happy", "celebrate", "proud", "dancing", "success", "encourage", "clapping", "high_five", "love"]);
const CLOSED_KEYS = new Set(["happy", "dancing", "clapping"]);
const WIDE_KEYS = new Set(["surprised", "alarm", "error"]);
const SAD_KEYS = new Set(["sad", "crying"]);
const ANGRY_KEYS = new Set(["grumpy", "thumbs_down"]);
const HALF_KEYS = new Set(["waiting", "grumpy"]);

const ORB_VARIANTS = {
  aura: {
    slug: "aura",
    name: "Aura",
    species: "pillar",
    tagline: "A tall dawn pill that breathes with you",
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
      twilight: { name: "Twilight Breath", top: "#F0E6FF", mid: "#C4A8E8", base: "#7A62B0", core: "#FFF6DE", stage: "#1A1628", features: "#3A2A58" },
      mist: { name: "Morning Mist", top: "#E8F4F0", mid: "#A8D4C8", base: "#5A9088", core: "#FFF8E8", stage: "#14201C", features: "#2A4038" },
      dusk: { name: "Soft Dusk", top: "#FFE8F0", mid: "#E0A0B8", base: "#A06888", core: "#FFF0E0", stage: "#241820", features: "#4A2838" },
      aurora: { name: "Aurora Quiet", top: "#E0F0FF", mid: "#90B8E8", base: "#5878B0", core: "#FFF8E8", stage: "#141C28", features: "#283850" },
      ember: { name: "Warm Ember", top: "#FFF0E0", mid: "#E8B888", base: "#B07858", core: "#FFF8E8", stage: "#241810", features: "#4A3020" },
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
      blush: { name: "Blush Filter", top: "#FFE0EC", mid: "#E07898", base: "#A04068", core: "#FFF0D0", stage: "#241018", features: "#3A1830" },
      citrus: { name: "Citrus Pop", top: "#FFF4C8", mid: "#F0A848", base: "#C06830", core: "#FFF8E0", stage: "#241810", features: "#4A2810" },
      noir: { name: "Noir Gloss", top: "#E8E0F0", mid: "#786888", base: "#3A3048", core: "#F0E8FF", stage: "#18141E", features: "#1A1420" },
      teal: { name: "Teal Grade", top: "#D8F4F0", mid: "#48B0A8", base: "#287870", core: "#FFF0D8", stage: "#101C1A", features: "#183838" },
      violet: { name: "Violet Fade", top: "#F0E0FF", mid: "#9870D0", base: "#583888", core: "#FFE8F0", stage: "#1A1428", features: "#2A1840" },
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
      goldleaf: { name: "Gold Leaf", top: "#FFF2C8", mid: "#E0C060", base: "#8A7840", core: "#FFF8E0", stage: "#1C1A14", features: "#3A3020" },
      sage: { name: "Sage Nest Egg", top: "#E8F4D8", mid: "#98B870", base: "#587848", core: "#FFF8E0", stage: "#141C14", features: "#283820" },
      mint: { name: "Mint Vault", top: "#E0F8F0", mid: "#68C0A0", base: "#387860", core: "#FFF8E8", stage: "#101C18", features: "#183830" },
      copper: { name: "Copper Cache", top: "#FFE8D0", mid: "#D08858", base: "#885030", core: "#FFF4E0", stage: "#1E1410", features: "#3A2418" },
      slate: { name: "Slate Reserve", top: "#E8ECF0", mid: "#8898A8", base: "#485868", core: "#FFF4E0", stage: "#14181C", features: "#243040" },
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
      top: "#F4FAFF", mid: "#78C0F0", base: "#3A78B0", core: "#FFE8A0",
      features: "#1A3048", blush: "#F0A8A0",
    },
    themes: {
      clear: { name: "Clear Sky", top: "#F4FAFF", mid: "#78C0F0", base: "#3A78B0", core: "#FFE8A0", stage: "#121C28", features: "#1A3048" },
      sunset: { name: "Soft Sunset", top: "#FFE8D8", mid: "#F0A070", base: "#C06048", core: "#FFF0C0", stage: "#241410", features: "#402018" },
      storm: { name: "Storm Soft", top: "#E0E8F0", mid: "#6888A8", base: "#385068", core: "#E8F0FF", stage: "#141820", features: "#1A2838" },
      spring: { name: "Spring Breeze", top: "#E8FFF4", mid: "#68C898", base: "#388860", core: "#FFF4C8", stage: "#101C16", features: "#183828" },
      night: { name: "Night Air", top: "#D8E0F8", mid: "#5870B0", base: "#304070", core: "#F0D080", stage: "#10141E", features: "#1A2438" },
    },
  },
};

/* ---------- distinct body silhouettes (same viewBox, different species) ---------- */
const BODY = {
  // Tall soft pill — meditation breath (narrow, vertical)
  pillar: {
    d: "M210,448 C162,448 128,404 128,330 C128,256 154,188 210,168 C266,188 292,256 292,330 C292,404 258,448 210,448 Z",
    breath:
      "M210,448 C162,448 128,404 128,330 C128,256 154,188 210,168 C266,188 292,256 292,330 C292,404 258,448 210,448 Z;" +
      "M210,446 C158,446 122,402 124,328 C126,252 152,182 210,164 C268,182 294,252 296,328 C298,402 262,446 210,446 Z;" +
      "M210,448 C162,448 128,404 128,330 C128,256 154,188 210,168 C266,188 292,256 292,330 C292,404 258,448 210,448 Z",
    clip: "M210,440 C168,440 138,400 138,332 C138,264 160,200 210,184 C260,200 282,264 282,332 C282,400 252,440 210,440 Z",
    faceY: 292,
    eyeSpread: 34,
    coreY: 318,
    coreR: 42,
    blushY: 318,
    blushX: 48,
    limbY: 360,
    badgeY: 372,
  },
  // Rounded diamond / soft kite — aperture character (pointed crown)
  diamond: {
    d: "M210,156 C236,188 292,248 300,318 C308,388 258,448 210,456 C162,448 112,388 120,318 C128,248 184,188 210,156 Z",
    breath:
      "M210,156 C236,188 292,248 300,318 C308,388 258,448 210,456 C162,448 112,388 120,318 C128,248 184,188 210,156 Z;" +
      "M210,148 C240,184 298,244 306,318 C314,392 260,452 210,460 C160,452 106,392 114,318 C122,244 180,184 210,148 Z;" +
      "M210,156 C236,188 292,248 300,318 C308,388 258,448 210,456 C162,448 112,388 120,318 C128,248 184,188 210,156 Z",
    clip: "M210,172 C232,200 280,252 286,318 C292,380 252,436 210,442 C168,436 128,380 134,318 C140,252 188,200 210,172 Z",
    faceY: 286,
    eyeSpread: 36,
    coreY: 312,
    coreR: 38,
    blushY: 312,
    blushX: 50,
    limbY: 368,
    badgeY: 378,
  },
  // Wide Apple squircle — vault (broad, short, architectural)
  squircle: {
    d: "M72,252 C72,196 128,176 210,176 C292,176 348,196 348,252 L348,372 C348,428 292,448 210,448 C128,448 72,428 72,372 Z",
    breath:
      "M72,252 C72,196 128,176 210,176 C292,176 348,196 348,252 L348,372 C348,428 292,448 210,448 C128,448 72,428 72,372 Z;" +
      "M66,256 C66,192 124,170 210,170 C296,170 354,192 354,256 L354,368 C354,432 296,452 210,452 C124,452 66,432 66,368 Z;" +
      "M72,252 C72,196 128,176 210,176 C292,176 348,196 348,252 L348,372 C348,428 292,448 210,448 C128,448 72,428 72,372 Z",
    clip: "M86,256 C86,208 136,190 210,190 C284,190 334,208 334,256 L334,368 C334,416 284,434 210,434 C136,434 86,416 86,368 Z",
    faceY: 258,
    eyeSpread: 54,
    coreY: 322,
    coreR: 32,
    blushY: 288,
    blushX: 82,
    limbY: 360,
    badgeY: 388,
  },
  // Scalloped cloud — weather puff (wide, low, bumpy crown)
  cloud: {
    d: "M96,340 C88,300 112,268 148,262 C156,220 196,198 232,210 C258,188 300,198 312,234 C348,238 368,278 356,318 C372,350 352,392 310,400 L130,400 C96,392 84,362 96,340 Z",
    breath:
      "M96,340 C88,300 112,268 148,262 C156,220 196,198 232,210 C258,188 300,198 312,234 C348,238 368,278 356,318 C372,350 352,392 310,400 L130,400 C96,392 84,362 96,340 Z;" +
      "M90,338 C80,296 108,262 146,256 C152,212 194,190 234,204 C262,180 306,192 318,230 C356,232 378,274 364,316 C382,348 358,396 312,404 L126,404 C90,396 78,360 90,338 Z;" +
      "M96,340 C88,300 112,268 148,262 C156,220 196,198 232,210 C258,188 300,198 312,234 C348,238 368,278 356,318 C372,350 352,392 310,400 L130,400 C96,392 84,362 96,340 Z",
    clip: "M108,338 C102,306 122,280 152,276 C160,238 196,220 228,230 C252,212 290,222 300,252 C330,256 348,288 338,320 C350,348 334,382 300,388 L138,388 C110,382 100,358 108,338 Z",
    faceY: 292,
    eyeSpread: 48,
    coreY: 318,
    coreR: 36,
    blushY: 318,
    blushX: 62,
    limbY: 378,
    badgeY: 392,
  },
};



function AppMark({ mark, core, feature, y }) {
  const cy = y;
  if (mark === "lotus") {
    return (
      <g transform={`translate(210,${cy})`}>
        <path d="M0,-16 C8,-8 10,4 0,14 C-10,4 -8,-8 0,-16 Z" fill={core} stroke={feature} strokeWidth="3.5" />
        <path d="M-14,-2 C-6,-10 6,-10 14,-2 C6,2 -6,2 -14,-2 Z" fill={core} opacity=".75" stroke={feature} strokeWidth="3" />
      </g>
    );
  }
  if (mark === "aperture") {
    return (
      <g transform={`translate(210,${cy})`}>
        <circle r="18" fill="none" stroke={feature} strokeWidth="4" />
        <circle r="7" fill={core} stroke={feature} strokeWidth="3" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path key={a} d="M0,-18 L6,-8 L0,-4 Z" fill={core} opacity=".85"
            transform={`rotate(${a})`} />
        ))}
      </g>
    );
  }
  if (mark === "coin") {
    return (
      <g transform={`translate(210,${cy})`}>
        <circle r="18" fill={core} stroke={feature} strokeWidth="4" />
        <circle r="12" fill="none" stroke={feature} strokeWidth="2.5" opacity=".55" />
        <path d="M-4,-8 V8 M4,-6 V6 M-4,-8 Q4,-10 4,-2 Q4,2 -4,4 Q4,6 4,8" fill="none" stroke={feature} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  // Compact weather mark — sits low on the cloud belly
  return (
    <g transform={`translate(210,${cy}) scale(0.78)`}>
      <circle cx="-6" cy="4" r="11" fill={core} stroke={feature} strokeWidth="3" />
      <path d="M2,-6 C14,-10 22,0 18,10 C14,18 4,14 -2,8" fill="#fff" opacity=".92" stroke={feature} strokeWidth="2.8" />
    </g>
  );
}


function SpeciesRays({ species, p }) {

  if (species === "pillar") {
    return (
      <g data-ms-part="rays" fill="none" stroke={p.top} strokeLinecap="round">
        <ellipse className="ob-ray" cx="210" cy="150" rx="52" ry="14" strokeWidth="5" opacity=".7" />
        <ellipse className="ob-ray" cx="210" cy="136" rx="34" ry="9" strokeWidth="4" opacity=".55" style={{ animationDelay: ".35s" }} />
        <path className="ob-ray" d="M210,118 L210,96" strokeWidth="5" style={{ animationDelay: ".2s" }} />
      </g>
    );
  }
  if (species === "diamond") {
    const blades = [
      [210, 128, 210, 96], [168, 148, 148, 118], [252, 148, 272, 118],
      [148, 188, 120, 172], [272, 188, 300, 172],
    ];
    return (
      <g data-ms-part="rays" stroke={p.top} strokeLinecap="round" fill="none">
        {blades.map(([a, b, c, d], i) => (
          <path key={i} className="ob-ray" d={`M${a},${b} L${c},${d}`} strokeWidth="6"
            style={{ animationDelay: `${(i % 3) * 0.2}s` }} />
        ))}
        <circle cx="210" cy="118" r="7" fill={p.core} />
      </g>
    );
  }
  if (species === "squircle") {
    return (
      <g data-ms-part="rays">
        <path d="M188,148 C188,128 198,116 210,112 C222,116 232,128 232,148" fill={p.mid} opacity=".55" />
        <path d="M198,150 C196,132 202,120 210,116 C218,120 224,132 222,150" fill={p.core} stroke={p.features} strokeWidth="3" />
        <path d="M210,116 C218,104 232,108 234,122" fill="none" stroke={p.top} strokeWidth="4" strokeLinecap="round" className="ob-ray" />
      </g>
    );
  }
  // cloud — wind wisps
  return (
    <g data-ms-part="rays" fill="none" stroke={p.top} strokeLinecap="round">
      <path className="ob-ray" d="M78,250 Q58,240 48,252" strokeWidth="5" />
      <path className="ob-ray" d="M72,278 Q50,278 40,290" strokeWidth="4.5" style={{ animationDelay: ".25s" }} />
      <path className="ob-ray" d="M348,248 Q370,238 380,252" strokeWidth="5" style={{ animationDelay: ".15s" }} />
      <circle cx="56" cy="310" r="4" fill={p.core} className="ob-tick" />
      <circle cx="368" cy="318" r="3.5" fill={p.core} className="ob-tick" style={{ animationDelay: ".3s" }} />
    </g>
  );
}

function Eye({ style, kind, x, y, p }) {
  const at = `translate(${x},${y})`;
  const line = { fill: "none", stroke: p.features, strokeWidth: 8, strokeLinecap: "round" };

  if (kind === "heart") {
    return <path transform={`${at} scale(1.15)`} fill={p.features}
      d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" />;
  }
  if (kind === "star") {
    return <path transform={at} fill={p.features}
      d="M0,-16 L4,-4 L16,0 L4,4 L0,16 L-4,4 L-16,0 L-4,-4 Z" />;
  }
  if (kind === "spiral") {
    return <path transform={at} {...line} strokeWidth="6"
      d="M2,1 q5,-4 4,2 q-1.5,7 -9,6 q-9,-1.5 -8,-11 q1.5,-11.5 13,-10.5 q13,1.5 12,14" />;
  }
  if (kind === "arch" || kind === "closed") {
    return <path d="M-16,3 Q0,-12 16,3" transform={at} {...line} />;
  }
  if (kind === "sleep") {
    return <path d="M-16,-3 Q0,12 16,-3" transform={at} {...line} />;
  }
  if (kind === "sad") {
    if (style === "crescent") {
      return <path d="M-15,6 Q0,-6 15,6" transform={at} {...line} strokeWidth="7" />;
    }
    return (
      <g transform={at}>
        <ellipse cx="0" cy="2" rx="11" ry="14" fill={p.features} />
        <circle cx="-3" cy="-3" r="2.6" fill={p.core} />
      </g>
    );
  }

  // Open / half / wide — species-specific open eyes
  const wide = kind === "wide";
  const half = kind === "half";

  if (style === "crescent") {
    // Soft moon crescents — open almond with crescent lid + bright pupil
    return (
      <g transform={at} className="ob-blink">
        <ellipse cx="0" cy="0" rx={wide ? 15 : 12.5} ry={wide ? 18 : 15} fill="#FFF8F0" stroke={p.features} strokeWidth="4.5" />
        <path
          d={wide
            ? "M-15,-2 Q0,-16 15,-2"
            : "M-12.5,-1 Q0,-13 12.5,-1"}
          fill="none" stroke={p.features} strokeWidth="5" strokeLinecap="round"
        />
        {!half && (
          <>
            <ellipse cx="-2" cy={wide ? 2 : 1} rx={wide ? 5 : 4} ry={wide ? 6.5 : 5.5} fill={p.features} />
            <circle cx="-4" cy={wide ? -1 : -1.5} r="2" fill="#fff" />
          </>
        )}
        {half && <rect x="-16" y="-18" width="32" height="16" fill={p.mid} />}
      </g>
    );
  }

  if (style === "rhombus") {
    const s = wide ? 1.35 : 1.15;
    return (
      <g transform={`${at} scale(${s})`} className="ob-blink">
        <path d="M0,-20 L16,0 L0,20 L-16,0 Z" fill="#FFF8F0" stroke={p.features} strokeWidth="3.5" />
        <path d="M0,-14 L11,0 L0,14 L-11,0 Z" fill={p.features} />
        {!half && (
          <>
            <path d="M0,-7 L5.5,0 L0,7 L-5.5,0 Z" fill={p.core} opacity=".95" />
            <circle cx="2.5" cy="-2" r="1.8" fill="#fff" opacity=".85" />
          </>
        )}
        {half && <path d="M-14,0 L14,0" stroke={p.mid} strokeWidth="10" strokeLinecap="round" />}
      </g>
    );
  }

  if (style === "slot") {
    // Wide flat coin-slot eyes — horizontally stretched
    const rx = wide ? 22 : 18;
    const ry = wide ? 9 : half ? 5 : 7.5;
    return (
      <g transform={at} className="ob-blink">
        <ellipse cx="0" cy="0" rx={rx} ry={ry + 3} fill="#FFF8F0" stroke={p.features} strokeWidth="4" />
        <ellipse cx="0" cy="0" rx={rx - 3} ry={ry} fill={p.features} />
        {!half && (
          <>
            <ellipse cx="-5" cy="-1" rx="5" ry="3.2" fill={p.core} />
            <circle cx="5" cy="1.5" r="1.6" fill={p.core} opacity=".55" />
          </>
        )}
        {half && <rect x={-rx} y={-ry - 4} width={rx * 2} height={ry + 2} fill={p.mid} />}
      </g>
    );
  }


  // bubble — big round weather eyes
  const r = wide ? 16 : half ? 11 : 13.5;
  return (
    <g transform={at} className="ob-blink">
      <circle cx="0" cy="0" r={r} fill="#FFFDF8" stroke={p.features} strokeWidth="5" />
      <circle cx={wide ? -3 : -2.5} cy={half ? 2 : -1} r={half ? 4 : 6.5} fill={p.features} />
      <circle cx={wide ? -5 : -4.5} cy={half ? 0 : -3} r="2.2" fill="#fff" />
      <circle cx="3" cy="3" r="1.2" fill="#fff" opacity=".65" />
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

function Limbs({ species, poseKey, p, y }) {
  const wave = poseKey === "wave" || poseKey === "high_five";
  const point = poseKey === "pointing";
  const clap = poseKey === "clapping" || poseKey === "celebrate";
  const shrug = poseKey === "shrug";
  const run = poseKey === "running";
  const facepalm = poseKey === "facepalm";
  const thumbs = poseKey === "thumbs_up" || poseKey === "thumbs_down";

  if (species === "pillar") {
    // Soft elongated light paddles
    return (
      <g data-ms-part="limbs" fill={p.mid} stroke={p.features} strokeWidth="3" opacity=".92">
        <ellipse cx="118" cy={y} rx="18" ry={wave || clap ? 36 : 28}
          transform={wave ? undefined : shrug ? "rotate(-20 118 " + y + ")" : facepalm ? "rotate(25 118 " + y + ")" : undefined}>
          {wave && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-28 118 ${y};-48 118 ${y};-28 118 ${y}`}
              dur="0.7s"
              repeatCount="indefinite"
            />
          )}
        </ellipse>
        <ellipse cx="302" cy={y} rx="18" ry={point || wave ? 38 : 28}
          transform={point ? "rotate(55 302 " + y + ")" : clap ? "rotate(30 302 " + y + ")" : shrug ? "rotate(20 302 " + y + ")" : undefined} />
      </g>
    );
  }
  if (species === "diamond") {
    // Angular soft wedges
    return (
      <g data-ms-part="limbs" fill={p.mid} stroke={p.features} strokeWidth="3">
        <path d={wave || clap
          ? "M132,340 L98,300 L108,288 L142,328 Z"
          : facepalm
            ? "M150,300 L118,268 L130,256 L160,292 Z"
            : "M128,360 L96,392 L108,404 L140,372 Z"} />
        <path d={point
          ? "M288,348 L348,330 L352,344 L294,360 Z"
          : thumbs
            ? "M292,340 L340,300 L350,312 L300,350 Z"
            : "M292,360 L324,392 L312,404 L280,372 Z"} />
      </g>
    );
  }
  if (species === "squircle") {
    // Stubby soft mitts — sit on the wide vault sides
    return (
      <g data-ms-part="limbs">
        <rect x="58" y={y - 12} width="40" height={wave || clap ? 46 : 34} rx="14" fill={p.mid} stroke={p.features} strokeWidth="3"
          transform={wave ? undefined : facepalm ? `rotate(15 78 ${y})` : undefined}>
          {wave && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              values={`-30 78 ${y};-50 78 ${y};-30 78 ${y}`}
              dur="0.75s"
              repeatCount="indefinite"
            />
          )}
        </rect>
        <rect x="322" y={y - 12} width="40" height={point ? 48 : 34} rx="14" fill={p.mid} stroke={p.features} strokeWidth="3"
          transform={point ? `rotate(50 342 ${y})` : clap ? `rotate(25 342 ${y})` : undefined} />
      </g>
    );
  }
  // cloud puffs as limbs
  return (
    <g data-ms-part="limbs" fill={p.top} stroke={p.features} strokeWidth="3">
      <g transform={wave ? `translate(0,-18)` : run ? "translate(-8,4)" : undefined}>
        <ellipse cx="86" cy={y} rx="28" ry="20" />
        <circle cx="68" cy={y - 8} r="12" />
        <circle cx="100" cy={y - 6} r="11" />
      </g>
      <g transform={point ? "translate(16,-10)" : run ? "translate(10,4)" : undefined}>
        <ellipse cx="334" cy={y} rx="28" ry="20" />
        <circle cx="318" cy={y - 8} r="12" />
        <circle cx="350" cy={y - 6} r="11" />
      </g>
    </g>
  );
}

function CoreNucleus({ species, p, y, r, gid }) {
  if (species === "diamond") {
    // Aperture iris
    return (
      <g data-ms-part="core" className="ob-pop">
        <circle cx="210" cy={y} r={r} fill={`url(#${gid}-core)`} />
        <circle cx="210" cy={y} r={r * 0.55} fill="none" stroke={p.features} strokeWidth="3" opacity=".35" />
        <circle cx="210" cy={y} r={r * 0.28} fill={p.core} opacity=".95" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <path key={a} d={`M210,${y - r * 0.72} L216,${y - r * 0.42} L210,${y - r * 0.28} Z`}
            fill={p.top} opacity=".55" transform={`rotate(${a} 210 ${y})`} />
        ))}
      </g>
    );
  }
  if (species === "squircle") {
    return (
      <g data-ms-part="core" className="ob-pop">
        <circle cx="210" cy={y} r={r} fill={`url(#${gid}-core)`} />
        <circle cx="210" cy={y} r={r * 0.78} fill="none" stroke={p.features} strokeWidth="2.2" opacity=".28" />
        <circle cx="210" cy={y} r={r * 0.42} fill={p.core} opacity=".55" />
        <path d={`M210,${y - 9} V${y + 9}`} fill="none" stroke={p.features} strokeWidth="3" strokeLinecap="round" opacity=".4" />
        <path d={`M201,${y - 5} H219`} fill="none" stroke={p.features} strokeWidth="2.5" strokeLinecap="round" opacity=".35" />
      </g>
    );
  }

  if (species === "cloud") {
    return (
      <g data-ms-part="core" className="ob-pop">
        <circle cx="210" cy={y} r={r} fill={`url(#${gid}-core)`} />
        <circle cx="210" cy={y} r={r * 0.42} fill={p.core} opacity=".9" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} className="ob-ray" d={`M210,${y - r * 0.55} L210,${y - r * 0.85}`}
            stroke={p.top} strokeWidth="3.5" strokeLinecap="round"
            transform={`rotate(${a} 210 ${y})`} opacity=".7" />
        ))}
      </g>
    );
  }
  // pillar — soft moon
  return (
    <g data-ms-part="core" className="ob-pop">
      <circle cx="210" cy={y} r={r} fill={`url(#${gid}-core)`} />
      <circle cx={210 - r * 0.22} cy={y - r * 0.28} r={r * 0.18} fill={p.core} opacity=".9" />
      <path d={`M${210 + r * 0.1},${y - r * 0.55} A${r * 0.55},${r * 0.55} 0 1,0 ${210 + r * 0.1},${y + r * 0.55}`}
        fill="none" stroke={p.top} strokeWidth="4" opacity=".35" />
    </g>
  );
}

function PoseVisuals({ keyName, p }) {
  const stroke = { fill: "none", stroke: p.features, strokeWidth: 6.5, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (keyName) {
    case "thinking":
    case "confused":
      return <g className="ob-drift"><path d="M300 178 Q324 150 346 172 Q356 188 338 202 L322 216" {...stroke} /><circle cx="316" cy="236" r="4.5" fill={p.features} /></g>;
    case "listening":
      return (
        <g fill="none" stroke={p.top} strokeWidth="4">
          <circle className="ob-tick" cx="210" cy="300" r="150"><animate attributeName="r" values="140;190" dur="1.6s" repeatCount="indefinite" /></circle>
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
        </g>
      );
    case "pointing":
      return <path d="M348 312 h42 M390 312 l-14 -12 M390 312 l-14 12" {...stroke} />;
    case "writing":
      return (
        <g>
          <rect x="130" y="400" width="160" height="70" rx="12" fill="#FFFDF8" stroke={p.features} strokeWidth="6" />
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
          <g transform="translate(110,120)">
            <path className="ob-drift" d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" fill={p.core} />
          </g>
          <g transform="translate(310,116)">
            <path className="ob-drift" d="M0,-8 L2.2,-2.2 L8,0 L2.2,2.2 L0,8 L-2.2,2.2 L-8,0 L-2.2,-2.2 Z" fill={p.top} style={{ animationDelay: ".4s" }} />
          </g>
        </g>
      );
    case "love":
      return (
        <g>
          <g transform="translate(310,170) scale(1.3)">
            <path className="ob-drift" d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" fill={p.base} />
          </g>
          <g transform="translate(118,160) scale(0.9)">
            <path className="ob-drift" d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" fill={p.top} style={{ animationDelay: ".7s" }} />
          </g>
        </g>
      );
    case "blowing_kiss":
      return (
        <g>
          <g fill="none" stroke="#FF7A9A" strokeLinecap="round" opacity=".9">
            <path className="ob-tick" d="M228,250 Q252,238 278,242" strokeWidth="3.4" />
            <path className="ob-tick" d="M230,258 Q258,252 286,254" strokeWidth="2.4" style={{ animationDelay: ".18s" }} />
          </g>
          <g transform="translate(278,240) scale(1.35)">
            <path className="ob-drift" d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" fill="#FF6B8A" />
          </g>
          <g transform="translate(320,198) scale(1.05)">
            <path className="ob-drift" d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" fill={p.base} style={{ animationDelay: ".4s" }} />
          </g>
          <g transform="translate(354,162) scale(0.8)">
            <path className="ob-drift" d="M0,12 C-14,1 -16,-9 -8.5,-13.5 C-3.5,-16.5 0,-12 0,-8 C0,-12 3.5,-16.5 8.5,-13.5 C16,-9 14,1 0,12 Z" fill={p.top} style={{ animationDelay: ".8s" }} />
          </g>
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
          <path className="ob-drift" d="M314,110 L328,110 L314,124 L308,124" strokeWidth="4.5" style={{ animationDelay: ".6s" }} />
        </g>
      );
    case "proud":
    case "encourage":
      return <g><path d="M210 108 l8 18 20 2-15 13 5 19-18-10-18 10 5-19-15-13 20-2Z" fill={p.core} stroke={p.features} strokeWidth="4" /></g>;
    case "oops":
      return <g><circle cx="324" cy="220" r="26" fill="#FFFDF8" stroke={p.features} strokeWidth="5" /><path d="M324 206 v18 M324 234 v2" {...stroke} /></g>;
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
      return <path d="M140 170 q70-50 140 0" fill="none" stroke={p.core} strokeWidth="7" strokeDasharray="7 14" strokeLinecap="round" />;
    case "dancing":
      return <g className="ob-drift"><path d="M90 220 q22-14 18-36 q24 10 38-8 v42 q-16-10-30 3 M310 206 q20-12 16-34 q22 8 34-8 v40 q-14-8-26 3" fill={p.core} stroke={p.features} strokeWidth="4" /></g>;
    case "searching":
      return <g><circle cx="100" cy="250" r="30" fill="#FFFDF8" fillOpacity=".4" stroke={p.features} strokeWidth="7" /><path d="M78 272 l-22 24" {...stroke} /></g>;
    case "thumbs_up":
    case "thumbs_down":
      return (
        <g transform={keyName === "thumbs_down" ? "translate(0 520) scale(1 -1)" : undefined}>
          <path d="M80 280 h40 l16-32 q8-14 18-7 q8 5 2 24 l-4 14 h28 v66 h-62 l-36-14Z" fill={p.core} stroke={p.features} strokeWidth="5" strokeLinejoin="round" />
        </g>
      );
    case "shrug":
      return <g><path d="M70 210 q28-24 54 0 M296 210 q28-24 54 0" {...stroke} /></g>;
    case "working":
      return <g><path d="M118 368 h184 l-16 84 h-152Z" fill="#FFFDF8" stroke={p.features} strokeWidth="6" /><circle cx="210" cy="412" r="9" fill={p.core} /></g>;
    case "running":
      return <g><path d="M48 280 h70 M36 314 h62 M56 348 h46" {...stroke} /></g>;
    case "flying":
      return <g fill="#FFFDF8" stroke={p.features} strokeWidth="4"><path d="M42 400 q12-26 36-10 q14-24 36 0 q26-4 28 18 H42Z" /><path d="M286 130 q12-24 34-10 q14-22 34 2 q24-4 26 16 h-94Z" /></g>;
    case "high_five":
    case "clapping":
      return <g className="ob-pulse"><path d="M210 118 l8 18 20 2-15 13 5 19-18-10-18 10 5-19-15-13 20-2Z" fill={p.core} stroke={p.features} strokeWidth="4" /></g>;
    case "error":
      return <g><path d="M324 170 l38 66 h-76Z" fill={p.core} stroke={p.features} strokeWidth="5" strokeLinejoin="round" /><path d="M324 194 v20 M324 226 v2" {...stroke} /></g>;
    case "empty":
      return <g><path d="M124 390 h172 l-16 54 h-140Z" fill="#FFFDF8" fillOpacity=".3" stroke={p.features} strokeWidth="6" /><path d="M176 414 h68" {...stroke} /></g>;
    case "loading":
      return <g className="ob-spin"><circle cx="324" cy="210" r="30" fill="none" stroke={p.features} strokeOpacity=".25" strokeWidth="8" /><path d="M324 180 a30 30 0 0 1 28 24" fill="none" stroke={p.core} strokeWidth="8" strokeLinecap="round" /></g>;
    case "waiting":
      return <g><circle cx="324" cy="210" r="32" fill="#FFFDF8" fillOpacity=".3" stroke={p.features} strokeWidth="6" /><path d="M324 188 v24 l16 10" {...stroke} /></g>;
    case "grumpy":
      return <g stroke={p.features} strokeWidth="5" strokeLinecap="round" fill="none" opacity=".75"><path className="ob-tick" d="M130 150 L140 160 L130 170" /><path className="ob-tick" d="M290 144 L280 154 L290 164" style={{ animationDelay: ".25s" }} /></g>;
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
  const mouthY = body.faceY + (species === "squircle" ? 28 : 42);

  const bodyClass = pose.key === "dancing" ? "ob-float ob-g-dancing" : pose.key === "running" ? "ob-float ob-g-running" : pose.key === "flying" ? "ob-float ob-g-flying" : pose.key === "alarm" ? "ob-float ob-g-alarm" : pose.key === "sleepy" || pose.key === "waiting" ? "ob-float ob-g-sleepy" : "ob-float";
  const look = face.look || [0, 0];
  const propHeavy = ["writing", "working", "searching", "thumbs_up", "thumbs_down", "empty"].includes(pose.key);

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
          <stop offset=".7" stopColor={p.core} stopOpacity=".85" />
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

      {/* Sol-family light pool — never a hard shadow */}
      <g data-ms-part="pool" transform="translate(210,472)">
        <ellipse className="ob-pool" cx="0" cy="0" rx={species === "cloud" ? 120 : 100} ry="12" fill={`url(#${gid}-pool)`} />
        <ellipse cx="0" cy="0" rx="42" ry="5" fill={p.core} opacity=".32" />
      </g>

      <ellipse data-ms-part="halo" className="ob-glow ms-glow-halo" cx="210" cy="300" rx="168" ry="160" fill={`url(#${gid}-halo)`} />

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


            <CoreNucleus species={species} p={p} y={body.coreY} r={body.coreR} gid={gid} />

            <g data-ms-part="gleam" clipPath={`url(#${gid}-clip)`}>
              <ellipse className="ob-gleam" cx="210" cy="300" rx="12" ry="120" fill={p.top} opacity="0" />
            </g>

            <g data-ms-part="blush" fill={p.blush} opacity=".58">
              <circle cx={210 - body.blushX} cy={body.blushY} r="11" />
              <circle cx={210 + body.blushX} cy={body.blushY} r="11" />
            </g>

            <g transform={`translate(${look[0]},${look[1]})`}>
              <Brows kind={face.brow} xL={eyeL} xR={eyeR} y={body.faceY - 28} p={p} />
              <g data-ms-part="eyes" className="ms-eyes ob-pop">
                <Eye style={config.eyeStyle} kind={face.eye} x={eyeL} y={body.faceY} p={p} />
                <Eye style={config.eyeStyle} kind={face.eye} x={eyeR} y={body.faceY} p={p} />
              </g>
              <g data-ms-part="mouth">
                <Mouth kind={face.mouth} y={mouthY} p={p} />
              </g>
            </g>

            <g data-ms-part="badge">
              <AppMark mark={config.mark} core={p.core} feature={p.features} y={body.badgeY} />
            </g>

            <Limbs species={species} poseKey={pose.key} p={p} y={body.limbY} />
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
