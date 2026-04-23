export interface ErrorInfo {
  message: string;
  details?: string;
}

interface Props {
  error: ErrorInfo | string | null;
}

export function ErrorDisplay({ error }: Props) {
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  const details = typeof error === "string" ? undefined : error.details;

  return (
    <div className="error-preview">
      <h4 className="error-title">오류 발생</h4>
      <p className="error-message">{message}</p>
      {details && (
        <details className="error-details">
          <summary>상세 정보 보기</summary>
          <pre>{details}</pre>
        </details>
      )}
    </div>
  );
}
