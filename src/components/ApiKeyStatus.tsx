interface Props {
  present: boolean;
}

export function ApiKeyStatus({ present }: Props) {
  return (
    <div className="sidebar-api-key">
      <span className="sidebar-api-key-label">OpenAI API 키</span>
      <div
        className={`sidebar-api-key-status ${present ? "is-ok" : "is-missing"}`}
      >
        <span className="sidebar-api-key-dot" aria-hidden>
          {present ? "●" : "⚠"}
        </span>
        <span>
          {present ? ".env에서 불러옴" : ".env.local 파일이 필요합니다"}
        </span>
      </div>
      <p className="sidebar-api-key-hint">
        프로젝트 루트의 <code>.env.local</code>에{" "}
        <code>VITE_OPENAI_API_KEY</code>를 설정한 뒤 개발 서버를 다시 시작하세요.
      </p>
    </div>
  );
}
