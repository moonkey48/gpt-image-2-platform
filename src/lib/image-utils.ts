import type { ImageFormat, ImageItem } from "./openai";

export function mime(format: ImageFormat): string {
  return `image/${format === "jpeg" ? "jpeg" : format}`;
}

export function extensionFor(format: ImageFormat): string {
  return format === "jpeg" ? "jpg" : format;
}

export function sourceFor(item: ImageItem, format: ImageFormat): string {
  return item.url
    ? item.url
    : `data:${mime(format)};base64,${item.b64_json ?? ""}`;
}

export function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadItem(
  item: ImageItem,
  format: ImageFormat,
  filename: string,
): void {
  triggerDownload(sourceFor(item, format), filename);
}

export function downloadAll(
  items: ImageItem[],
  format: ImageFormat,
  prefix: string,
): void {
  items.forEach((item, i) => {
    setTimeout(
      () => downloadItem(item, format, `${prefix}-${i + 1}.${extensionFor(format)}`),
      i * 120,
    );
  });
}

function base64ToFile(
  b64: string,
  format: ImageFormat,
  filename: string,
): File {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime(format) });
}

async function urlToFile(
  url: string,
  format: ImageFormat,
  filename: string,
): Promise<File> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || mime(format) });
}

export async function itemToFile(
  item: ImageItem,
  format: ImageFormat,
  filename: string,
): Promise<File | null> {
  if (item.b64_json) return base64ToFile(item.b64_json, format, filename);
  if (item.url) return urlToFile(item.url, format, filename);
  return null;
}
