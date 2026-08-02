/**
 * Chromium smoke tests for animated raster export.
 * Run: npx tsx scripts/smoke-animated-export.mts
 *
 * Requires network once to fetch Playwright Chromium if missing.
 */
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

type CaseResult = { name: string; ok: boolean; detail: string };

function restoreSharedCss(svg: string, css: string): string {
  return svg.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/,
    (_full, open: string, _body: string, close: string) => `${open}${css}${close}`
  );
}

async function ensurePlaywright() {
  try {
    return await import("playwright");
  } catch {
    console.log("Installing playwright (one-time)…");
    const { execSync } = await import("node:child_process");
    execSync("npm install --no-save playwright@1.52.0", {
      cwd: root,
      stdio: "inherit",
    });
    execSync("npx playwright install chromium", { cwd: root, stdio: "inherit" });
    return await import("playwright");
  }
}

async function bundleHarness(outfile: string): Promise<void> {
  await esbuild.build({
    entryPoints: [join(root, "scripts/smoke-animated-export-harness.ts")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["chrome120"],
    outfile,
    absWorkingDir: root,
    alias: {
      "@": join(root, "src"),
    },
    logLevel: "silent",
  });
}

async function main(): Promise<void> {
  const poppy = JSON.parse(
    readFileSync(join(root, "src/lib/example-poses/poppy.json"), "utf8")
  ) as {
    css: string;
    poses: Array<{ key: string; svg: string }>;
  };

  const poseKeys = ["idle", "wave", "happy", "talking", "clapping", "empty"] as const;
  const poses: Record<string, string> = {};
  for (const key of poseKeys) {
    const pose = poppy.poses.find((p) => p.key === key);
    if (!pose) throw new Error(`Missing poppy pose: ${key}`);
    poses[key] = restoreSharedCss(pose.svg, poppy.css);
  }

  // Static control: strip SMIL + CSS animation rules.
  poses.static = poses.idle!
    .replace(/<animate[\s\S]*?<\/animate>/gi, "")
    .replace(/<animateTransform[\s\S]*?<\/animateTransform>/gi, "")
    .replace(/@keyframes[\s\S]*?\}\s*/g, "")
    .replace(
      /animation(?:-duration|-delay|-iteration-count|-timing-function|-direction|-fill-mode|-play-state|-name)?\s*:[^;{}]+;?/gi,
      ""
    );

  const dir = mkdtempSync(join(tmpdir(), "mascot-export-smoke-"));
  const harnessJs = join(dir, "harness.js");
  const htmlPath = join(dir, "index.html");

  try {
    await bundleHarness(harnessJs);
    writeFileSync(
      htmlPath,
      `<!doctype html><html><body><script>window.__POSES__=${JSON.stringify(
        poses
      )}</script><script src="./harness.js"></script></body></html>`
    );

    const { chromium } = await ensurePlaywright();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") console.error("[browser]", msg.text());
    });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.waitForFunction(() => (window as unknown as { __READY__?: boolean }).__READY__ === true, null, {
      timeout: 30_000,
    });

    const results = (await page.evaluate(async () => {
      const api = (
        window as unknown as {
          __SMOKE__: {
            runAll: () => Promise<CaseResult[]>;
            exportArtifacts: () => Promise<
              Array<{
                key: string;
                apngBase64: string;
                webpBase64: string | null;
                hasMotion: boolean;
                firstFrameOpaqueScore: number;
              }>
            >;
          };
        }
      ).__SMOKE__;
      return api.runAll();
    })) as CaseResult[];

    // Write real files + verify first-frame pixels with sharp (human-like open/inspect).
    const artifacts = await page.evaluate(async () => {
      return (
        window as unknown as {
          __SMOKE__: {
            exportArtifacts: () => Promise<
              Array<{
                key: string;
                apngBase64: string;
                webpBase64: string | null;
                hasMotion: boolean;
                firstFrameOpaqueScore: number;
              }>
            >;
          };
        }
      ).__SMOKE__.exportArtifacts();
    });

    await browser.close();

    const outDir = join(root, ".tmp-export-qa");
    rmSync(outDir, { recursive: true, force: true });
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(outDir, "apng"), { recursive: true });
    mkdirSync(join(outDir, "webp"), { recursive: true });

    const sharp = (await import("sharp")).default;
    console.log("\n=== File open / pixel verify (sharp) ===\n");
    for (const art of artifacts) {
      const apngPath = join(outDir, "apng", `${art.key}.png`);
      const apngBytes = Buffer.from(art.apngBase64, "base64");
      writeFileSync(apngPath, apngBytes);
      const { data, info } = await sharp(apngBytes, { animated: true, pages: 1 })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      let opaque = 0;
      for (let i = 3; i < data.length; i += 4) opaque += data[i]!;
      const blank = opaque < info.width * info.height * 0.002 * 255;
      const mark = blank ? "FAIL" : "PASS";
      if (blank) results.push({
        name: `file-open-apng-${art.key}`,
        ok: false,
        detail: `blank first frame opaque=${opaque}`,
      });
      else results.push({
        name: `file-open-apng-${art.key}`,
        ok: true,
        detail: `${info.width}x${info.height} opaque=${opaque} → ${apngPath}`,
      });
      console.log(`[${mark}] file-open-apng-${art.key}: ${info.width}x${info.height} opaque=${opaque}`);

      if (art.webpBase64) {
        const webpPath = join(outDir, "webp", `${art.key}.webp`);
        const webpBytes = Buffer.from(art.webpBase64, "base64");
        writeFileSync(webpPath, webpBytes);
        const webp = await sharp(webpBytes, { animated: true, pages: 1 })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        let wOpaque = 0;
        for (let i = 3; i < webp.data.length; i += 4) wOpaque += webp.data[i]!;
        const wBlank = wOpaque < webp.info.width * webp.info.height * 0.002 * 255;
        const wMark = wBlank ? "FAIL" : "PASS";
        results.push({
          name: `file-open-webp-${art.key}`,
          ok: !wBlank,
          detail: wBlank
            ? `blank first frame opaque=${wOpaque}`
            : `${webp.info.width}x${webp.info.height} opaque=${wOpaque} → ${webpPath}`,
        });
        console.log(`[${wMark}] file-open-webp-${art.key}: ${webp.info.width}x${webp.info.height} opaque=${wOpaque}`);
      }
    }

    let failed = 0;
    console.log("\n=== Animated export smoke results ===\n");
    for (const r of results) {
      const mark = r.ok ? "PASS" : "FAIL";
      if (!r.ok) failed += 1;
      console.log(`[${mark}] ${r.name}: ${r.detail}`);
    }
    console.log(
      `\n${results.length - failed}/${results.length} passed` +
        (failed ? ` (${failed} failed)` : "")
    );
    console.log(`\nArtifacts written to ${outDir}`);
    if (failed) process.exit(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
