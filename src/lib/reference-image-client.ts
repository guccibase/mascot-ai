export type ReferenceMediaType = "image/png" | "image/jpeg" | "image/webp";

export const REFERENCE_MAX_BYTES = 2_000_000;
export const REFERENCE_MAX_EDGE = 1568;

const ALLOWED = new Set<string>(["image/png", "image/jpeg", "image/webp"]);

export function isReferenceMediaType(value: string): value is ReferenceMediaType {
  return ALLOWED.has(value);
}

/** Validate referenceId shape before hitting Convex. */
export function isReferenceId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 10 && value.length <= 64;
}

/** Resize/compress a File for vision upload (browser only). */
export async function prepareReferenceFile(
  file: File
): Promise<{ blob: Blob; mediaType: ReferenceMediaType; width: number; height: number }> {
  if (!isReferenceMediaType(file.type)) {
    throw new Error("Use PNG, JPEG, or WebP");
  }
  if (file.size > REFERENCE_MAX_BYTES * 2) {
    throw new Error("Image is too large (max 2 MB after compression)");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, REFERENCE_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mediaType: ReferenceMediaType =
    file.type === "image/jpeg" ? "image/jpeg" : "image/png";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not compress image"))),
      mediaType,
      mediaType === "image/jpeg" ? 0.88 : undefined
    );
  });

  if (blob.size > REFERENCE_MAX_BYTES) {
    throw new Error("Image is still too large after compression (max 2 MB)");
  }

  return { blob, mediaType, width, height };
}
