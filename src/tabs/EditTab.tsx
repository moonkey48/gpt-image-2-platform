import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import {
  editImageBatch,
  estimateCost,
  type ImageItem,
} from "../lib/openai";
import {
  downloadAll,
  downloadItem,
  extensionFor,
  itemToFile,
} from "../lib/image-utils";
import { AdvancedOptions, type CommonParams } from "../components/AdvancedOptions";
import { CountSlider } from "../components/CountSlider";
import { ImageUpload } from "../components/ImageUpload";
import { ProgressBar } from "../components/shared/ProgressBar";
import { EmptyPreview } from "../components/shared/EmptyPreview";
import {
  ErrorDisplay,
  type ErrorInfo,
} from "../components/shared/ErrorDisplay";
import { ResultGallery } from "../components/shared/ResultGallery";

interface Props {
  params: CommonParams;
  onParamsChange: (p: CommonParams) => void;
  externalRef: File | null;
  onConsumeExternalRef: () => void;
  onSendToEdit: (file: File) => void;
}

export function EditTab({
  params,
  onParamsChange,
  externalRef,
  onConsumeExternalRef,
  onSendToEdit,
}: Props) {
  const { addToast } = useToast();
  const [image, setImage] = useState<File | null>(null);
  const [mask, setMask] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageItem[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGenerating && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!externalRef) return;
    setImage(externalRef);
    onConsumeExternalRef();
    addToast("참조 이미지를 불러왔습니다.", "info", 2000);
  }, [externalRef, onConsumeExternalRef, addToast]);

  const cost = estimateCost(params.model, params.quality, count);

  const handleGenerate = useCallback(async () => {
    if (!image) {
      addToast("편집할 이미지를 업로드해주세요.", "warning");
      return;
    }
    if (!prompt.trim()) {
      addToast("편집 지시사항을 입력해주세요.", "warning");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: count });

    try {
      await editImageBatch(
        {
          prompt: prompt.trim(),
          model: params.model,
          images: [image],
          mask,
          size: params.size,
          quality: params.quality,
          output_format: params.output_format,
          output_compression: params.output_compression,
          background: params.background,
          input_fidelity: params.input_fidelity,
        },
        count,
        (current, total, item) => {
          setProgress({ current, total });
          setResults((prev) => [...prev, item]);
        },
      );
      addToast("편집이 완료되었습니다.", "success", 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError({ message: e.message, details: e.stack });
    } finally {
      setIsGenerating(false);
    }
  }, [image, mask, prompt, count, params, addToast]);

  useKeyboardShortcut("Enter", handleGenerate, {
    metaKey: true,
    ctrlKey: true,
    enabled: !isGenerating,
  });

  const handleReset = () => {
    setResults([]);
    setError(null);
    setProgress({ current: 0, total: 0 });
  };

  const prefix = `edited-${Date.now()}`;
  const ext = extensionFor(params.output_format);

  const handleUseAsReference = async (item: ImageItem, index: number) => {
    const file = await itemToFile(
      item,
      params.output_format,
      `${prefix}-${index + 1}.${ext}`,
    );
    if (file) {
      setImage(file);
      onSendToEdit(file);
      addToast("결과 이미지를 새 입력으로 설정했습니다.", "info", 2000);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              이미지를 업로드하고 원하는 편집 내용을 입력하세요.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label className="input-label">이미지</label>
              <ImageUpload
                file={image}
                onSelect={setImage}
                disabled={isGenerating}
              />
            </div>

            <div className="input-section">
              <label className="input-label">마스크 (선택, PNG)</label>
              <ImageUpload
                file={mask}
                onSelect={setMask}
                accept="image/png"
                hint="투명 영역 = 교체할 영역"
                disabled={isGenerating}
                compress={false}
              />
            </div>

            <div className="input-section">
              <label htmlFor="edit-prompt" className="input-label">
                편집 지시사항
              </label>
              <textarea
                id="edit-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 배경을 햇살 가득한 숲속 공터로 바꿔주고, 주체는 그대로 유지해주세요."
                rows={6}
                disabled={isGenerating}
                style={{ minHeight: "140px" }}
              />
            </div>

            <div className="input-section">
              <label className="input-label">
                생성할 이미지 개수: {count}개
              </label>
              <CountSlider
                value={count}
                onChange={setCount}
                min={1}
                max={4}
                disabled={isGenerating}
              />
            </div>

            <AdvancedOptions
              params={params}
              onChange={onParamsChange}
              showInputFidelity
              disabled={isGenerating}
            />

            <button
              className="primary-button"
              onClick={handleGenerate}
              disabled={isGenerating || !image || !prompt.trim()}
            >
              {isGenerating ? (
                `편집 중… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>이미지 편집하기</span>
                  <span className="shortcut-hint">
                    <kbd>⌘</kbd>
                    <kbd>↵</kbd>
                  </span>
                </>
              )}
            </button>

            {cost !== null && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--color-text-dim)",
                  textAlign: "center",
                }}
              >
                예상 비용 약 ${cost.toFixed(3)} ({params.quality} · {count}개)
              </p>
            )}

            {results.length > 0 && !isGenerating && (
              <>
                <button className="secondary-button" onClick={handleReset}>
                  다시 편집하기
                </button>
                <button
                  className="download-all-button"
                  onClick={() =>
                    downloadAll(results, params.output_format, prefix)
                  }
                >
                  ⬇ 전체 다운로드 ({results.length}개)
                </button>
              </>
            )}
          </div>
        </div>

        <div className="preview-panel" ref={previewRef}>
          <div className="preview-content">
            {isGenerating && (
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="이미지 편집 중"
              />
            )}
            {error && !isGenerating && <ErrorDisplay error={error} />}

            {(results.length > 0 || isGenerating) && (
              <ResultGallery
                results={results}
                format={params.output_format}
                loadingCount={
                  isGenerating ? Math.max(0, count - results.length) : 0
                }
                labelPrefix="편집"
                loadingLabel="편집 중…"
                onDownload={(item, i) =>
                  downloadItem(
                    item,
                    params.output_format,
                    `${prefix}-${i + 1}.${ext}`,
                  )
                }
                onUseAsReference={handleUseAsReference}
              />
            )}

            {!isGenerating && results.length === 0 && !error && (
              <EmptyPreview
                icon="🎨"
                text="AI 프롬프트로 이미지를 편집합니다."
                steps={[
                  "이미지를 업로드하세요 (선택 사항: PNG 마스크)",
                  "원하는 편집 내용을 입력하세요",
                  "⌘+Enter 또는 편집 버튼을 클릭하세요",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
