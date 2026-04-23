import { useRef, useState } from "react";
import { useToast } from "../contexts/ToastContext";

interface Props {
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
  accept?: string;
  hint?: string;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUpload({
  file,
  onSelect,
  disabled,
  accept = DEFAULT_ACCEPT,
  hint = "PNG, JPG, WEBP (최대 10MB)",
}: Props) {
  const { addToast } = useToast();
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validate = (f: File): boolean => {
    const allowed = accept.split(",").map((s) => s.trim());
    if (!allowed.includes(f.type)) {
      addToast(`${f.name}은(는) 지원하지 않는 형식입니다.`, "warning");
      return false;
    }
    if (f.size > 10 * 1024 * 1024) {
      addToast(`${f.name}이(가) 10MB 제한을 초과합니다.`, "warning");
      return false;
    }
    return true;
  };

  const pick = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!validate(f)) return;
    onSelect(f);
  };

  if (!file) {
    return (
      <div
        className={`upload-area ${dragActive ? "drag-active" : ""}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!disabled) pick(e.dataTransfer.files);
        }}
        role="button"
        tabIndex={0}
      >
        <div className="upload-icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className="upload-text">
          <span className="upload-text-bold">클릭하여 이미지 업로드</span> 또는
          드래그 앤 드롭
        </p>
        <p className="upload-hint">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          className="file-input"
          accept={accept}
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="uploaded-preview">
      <img
        src={URL.createObjectURL(file)}
        alt={file.name}
        className="uploaded-image"
        onLoad={(e) =>
          setTimeout(
            () => URL.revokeObjectURL((e.target as HTMLImageElement).src),
            0,
          )
        }
      />
      {!disabled && (
        <button
          type="button"
          className="remove-image-button"
          onClick={() => onSelect(null)}
        >
          제거
        </button>
      )}
      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          left: "0.5rem",
          padding: "0.2rem 0.6rem",
          background: "rgba(25, 31, 40, 0.7)",
          color: "#fff",
          fontSize: "0.7rem",
          borderRadius: "6px",
          fontWeight: 500,
        }}
      >
        {file.name} · {formatSize(file.size)}
      </div>
    </div>
  );
}
