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
import { ImageUpload } from "../components/ImageUpload";
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

export function EditTab({
  apiKey,
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

  useEffect(() => {
    if (!externalRef) return;
    setImage(externalRef);
    onConsumeExternalRef();
    addToast("Reference image loaded.", "info", 2000);
  }, [externalRef, onConsumeExternalRef, addToast]);

  const cost = estimateCost(params.model, params.quality, count);

  const handleGenerate = useCallback(async () => {
    if (!apiKey.trim()) {
      addToast("Enter your OpenAI API key first.", "error");
      return;
    }
    if (!image) {
      addToast("Please upload an image to edit.", "warning");
      return;
    }
    if (!prompt.trim()) {
      addToast("Please enter an edit prompt.", "warning");
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
      addToast("Edit complete.", "success", 2500);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError({ message: e.message, details: e.stack });
    } finally {
      setIsGenerating(false);
    }
  }, [apiKey, image, mask, prompt, count, params, addToast]);

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
      addToast("Result set as new input.", "info", 2000);
    }
  };

  return (
    <div className="page-container">
      <div className="layout-wrapper">
        <div className="input-panel">
          <div className="input-header input-header--compact">
            <p className="input-subtitle">
              Upload an image and describe how to transform it.
            </p>
          </div>

          <div className="input-content">
            <div className="input-section">
              <label className="input-label">Image</label>
              <ImageUpload
                file={image}
                onSelect={setImage}
                disabled={isGenerating}
              />
            </div>

            <div className="input-section">
              <label className="input-label">Mask (optional, PNG)</label>
              <ImageUpload
                file={mask}
                onSelect={setMask}
                accept="image/png"
                hint="Transparent areas = regions to replace"
                disabled={isGenerating}
              />
            </div>

            <div className="input-section">
              <label htmlFor="edit-prompt" className="input-label">
                Edit instructions
              </label>
              <textarea
                id="edit-prompt"
                className="input-field"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Replace the background with a sunlit forest clearing, keep the subject identical"
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
              disabled={isGenerating || !image || !prompt.trim()}
            >
              {isGenerating ? (
                `Editing… (${progress.current}/${progress.total})`
              ) : (
                <>
                  <span>Edit image</span>
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
                  Edit again
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
                label="Editing image"
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
                labelPrefix="Edit"
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
                text="Edit an image with an AI prompt."
                steps={[
                  "Upload an image (and an optional PNG mask)",
                  "Describe the edit you want to make",
                  "Press ⌘+Enter or click Edit image",
                ]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
