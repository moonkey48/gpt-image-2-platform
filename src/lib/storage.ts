const LAST_PARAMS = "gpt-image-studio:last-params";

export function loadParams<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(LAST_PARAMS);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function saveParams<T>(params: T): void {
  try {
    localStorage.setItem(LAST_PARAMS, JSON.stringify(params));
  } catch {
    // ignore
  }
}

export function getApiKeyFromEnv(): string {
  const raw = import.meta.env.VITE_OPENAI_API_KEY;
  return typeof raw === "string" ? raw.trim() : "";
}
