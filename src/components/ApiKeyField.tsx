import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function ApiKeyField({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const [visible, setVisible] = useState(false);

  const saved = draft === value && value.length > 0;

  return (
    <div className="sidebar-api-key">
      <span className="sidebar-api-key-label">OpenAI API key</span>
      <div className="sidebar-api-key-row">
        <input
          type={visible ? "text" : "password"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="sk-..."
          className="sidebar-api-key-input"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="sidebar-api-key-button"
          onClick={() => setVisible((v) => !v)}
          title={visible ? "Hide key" : "Show key"}
        >
          {visible ? "○" : "●"}
        </button>
        <button
          type="button"
          className="sidebar-api-key-button"
          onClick={() => onChange(draft)}
          disabled={saved}
        >
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      <p className="sidebar-api-key-hint">
        Stored in your browser. Proxied to api.openai.com.
      </p>
    </div>
  );
}
