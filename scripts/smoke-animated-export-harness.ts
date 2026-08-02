import {
  captureSvgAnimationFrames,
  encodeApng,
  encodeAnimatedWebp,
  encodeAnimatedPair,
  supportsWebpEncode,
} from "@/lib/export-animated";
import {
  opaquePixelScore,
} from "@/lib/export-animated/capture-frames";
import { detectAnimationLoopSec } from "@/lib/export-animated/detect-duration";

type CaseResult = { name: string; ok: boolean; detail: string };

type Artifact = {
  key: string;
  apngBase64: string;
  webpBase64: string | null;
  hasMotion: boolean;
  firstFrameOpaqueScore: number;
};

declare global {
  interface Window {
    __POSES__: Record<string, string>;
    __READY__: boolean;
    __SMOKE__: {
      runAll: () => Promise<CaseResult[]>;
      exportArtifacts: () => Promise<Artifact[]>;
    };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function pass(name: string, detail: string): CaseResult {
  return { name, ok: true, detail };
}
function fail(name: string, detail: string): CaseResult {
  return { name, ok: false, detail };
}

async function runAll(): Promise<CaseResult[]> {
  const poses = window.__POSES__;
  const out: CaseResult[] = [];
  const minOpaque = 420 * 520 * 0.002 * 255; // matches capture threshold scale

  // --- helpers ---
  out.push(
    (() => {
      const dur = detectAnimationLoopSec(poses.idle!);
      return dur >= 3 && dur <= 6
        ? pass("detect-duration-idle", `loop=${dur}s`)
        : fail("detect-duration-idle", `unexpected loop=${dur}s`);
    })()
  );

  // --- per-pose capture ---
  for (const key of ["idle", "wave", "happy", "talking", "clapping", "empty"] as const) {
    const markup = poses[key]!;
    try {
      const captured = await captureSvgAnimationFrames(markup, {
        scale: "1x",
        fps: 12,
      });
      const firstScore = opaquePixelScore(captured.frames[0]!);
      const anyBlank = captured.frames.some(
        (f) => opaquePixelScore(f) < minOpaque
      );

      if (firstScore < minOpaque) {
        out.push(
          fail(
            `capture-${key}-thumbnail`,
            `first-frame opaqueScore=${firstScore} (blank thumbnail)`
          )
        );
      } else {
        out.push(
          pass(
            `capture-${key}-thumbnail`,
            `first-frame opaqueScore=${Math.round(firstScore)} hasMotion=${captured.hasMotion}`
          )
        );
      }

      if (anyBlank) {
        out.push(fail(`capture-${key}-no-blank-frames`, "a frame was nearly empty"));
      } else {
        out.push(
          pass(
            `capture-${key}-no-blank-frames`,
            `${captured.frames.length} frames, all opaque`
          )
        );
      }

      // These poses should animate in the studio.
      if (key === "empty") {
        // Empty may be still or subtle; only require non-blank.
        out.push(
          pass(
            `capture-${key}-motion-policy`,
            `hasMotion=${captured.hasMotion} (still allowed)`
          )
        );
      } else if (!captured.hasMotion) {
        out.push(
          fail(
            `capture-${key}-has-motion`,
            "expected visible motion for this pose"
          )
        );
      } else {
        out.push(
          pass(
            `capture-${key}-has-motion`,
            `${captured.frames.length} frames`
          )
        );
      }

      const apng = encodeApng(captured);
      const pngSig = [137, 80, 78, 71, 13, 10, 26, 10];
      const sigOk = pngSig.every((b, i) => apng[i] === b);
      const hasActl = new TextDecoder("latin1").decode(apng).includes("acTL");
      out.push(
        sigOk && hasActl
          ? pass(`encode-${key}-apng`, `bytes=${apng.byteLength}`)
          : fail(`encode-${key}-apng`, `sigOk=${sigOk} acTL=${hasActl}`)
      );
    } catch (error) {
      out.push(
        fail(
          `capture-${key}`,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  // --- static pose → still, non-blank ---
  try {
    const captured = await captureSvgAnimationFrames(poses.static!, {
      scale: "1x",
      fps: 10,
      durationSec: 2,
    });
    const score = opaquePixelScore(captured.frames[0]!);
    if (captured.hasMotion) {
      out.push(fail("static-pose-still", "expected hasMotion=false"));
    } else if (score < minOpaque) {
      out.push(fail("static-pose-still", `blank still score=${score}`));
    } else {
      out.push(
        pass(
          "static-pose-still",
          `hasMotion=false frames=${captured.frames.length} opaque=${Math.round(score)}`
        )
      );
    }
  } catch (error) {
    out.push(
      fail(
        "static-pose-still",
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  // --- pack pair encode (6 poses, shared path as studio pack) ---
  try {
    let webpOk = await supportsWebpEncode();
    for (const key of ["idle", "wave", "happy", "talking", "clapping", "empty"] as const) {
      const pair = await encodeAnimatedPair(poses[key]!, {
        scale: "1x",
        fps: 10,
        includeWebp: webpOk,
      });
      if (pair.apng.byteLength < 32) {
        out.push(fail(`pack-pair-${key}`, "APNG too small"));
        continue;
      }
      if (webpOk && (!pair.webp || pair.webp.byteLength < 32)) {
        out.push(fail(`pack-pair-${key}`, "WebP missing/too small"));
        continue;
      }
      // Spot-check: decode first APNG isn't required; check opaque via re-capture already done.
      out.push(
        pass(
          `pack-pair-${key}`,
          `apng=${pair.apng.byteLength} webp=${pair.webp?.byteLength ?? 0} motion=${pair.hasMotion}`
        )
      );
    }
  } catch (error) {
    out.push(
      fail(
        "pack-pair",
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  // --- webp mux path ---
  try {
    if (await supportsWebpEncode()) {
      const captured = await captureSvgAnimationFrames(poses.idle!, {
        scale: "1x",
        fps: 8,
        durationSec: 2,
      });
      const webp = await encodeAnimatedWebp(captured, 0.85);
      const head = String.fromCharCode(...webp.slice(0, 12));
      out.push(
        head.startsWith("RIFF") && head.includes("WEBP")
          ? pass("encode-idle-webp", `bytes=${webp.byteLength}`)
          : fail("encode-idle-webp", `bad header ${JSON.stringify(head)}`)
      );
    } else {
      out.push(pass("encode-idle-webp", "skipped (browser cannot encode WebP)"));
    }
  } catch (error) {
    out.push(
      fail(
        "encode-idle-webp",
        error instanceof Error ? error.message : String(error)
      )
    );
  }

  return out;
}

async function exportArtifacts(): Promise<Artifact[]> {
  const poses = window.__POSES__;
  const webpOk = await supportsWebpEncode();
  const artifacts: Artifact[] = [];
  for (const key of ["idle", "wave", "happy", "talking", "clapping", "empty"] as const) {
    const captured = await captureSvgAnimationFrames(poses[key]!, {
      scale: "1x",
      fps: 10,
    });
    const apng = encodeApng(captured);
    const webp = webpOk ? await encodeAnimatedWebp(captured, 0.9) : null;
    artifacts.push({
      key,
      apngBase64: bytesToBase64(apng),
      webpBase64: webp ? bytesToBase64(webp) : null,
      hasMotion: captured.hasMotion,
      firstFrameOpaqueScore: opaquePixelScore(captured.frames[0]!),
    });
  }
  return artifacts;
}

window.__SMOKE__ = { runAll, exportArtifacts };
window.__READY__ = true;
