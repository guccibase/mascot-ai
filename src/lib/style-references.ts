/**
 * Compact craft brief with curated Fanous/Lyra engineering excerpts.
 * Full sources are ~125KB and cause frontier models to truncate JSON;
 * these excerpts keep the craft bar without the token blowup.
 */
export function styleReferenceBlock() {
  return [
    "CRAFT STANDARD = Fanous + Lyra production SVG studios (do NOT copy their characters).",
    "",
    "Engineering checklist:",
    '· Root: <svg viewBox="0 0 420 520" class="ms-root" xmlns="http://www.w3.org/2000/svg">',
    '· Hit target: <g id="ms-hit"> with transparent rect covering the character',
    "· Contact shadow ellipse under feet; soft ms-glow-halo behind body",
    '· Eyes: <g class="ms-eyes" data-ms-part="eyes"> with pupils that can track (idle/listening)',
    '· Instrument: <g class="ms-signal-fan" data-ms-part="instrument"> with 7 to 9 fan/strip pieces',
    '· Motion: SMIL <animateTransform> bounce begin="ms-hit.click"; optional blink on eyes',
    "· Theme paints: use literal hex from the bible (top/mid/base/core/features)",
    '· Parts: wrap distinct elements in <g data-ms-part="key">',
    "· Whole-performance poses; elegant Bezier silhouette; compact paths",
    "· Transparent background; export-ready single SVG string",
    "· JSON safety: escape every \" and newline inside string values",
    "",
    "──── Curated Fanous craft excerpt (patterns only) ────",
    `<!-- structure -->
<svg class="ms-root" viewBox="0 0 420 520" xmlns="http://www.w3.org/2000/svg">
  <defs>/* soft gradients for body / glow */</defs>
  <ellipse class="ms-glow-halo" data-ms-part="halo" cx="210" cy="250" rx="120" ry="140" opacity=".35"/>
  <ellipse data-ms-part="shadow" cx="210" cy="470" rx="70" ry="14" fill="#000" opacity=".18"/>
  <g id="ms-hit"><rect x="60" y="40" width="300" height="420" fill="transparent"/></g>
  <g data-ms-part="body"><!-- Bezier silhouette --></g>
  <g class="ms-eyes" data-ms-part="eyes"><!-- pupils --></g>
  <g class="ms-signal-fan" data-ms-part="instrument"><!-- 7 to 9 signal blades --></g>
  <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0"
    dur="0.45s" begin="ms-hit.click" fill="freeze"/>
</svg>`,
    "",
    "──── Curated Lyra craft excerpt (patterns only) ────",
    `<!-- instrument + theme vars live in .ms-root style -->
.ms-root{--ms-top:#…;--ms-mid:#…;--ms-base:#…;--ms-core:#…;--ms-features:#…;--ms-signal-color:#…}
.ms-eyes{transition:transform .12s ease-out}
.ms-glow-halo{opacity:calc(.18 + var(--ms-glow) * .72)}
/* Delivery/Signal strip: 7 to 9 paths tinted by --ms-signal-color; whole-performance pose, not a sticker flip */`,
    "",
    "Match their engineering and illustration standards.",
    "Do NOT copy Fanous or Lyra's character. Copy their CRAFT.",
  ].join("\n");
}
