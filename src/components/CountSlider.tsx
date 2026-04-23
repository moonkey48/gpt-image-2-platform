interface Props {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function CountSlider({
  value,
  onChange,
  min = 1,
  max = 4,
  disabled,
}: Props) {
  return (
    <div className="image-count-selector">
      <div className="count-slider-container">
        <input
          type="range"
          className="count-slider"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          disabled={disabled}
        />
        <div className="count-value">{value}</div>
      </div>
    </div>
  );
}
