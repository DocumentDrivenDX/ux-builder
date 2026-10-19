import { useId } from "react";

/* Loading and progress: a bar for work whose amount is known (or not), a
   spinner for a short wait, and skeletons standing in for content that is
   on its way. Each takes its thickness, corners, track and motion from the
   theme's design system, and holds still when the user asks for less
   motion (the spinner only slows). */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const length = (v) => (typeof v === "number" ? `${v}px` : v);

/* A bar showing how much of a task is done, named by its visible label; leave out value while the amount is unknown and it moves instead. */
export function ProgressBar({ label, value, max = 100, valueText, showValue = false, hideLabel = false, className = "", ...rest }) {
  const id = useId();
  const top = max > 0 ? max : 100;
  const known = typeof value === "number" && Number.isFinite(value);
  const now = known ? clamp(value, 0, top) : null;
  const pct = known ? Math.round((now / top) * 100) : null;
  return (
    <div className={`piq-progress${known ? "" : " piq-progress--indeterminate"}${className ? ` ${className}` : ""}`} {...rest}>
      <div className={hideLabel ? "piq-visually-hidden" : "piq-progress__head"}>
        <span id={id} className="piq-progress__label">{label}</span>
        {known && showValue && <span className="piq-progress__value" aria-hidden="true">{valueText ?? `${pct}%`}</span>}
      </div>
      <div
        className="piq-progress__track"
        role="progressbar"
        aria-labelledby={id}
        aria-valuemin={0}
        aria-valuemax={top}
        aria-valuenow={known ? now : undefined}
        aria-valuetext={known && valueText ? valueText : undefined}
      >
        <div className="piq-progress__fill" style={known ? { width: `${pct}%` } : undefined} />
      </div>
    </div>
  );
}

/* The spinner's drawing alone, hidden from assistive technology; Button draws it while busy. */
export function SpinnerGlyph() {
  return (
    <svg className="piq-spinner__glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle className="piq-spinner__track" cx="12" cy="12" r="10" fill="none" />
      <circle className="piq-spinner__arc" cx="12" cy="12" r="10" fill="none" pathLength="100" />
    </svg>
  );
}

/* A turning ring for a short wait, announced as a status with its label (spoken only, unless showLabel puts it beside the ring). */
export function Spinner({ size = "md", label = "Loading", showLabel = false, className = "", ...rest }) {
  return (
    <span className={`piq-spinner piq-spinner--${size}${className ? ` ${className}` : ""}`} role="status" {...rest}>
      <SpinnerGlyph />
      <span className={showLabel ? "piq-spinner__label" : "piq-visually-hidden"}>{label}</span>
    </span>
  );
}

/* A placeholder in the shape of content that is loading: text lines, a block or a circle. It is hidden from assistive technology, so mark the region that holds it aria-busy="true". */
export function Skeleton({ variant = "text", lines = 1, width, height, className = "", style, ...rest }) {
  const cls = `piq-skeleton piq-skeleton--${variant}${className ? ` ${className}` : ""}`;
  if (variant === "text") {
    const n = Math.max(1, Math.floor(lines));
    return (
      <span className={cls} aria-hidden="true" style={{ width: length(width), ...style }} {...rest}>
        {Array.from({ length: n }, (_, i) => <span key={i} className="piq-skeleton__line" />)}
      </span>
    );
  }
  const size = variant === "circle" ? { width: length(width ?? height ?? 40), height: length(height ?? width ?? 40) } : { width: length(width), height: length(height) };
  return <span className={cls} aria-hidden="true" style={{ ...size, ...style }} {...rest} />;
}
