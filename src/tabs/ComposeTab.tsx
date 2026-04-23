import { useCallback, useEffect, useState } from "react";
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
import { MultiImageUpload } from "../components/MultiImageUpload";
import { ProgressBar } from "../components/shared/ProgressBar";
import { EmptyPreview } from "../components/shared/EmptyPreview";
import {
  ErrorDisplay,
  type ErrorInfo,
} from "../components/shared/ErrorDisplay";
import { ResultGallery } from "../components/shared/ResultGallery";

interface Props {
  apiKey: string;
  params: CommonParams;
  onParamsChange: (p: CommonParams) => void;
  externalRef: File | null;
  onConsumeExternalRef: () => void;
  onSendToEdit: (file: File) => void;
}

const composeRoleLabel = (index: number, total: number) => {
  if (total <= 1) return "주체";
  if (index === 0) return "주체";
  if (index === 1) return "배경";
  return `참조 ${index}`;
};

export function ComposeTab({
  apiKey,
  params,
  onParamsChange,
  externalRef,
  onConsumeExternalRef,
  onSendToEdit,
}: Props) {
  const { addToast } = useToast();
  const [images, setImages] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageItem[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    if (!externalRef) return;
    setImages((cur) =>
      cur.length >= 10 ? cur : [...cur, externalRef].slice(0, 10),
    );
    onConsumeExternalRef();
  }, [externalRef, onConsumeExternalRef]);

  const cost = estimateCost(params.model, params.quality, count);

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      addToast(".env.local에 VITE_OPENAI_API_KEY를 설정해주세요.", "error");
      return;
    }
    if (images.length < 2) {
      addToast("최소 2개 이상의 이미지를 업로드해주세요.", "warning");
      return;
    }
    if (!prompt.trim()) {
      addToast("합성 지시사항을 입력해주세요.", "warning");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: count });

    try {
      await editImageBatch(
        apiKey,
        {
          prompt: prompt.trim(),
          model: params.model,
          images,
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
      addToast("이미지 합성이 완료되었습니다.", "success", 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError({ message: e.message, details: e.stack });
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, images, prompt, count, params, addToast]);

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

  const prefix = `composed-${Date.now()}`;
  const ext = extensionFor(params.output_format);

  const handleUseAsReference = async (item: ImageItem, index: number) => {
    const file = await itemToFile(
      item,
      params.output_format,
      `${prefix}-${index + 1}.${ext}`,
    );
    if (file) {
      onSendToEdit(file);
      addToast("결과 이미지를 편집 탭으로 전송했습니다.", "info", 2500);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              여러 이미지를 조합해 하나의 합성 이미지를 만듭니다.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label className="input-label">
                참조 이미지 ({images.length}/10 · 첫 번째 = 주체)
              </label>
              <MultiImageUpload
                files={images}
                onChange={setImages}
                maxImages={10}
                disabled={isGenerating}
                roleLabel={composeRoleLabel}
              />
            </div>

            <div className="tips-panel">
              <span className="tips-panel-title">합성 팁</span>
              <ul>
                <li>순서가 중요합니다. 이미지 1은 주체, 이미지 2는 배경입니다.</li>
                <li>
                  프롬프트에 각 이미지의 역할을 명시하세요 (예: "이미지 1을 이미지 2의 배경에 합성").
                </li>
                <li>
                  <code>gpt-image-2</code>는 항상 높은 입력 충실도로 동작합니다.
                </li>
              </ul>
            </div>

            <div className="input-section">
              <label htmlFor="compose-prompt" className="input-label">
                합성 지시사항
              </label>
              <textarea
                id="compose-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="예: 이미지 1의 주체를 이미지 2의 배경에 자연스럽게 합성해주세요. 조명과 원근이 어울리도록."
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
              disabled={
                isGenerating || images.length < 2 || !prompt.trim()
              }
            >
              {isGenerating ? (
                `합성 중… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>이미지 합성하기</span>
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
                  다시 합성하기
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

        <div className="preview-panel">
          <div className="preview-content">
            {isGenerating && (
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="이미지 합성 중"
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
                labelPrefix="합성"
                loadingLabel="합성 중…"
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
                icon="🖼️"
                text="여러 이미지를 하나로 AI가 합성합니다."
                steps={[
                  "2~10개의 참조 이미지를 업로드하세요",
                  "어떻게 합성할지 설명해주세요",
                  "⌘+Enter 또는 합성 버튼을 클릭하세요",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
