interface Props {
  icon: string;
  text: string;
  steps?: string[];
}

export function EmptyPreview({ icon, text, steps }: Props) {
  return (
    <div className="main-preview">
      <div className="empty-preview">
        <div className="empty-preview-icon">{icon}</div>
        <p className="empty-preview-text">{text}</p>
        {steps && steps.length > 0 && (
          <div className="empty-preview-steps">
            {steps.map((step, i) => (
              <div key={i} className="empty-step">
                <span className="empty-step-number">{i + 1}</span>
                <span className="empty-step-text">{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
