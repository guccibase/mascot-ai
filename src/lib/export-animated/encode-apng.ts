import UPNG from "upng-js";
import type { CapturedFrames } from "./types";

/** Encode captured RGBA frames as an animated PNG (APNG). */
export function encodeApng(captured: CapturedFrames): Uint8Array {
  if (captured.frames.length === 0) {
    throw new Error("No frames to encode as APNG");
  }
  const encoded = UPNG.encode(
    captured.frames,
    captured.width,
    captured.height,
    0,
    captured.delaysMs
  );
  return new Uint8Array(encoded);
}
