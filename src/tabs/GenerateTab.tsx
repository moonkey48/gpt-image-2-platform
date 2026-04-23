import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { useKeyboardShortcut } from "../hooks/useKeyboardShortcut";
import {
  generateImageBatch,
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
  onSendToEdit: (file: File) => void;
}

export function GenerateTab({ params, onParamsChange, onSendToEdit }: Props) {
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState(
    "황혼녘 젖은 아스팔트 위에 놓인 보라색 종이 접기 백조, 시네마틱 조명의 감각적인 에디토리얼 사진",
  );
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageItem[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const cost = estimateCost(params.model, params.quality, count);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      addToast("프롬프트를 입력해주세요.", "warning");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: count });

    try {
      await generateImageBatch(
        {
          prompt: prompt.trim(),
          model: params.model,
          size: params.size,
          quality: params.quality,
          output_format: params.output_format,
          output_compression: params.output_compression,
          background: params.background,
        },
        count,
        (current, total, item) => {
          setProgress({ current, total });
          setResults((prev) => [...prev, item]);
        },
      );
      addToast("이미지 생성이 완료되었습니다.", "success", 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError({ message: e.message, details: e.stack });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, count, params, addToast]);

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

  const prefix = `generated-${Date.now()}`;
  const ext = extensionFor(params.output_format);

  const handleUseAsReference = async (item: ImageItem, index: number) => {
    const file = await itemToFile(
      item,
      params.output_format,
      `${prefix}-${index + 1}.${ext}`,
    );
    if (file) {
      onSendToEdit(file);
      addToast("편집 탭으로 참조 이미지를 전송했습니다.", "info", 2500);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              텍스트 프롬프트로 이미지를 생성합니다.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label htmlFor="gen-prompt" className="input-label">
                프롬프트
              </label>
              <textarea
                id="gen-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="생성하고 싶은 이미지를 설명해주세요…"
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
              disabled={isGenerating}
            />

            <button
              className="primary-button"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                `생성 중… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>이미지 생성하기</span>
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
                  다시 생성하기
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
                label="이미지 생성 중"
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
                labelPrefix="이미지"
                loadingLabel="생성 중…"
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
                icon="✨"
                text="텍스트로 AI 이미지를 생성합니다."
                steps={[
                  "서버에 OPENAI_API_KEY가 설정되어 있는지 확인하세요",
                  "프롬프트를 입력하고 이미지 개수를 선택하세요",
                  "⌘+Enter 또는 생성 버튼을 클릭하세요",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
