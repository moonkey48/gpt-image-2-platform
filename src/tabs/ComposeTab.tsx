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
  if (total <= 1) return "subject";
  if (index === 0) return "subject";
  if (index === 1) return "scene";
  return `ref ${index}`;
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
      addToast("Enter your OpenAI API key first.", "error");
      return;
    }
    if (images.length < 2) {
      addToast("Upload at least 2 images to compose.", "warning");
      return;
    }
    if (!prompt.trim()) {
      addToast("Please enter a composition prompt.", "warning");
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
      addToast("Composition complete.", "success", 2500);
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
      addToast("Result sent to Edit tab.", "info", 2500);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              Combine multiple reference images into one composition.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label className="input-label">
                Reference images ({images.length}/10 · first = subject)
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
              <span className="tips-panel-title">Composition tips</span>
              <ul>
                <li>Order matters: image 1 is the subject, image 2 the scene.</li>
                <li>
                  Reference roles explicitly in the prompt (e.g. "place image 1
                  into image 2").
                </li>
                <li>
                  <code>gpt-image-2</code> always uses high input fidelity.
                </li>
              </ul>
            </div>

            <div className="input-section">
              <label htmlFor="compose-prompt" className="input-label">
                Composition prompt
              </label>
              <textarea
                id="compose-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Place the subject from image 1 into the scene of image 2, matching lighting and perspective."
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
                `Composing… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>Compose images</span>
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
                  Compose again
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
                label="Composing"
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
                labelPrefix="Composition"
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
                text="Compose multiple images into a single output."
                steps={[
                  "Upload 2–10 reference images",
                  "Describe how they should combine",
                  "Press ⌘+Enter or click Compose images",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
