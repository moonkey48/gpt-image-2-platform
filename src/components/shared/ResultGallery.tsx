import type { ImageFormat, ImageItem } from "../../lib/openai";

interface Props {
  results: ImageItem[];
  format: ImageFormat;
  loadingCount?: number;
  onDownload: (item: ImageItem, index: number) => void;
  onUseAsReference?: (item: ImageItem, index: number) => void;
  labelPrefix?: string;
  loadingLabel?: string;
}

function mime(format: ImageFormat): string {
  return `image/${format === "jpeg" ? "jpeg" : format}`;
}

function sourceFor(item: ImageItem, format: ImageFormat): string {
  return item.url
    ? item.url
    : `data:${mime(format)};base64,${item.b64_json ?? ""}`;
}

export function ResultGallery({
  results,
  format,
  loadingCount = 0,
  onDownload,
  onUseAsReference,
  labelPrefix = "이미지",
  loadingLabel = "생성 중…",
}: Props) {
  return (
    <div className="results-gallery">
      {results.map((item, index) => (
        <div key={index} className="result-card">
          <div className="result-card-image-wrapper">
            <img
              src={sourceFor(item, format)}
              alt={`${labelPrefix} ${index + 1}`}
              className="result-card-image"
            />
          </div>
          <div className="result-card-actions">
            <span className="result-card-index">
              {labelPrefix} #{index + 1}
            </span>
            <div className="result-card-button-group">
              {onUseAsReference && (
                <button
                  type="button"
                  className="reference-button"
                  onClick={() => onUseAsReference(item, index)}
                  title="이 이미지를 편집 탭의 참조로 전송합니다"
                >
                  참조로 사용
                </button>
              )}
              <button
                type="button"
                className="download-button"
                onClick={() => onDownload(item, index)}
              >
                다운로드
              </button>
            </div>
          </div>
        </div>
      ))}

      {loadingCount > 0 &&
        Array.from({ length: loadingCount }).map((_, index) => (
          <div key={`loading-${index}`} className="result-card-loading">
            <div className="result-card-image-wrapper">
              <div className="loading-spinner" />
            </div>
            <div className="result-card-actions">
              <span className="result-card-index">{loadingLabel}</span>
            </div>
          </div>
        ))}
    </div>
  );
}
