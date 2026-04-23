import { useToast, type ToastKind } from "../../contexts/ToastContext";

const ICONS: Record<ToastKind, string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  error: "×",
};

export function Toast() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.kind}`}>
          <span className="toast-icon">{ICONS[t.kind]}</span>
          <span className="toast-message">{t.message}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => removeToast(t.id)}
            aria-label="알림 닫기"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
