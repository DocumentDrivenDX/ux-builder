import { cloneElement, useEffect, useId, useRef, useState } from "react";

/* A short description of a control, shown while the pointer is over it or
   it has keyboard focus: the WAI-ARIA Tooltip pattern. The control points to
   it with aria-describedby; Escape hides it without moving focus; the pointer
   can move onto it without it closing (WCAG 1.4.13). It describes, it never
   names: an icon-only button still needs its own aria-label. children is the
   one control; content is the text. */
export function Tooltip({ content, children, placement = "top", className }) {
  const id = useId();
  const wrap = useRef(null);
  const [shown, setShown] = useState(false);
  const hover = useRef(false), focus = useRef(false);
  const update = () => setShown(hover.current || focus.current);

  useEffect(() => {
    const el = wrap.current;
    const enter = () => { hover.current = true; update(); };
    const leave = () => { hover.current = false; update(); };
    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    return () => { el.removeEventListener("mouseenter", enter); el.removeEventListener("mouseleave", leave); };
  }, []);
  useEffect(() => {
    if (!shown) return undefined;
    const esc = (e) => { if (e.key === "Escape") { hover.current = false; focus.current = false; setShown(false); } };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [shown]);

  const child = cloneElement(children, {
    "aria-describedby": [children.props["aria-describedby"], id].filter(Boolean).join(" "),
    onFocus: (e) => { focus.current = true; update(); children.props.onFocus?.(e); },
    onBlur: (e) => { focus.current = false; update(); children.props.onBlur?.(e); },
  });
  return (
    <span ref={wrap} className={`piq-tooltip-anchor${className ? ` ${className}` : ""}`}>
      {child}
      <span id={id} role="tooltip" className="piq-tooltip" data-placement={placement} hidden={!shown}>{content}</span>
    </span>
  );
}
