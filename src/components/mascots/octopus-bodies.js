/**
 * Distinct organic body builds — same craft bar as Numi (soft mantle,
 * tapered arms, polished face), different silhouettes and eye language.
 */

const PARTS_ON = {
  suckers: true,
  spots: true,
  brows: true,
  blush: true,
  specs: false,
  cap: false,
  slate: true,
  chips: true,
  siphon: true,
  props: true,
  halo: true,
  shadow: true,
};

/** Numi — classic tall dome, slit pupils. */
export const BUILD_NUMI = {
  id: "numi",
  mantle:
    "M210,98 C268,98 306,146 306,204 C306,250 288,284 258,300 " +
    "C240,310 226,314 210,314 C194,314 180,310 162,300 " +
    "C132,284 114,250 114,204 C114,146 152,98 210,98 Z",
  highlight: { cx: 176, cy: 146, rx: 46, ry: 30 },
  socketsL: [
    [134, 264],
    [150, 292],
    [172, 298],
    [196, 304],
  ],
  midX: 210,
  armW: [27, 25, 23, 21],
  armScale: 1,
  face: {
    eyeL: 170,
    eyeR: 250,
    eyeY: 212,
    eyeRx: 29,
    eyeRy: 25,
    pupil: "slit",
    mouthY: 270,
    browY: 0,
  },
  spots: [
    [178, 140, 6],
    [214, 126, 4.5],
    [246, 146, 5.5],
    [196, 164, 3.5],
    [236, 172, 4],
    [262, 120, 3],
  ],
  blush: [
    [134, 246, 14, 9],
    [286, 246, 14, 9],
  ],
  siphon: "classic",
  chip: { shape: "circle", r: 11 },
  signature: "none",
  costume: { cap: "grad", specs: "round" },
  propKit: "math",
  defaultParts: { ...PARTS_ON },
};

/**
 * Lexa — tall lantern scholar. Narrow peaked mantle, almond reading eyes
 * with vertical ink-bar pupils, soft beret + wire glasses by default.
 */
export const BUILD_LEXA = {
  id: "lexa",
  mantle:
    "M210,78 C248,78 278,120 284,178 C288,230 274,272 246,296 " +
    "C230,308 218,314 210,316 C202,314 190,308 174,296 " +
    "C146,272 132,230 136,178 C142,120 172,78 210,78 Z",
  highlight: { cx: 188, cy: 132, rx: 34, ry: 38 },
  socketsL: [
    [148, 272],
    [162, 294],
    [178, 304],
    [196, 310],
  ],
  midX: 210,
  armW: [23, 21, 19, 17],
  armScale: 0.94,
  face: {
    eyeL: 176,
    eyeR: 244,
    eyeY: 198,
    eyeRx: 20,
    eyeRy: 28,
    pupil: "bar",
    mouthY: 256,
    browY: -10,
  },
  spots: [
    [170, 120, 3.5],
    [210, 108, 2.8],
    [248, 126, 3.2],
    [192, 152, 2.4],
  ],
  blush: [
    [150, 230, 12, 8],
    [270, 230, 12, 8],
  ],
  siphon: "quill",
  chip: { shape: "hex", r: 11 },
  signature: "lexa",
  costume: { cap: "beret", specs: "rect" },
  propKit: "lang",
  defaultParts: {
    ...PARTS_ON,
    specs: true,
    cap: true,
    siphon: true,
  },
};

/**
 * Coda — wide reef mushroom. Short broad mantle, oversized ring-pupil
 * eyes, soft coral crown bumps, longer flowing arms.
 */
export const BUILD_CODA = {
  id: "coda",
  mantle:
    "M210,128 C282,118 330,158 324,214 C320,256 294,288 254,304 " +
    "C234,314 220,318 210,318 C200,318 186,314 166,304 " +
    "C126,288 100,256 96,214 C90,158 138,118 210,128 Z",
  highlight: { cx: 168, cy: 170, rx: 56, ry: 28 },
  socketsL: [
    [120, 276],
    [142, 300],
    [168, 312],
    [194, 318],
  ],
  midX: 210,
  armW: [22, 20, 18, 16],
  armScale: 1.12,
  face: {
    eyeL: 158,
    eyeR: 262,
    eyeY: 216,
    eyeRx: 34,
    eyeRy: 32,
    pupil: "ring",
    mouthY: 278,
    browY: 6,
  },
  spots: [
    [148, 158, 8],
    [198, 142, 5.5],
    [252, 160, 9],
    [178, 186, 4.5],
    [228, 192, 6],
    [272, 176, 4],
    [136, 196, 3.5],
  ],
  blush: [
    [122, 254, 18, 11],
    [298, 254, 18, 11],
  ],
  siphon: "shell",
  chip: { shape: "diamond", r: 11 },
  signature: "coda",
  costume: { cap: "crown", specs: "round" },
  propKit: "music",
  defaultParts: {
    ...PARTS_ON,
    cap: true,
    specs: false,
  },
};

/**
 * Kelp — compact athletic pear. Broad base, short dome, thick arms,
 * fierce low-set eyes, soft coconut shell + sweatband.
 */
export const BUILD_KELP = {
  id: "kelp",
  mantle:
    "M210,126 C258,126 298,164 304,220 C308,268 286,302 252,322 " +
    "C234,332 220,336 210,336 C200,336 186,332 168,322 " +
    "C134,302 112,268 116,220 C122,164 162,126 210,126 Z",
  highlight: { cx: 176, cy: 172, rx: 40, ry: 26 },
  socketsL: [
    [130, 292],
    [150, 316],
    [174, 326],
    [196, 332],
  ],
  midX: 210,
  armW: [30, 28, 26, 24],
  armScale: 0.9,
  face: {
    eyeL: 168,
    eyeR: 252,
    eyeY: 228,
    eyeRx: 22,
    eyeRy: 18,
    pupil: "fierce",
    mouthY: 280,
    browY: 8,
  },
  spots: [
    [158, 168, 9],
    [210, 154, 6.5],
    [258, 170, 10],
    [188, 200, 5],
    [242, 204, 6],
  ],
  blush: [
    [138, 262, 11, 7],
    [282, 262, 11, 7],
  ],
  siphon: "jet",
  chip: { shape: "soft", r: 12 },
  signature: "kelp",
  costume: { cap: "band", specs: "sport" },
  propKit: "fit",
  defaultParts: {
    ...PARTS_ON,
    blush: false,
    cap: true,
    specs: false,
  },
};

/**
 * Nori — round dumpling cook. Near-circular mantle, oversized soft eyes
 * with sesame pupils, stubby arms, chef toque + apron.
 */
export const BUILD_NORI = {
  id: "nori",
  mantle:
    "M210,138 C274,138 322,186 322,246 C322,298 280,338 210,346 " +
    "C140,338 98,298 98,246 C98,186 146,138 210,138 Z",
  highlight: { cx: 176, cy: 186, rx: 50, ry: 36 },
  socketsL: [
    [128, 292],
    [150, 312],
    [174, 322],
    [196, 328],
  ],
  midX: 210,
  armW: [28, 26, 24, 22],
  armScale: 0.76,
  face: {
    eyeL: 168,
    eyeR: 252,
    eyeY: 224,
    eyeRx: 32,
    eyeRy: 30,
    pupil: "sesame",
    mouthY: 278,
    browY: 2,
  },
  spots: [
    [156, 176, 2.8],
    [190, 162, 2.2],
    [228, 168, 2.5],
    [262, 180, 3],
    [200, 196, 2],
    [242, 204, 2.2],
  ],
  blush: [
    [136, 258, 18, 12],
    [284, 258, 18, 12],
  ],
  siphon: "ladle",
  chip: { shape: "soft", r: 12 },
  signature: "nori",
  costume: { cap: "toque", specs: "round" },
  propKit: "cook",
  defaultParts: {
    ...PARTS_ON,
    cap: true,
    siphon: true,
  },
};

export const BUILDS = {
  numi: BUILD_NUMI,
  lexa: BUILD_LEXA,
  coda: BUILD_CODA,
  kelp: BUILD_KELP,
  nori: BUILD_NORI,
};
