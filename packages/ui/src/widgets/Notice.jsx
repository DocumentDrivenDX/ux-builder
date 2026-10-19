/* A message in the flow of the page. The tone sets its colour and its mark;
   the title says the point, so the colour is never the only signal. An error
   rendered in response to an action should pass role="alert". */

const MARKS = { info: "i", accent: "i", success: "✓", warning: "!", error: "×" };

export function Notice({ tone = "info", title, children, ...rest }) {
  return (
    <div className={`piq-notice piq-notice--${tone}`} {...rest}>
      <span className="piq-notice__mark" aria-hidden="true">{MARKS[tone] ?? "i"}</span>
      <p className="piq-notice__title">{title}</p>
      {children && <p className="piq-notice__body">{children}</p>}
    </div>
  );
}
