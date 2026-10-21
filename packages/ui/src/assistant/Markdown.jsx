import { useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { Icon } from "../icons/Icon.jsx";

/* Model output as text the app can trust: a small markdown subset
   (paragraphs, headings, lists, emphasis, code and links) built as React
   elements, so nothing in it ever reaches the page as HTML. Tags are
   dropped, with the content of script and style; only http, https and
   mailto links are links, and each says it opens a new tab, leaving the
   app; [n] links to source n when sources are given; a code block scrolls
   within itself and has a copy control. */

const SAFE = new Set(["http:", "https:", "mailto:"]);
function safeHref(href) {
  try { const u = new URL(href); return SAFE.has(u.protocol) ? u.href : null; } catch { return null; }
}

/* Text without HTML: script and style elements with their content, comments, then every other tag. */
export function stripHtml(text) {
  return dropElements(text).replace(/<\/?[a-zA-Z][^>]*>?/g, "");
}
const dropElements = (text) => text.replace(/<(script|style)\b[\s\S]*?(<\/\1\s*>|$)/gi, "").replace(/<!--[\s\S]*?(-->|$)/g, "");
/* Outside fenced code, script and style elements and comments go first, even across lines. */
function dropOutsideFences(text) {
  return text.split(/(^\s*```[^\n]*\n[\s\S]*?(?:^\s*```\s*$|(?![\s\S])))/m).map((chunk, i) => (i % 2 ? chunk : dropElements(chunk))).join("");
}
/* Tags dropped from a line of text, except inside inline code. */
const stripOutsideCode = (text) => text.split(/(`[^`\n]+`)/).map((x, i) => (i % 2 ? x : stripHtml(x))).join("");

/* Markdown as plain text, for an announcement. */
export function plainText(text = "") {
  return stripHtml(String(text)).replace(/```[^\n]*\n?/g, "").replace(/[*_`#>]+/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
}

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\[[^\]\n]+\]\([^)\s]+\))|(\[\d{1,3}\])|(\*[^*\s][^*\n]*\*)|(_[^_\s][^_\n]*_)/g;

function Link({ href, children }) {
  return (
    <a className="piq-markdown__link" href={href} target="_blank" rel="noopener noreferrer">
      {children}<Icon name="external-link" className="piq-markdown__leaves" /><span className="piq-visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

function Citation({ n, sources, idPrefix }) {
  const source = sources?.[n - 1];
  if (!source || !idPrefix) return `[${n}]`;
  const target = `${idPrefix}-${n}`;
  const go = (e) => { e.preventDefault(); const el = document.getElementById(target); el?.scrollIntoView?.({ block: "nearest" }); el?.focus(); };
  return <a className="piq-citation" href={`#${target}`} onClick={go} aria-label={`Source ${n}: ${source.title}`}>[{n}]</a>;
}

function inline(text, ctx, key = "i") {
  const out = [];
  let last = 0, i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [all, code, bold, link, cite, em1, em2] = m;
    const k = `${key}-${i++}`;
    if (code) out.push(<code key={k} className="piq-markdown__code-inline">{code.slice(1, -1)}</code>);
    else if (bold) out.push(<strong key={k}>{inline(bold.slice(2, -2), ctx, k)}</strong>);
    else if (link) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(link);
      const safe = safeHref(href);
      out.push(safe ? <Link key={k} href={safe}>{inline(label, ctx, k)}</Link> : <span key={k}>{inline(label, ctx, k)}</span>);
    } else if (cite) out.push(<Citation key={k} n={Number(cite.slice(1, -1))} sources={ctx.sources} idPrefix={ctx.idPrefix} />);
    else if (em1 || em2) out.push(<em key={k}>{inline(all.slice(1, -1), ctx, k)}</em>);
    last = m.index + all.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard?.writeText(code); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="piq-markdown__code">
      <div className="piq-markdown__code-bar">
        <span className="piq-markdown__code-lang">{lang || "Code"}</span>
        <Button variant="text" size="sm" onClick={copy} data-copy=""><Icon name={copied ? "check" : "copy"} />{copied ? "Copied" : "Copy code"}</Button>
      </div>
      <pre className="piq-markdown__pre" tabIndex={0} aria-label={`${lang || "Code"} block`}><code>{code}</code></pre>
    </div>
  );
}

/* The blocks of a markdown text: fenced code, headings, lists and paragraphs. */
export function blocks(text) {
  const lines = dropOutsideFences(String(text ?? "").replace(/\r\n?/g, "\n")).split("\n");
  const out = [];
  let para = [], list = null;
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    if (list) out.push(list);
    para = []; list = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = /^\s*```\s*([\w+-]*)\s*$/.exec(line);
    if (fence) {
      flush();
      const code = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) code.push(lines[i]);
      out.push({ kind: "code", lang: fence[1], text: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const item = /^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/.exec(line);
    if (!line.trim()) { flush(); continue; }
    if (heading) { flush(); out.push({ kind: "h", level: heading[1].length, text: stripOutsideCode(heading[2]) }); continue; }
    if (item) {
      const ordered = !item[1];
      if (para.length || (list && list.ordered !== ordered)) flush();
      list ??= { kind: "list", ordered, items: [] };
      list.items.push(stripOutsideCode(item[3]));
      continue;
    }
    if (list) { list.items[list.items.length - 1] += ` ${stripOutsideCode(line.trim())}`; continue; }
    para.push(stripOutsideCode(line.trim()));
  }
  flush();
  return out;
}

/* Markdown from a model, rendered as React elements: never as HTML. sources
   and idPrefix link each [n] to source n of a Sources list. */
export function Markdown({ text, sources, idPrefix, className }) {
  const ctx = { sources, idPrefix };
  return (
    <div className={`piq-markdown${className ? ` ${className}` : ""}`}>
      {blocks(text).map((b, i) => {
        if (b.kind === "code") return <CodeBlock key={i} lang={b.lang} code={b.text} />;
        if (b.kind === "h") {
          const Tag = `h${Math.min(6, b.level + 2)}`;
          return <Tag key={i} className="piq-markdown__heading">{inline(b.text, ctx, `h${i}`)}</Tag>;
        }
        if (b.kind === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return <Tag key={i} className="piq-markdown__list">{b.items.map((it, j) => <li key={j}>{inline(it, ctx, `l${i}-${j}`)}</li>)}</Tag>;
        }
        const content = inline(b.text, ctx, `p${i}`).filter((x) => x !== "");
        return content.length ? <p key={i} className="piq-markdown__p">{content}</p> : null;
      })}
    </div>
  );
}
