import { SpinnerGlyph } from "./Loading.jsx";

/* A button in one of three emphases: primary for the one action a view
   wants, secondary beside it, text for actions that should not compete.
   While busy it shows a spinner over its label, keeps its width and name,
   and ignores clicks. A badge is a count that belongs to the control, such
   as items pinned. */

const VARIANTS = { primary: "", secondary: " piq-btn--secondary", text: " piq-btn--text" };

export function Button({ variant = "primary", size, badge, busy = false, type = "button", className = "", onClick, children, ...rest }) {
  const cls = `piq-btn${VARIANTS[variant] ?? ""}${size === "sm" ? " piq-btn--sm" : ""}${busy ? " piq-btn--busy" : ""}${className ? ` ${className}` : ""}`;
  const content = <>{children}{badge != null && <span className="piq-btn__badge">{badge}</span>}</>;
  if (!busy) return <button type={type} className={cls} onClick={onClick} {...rest}>{content}</button>;
  return (
    <button type={type} className={cls} {...rest} aria-busy="true" aria-disabled="true" onClick={(e) => e.preventDefault()}>
      <span className="piq-btn__label">{content}</span>
      <span className="piq-btn__spinner"><SpinnerGlyph /></span>
    </button>
  );
}
