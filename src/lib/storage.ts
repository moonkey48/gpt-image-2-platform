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

/**
 * Asks the server whether OPENAI_API_KEY is configured. The actual key is
 * never sent to the client.
 */
export async function fetchKeyStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/status", { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { configured?: boolean };
    return !!data.configured;
  } catch {
    return false;
  }
}
