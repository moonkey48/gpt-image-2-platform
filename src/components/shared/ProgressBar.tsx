interface Props {
  current: number;
  total: number;
  label?: string;
}

export function ProgressBar({ current, total, label = "생성 중" }: Props) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  return (
    <div className="generation-progress">
      <p className="progress-text">
        {label}… ({current}/{total})
      </p>
      <div className="progress-bar-container">
        <div
          className="progress-bar-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
