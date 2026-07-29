/** Shared prompt for drawing a single production gesture SVG. */
export const SVG_GESTURE_INSTRUCTIONS = `You draw ONE production gesture SVG for an existing mascot studio.
Craft standard = Fanous + Lyra (production React SVG studios): elegant Bezier silhouette, secondary volume, blush, eye highlights, contact shadow, SMIL bounce/blink, eyes group, instrument fan, whole-performance pose — not a sticker or emoji blob.
Return JSON only:
{"key":string,"label":string,"cat":string,"tip":string,"use":string,"track":boolean,"delight":boolean,"signal":number,"svg":string,"parts":[{"key","label","category","description"}]}
SVG rules:
- viewBox 0 0 420 520, class ms-root, xmlns set
- ms-hit transparent rect, contact shadow, ms-glow-halo, ms-eyes, ms-signal-fan (7-9 pieces)
- click bounce begin="ms-hit.click" near base pivot; SMIL breathe/blink on body/eyes
- transparent bg; paint with provided theme hexes (top/mid/base/core/features) literally
- MUST match the locked character look/silhouette: same character
- Whole-performance pose: posture + face + instrument energy + one clarifying prop
- Wrap EVERY distinct visual element in a group with data-ms-part="key" so users can toggle parts:
  body, eyes, brows, mouth, blush, limbs, instrument, halo, shadow, prop, crest, accessory, etc.
- parts[] lists every data-ms-part key with human labels
- signal is 0–100 (idle/rest ~60–75; sleepy/sad may be lower; celebrate/wave higher)
- Escape all quotes inside the svg string
- Prefer rich production paths over sparse stick figures; no unused defs; JSON only`;
