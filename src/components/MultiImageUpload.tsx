import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { compressImage } from "../lib/image-compress";

interface StoredImage {
  file: File;
  previewUrl: string;
  id: string;
}

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
  accept?: string;
  roleLabel?: (index: number, total: number) => string;
}

const DEFAULT_ACCEPT = "image/png,image/jpeg,image/webp";

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function MultiImageUpload({
  files,
  onChange,
  maxImages = 10,
  disabled,
  accept = DEFAULT_ACCEPT,
  roleLabel,
}: Props) {
  const { addToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Keep an internal cache that maps File → previewUrl so remounts don't flicker.
  const [stored, setStored] = useState<StoredImage[]>([]);

  // Sync when parent changes `files` externally.
  useEffect(() => {
    setStored((prev) => {
      const byFile = new Map(prev.map((s) => [s.file, s]));
      const next: StoredImage[] = files.map((f, i) => {
        const cached = byFile.get(f);
        if (cached) {
          byFile.delete(f);
          return cached;
        }
        return {
          file: f,
          previewUrl: URL.createObjectURL(f),
          id: `${f.name}-${f.size}-${Date.now()}-${i}`,
        };
      });
      // Revoke previews for removed files.
      byFile.forEach((s) => URL.revokeObjectURL(s.previewUrl));
      return next;
    });
  }, [files]);

  // On unmount, revoke all.
  useEffect(() => {
    return () => {
      setStored((cur) => {
        cur.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        return [];
      });
    };
  }, []);

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

  const addFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const incoming = Array.from(list).filter(validate);
    if (incoming.length === 0) return;

    const total = files.length + incoming.length;
    if (total > maxImages) {
      addToast(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`, "warning");
      return;
    }

    // Compress before adding to state so Vercel's 4.5MB multipart body
    // limit is never hit even with 10 references.
    try {
      const compressed = await Promise.all(
        incoming.map((f) => compressImage(f)),
      );
      onChange([...files, ...compressed]);
    } catch {
      onChange([...files, ...incoming]);
    }
  };

  const removeAt = (idx: number) => {
    const next = files.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const clearAll = () => onChange([]);

  const total = stored.length;
  const defaultRoleLabel = useMemo(
    () => (index: number, n: number) => {
      if (n === 1) return "이미지";
      if (index === 0) return "메인";
      return `참조 ${index}`;
    },
    [],
  );
  const label = roleLabel ?? defaultRoleLabel;

  return (
    <div className="multiple-image-upload-container">
      <input
        ref={inputRef}
        type="file"
        className="file-input"
        accept={accept}
        multiple
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {stored.length === 0 ? (
        <div
          className={`upload-area-multiple ${dragActive ? "drag-active" : ""}`}
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
            if (!disabled) addFiles(e.dataTransfer.files);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <div className="upload-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="56"
              height="56"
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
          <p className="upload-hint">
            PNG, JPG, WEBP (최대 {maxImages}개 · 각 10MB)
          </p>
        </div>
      ) : (
        <div className="preview-container-multiple">
          <div className="preview-header">
            <p className="preview-count">
              선택된 이미지: {stored.length}개
            </p>
            {!disabled && (
              <button
                type="button"
                className="remove-all-button"
                onClick={clearAll}
              >
                모두 제거
              </button>
            )}
          </div>

          <div className="preview-grid">
            {stored.map((img, i) => (
              <div key={img.id} className="preview-item">
                <div className="preview-image-wrapper">
                  <img
                    src={img.previewUrl}
                    alt={img.file.name}
                    className="preview-image-small"
                  />
                  <span className="preview-role-badge">{label(i, total)}</span>
                  {!disabled && (
                    <button
                      type="button"
                      className="remove-item-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAt(i);
                      }}
                      aria-label={`${img.file.name} 제거`}
                    >
                      ×
                    </button>
                  )}
                </div>
                <p className="preview-filename-small" title={img.file.name}>
                  {img.file.name}
                </p>
                <p className="preview-size-small">
                  {formatSize(img.file.size)}
                </p>
              </div>
            ))}

            {stored.length < maxImages && !disabled && (
              <div
                className="add-more-box"
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
              >
                <div className="add-more-icon">+</div>
                <p className="add-more-text">이미지 추가</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
