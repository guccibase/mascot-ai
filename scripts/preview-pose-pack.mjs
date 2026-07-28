#!/usr/bin/env node
/**
 * Dev helper: render a committed pose pack to a contact-sheet HTML page so the
 * exported markup can be eyeballed without booting the app.
 *
 *   node scripts/preview-pose-pack.mjs numi > /tmp/pack.html
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: node scripts/preview-pose-pack.mjs <slug>");
  process.exit(1);
}

const pack = JSON.parse(
  readFileSync(join("src/lib/example-poses", `${slug}.json`), "utf8")
);

const STYLE_RE = /(<style[^>]*>)([\s\S]*?)(<\/style>)/;
const restore = (svg) =>
  svg.replace(STYLE_RE, (_m, open, _body, close) => `${open}${pack.css}${close}`);

const cells = pack.poses
  .map(
    (pose) => `<figure>
  <div class="art">${restore(pose.svg)}</div>
  <figcaption><b>${pose.label}</b><span>${pose.cat} · ${pose.key}</span></figcaption>
</figure>`
  )
  .join("\n");

process.stdout.write(`<!doctype html>
<meta charset="utf-8">
<title>${pack.slug} — ${pack.poses.length} poses</title>
<style>
  body{margin:0;padding:24px;background:${pack.meta?.stage ?? "#12131f"};
    color:#EDE7F6;font:14px/1.4 ui-sans-serif,system-ui,sans-serif}
  h1{font-size:18px;margin:0 0 18px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
  figure{margin:0;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);
    border-radius:14px;padding:8px}
  .art{background:rgba(0,0,0,.16);border-radius:10px}
  .art svg{width:100%;height:auto;display:block}
  figcaption{display:flex;flex-direction:column;gap:2px;padding:7px 4px 2px;font-size:12px}
  figcaption span{opacity:.6;font-size:11px}
</style>
<h1>${pack.slug} — ${pack.poses.length} poses</h1>
<div class="grid">
${cells}
</div>
`);
