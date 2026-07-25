export type ThemeSwatch = {
  name: string;
  top: string;
  mid: string;
  base: string;
  core: string;
  stage: string;
  /** Optional feature/line color (eyes, brows, beak outlines). */
  features?: string;
};

export type StudioInstrument = {
  /** Product-facing control, Lyra's "Delivery" pattern. */
  label: string;
  description: string;
  lowLabel: string;
  midLabel: string;
  highLabel: string;
  defaultValue: number;
  /** 5-stop colour ramp used for the signal, 0→100. */
  ramp: [string, string, string, string, string];
};

export type GeneratedGesture = {
  key: string;
  label: string;
  cat: string;
  tip: string;
  use: string;
  /** Full self-contained animated SVG markup (SMIL + inline styles). */
  svg: string;
  /** Eyes follow cursor (idle / listening style). */
  track?: boolean;
  /** Auto spark bursts while this pose is active. */
  delight?: boolean;
  /** Retarget the instrument slider when this pose is selected. */
  signal?: number;
};

export type GeneratedMascot = {
  name: string;
  tagline: string;
  product?: string;
  accent: string;
  glowLabel?: string;
  themes: Record<string, ThemeSwatch>;
  instrument: StudioInstrument;
  gestures: GeneratedGesture[];
};

export type GenerateRequest = {
  name: string;
  description: string;
  productContext?: string;
  personality?: string;
  gestures: Array<{
    key: string;
    label: string;
    cat: string;
    tip: string;
    use: string;
  }>;
};
