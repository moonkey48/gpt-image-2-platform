const KEY_NAME = "gpt-image-test:openai-key";
const LAST_PARAMS = "gpt-image-test:last-params";

export function loadKey(): string {
  try {
    return localStorage.getItem(KEY_NAME) ?? "";
  } catch {
    return "";
  }
}

export function saveKey(key: string): void {
  try {
    if (key) localStorage.setItem(KEY_NAME, key);
    else localStorage.removeItem(KEY_NAME);
  } catch {
    // ignore
  }
}

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
