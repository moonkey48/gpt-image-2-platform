import { useMemo } from "react";
import type {
  ImageBackground,
  ImageFormat,
  ImageModel,
  ImageQuality,
  ImageSize,
} from "../lib/openai";
import { supportsInputFidelity } from "../lib/openai";

export interface CommonParams {
  model: ImageModel;
  size: ImageSize;
  quality: ImageQuality;
  output_format: ImageFormat;
  output_compression: number;
  background: ImageBackground;
  input_fidelity: "low" | "high";
}

export const DEFAULT_PARAMS: CommonParams = {
  model: "gpt-image-2",
  size: "1024x1024",
  quality: "auto",
  output_format: "png",
  output_compression: 90,
  background: "auto",
  input_fidelity: "high",
};

const MODELS: { id: ImageModel; sub: string }[] = [
  { id: "gpt-image-2", sub: "latest" },
  { id: "gpt-image-1.5", sub: "fast" },
  { id: "gpt-image-1", sub: "legacy" },
  { id: "gpt-image-1-mini", sub: "draft" },
];

const SIZES: { id: ImageSize; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "1024x1024", label: "1:1" },
  { id: "1536x1024", label: "3:2" },
  { id: "1024x1536", label: "2:3" },
  { id: "2048x2048", label: "2K" },
];

const QUALITIES: ImageQuality[] = ["auto", "low", "medium", "high"];
const FORMATS: ImageFormat[] = ["png", "jpeg", "webp"];
const BACKGROUNDS: ImageBackground[] = ["auto", "transparent", "opaque"];

interface Props {
  params: CommonParams;
  onChange: (p: CommonParams) => void;
  showInputFidelity?: boolean;
  disabled?: boolean;
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="input-label">{label}</label>
      {children}
    </div>
  );
}

export function AdvancedOptions({
  params,
  onChange,
  showInputFidelity,
  disabled,
}: Props) {
  const update = <K extends keyof CommonParams>(
    key: K,
    value: CommonParams[K],
  ) => onChange({ ...params, [key]: value });

  const compressible =
    params.output_format === "jpeg" || params.output_format === "webp";
  const fidelityAllowed =
    !!showInputFidelity && supportsInputFidelity(params.model);

  const sizeLabel =
    SIZES.find((s) => s.id === params.size)?.label ?? params.size;

  const badge = useMemo(() => {
    const parts = [
      params.model,
      sizeLabel,
      params.quality,
      params.output_format,
    ];
    if (params.background !== "auto") parts.push(params.background);
    return parts.join(" · ");
  }, [params, sizeLabel]);

  return (
    <details className="advanced-options">
      <summary>
        Advanced options
        <span className="advanced-options-badge">{badge}</span>
      </summary>
      <div className="advanced-options-content">
        <Section label="Model">
          <div className="option-grid option-grid-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`option-btn ${params.model === m.id ? "active" : ""}`}
                onClick={() => update("model", m.id)}
                disabled={disabled}
              >
                {m.id}
                <span className="btn-sub">{m.sub}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Size / aspect">
          <div className="option-grid option-grid-3">
            {SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`option-btn ${params.size === s.id ? "active" : ""}`}
                onClick={() => update("size", s.id)}
                disabled={disabled}
              >
                {s.label}
                <span className="btn-sub">{s.id === "auto" ? "—" : s.id}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section label="Quality">
          <div className="option-grid option-grid-4">
            {QUALITIES.map((q) => (
              <button
                key={q}
                type="button"
                className={`option-btn ${params.quality === q ? "active" : ""}`}
                onClick={() => update("quality", q)}
                disabled={disabled}
              >
                {q}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Format">
          <div className="option-grid option-grid-3">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                className={`option-btn ${params.output_format === f ? "active" : ""}`}
                onClick={() => update("output_format", f)}
                disabled={disabled}
              >
                {f}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Background">
          <div className="option-grid option-grid-3">
            {BACKGROUNDS.map((b) => (
              <button
                key={b}
                type="button"
                className={`option-btn ${params.background === b ? "active" : ""}`}
                onClick={() => update("background", b)}
                disabled={disabled}
              >
                {b}
              </button>
            ))}
          </div>
        </Section>

        {compressible && (
          <Section label={`Compression (${params.output_compression}%)`}>
            <input
              type="range"
              min={0}
              max={100}
              value={params.output_compression}
              onChange={(e) =>
                update("output_compression", Number(e.target.value))
              }
              disabled={disabled}
              style={{ width: "100%" }}
            />
          </Section>
        )}

        {showInputFidelity && (
          <Section
            label={
              fidelityAllowed
                ? "Input fidelity"
                : "Input fidelity (fixed · high)"
            }
          >
            <div className="option-grid option-grid-2">
              {(["low", "high"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`option-btn ${params.input_fidelity === v ? "active" : ""}`}
                  onClick={() => update("input_fidelity", v)}
                  disabled={disabled || !fidelityAllowed}
                >
                  {v}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </details>
  );
}
