// Client-side image resizing + JPEG re-encoding. Keeps Vercel proxy
// body well under the 4.5MB limit for multi-image composition without
// visibly degrading results (gpt-image-2 accepts up to 3840px per edge).

interface Options {
  maxDim?: number;
  quality?: number;
  /** Skip compression entirely (e.g. mask images that need PNG alpha). */
  skip?: boolean;
}

const DEFAULT_MAX_DIM = 2048;
const DEFAULT_QUALITY = 0.85;
const SKIP_IF_UNDER_BYTES = 700 * 1024; // ~700KB — small images pass through

export async function compressImage(
  file: File,
  { maxDim = DEFAULT_MAX_DIM, quality = DEFAULT_QUALITY, skip }: Options = {},
): Promise<File> {
  if (skip) return file;
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const needsResize = longEdge > maxDim;

  // Already small + within size budget: no reason to re-encode.
  if (!needsResize && file.size <= SKIP_IF_UNDER_BYTES) {
    bitmap.close?.();
    return file;
  }

  const scale = needsResize ? maxDim / longEdge : 1;
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  // Prefer OffscreenCanvas when available; fall back to a DOM canvas.
  let blob: Blob | null = null;

  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
        blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
      }
    } catch {
      blob = null;
    }
  }

  if (!blob) {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, targetW, targetH);
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
  }

  bitmap.close?.();

  if (!blob) return file;
  // If the "compressed" result is somehow larger than the original, keep
  // the original.
  if (blob.size >= file.size && !needsResize) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}
