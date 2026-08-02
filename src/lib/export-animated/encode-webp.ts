import type { CapturedFrames } from "./types";

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Animated export aborted", "AbortError");
  }
}

function writeUint24LEInto(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >> 8) & 0xff;
  target[offset + 2] = (value >> 16) & 0xff;
}

function fourCC(tag: string): number {
  return (
    tag.charCodeAt(0) |
    (tag.charCodeAt(1) << 8) |
    (tag.charCodeAt(2) << 16) |
    (tag.charCodeAt(3) << 24)
  ) >>> 0;
}

function readFourCC(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!
  );
}

function readU32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset]! |
    (bytes[offset + 1]! << 8) |
    (bytes[offset + 2]! << 16) |
    (bytes[offset + 3]! << 24)
  ) >>> 0;
}

function extractWebpBitstream(webp: Uint8Array): {
  bitstream: Uint8Array;
  hasAlpha: boolean;
} {
  if (
    webp.byteLength < 12 ||
    readFourCC(webp, 0) !== "RIFF" ||
    readFourCC(webp, 8) !== "WEBP"
  ) {
    throw new Error("Invalid WebP frame");
  }

  let offset = 12;
  let hasAlpha = false;
  const parts: Uint8Array[] = [];

  while (offset + 8 <= webp.byteLength) {
    const tag = readFourCC(webp, offset);
    const size = readU32LE(webp, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > webp.byteLength) break;
    const end = Math.min(webp.byteLength, dataEnd + (size & 1));

    if (tag === "VP8X") {
      hasAlpha = (webp[dataStart]! & 0x10) !== 0;
    } else if (tag === "VP8 " || tag === "VP8L" || tag === "ALPH") {
      if (tag === "ALPH" || tag === "VP8L") hasAlpha = true;
      const paddedLength = 8 + size + (size & 1);
      const chunk = new Uint8Array(paddedLength);
      chunk.set(webp.subarray(offset, end));
      parts.push(chunk);
    }

    offset = Math.min(webp.byteLength, dataEnd + (size & 1));
  }

  if (parts.length === 0) {
    throw new Error("WebP frame missing VP8/VP8L bitstream");
  }

  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const bitstream = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    bitstream.set(part, at);
    at += part.byteLength;
  }
  return { bitstream, hasAlpha };
}

function muxAnimatedWebp(args: {
  width: number;
  height: number;
  frames: Array<{ bitstream: Uint8Array; durationMs: number }>;
  loopCount?: number;
  hasAlpha?: boolean;
}): Uint8Array {
  const { width, height, frames } = args;
  if (frames.length === 0) throw new Error("No WebP frames to mux");
  if (width < 1 || height < 1) throw new Error("Invalid WebP canvas size");

  const loopCount = args.loopCount ?? 0;
  const hasAlpha = Boolean(args.hasAlpha);
  const vp8xFlags = 0x02 | (hasAlpha ? 0x10 : 0);

  const vp8x = new Uint8Array(18);
  const vp8xView = new DataView(vp8x.buffer);
  vp8xView.setUint32(0, fourCC("VP8X"), true);
  vp8xView.setUint32(4, 10, true);
  vp8x[8] = vp8xFlags;
  writeUint24LEInto(vp8x, 12, width - 1);
  writeUint24LEInto(vp8x, 15, height - 1);

  const anim = new Uint8Array(14);
  const animView = new DataView(anim.buffer);
  animView.setUint32(0, fourCC("ANIM"), true);
  animView.setUint32(4, 6, true);
  animView.setUint32(8, 0, true);
  animView.setUint16(12, loopCount, true);

  const anmfChunks: Uint8Array[] = [];
  for (const frame of frames) {
    const duration = Math.max(1, Math.min(0xffffff, Math.round(frame.durationMs)));
    const payloadSize = 16 + frame.bitstream.byteLength;
    const padded = payloadSize + (payloadSize & 1);
    const chunk = new Uint8Array(8 + padded);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, fourCC("ANMF"), true);
    view.setUint32(4, payloadSize, true);
    writeUint24LEInto(chunk, 8, 0);
    writeUint24LEInto(chunk, 11, 0);
    writeUint24LEInto(chunk, 14, width - 1);
    writeUint24LEInto(chunk, 17, height - 1);
    writeUint24LEInto(chunk, 20, duration);
    chunk[23] = 0x02;
    chunk.set(frame.bitstream, 24);
    anmfChunks.push(chunk);
  }

  const contentSize =
    4 +
    vp8x.byteLength +
    anim.byteLength +
    anmfChunks.reduce((n, c) => n + c.byteLength, 0);

  const out = new Uint8Array(8 + contentSize);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, fourCC("RIFF"), true);
  outView.setUint32(4, contentSize, true);
  outView.setUint32(8, fourCC("WEBP"), true);

  let at = 12;
  out.set(vp8x, at);
  at += vp8x.byteLength;
  out.set(anim, at);
  at += anim.byteLength;
  for (const chunk of anmfChunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}

let webpEncodeSupport: boolean | null = null;

export async function supportsWebpEncode(): Promise<boolean> {
  if (webpEncodeSupport != null) return webpEncodeSupport;
  if (typeof document === "undefined") {
    webpEncodeSupport = false;
    return false;
  }
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  webpEncodeSupport = await new Promise<boolean>((resolve) => {
    try {
      canvas.toBlob(
        (blob) => resolve(Boolean(blob && blob.type === "image/webp")),
        "image/webp",
        0.8
      );
    } catch {
      resolve(false);
    }
  });
  return webpEncodeSupport;
}

/** Encode captured RGBA frames as animated WebP. */
export async function encodeAnimatedWebp(
  captured: CapturedFrames,
  quality = 0.9,
  signal?: AbortSignal
): Promise<Uint8Array> {
  if (captured.frames.length === 0) {
    throw new Error("No frames to encode as animated WebP");
  }
  if (!(await supportsWebpEncode())) {
    throw new Error("This browser cannot encode WebP images");
  }

  const canvas = document.createElement("canvas");
  canvas.width = captured.width;
  canvas.height = captured.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D unavailable for WebP encode");

  const encodedFrames: Array<{ bitstream: Uint8Array; durationMs: number }> =
    [];
  let hasAlpha = false;

  for (let i = 0; i < captured.frames.length; i++) {
    assertNotAborted(signal);
    const rgba = captured.frames[i]!;
    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(rgba),
        captured.width,
        captured.height
      ),
      0,
      0
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value && value.type === "image/webp") resolve(value);
          else reject(new Error("Browser refused image/webp encoding"));
        },
        "image/webp",
        quality
      );
    });
    const webp = new Uint8Array(await blob.arrayBuffer());
    const extracted = extractWebpBitstream(webp);
    hasAlpha = hasAlpha || extracted.hasAlpha;
    encodedFrames.push({
      bitstream: extracted.bitstream,
      durationMs: captured.delaysMs[i] ?? 67,
    });
  }

  return muxAnimatedWebp({
    width: captured.width,
    height: captured.height,
    frames: encodedFrames,
    loopCount: 0,
    hasAlpha,
  });
}

/** @internal Test-only exports for mux layout verification. */
export const __testing = {
  extractWebpBitstream,
  muxAnimatedWebp,
};
