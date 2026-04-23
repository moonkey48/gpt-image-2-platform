import { useEffect } from "react";

interface Options {
  metaKey?: boolean;
  ctrlKey?: boolean;
  enabled?: boolean;
}

export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  { metaKey = false, ctrlKey = false, enabled = true }: Options = {},
): void {
  useEffect(() => {
    if (!enabled) return;

    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== key) return;
      // Accept either Cmd (Mac) or Ctrl (others) when either metaKey or ctrlKey
      // was requested, to match user expectations across platforms.
      const needsModifier = metaKey || ctrlKey;
      if (needsModifier) {
        const pressed = isMac ? e.metaKey : e.ctrlKey;
        if (!pressed) return;
      }
      e.preventDefault();
      handler();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler, metaKey, ctrlKey, enabled]);
}
