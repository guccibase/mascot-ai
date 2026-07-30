"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";

const GOLD = "#F5B34F";
const GOLD_LIGHT = "#FFD68A";
const GOLD_DEEP = "#E09A32";
const CREAM = "#F7F3EA";
const INK = "#12141C";
const BLUE = "#588CFF";

export type BrandMarkGesture =
  | "welcome"
  | "thinking"
  | "curious"
  | "curious-web"
  | "curious-mobile"
  | "curious-game"
  | "listening"
  | "proud"
  | "showcase";

type Props = {
  className?: string;
  title?: string;
  gesture?: BrandMarkGesture;
};

type FaceProps = {
  gesture: BrandMarkGesture;
};

function Brows({ gesture }: { gesture: BrandMarkGesture }) {
  const stroke = { fill: "none", stroke: INK, strokeWidth: 6, strokeLinecap: "round" as const };
  if (gesture === "thinking") {
    return (
      <g>
        <path d="M-28 -18 Q-14 -28 -2 -22" {...stroke} />
        <path d="M2 -22 Q14 -28 28 -18" {...stroke} />
      </g>
    );
  }
  if (gesture === "curious" || gesture.startsWith("curious-")) {
    return (
      <g>
        <path d="M-28 -20 Q-14 -32 -2 -24" {...stroke} />
        <path d="M2 -24 Q14 -32 28 -20" {...stroke} />
      </g>
    );
  }
  if (gesture === "listening") {
    return (
      <g opacity="0.85">
        <path d="M-26 -16 Q-14 -22 -4 -18" {...stroke} strokeWidth={5} />
        <path d="M4 -18 Q14 -22 26 -16" {...stroke} strokeWidth={5} />
      </g>
    );
  }
  if (gesture === "proud" || gesture === "showcase") {
    return (
      <g>
        <path d="M-28 -16 Q-14 -26 -2 -20" {...stroke} />
        <path d="M2 -20 Q14 -26 28 -16" {...stroke} />
      </g>
    );
  }
  return null;
}

function Eyes({ gesture }: { gesture: BrandMarkGesture }) {
  if (gesture === "proud") {
    return (
      <>
        <path d="M-24 -8 Q-14 -18 -4 -8" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
        <path d="M4 -8 Q14 -18 24 -8" stroke={INK} strokeWidth={5} strokeLinecap="round" fill="none" />
      </>
    );
  }
  if (gesture === "showcase") {
    return (
      <>
        <ellipse cx="-14" cy="-4" rx="11" ry="3" fill={INK} />
        <ellipse cx="14" cy="-4" rx="11" ry="14" fill={CREAM} />
        <circle cx="14" cy="-2" r="5.5" fill={INK} />
        <circle cx="16.5" cy="-4.5" r="1.8" fill={CREAM} opacity="0.9" />
      </>
    );
  }

  const wide =
    gesture === "curious" ||
    gesture.startsWith("curious-") ||
    gesture === "listening";

  return (
    <>
      <ellipse
        className="abm-eye abm-eye-l"
        cx="-14"
        cy="-4"
        rx={wide ? 12 : 11}
        ry={wide ? 15 : 14}
        fill={CREAM}
      />
      <ellipse
        className="abm-eye abm-eye-r"
        cx="14"
        cy="-4"
        rx={wide ? 12 : 11}
        ry={wide ? 15 : 14}
        fill={CREAM}
      />
    </>
  );
}

function Pupils({ gesture }: { gesture: BrandMarkGesture }) {
  if (gesture === "proud") return null;
  if (gesture === "showcase") return null;

  const lookUp = gesture === "thinking";
  const lookSide = gesture === "listening";
  const cxL = lookUp ? -13 : lookSide ? -11.5 : -14;
  const cyL = lookUp ? -4.5 : lookSide ? -1.5 : -2;
  const cxR = lookUp ? -15 : lookSide ? 12.5 : 14;
  const cyR = lookUp ? -3.5 : lookSide ? -1.5 : -2;

  return (
    <g className="abm-pupils">
      <circle cx={cxL} cy={cyL} r="5.5" fill={INK} />
      <circle cx={cxR} cy={cyR} r="5.5" fill={INK} />
      <circle cx={cxL + 2.5} cy={cyL - 2.5} r="1.8" fill={CREAM} opacity="0.9" />
      <circle cx={cxR + 2.5} cy={cyR - 2.5} r="1.8" fill={CREAM} opacity="0.9" />
    </g>
  );
}

function Mouth({ gesture }: { gesture: BrandMarkGesture }) {
  const stroke = {
    fill: "none" as const,
    stroke: INK,
    strokeWidth: 3.5,
    strokeLinecap: "round" as const,
  };

  if (gesture === "thinking") {
    return <path className="abm-mouth" d="M-8 16 L8 16" {...stroke} />;
  }
  if (gesture === "curious" || gesture.startsWith("curious-")) {
    return (
      <ellipse className="abm-mouth" cx="0" cy="16" rx="7" ry="9" fill={INK} opacity="0.9" />
    );
  }
  if (gesture === "listening") {
    return (
      <path className="abm-mouth" d="M-10 14 Q0 21 10 14" {...stroke} />
    );
  }
  if (gesture === "proud" || gesture === "showcase") {
    return (
      <path className="abm-mouth" d="M-14 12 Q0 28 14 12" {...stroke} strokeWidth={4} />
    );
  }
  return (
    <path className="abm-mouth" d="M-12 14 Q0 24 12 14" {...stroke} />
  );
}

function Sparkles({ gesture }: { gesture: BrandMarkGesture }) {
  // Position lives on an outer <g> so the CSS sparkle animation can't
  // overwrite the translate and dump the star at the face center.
  const star = (x: number, y: number, scale = 1, cls = "abm-sparkle") => (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        className={cls}
        d="M0 -7 L1.9 -1.9 L7 0 L1.9 1.9 L0 7 L-1.9 1.9 L-7 0 L-1.9 -1.9 Z"
        fill={CREAM}
      />
    </g>
  );

  if (gesture === "proud") {
    return (
      <g>
        {star(28, -28, 1, "abm-sparkle")}
        {star(-32, -22, 0.75, "abm-sparkle-b")}
        {star(34, -12, 0.55, "abm-sparkle-c")}
      </g>
    );
  }
  if (gesture === "showcase") {
    return (
      <g>
        {star(30, -30, 1.1, "abm-sparkle")}
        {star(18, -36, 0.65, "abm-sparkle-b")}
        {star(38, -18, 0.8, "abm-sparkle-c")}
      </g>
    );
  }
  if (gesture === "welcome") {
    return star(28, -28);
  }
  return null;
}

function Prop({ gesture }: { gesture: BrandMarkGesture }) {
  if (gesture === "thinking") {
    return (
      <g className="abm-prop" transform="translate(34 -34)">
        <circle cx="0" cy="0" r="11" fill={CREAM} fillOpacity="0.12" stroke={CREAM} strokeWidth="1.5" strokeOpacity="0.35" />
        <path d="M0 -4 L0 3" stroke={CREAM} strokeWidth="2" strokeLinecap="round" />
        <circle cx="0" cy="5.5" r="1.3" fill={CREAM} />
      </g>
    );
  }
  if (gesture === "curious-web") {
    return (
      <g className="abm-prop" transform="translate(-36 -30)">
        <circle cx="0" cy="0" r="10" fill="none" stroke={BLUE} strokeWidth="2" opacity="0.85" />
        <ellipse cx="0" cy="0" rx="10" ry="4.5" fill="none" stroke={BLUE} strokeWidth="1.5" opacity="0.7" />
        <path d="M0 -10 L0 10" stroke={BLUE} strokeWidth="1.5" opacity="0.7" />
      </g>
    );
  }
  if (gesture === "curious-mobile") {
    return (
      <g className="abm-prop" transform="translate(-36 -32)">
        <rect x="-6" y="-10" width="12" height="20" rx="3" fill={CREAM} opacity="0.15" stroke={CREAM} strokeWidth="1.5" />
        <circle cx="0" cy="7" r="1.2" fill={CREAM} opacity="0.6" />
      </g>
    );
  }
  if (gesture === "curious-game") {
    return (
      <g className="abm-prop" transform="translate(-38 -28)">
        <rect x="-9" y="-6" width="18" height="12" rx="4" fill={CREAM} opacity="0.12" stroke={CREAM} strokeWidth="1.5" />
        <circle cx="-4" cy="0" r="2" fill={GOLD} />
        <circle cx="4" cy="-2" r="1.5" fill={BLUE} opacity="0.9" />
      </g>
    );
  }
  if (gesture === "listening") {
    return (
      <g className="abm-prop" transform="translate(36 -18)">
        <rect x="-8" y="-10" width="16" height="20" rx="3" fill={CREAM} opacity="0.1" stroke={CREAM} strokeWidth="1.2" />
        <path d="M-4 -2 L-1 1 L4 -4" fill="none" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }
  return null;
}

function Face({ gesture }: FaceProps) {
  return (
    <>
      <Brows gesture={gesture} />
      <Eyes gesture={gesture} />
      <Pupils gesture={gesture} />
      <Mouth gesture={gesture} />
      <Sparkles gesture={gesture} />
      <Prop gesture={gesture} />
    </>
  );
}

/** Extra top/bottom room so float + antenna tip stay inside the viewBox. */
const RIG_X = 64;
const RIG_Y = 82;

function buildStyles(gesture: BrandMarkGesture): string {
  const g = gesture;
  const origin = `translate(${RIG_X}px,${RIG_Y}px)`;
  return `
    .abm-rig { transform: ${origin}; transform-box: fill-box; }
    @media (prefers-reduced-motion: no-preference) {
      .abm-rig { animation: abm-float-${g} 3.6s ease-in-out infinite; transform-origin: 0 0; }
      .abm-ear-l { animation: abm-ear 2.6s ease-in-out infinite; transform-origin: -38px -8px; }
      .abm-ear-r { animation: abm-ear 2.6s ease-in-out 0.35s infinite; transform-origin: 38px -8px; }
      .abm-antenna { animation: abm-antenna-${g} 4.2s ease-in-out infinite; transform-origin: 0 -42px; }
      .abm-tip { animation: abm-tip 2.4s ease-in-out infinite; transform-origin: 0 -62px; }
      .abm-eye { animation: abm-blink 5.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
      .abm-eye-r { animation-delay: 0.08s; }
      .abm-pupils { animation: abm-look-${g} 6s ease-in-out infinite; transform-origin: center; }
      .abm-mouth { animation: abm-mouth-${g} 3.6s ease-in-out infinite; transform-origin: 0 18px; }
      .abm-sparkle { animation: abm-sparkle-a 2.8s ease-in-out infinite; }
      .abm-sparkle-b { animation: abm-sparkle-a 3.2s ease-in-out 0.4s infinite; }
      .abm-sparkle-c { animation: abm-sparkle-a 2.4s ease-in-out 0.8s infinite; }
      .abm-prop { animation: abm-prop-${g} 3s ease-in-out infinite; }
    }
    @keyframes abm-ear { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-1.5px) scale(1.04)} }
    @keyframes abm-tip { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.95} }
    @keyframes abm-blink { 0%,46%,50%,100%{transform:scaleY(1)} 48%{transform:scaleY(0.08)} }
    @keyframes abm-sparkle-a { 0%,100%{transform:rotate(0deg) scale(1);opacity:1} 50%{transform:rotate(14deg) scale(1.12);opacity:0.82} }
    @keyframes abm-float-welcome { 0%,100%{transform:${origin} translateY(0)} 50%{transform:${origin} translateY(-6px)} }
    @keyframes abm-antenna-welcome { 0%,100%{transform:rotate(0deg)} 40%{transform:rotate(5deg)} 70%{transform:rotate(-3deg)} }
    @keyframes abm-look-welcome { 0%,100%{transform:translate(0,0)} 30%{transform:translate(1.5px,0)} 55%{transform:translate(-1px,-0.5px)} 80%{transform:translate(0.5px,0.5px)} }
    @keyframes abm-mouth-welcome { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.05)} }
    @keyframes abm-prop-welcome { 0%,100%{opacity:1} }
    @keyframes abm-float-thinking { 0%,100%{transform:${origin} rotate(-3deg) translateY(0)} 50%{transform:${origin} rotate(-3deg) translateY(-4px)} }
    @keyframes abm-antenna-thinking { 0%,100%{transform:rotate(-6deg)} 50%{transform:rotate(-10deg)} }
    @keyframes abm-look-thinking { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-1px,-1.5px)} }
    @keyframes abm-mouth-thinking { 0%,100%{transform:scaleX(1)} }
    @keyframes abm-prop-thinking { 0%,100%{transform:translate(34px,-34px) rotate(0deg)} 50%{transform:translate(34px,-36px) rotate(8deg)} }
    @keyframes abm-float-curious { 0%,100%{transform:${origin} rotate(2deg) translateY(0)} 50%{transform:${origin} rotate(2deg) translateY(-7px)} }
    @keyframes abm-antenna-curious { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(8deg)} }
    @keyframes abm-look-curious { 0%,100%{transform:translate(0,0)} 25%{transform:translate(2px,-1px)} 75%{transform:translate(-2px,0.5px)} }
    @keyframes abm-mouth-curious { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes abm-prop-curious { 0%,100%{opacity:1} }
    @keyframes abm-float-curious-web { 0%,100%{transform:${origin} rotate(2deg) translateY(0)} 50%{transform:${origin} rotate(2deg) translateY(-7px)} }
    @keyframes abm-antenna-curious-web { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(8deg)} }
    @keyframes abm-look-curious-web { 0%,100%{transform:translate(0,0)} 25%{transform:translate(2px,-1px)} 75%{transform:translate(-2px,0.5px)} }
    @keyframes abm-mouth-curious-web { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes abm-prop-curious-web { 0%,100%{transform:translate(-36px,-30px) rotate(0deg)} 50%{transform:translate(-36px,-33px) rotate(-12deg)} }
    @keyframes abm-float-curious-mobile { 0%,100%{transform:${origin} rotate(2deg) translateY(0)} 50%{transform:${origin} rotate(2deg) translateY(-7px)} }
    @keyframes abm-antenna-curious-mobile { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(8deg)} }
    @keyframes abm-look-curious-mobile { 0%,100%{transform:translate(0,0)} 25%{transform:translate(2px,-1px)} 75%{transform:translate(-2px,0.5px)} }
    @keyframes abm-mouth-curious-mobile { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes abm-prop-curious-mobile { 0%,100%{transform:translate(-36px,-32px) rotate(0deg)} 50%{transform:translate(-38px,-35px) rotate(6deg)} }
    @keyframes abm-float-curious-game { 0%,100%{transform:${origin} rotate(2deg) translateY(0)} 50%{transform:${origin} rotate(2deg) translateY(-7px)} }
    @keyframes abm-antenna-curious-game { 0%,100%{transform:rotate(4deg)} 50%{transform:rotate(8deg)} }
    @keyframes abm-look-curious-game { 0%,100%{transform:translate(0,0)} 25%{transform:translate(2px,-1px)} 75%{transform:translate(-2px,0.5px)} }
    @keyframes abm-mouth-curious-game { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes abm-prop-curious-game { 0%,100%{transform:translate(-38px,-28px) rotate(-4deg)} 50%{transform:translate(-40px,-31px) rotate(4deg)} }
    @keyframes abm-float-listening { 0%,100%{transform:${origin} translateY(0)} 35%{transform:${origin} translateY(-2px)} 65%{transform:${origin} translateY(-5px)} }
    @keyframes abm-antenna-listening { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(2deg)} }
    @keyframes abm-look-listening { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2px,0)} }
    @keyframes abm-mouth-listening { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.04)} }
    @keyframes abm-prop-listening { 0%,100%{transform:translate(36px,-18px) scale(1)} 50%{transform:translate(36px,-20px) scale(1.03)} }
    @keyframes abm-float-proud { 0%,100%{transform:${origin} scale(1) translateY(0)} 50%{transform:${origin} scale(1.03) translateY(-5px)} }
    @keyframes abm-antenna-proud { 0%,100%{transform:rotate(0deg)} 40%{transform:rotate(6deg)} 70%{transform:rotate(-4deg)} }
    @keyframes abm-look-proud { 0%,100%{transform:translate(0,0)} }
    @keyframes abm-mouth-proud { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.08)} }
    @keyframes abm-prop-proud { 0%,100%{opacity:1} }
    @keyframes abm-float-showcase { 0%,100%{transform:${origin} rotate(-2deg) translateY(0)} 50%{transform:${origin} rotate(-2deg) translateY(-8px)} }
    @keyframes abm-antenna-showcase { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(4deg)} }
    @keyframes abm-look-showcase { 0%,100%{transform:translate(0,0)} 40%{transform:translate(1px,-0.5px)} }
    @keyframes abm-mouth-showcase { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.06)} }
    @keyframes abm-prop-showcase { 0%,100%{opacity:1} }
  `;
}

export function AnimatedBrandMark({
  className,
  title = "MascotAI",
  gesture = "welcome",
}: Props) {
  const uid = useId().replace(/:/g, "");
  const styles = useMemo(() => buildStyles(gesture), [gesture]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 152"
      fill="none"
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
      overflow="visible"
      className={cn("shrink-0 overflow-visible", className)}
      data-gesture={gesture}
    >
      <defs>
        <radialGradient id={`${uid}-head`} cx="42%" cy="36%" r="68%">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="55%" stopColor={GOLD} />
          <stop offset="100%" stopColor={GOLD_DEEP} />
        </radialGradient>
        <radialGradient id={`${uid}-ear`} cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="100%" stopColor={GOLD_DEEP} />
        </radialGradient>
        <radialGradient id={`${uid}-tip`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={GOLD_LIGHT} />
          <stop offset="100%" stopColor={GOLD} />
        </radialGradient>
        <filter id={`${uid}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.96  0 0 0 0 0.70  0 0 0 0 0.31  0 0 0 0.45 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <style>{styles}</style>

      <g className="abm-rig" filter={`url(#${uid}-glow)`}>
        <circle className="abm-ear-l" cx="-38" cy="-8" r="11" fill={`url(#${uid}-ear)`} />
        <circle className="abm-ear-r" cx="38" cy="-8" r="11" fill={`url(#${uid}-ear)`} />
        <circle cx="0" cy="0" r="42" fill={`url(#${uid}-head)`} />

        <g className="abm-antenna">
          <line x1="0" y1="-42" x2="0" y2="-58" stroke={GOLD} strokeWidth="5" strokeLinecap="round" />
          <circle className="abm-tip" cx="0" cy="-62" r="6.5" fill={`url(#${uid}-tip)`} />
        </g>

        <Face gesture={gesture} />
      </g>
    </svg>
  );
}
