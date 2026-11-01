/* A scene as SVG (CONTRACT-009 SVG): stable ids from the document, classes and data attributes
   for what each thing is, colours from the theme (as var() in "both"), and the same bytes for the
   same input: attributes in a fixed order and numbers rounded to two decimals. */

const num = (n) => String(Math.round(n * 100) / 100);
export const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const idPart = (s) => String(s).replace(/[^A-Za-z0-9_-]/g, "_");

function attrs(pairs) {
  return pairs.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => ` ${k}="${typeof v === "number" ? num(v) : escape(v)}"`).join("");
}

function style(theme, shape) {
  const parts = [];
  if (shape.fill) parts.push(`fill:${shape.fill === "none" ? "none" : theme.color(shape.fill)}`);
  if (shape.stroke) parts.push(`stroke:${theme.color(shape.stroke)}`, `stroke-width:${num(shape.sw ?? 1)}px`);
  if (shape.dash) parts.push(`stroke-dasharray:${shape.dash}`);
  if (shape.t === "text") parts.push(`font-size:${num(shape.size)}px`, `font-weight:${shape.weight}`);
  if (shape.t === "text" && shape.font) parts.push(`font-family:${theme.fontOf(shape.font)}`);
  // A halo: the background colour stroked behind the glyphs, so a line under the text does not show through it.
  if (shape.t === "text" && shape.halo) parts.push(`paint-order:stroke`, `stroke:${theme.color(shape.halo)}`, `stroke-width:6px`, `stroke-linejoin:round`);
  if (shape.tracking) parts.push(`letter-spacing:${shape.tracking}em`);
  return parts.join(";");
}

function shapeSvg(theme, s) {
  const st = style(theme, s);
  switch (s.t) {
    case "rect": return `<rect${attrs([["x", s.x], ["y", s.y], ["width", s.w], ["height", s.h], ["rx", s.r], ["style", st]])}/>`;
    case "circle": return `<circle${attrs([["cx", s.cx], ["cy", s.cy], ["r", s.r], ["style", st]])}/>`;
    case "ellipse": return `<ellipse${attrs([["cx", s.cx], ["cy", s.cy], ["rx", s.rx], ["ry", s.ry], ["style", st]])}/>`;
    case "path": return `<path${attrs([["d", s.d], ["style", st]])}/>`;
    case "text": return `<text${attrs([["x", s.x], ["y", s.y], ["text-anchor", s.anchor && s.anchor !== "start" ? s.anchor : null], ["style", st]])}>${escape(s.text)}</text>`;
    default: throw new Error(`Unknown shape ${s.t}`);
  }
}

/** The SVG text of a scene. */
export function writeSvg(scene, theme, visual) {
  const vid = idPart(visual.id);
  const title = visual.title ?? visual.question;
  const desc = visual.takeaway ?? visual.question;
  const out = [];
  out.push(`<svg${attrs([["xmlns", "http://www.w3.org/2000/svg"], ["viewBox", `0 0 ${num(scene.width)} ${num(scene.height)}`], ["width", scene.width], ["height", scene.height],
    ["role", "img"], ["aria-labelledby", `${vid}-title`], ["aria-describedby", `${vid}-desc`], ["class", `uxb-visual uxb-visual--${visual.kind}-${visual.form}`], ["data-visual", visual.id],
    ["style", `font-family:${theme.fontAttr()}`]])}>`);
  out.push(`<title id="${vid}-title">${escape(title)}</title>`);
  out.push(`<desc id="${vid}-desc">${escape(desc)}</desc>`);
  out.push(shapeSvg(theme, { t: "rect", x: 0, y: 0, w: scene.width, h: scene.height, fill: scene.background ?? "piq-color-ground" }));
  for (const item of scene.items) {
    const data = item.data ?? {};
    out.push(`<g${attrs([["id", item.id ? `${vid}--${idPart(item.id)}` : null], ["class", item.cls], ["data-role", data.role], ["data-status", data.status],
      ["data-kind", data.kind], ["data-emphasis", data.emphasis], ["data-steps", item.steps?.length ? item.steps.join(" ") : null]])}>`);
    for (const s of item.shapes) out.push(shapeSvg(theme, s));
    out.push("</g>");
  }
  out.push("</svg>");
  return out.join("\n") + "\n";
}
