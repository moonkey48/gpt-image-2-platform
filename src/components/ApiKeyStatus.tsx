export type KeyStatus = "loading" | "ok" | "missing";

interface Props {
  status: KeyStatus;
}

export function ApiKeyStatus({ status }: Props) {
  const label =
    status === "loading"
      ? "상태 확인 중…"
      : status === "ok"
        ? "서버에 API 키가 설정되어 있습니다"
        : "서버에 API 키가 설정되지 않았습니다";

  const dot = status === "loading" ? "●" : status === "ok" ? "●" : "⚠";

  return (
    <div className={`sidebar-api-key sidebar-api-key--${status}`}>
      <span className="sidebar-api-key-label">OpenAI API 키</span>
      <div className={`sidebar-api-key-status is-${status}`}>
        <span className="sidebar-api-key-dot" aria-hidden>
          {dot}
        </span>
        <span>{label}</span>
      </div>
      <p className="sidebar-api-key-hint">
        키는 서버에만 보관됩니다.
        로컬 <code>.env.local</code> 또는 Vercel 환경 변수 <code>OPENAI_API_KEY</code>.
      </p>
    </div>
  );
}
