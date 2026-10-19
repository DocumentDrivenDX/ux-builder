/* Layout primitives: content-free arrangements that decide only space,
   alignment and columns, from the theme's tokens. Each adapts to the width
   it is given, not the window (ADR-021), so a page in a narrow embed or a
   side pane lays out as it would on a phone. Styles are in patterns.css. */

const SIZE_CLASSES = ["compact", "medium", "expanded", "large", "extraLarge"];
const ATTR = { compact: "compact", medium: "medium", expanded: "expanded", large: "large", extraLarge: "extra-large" };

// A space step 0-8 (--piq-space-N; 0 is no gap). Anything else falls back.
const step = (n, fallback) => (Number.isInteger(n) && n >= 0 && n <= 8 ? n : fallback);
const join = (...c) => c.filter(Boolean).join(" ");

/* A vertical run of children with one of the theme's space steps between
   them. gap is a step from 0 to 8. */
export function Stack({ gap = 4, align = "stretch", as: Tag = "div", className, children, ...rest }) {
  return (
    <Tag className={join("piq-stack", className)} data-gap={step(gap, 4)} data-align={align} {...rest}>
      {children}
    </Tag>
  );
}

/* A row of children that wraps onto further rows when it runs out of width:
   buttons, tags, filters. justify is start, center, end or between. */
export function Cluster({ gap = 3, justify = "start", align = "center", wrap = true, as: Tag = "div", className, children, ...rest }) {
  return (
    <Tag className={join("piq-cluster", className)} data-gap={step(gap, 3)} data-justify={justify} data-align={align} data-wrap={wrap ? "true" : "false"} {...rest}>
      {children}
    </Tag>
  );
}

/* Equal columns whose count follows the width the grid is given, per size
   class: columns is a number for every class, or { compact, medium,
   expanded, large, extraLarge } where a class left out keeps the previous
   class's count. Counts run from 1 to 6. */
export function Grid({ columns = { compact: 1, medium: 2, expanded: 3, large: 4 }, gap = 4, as: Tag = "div", className, children, ...rest }) {
  const counts = {};
  let last = 1;
  for (const c of SIZE_CLASSES) {
    const n = typeof columns === "number" ? columns : columns?.[c];
    last = Number.isInteger(n) ? Math.min(6, Math.max(1, n)) : last;
    counts[`data-cols-${ATTR[c]}`] = last;
  }
  return (
    <div className={join("piq-grid", className)} data-gap={step(gap, 4)} {...counts}>
      <Tag className="piq-grid__items" {...rest}>{children}</Tag>
    </div>
  );
}

/* The frame of a screen's content: the design system's page gutter for the
   size class, and a maximum width (page, form or reading) centred in the
   space. */
export function Page({ width = "page", as: Tag = "div", className, children, ...rest }) {
  return (
    <div className={join("piq-page", className)} data-width={width}>
      <Tag className="piq-page__body" {...rest}>{children}</Tag>
    </div>
  );
}

/* Two panes: side by side from the expanded size class up, and below it one
   pane at a time, the one named by show (primary or secondary). The app
   decides which pane shows, for example the detail once a record is chosen.
   ratio is 1:1, 1:2 or 2:1. */
export function SplitView({ primary, secondary, show = "primary", ratio = "1:2", primaryLabel, secondaryLabel, className, ...rest }) {
  return (
    <div className={join("piq-split", className)} data-show={show === "secondary" ? "secondary" : "primary"} data-ratio={ratio} {...rest}>
      <div className="piq-split__panes">
        <div className="piq-split__pane" data-pane="primary" role={primaryLabel ? "region" : undefined} aria-label={primaryLabel}>{primary}</div>
        <div className="piq-split__pane" data-pane="secondary" role={secondaryLabel ? "region" : undefined} aria-label={secondaryLabel}>{secondary}</div>
      </div>
    </div>
  );
}
