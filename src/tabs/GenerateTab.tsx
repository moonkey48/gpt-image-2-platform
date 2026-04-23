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
  apiKey: string;
  params: CommonParams;
  onParamsChange: (p: CommonParams) => void;
  onSendToEdit: (file: File) => void;
}

export function GenerateTab({
  apiKey,
  params,
  onParamsChange,
  onSendToEdit,
}: Props) {
  const { addToast } = useToast();
  const [prompt, setPrompt] = useState(
    "A moody editorial photograph of a purple origami swan on wet asphalt at dusk, cinematic lighting",
  );
  const [count, setCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<ImageItem[]>([]);
  const [error, setError] = useState<ErrorInfo | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const cost = estimateCost(params.model, params.quality, count);

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      addToast("Enter your OpenAI API key first.", "error");
      return;
    }
    if (!prompt.trim()) {
      addToast("Please enter a prompt.", "warning");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResults([]);
    setProgress({ current: 0, total: count });

    try {
      await generateImageBatch(
        apiKey,
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
      addToast("Generation complete.", "success", 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError({ message: e.message, details: e.stack });
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, prompt, count, params, addToast]);

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
      addToast("Sent to Edit tab as reference.", "info", 2500);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              Generate an image from a text prompt.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label htmlFor="gen-prompt" className="input-label">
                Prompt
              </label>
              <textarea
                id="gen-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate…"
                rows={6}
                disabled={isGenerating}
                style={{ minHeight: "140px" }}
              />
            </div>

            <div className="input-section">
              <label className="input-label">
                Number of images: {count}
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
                `Generating… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>Generate</span>
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
                est. ~${cost.toFixed(3)} ({params.quality} · {count})
              </p>
            )}

            {results.length > 0 && !isGenerating && (
              <>
                <button className="secondary-button" onClick={handleReset}>
                  Generate again
                </button>
                <button
                  className="download-all-button"
                  onClick={() =>
                    downloadAll(results, params.output_format, prefix)
                  }
                >
                  ⬇ Download all ({results.length})
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
                label="Generating images"
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
                labelPrefix="Image"
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
                text="Generate images from a text prompt."
                steps={[
                  "Enter your OpenAI API key in the sidebar",
                  "Write a prompt and pick the number of images",
                  "Press ⌘+Enter or click Generate",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
