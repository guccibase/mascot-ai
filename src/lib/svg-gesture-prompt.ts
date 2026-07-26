/** Shared prompt for drawing a single production gesture SVG. */
export const SVG_GESTURE_INSTRUCTIONS = `You draw ONE production gesture SVG for an existing mascot studio.
Craft standard = Fanous + Lyra (production React SVG studios): elegant Bezier silhouette, SMIL bounce/blink, eyes group, instrument fan, whole-performance pose.
Return JSON only:
{"key":string,"label":string,"cat":string,"tip":string,"use":string,"track":boolean,"delight":boolean,"signal":number,"svg":string,"parts":[{"key","label","category","description"}]}
SVG rules:
- viewBox 0 0 420 520, class ms-root, xmlns set
- ms-hit transparent rect, contact shadow, ms-glow-halo, ms-eyes, ms-signal-fan (7-9 pieces)
- click bounce begin="ms-hit.click" near base pivot
- transparent bg; paint with provided theme hexes (top/mid/base/core/features) literally
- MUST match the locked character look/silhouette: same character
- Wrap EVERY distinct visual element in a group with data-ms-part="key" so users can toggle parts:
  body, eyes, brows, mouth, blush, limbs, instrument, halo, shadow, prop, crest, accessory, etc.
- parts[] lists every data-ms-part key with human labels
- Escape all quotes inside the svg string
- compact paths; JSON only`;
