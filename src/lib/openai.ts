export type ImageModel =
  | "gpt-image-2"
  | "gpt-image-1.5"
  | "gpt-image-1"
  | "gpt-image-1-mini";

export type ImageSize =
  | "auto"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "2048x2048";

export type ImageQuality = "auto" | "low" | "medium" | "high";
export type ImageFormat = "png" | "jpeg" | "webp";
export type ImageBackground = "auto" | "transparent" | "opaque";
export type Moderation = "auto" | "low";

export interface GenerateRequest {
  prompt: string;
  model: ImageModel;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  output_compression?: number;
  background?: ImageBackground;
  moderation?: Moderation;
}

export interface EditRequest {
  prompt: string;
  model: ImageModel;
  images: File[];
  mask?: File | null;
  n?: number;
  size?: ImageSize;
  quality?: ImageQuality;
  output_format?: ImageFormat;
  output_compression?: number;
  background?: ImageBackground;
  input_fidelity?: "low" | "high";
}

export interface ImageItem {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

export interface ImageResponse {
  created?: number;
  data: ImageItem[];
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
}

const BASE = "/api/openai/v1";

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey.trim()}` };
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const message =
      data?.error?.message || data?.message || JSON.stringify(data);
    return `${res.status} ${res.statusText}: ${message}`;
  } catch {
    const text = await res.text().catch(() => "");
    return `${res.status} ${res.statusText}: ${text || "알 수 없는 오류"}`;
  }
}

export async function generateImage(
  apiKey: string,
  req: GenerateRequest,
): Promise<ImageResponse> {
  const body: Record<string, unknown> = {
    model: req.model,
    prompt: req.prompt,
  };
  if (req.n) body.n = req.n;
  if (req.size && req.size !== "auto") body.size = req.size;
  if (req.quality && req.quality !== "auto") body.quality = req.quality;
  if (req.output_format) body.output_format = req.output_format;
  if (
    req.output_compression !== undefined &&
    (req.output_format === "jpeg" || req.output_format === "webp")
  ) {
    body.output_compression = req.output_compression;
  }
  if (req.background && req.background !== "auto") {
    body.background = req.background;
  }
  if (req.moderation) body.moderation = req.moderation;

  const res = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function editImage(
  apiKey: string,
  req: EditRequest,
): Promise<ImageResponse> {
  if (!req.images.length) {
    throw new Error("편집하려면 최소 1개 이상의 이미지가 필요합니다.");
  }

  const form = new FormData();
  form.append("model", req.model);
  form.append("prompt", req.prompt);

  if (req.images.length === 1) {
    form.append("image", req.images[0]);
  } else {
    for (const file of req.images) form.append("image[]", file);
  }
  if (req.mask) form.append("mask", req.mask);

  if (req.n) form.append("n", String(req.n));
  if (req.size && req.size !== "auto") form.append("size", req.size);
  if (req.quality && req.quality !== "auto") form.append("quality", req.quality);
  if (req.output_format) form.append("output_format", req.output_format);
  if (
    req.output_compression !== undefined &&
    (req.output_format === "jpeg" || req.output_format === "webp")
  ) {
    form.append("output_compression", String(req.output_compression));
  }
  if (req.background && req.background !== "auto") {
    form.append("background", req.background);
  }
  // gpt-image-2 locks input_fidelity to high and rejects the param.
  // Only send for gpt-image-1 / gpt-image-1.5.
  if (req.input_fidelity && supportsInputFidelity(req.model)) {
    form.append("input_fidelity", req.input_fidelity);
  }

  const res = await fetch(`${BASE}/images/edits`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: form,
  });

  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function supportsInputFidelity(model: ImageModel): boolean {
  return model === "gpt-image-1" || model === "gpt-image-1.5";
}

/**
 * Loops N times with n=1 per call so the UI can stream result cards in
 * (current/total) instead of waiting for a single large response. Mirrors
 * bcave's batch pattern.
 */
export async function generateImageBatch(
  apiKey: string,
  req: Omit<GenerateRequest, "n">,
  count: number,
  onProgress?: (current: number, total: number, item: ImageItem) => void,
  signal?: AbortSignal,
): Promise<ImageItem[]> {
  const results: ImageItem[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const res = await generateImage(apiKey, { ...req, n: 1 });
    const item = res.data?.[0];
    if (!item) throw new Error("API 응답이 비어있습니다.");
    results.push(item);
    onProgress?.(i + 1, count, item);
  }
  return results;
}

export async function editImageBatch(
  apiKey: string,
  req: Omit<EditRequest, "n">,
  count: number,
  onProgress?: (current: number, total: number, item: ImageItem) => void,
  signal?: AbortSignal,
): Promise<ImageItem[]> {
  const results: ImageItem[] = [];
  for (let i = 0; i < count; i++) {
    if (signal?.aborted) break;
    const res = await editImage(apiKey, { ...req, n: 1 });
    const item = res.data?.[0];
    if (!item) throw new Error("API 응답이 비어있습니다.");
    results.push(item);
    onProgress?.(i + 1, count, item);
  }
  return results;
}

const COST_TABLE: Partial<
  Record<ImageModel, Partial<Record<ImageQuality | "standard", number>>>
> = {
  "gpt-image-2": { low: 0.006, medium: 0.04, high: 0.211, auto: 0.04 },
  "gpt-image-1.5": { low: 0.005, medium: 0.03, high: 0.17, auto: 0.03 },
  "gpt-image-1": { low: 0.011, medium: 0.042, high: 0.167, auto: 0.042 },
  "gpt-image-1-mini": { low: 0.003, medium: 0.011, high: 0.04, auto: 0.011 },
};

export function estimateCost(
  model: ImageModel,
  quality: ImageQuality,
  n: number,
): number | null {
  const row = COST_TABLE[model];
  if (!row) return null;
  const per = row[quality];
  if (per === undefined) return null;
  return per * n;
}
