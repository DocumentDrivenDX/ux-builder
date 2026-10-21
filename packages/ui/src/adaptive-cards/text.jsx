import { Icon } from "../icons/Icon.jsx";

/* Card text as React elements, never as HTML. Adaptive Cards allow a small
   markdown subset in TextBlock text and Fact values: bold, italic, bulleted
   and numbered lists, and links. Only that is formatted; everything else,
   HTML and script included, shows as the text it is. Links are http, https
   or mailto only, open a new tab and say they leave the app. The DATE() and
   TIME() text functions are formatted for the user's locale; a templating
   expression (${...}) stays as text. */

const SAFE_LINK = new Set(["http:", "https:", "mailto:"]);
export function safeLink(href) {
  try { const u = new URL(String(href)); return SAFE_LINK.has(u.protocol) ? u.href : null; } catch { return null; }
}
/* An image or media source: http or https, or an inline image. */
export function safeSource(src, { image = false } = {}) {
  if (typeof src !== "string") return null;
  if (image && /^data:image\/(png|gif|jpe?g|webp|svg\+xml)[;,]/i.test(src)) return src;
  try { const u = new URL(src); return u.protocol === "https:" || u.protocol === "http:" ? u.href : null; } catch { return null; }
}

/* A link that leaves the app: a new tab, the external-link mark, and words saying so. */
export function LeavingLink({ href, className = "piq-markdown__link", children, ...rest }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" data-leaves-app="" {...rest}>
      {children}<Icon name="external-link" className="piq-markdown__leaves" /><span className="piq-visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

const FUNCTION = /\{\{(DATE|TIME)\(([^,)]+)(?:,\s*(COMPACT|SHORT|LONG))?\)\}\}/g;
/* DATE() and TIME() in card text, formatted; anything that does not parse stays as written. */
export function formatFunctions(text) {
  return String(text).replace(FUNCTION, (all, fn, iso, style) => {
    const d = new Date(iso.trim());
    if (Number.isNaN(d.getTime())) return all;
    if (fn === "TIME") return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const opts = style === "LONG" ? { weekday: "long", year: "numeric", month: "long", day: "numeric" } : style === "SHORT" ? { weekday: "short", year: "numeric", month: "short", day: "numeric" } : { year: "numeric", month: "numeric", day: "numeric" };
    return d.toLocaleDateString(undefined, opts);
  });
}

const INLINE = /(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(\*[^*\s][^*\n]*\*)|(_[^_\s][^_\n]*_)/g;
function inline(text, key) {
  const out = [];
  let last = 0, i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [all, bold, link] = m;
    const k = `${key}-${i++}`;
    if (bold) out.push(<strong key={k}>{inline(bold.slice(2, -2), k)}</strong>);
    else if (link) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(link);
      const safe = safeLink(href);
      out.push(safe ? <LeavingLink key={k} href={safe}>{inline(label, k)}</LeavingLink> : <span key={k}>{all}</span>);
    } else out.push(<em key={k}>{inline(all.slice(1, -1), k)}</em>);
    last = m.index + all.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* The blocks of card text: paragraphs (lines joined), bulleted and numbered lists. */
export function textBlocks(text) {
  const out = [];
  let para = [], list = null;
  const flush = () => { if (para.length) out.push({ kind: "p", text: para.join("\n") }); if (list) out.push(list); para = []; list = null; };
  for (const line of formatFunctions(text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const item = /^\s*(?:([-*])|(\d+)\.)\s+(.*)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (item) {
      const ordered = !item[1];
      if (para.length || (list && list.ordered !== ordered)) flush();
      list ??= { kind: "list", ordered, start: ordered ? Number(item[2]) : undefined, items: [] };
      list.items.push(item[3]);
      continue;
    }
    if (list) flush();
    para.push(line);
  }
  flush();
  return out;
}

/* Card text with the markdown subset formatted, as React elements. With
   one paragraph and no list it is inline content for the caller's own
   element; otherwise paragraphs and lists. */
export function CardText({ text, as: Tag = "p", className, ...rest }) {
  const blocks = textBlocks(text);
  if (blocks.length <= 1 && blocks[0]?.kind !== "list") {
    return <Tag className={className} {...rest}>{blocks[0] ? lines(blocks[0].text, "b0") : null}</Tag>;
  }
  return (
    <div className={className} {...rest}>
      {blocks.map((b, i) => {
        if (b.kind === "p") return <p key={i} className="piq-adaptive-card__p">{lines(b.text, `b${i}`)}</p>;
        const L = b.ordered ? "ol" : "ul";
        return <L key={i} className="piq-adaptive-card__list" start={b.start}>{b.items.map((it, j) => <li key={j}>{inline(it, `l${i}-${j}`)}</li>)}</L>;
      })}
    </div>
  );
}
const lines = (text, key) => text.split("\n").flatMap((l, i) => (i ? [<br key={`${key}-br${i}`} />, ...inline(l, `${key}-${i}`)] : inline(l, `${key}-${i}`)));

/* Text only, for a label or an announcement: the markdown marks removed. */
export function plainCardText(text) {
  return formatFunctions(text ?? "").replace(/\*\*([^*\n]+)\*\*/g, "$1").replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, "$1").replace(/(^|\s)[*_]([^*_\n]+)[*_]/g, "$1$2").replace(/\s+/g, " ").trim();
}
