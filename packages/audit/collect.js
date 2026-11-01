/* What the audit checks inside the page, for the theme and appearance now
   showing (US-022, FEAT-004 SDK-18). Runs in the browser through
   page.evaluate, so it is one self-contained function: no imports, no
   closures over this module.

   The app's own elements (see appOwned below) are held to the theme: every
   colour they draw is one of the theme's colour tokens (or a mix of two),
   every font one of its fonts, every corner radius one of its radii. SDK
   widgets are trusted, but a stylesheet that restyles them, or sets --piq-*
   tokens outside the theme CSS, is reported. Icons, logos, loaders and
   controls the app draws itself, and other libraries' components, are
   reported as places to use the SDK. */

/* Installs globalThis.__piqAppOwned(el) in the page, for collect and the
   contrast check to share: is this element the app's own, rather than drawn
   by the SDK? Being inside a .piq-* element is not enough to be the SDK's,
   because the app's content sits inside the SDK's frame and patterns
   (AppShell, Page, Stack, Card, Dashboard…). Everything the SDK draws has a
   .piq-* class of its own, except parts of a widget (table rows and cells,
   list items, options), which carry no styling of their own. So an element
   inside the SDK is the app's when it, or anything between it and the SDK
   element, has an inline style or a class that is not the SDK's; or when it
   is a control, picture or icon, which the SDK always draws with a class
   (its two bare buttons, a menu item and an appearance option, have a
   role). A drawing from @ux-builder/visuals carries uxb-* classes, which are
   the SDK's too (US-168). */
export function installAppOwned() {
  const SDK = '[class^="piq-"], [class*=" piq-"]';
  const DRAWN = /^(button|input|select|textarea|table|svg|img|progress)$/;
  globalThis.__piqAppOwned = (el) => {
    // A drawing by <Visual> (@ux-builder/visuals/react) is the SDK's, whatever its own attributes.
    if (el.matches?.("svg.uxb-visual") && el.closest(".piq-visual")) return false;
    const sdk = el.closest(SDK);
    if (!sdk) return true;
    if (sdk === el) return false;
    for (let e = el; e && e !== sdk; e = e.parentElement) {
      if (e.hasAttribute("style") || [...e.classList].some((c) => !c.startsWith("piq-") && !c.startsWith("uxb-"))) return true;
    }
    return DRAWN.test(el.tagName.toLowerCase()) && !el.hasAttribute("role");
  };
}

export function collect({ sdkRules, bundledFamilies, ignore, rules, theme, appearance }) {
  const findings = [];
  const on = (rule) => rules[rule] !== false;
  const ignored = ["[data-audit-ignore]", ...ignore].join(",");
  const appOwned = globalThis.__piqAppOwned;

  /* ------------------------------------------------------------- helpers */
  const selectorOf = (el) => {
    if (!el || el.nodeType !== 1) return "";
    const parts = [];
    for (let e = el; e && e.nodeType === 1 && parts.length < 5; e = e.parentElement) {
      if (e.id) { parts.unshift(`#${CSS.escape(e.id)}`); break; }
      let s = e.tagName.toLowerCase();
      const cls = [...e.classList].filter((c) => !/^css-|^_|\d{3,}/.test(c)).slice(0, 2);
      if (cls.length) s += cls.map((c) => `.${CSS.escape(c)}`).join("");
      const sibs = e.parentElement ? [...e.parentElement.children].filter((x) => x.tagName === e.tagName) : [];
      if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(e) + 1})`;
      parts.unshift(s);
      if (e === document.body) break;
    }
    return parts.join(" > ");
  };
  const marked = new Map(); // element → finding ids, for the screenshot overlay
  const add = (rule, severity, el, message, extra = {}) => {
    const id = findings.length;
    findings.push({ rule, severity, selector: el ? selectorOf(el) : null, message, ...extra });
    if (el) { if (!marked.has(el)) marked.set(el, []); marked.get(el).push(id); }
  };

  // Any CSS colour as [r, g, b, a] in sRGB, via the cascade and a canvas.
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const rgba = (value) => {
    if (!value || !CSS.supports("color", value)) return null;
    probe.style.color = "";
    probe.style.color = value;
    const computed = getComputedStyle(probe).color;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const px = (value, prop = "borderTopLeftRadius") => {
    probe.style[prop] = "";
    probe.style[prop] = value;
    return parseFloat(getComputedStyle(probe)[prop]) || 0;
  };
  const hex = ([r, g, b, a]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}${a < 0.99 ? ` at ${Math.round(a * 100)}%` : ""}`.toUpperCase();
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const firstFamily = (f) => (f ?? "").split(",")[0].trim().replace(/^["']|["']$/g, "");

  /* The theme on an element: its tokens, read from the page (what the app
     actually got), cached per theme root. */
  const palettes = new Map();
  const tokensOf = (root) => {
    if (palettes.has(root)) return palettes.get(root);
    const cs = getComputedStyle(root);
    const names = new Set();
    for (const sheet of sheets()) for (const r of styleRules(sheet)) for (const p of r.style) if (p.startsWith("--piq-")) names.add(p);
    const colors = [], fonts = new Set(), radii = new Set([0]);
    for (const n of names) {
      const v = cs.getPropertyValue(n).trim();
      if (!v || v.startsWith("url(")) continue;
      if (/^--piq-font-(body|heading|display|mono)$/.test(n)) fonts.add(firstFamily(v));
      else if (/radius/.test(n)) radii.add(px(v));
      else if (!/^--piq-(font|space|size|line|letter|shadow|border|focus|brand)/.test(n)) { const c = rgba(v); if (c && c[3] > 0) colors.push({ name: n, c }); }
    }
    const t = { colors, fonts, radii: [...radii] };
    palettes.set(root, t);
    return t;
  };

  /* Whether a drawn colour is the theme's: a token, a token at another
     opacity, or a mix of two tokens (or a token and white or black), as
     state layers and tints are. */
  const WHITE = { name: "white", c: [255, 255, 255, 1] }, BLACK = { name: "black", c: [0, 0, 0, 1] };
  const match = (c, palette) => {
    let best = null;
    for (const t of palette) { const d = dist(c, t.c); if (!best || d < best.d) best = { name: t.name, d }; }
    if (best && best.d <= 3) return { ok: true, token: best.name };
    const pool = [...palette, WHITE, BLACK];
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
      const a = pool[i].c, b = pool[j].c, ab = [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
      const len = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      if (!len) continue;
      const t = Math.max(0, Math.min(1, ((c[0] - b[0]) * ab[0] + (c[1] - b[1]) * ab[1] + (c[2] - b[2]) * ab[2]) / len));
      if (dist(c, [b[0] + t * ab[0], b[1] + t * ab[1], b[2] + t * ab[2]]) <= 3) return { ok: true, token: `${pool[i].name} + ${pool[j].name}` };
    }
    return { ok: false, nearest: best?.name };
  };

  function* sheets() {
    for (const s of document.styleSheets) { try { void s.cssRules; yield s; } catch { /* cross-origin: unreadable */ } }
  }
  function* styleRules(container) {
    for (const r of container.cssRules ?? []) {
      if (r instanceof CSSStyleRule) yield r;
      if (r.cssRules?.length) yield* styleRules(r);
    }
  }

  /* --------------------------------------------- stylesheets (whole page) */
  // Compared one selector at a time: a minifier splits and merges lists.
  // A bundler may also merge a list into one :is(…, …) (Lightning CSS does), so a whole :is() is opened up.
  const parts = (sel) => { const out = []; let depth = 0, cur = ""; for (const c of sel) { if ("([".includes(c)) depth++; if (")]".includes(c)) depth--; if (c === "," && !depth) { out.push(cur.trim()); cur = ""; } else cur += c; } out.push(cur.trim()); return out.flatMap((x) => { const inner = isWhole(x); return inner === null ? [x.replace(/\s+/g, " ")] : parts(inner); }); };
  // The list inside x when x is one :is(…) and nothing else, else null.
  const isWhole = (x) => { if (!x.startsWith(":is(") || !x.endsWith(")")) return null; let depth = 0; for (let i = 3; i < x.length; i++) { if ("([".includes(x[i])) depth++; if (")]".includes(x[i])) depth--; if (!depth && i < x.length - 1) return null; } return x.slice(4, -1); };
  // The SDK's declarations by selector, so an app rule that reuses an SDK
  // selector with its own values (.piq-btn { border-radius: 3px }) is told
  // from the SDK's rule itself, however a minifier split, merged or
  // rewrote it (90ms as .09s): values are compared as the browser computes
  // them, on a probe inside the theme.
  const val = (v) => v.replace(/\s+/g, " ").replace(/\s*([,()])\s*/g, "$1").trim().toLowerCase();
  const sdk = new Map(); // selector → property → values
  for (const [sel, decls] of sdkRules) for (const p of parts(sel)) {
    if (!sdk.has(p)) sdk.set(p, new Map());
    for (const [prop, v] of decls) { const m = sdk.get(p); if (!m.has(prop)) m.set(prop, new Set()); m.get(prop).add(v); }
  }
  const cprobe = document.createElement("div");
  cprobe.style.display = "none";
  (document.querySelector("[data-theme]") ?? document.body).appendChild(cprobe);
  // Zero is zero, as a length or a percentage (left = 0% = 0px for a position).
  const computedAs = (prop, v) => { cprobe.style.cssText = "display:none"; cprobe.style.setProperty(prop, v); return getComputedStyle(cprobe).getPropertyValue(prop).replace(/(^|[\s,(])0(?:px|%)(?=$|[\s,)])/g, "$10"); };
  const same = (prop, a, b) => val(a) === val(b) || computedAs(prop, a) === computedAs(prop, b);
  for (const sheet of sheets()) {
    for (const r of styleRules(sheet)) {
      const sel = r.selectorText.replace(/\s+/g, " ").trim();
      if (sel.includes("data-theme")) continue;
      const ps = parts(sel);
      const own = [...r.style].filter((p) => {
        const v = r.style.getPropertyValue(p);
        return !ps.every((x) => [...(sdk.get(x)?.get(p) ?? [])].some((sv) => same(p, v, sv)));
      });
      if (!own.length) continue;
      const tokens = own.filter((p) => p.startsWith("--piq-"));
      const styles = own.filter((p) => !p.startsWith("--"));
      if (on("token-overrides") && tokens.length) add("token-overrides", "error", null, `"${sel}" sets ${tokens.join(", ")}: the theme sets tokens, an app reads them`, { rule_selector: sel, value: tokens.join(", ") });
      if (on("widget-overrides") && /\.piq-/.test(sel) && styles.length) add("widget-overrides", "warning", null, `"${sel}" restyles an SDK widget (${styles.slice(0, 4).join(", ")}${styles.length > 4 ? ", …" : ""}); use its props, or ask for a variant`, { rule_selector: sel });
    }
  }

  /* --------------------------------------------------- elements, one pass */
  const LIBS = [[/^Mui/, "Material UI"], [/^ant-/, "Ant Design"], [/^chakra-/, "Chakra UI"], [/^(cds|bx)--/, "Carbon React"], [/^fui-/, "Fluent UI React"], [/^ms-[A-Z]/, "Fluent UI (v8)"], [/^bp[3-6]-/, "Blueprint"], [/^mantine-/, "Mantine"], [/^p-(button|inputtext|datatable|dropdown)/, "PrimeReact"]];
  const libs = new Map();
  const CONTROLS = { button: "<Button>", select: "<Select>", textarea: "<TextArea>", table: "<DataTable>" };
  const TEXT_INPUT = /^(text|email|search|number|password|tel|url|date|time|datetime-local)$/;
  const usedFamilies = new Set();
  const outside = new Set();

  for (const el of document.body.querySelectorAll("*")) {
    if (el === probe || /^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT|BR|WBR|OPTION)$/.test(el.tagName)) continue;
    if (el.closest(ignored)) continue;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (cs.display === "none" || cs.visibility === "hidden" || box.width === 0 || box.height === 0) continue;
    if (el.closest(".piq-visually-hidden")) continue;
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (ownText) usedFamilies.add(firstFamily(cs.fontFamily));
    if (!appOwned(el.ownerSVGElement ?? el)) continue; // drawn by the SDK: trusted
    if (el.ownerSVGElement) continue; // parts of an <svg> are reported with the <svg>

    for (const c of el.classList) for (const [re, name] of LIBS) if (re.test(c)) { libs.set(name, (libs.get(name) ?? 0) + 1); if (libs.get(name) <= 3) add("foreign-components", "warning", el, `a ${name} component: use the SDK's widget instead, so it follows the theme`, { library: name }); }

    const root = el.closest("[data-theme]");
    if (!root) {
      if ((ownText || rgba(cs.backgroundColor)?.[3] > 0) && !outside.has(el.parentElement)) { outside.add(el); add("outside-theme", "warning", el, "drawn outside any [data-theme] element, so it never changes with the theme"); }
      continue;
    }
    const theme = tokensOf(root);

    // Colours: text where it has text, fills, and borders that show.
    if (on("token-colors")) {
      const props = [];
      if (ownText) props.push(["color", cs.color]);
      props.push(["background-color", cs.backgroundColor]);
      for (const side of ["Top", "Right", "Bottom", "Left"]) if (parseFloat(cs[`border${side}Width`]) > 0 && !/none|hidden/.test(cs[`border${side}Style`])) props.push([`border-${side.toLowerCase()}-color`, cs[`border${side}Color`]]);
      const seen = new Set();
      for (const [prop, value] of props) {
        const c = rgba(value);
        if (!c || c[3] === 0) continue;
        const key = `${prop.startsWith("border") ? "border" : prop}:${c.join()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const m = match(c, theme.colors);
        if (!m.ok) add("token-colors", "error", el, `${prop} ${hex(c)} is not a colour of this theme${m.nearest ? ` (nearest: var(${m.nearest}))` : ""}`, { property: prop, value: hex(c) });
      }
    }
    if (on("token-fonts") && ownText) {
      const f = firstFamily(cs.fontFamily);
      if (theme.fonts.size && !theme.fonts.has(f)) add("token-fonts", "error", el, `font "${f}" is not one of this theme's fonts (${[...theme.fonts].join(", ")}); use var(--piq-font-body) or another font token`, { property: "font-family", value: f });
    }
    if (on("token-radii")) {
      const half = Math.min(box.width, box.height) / 2;
      const off = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((k) => parseFloat(cs[`border${k}Radius`]) || 0).filter((r) => r > 0 && r < half - 0.5 && !theme.radii.some((t) => Math.abs(t - r) <= 0.5));
      if (off.length) add("token-radii", "warning", el, `corner radius ${off[0]}px is not one of this theme's radii (${theme.radii.map((r) => `${r}px`).join(", ")})`, { property: "border-radius", value: `${off[0]}px` });
    }

    // Things the SDK draws: icons, logos, loaders, controls.
    if (on("sdk-widgets")) {
      const tag = el.tagName.toLowerCase();
      if (tag === "svg" && box.width <= 96 && box.height <= 96) add("sdk-widgets", "error", el, "an icon the app draws itself: use <Icon> (any of 2,000+ in @ux-builder/ui/icons, or registerIcons for your own) so it follows the theme's icon set", { widget: "Icon" });
      else if (tag === "svg" && !el.closest(".chart, [data-audit-chart]")) add("sdk-widgets", "warning", el, "a diagram or chart the app draws itself: describe it as a umf.visual document and draw it with <Visual> from @ux-builder/visuals/react, so it follows the theme and passes this audit", { widget: "Visual" });
      else if (tag === "img" && /logo/i.test(`${el.alt} ${el.src}`)) add("sdk-widgets", "error", el, "a logo image the app hard-codes: use <Logo /> so it follows the theme and appearance", { widget: "Logo" });
      else if (tag === "img" && box.width <= 48 && box.height <= 48) add("sdk-widgets", "warning", el, "a small image used as an icon: use <Icon>", { widget: "Icon" });
      else if (CONTROLS[tag]) add("sdk-widgets", "warning", el, `a native <${tag}>: use ${CONTROLS[tag]} from @ux-builder/ui`, { widget: CONTROLS[tag].slice(1, -1) });
      else if (tag === "input" && TEXT_INPUT.test(el.type)) add("sdk-widgets", "warning", el, "a native text input: use <TextField>", { widget: "TextField" });
      else if (tag === "input" && /^(checkbox|radio)$/.test(el.type)) add("sdk-widgets", "warning", el, `a native ${el.type}: use ${el.type === "checkbox" ? "<Checkbox> or <Switch>" : "<RadioGroup>"}`, { widget: el.type === "checkbox" ? "Checkbox" : "RadioGroup" });
      else if (el.getAttribute("role") === "progressbar" || tag === "progress") add("sdk-widgets", "warning", el, "a progress bar the app draws itself: use <ProgressBar>", { widget: "ProgressBar" });
      else if (el.getAnimations?.().some((a) => a.effect?.getTiming().iterations === Infinity)) add("sdk-widgets", "warning", el, "an endless animation the app draws itself (a loader?): use <Spinner>, <ProgressBar> or <Skeleton>, which follow the theme and reduced motion", { widget: "Spinner" });
    }
  }
  for (const [name, n] of libs) if (n > 3) add("foreign-components", "warning", null, `${n - 3} more ${name} elements`, { library: name });

  /* ------------------------------------------- the theme's own artwork */
  // The provider's element, which the switch just set; not a data-theme an index.html puts on <html> to start with.
  const app = [...document.querySelectorAll("[data-theme]")].find((e) => e.dataset.theme === theme && e.dataset.appearance === appearance)
    ?? document.querySelector("[data-theme]");
  if (app && on("brand")) {
    const cs = getComputedStyle(app);
    // Read to the closing quote: a data: URI a bundler inlined holds quotes and brackets of its own.
    const m = /url\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\s"'()]+))\s*\)/.exec(cs.getPropertyValue("--piq-brand-favicon"));
    const fav = m && (m[1] ?? m[2] ?? m[3]).replace(/\\(.)/g, "$1");
    const link = document.querySelector("link[data-piq-favicon]");
    if (fav && link?.href !== fav) add("brand", "error", null, `the page's icon is not this theme's favicon (${fav.split("/").pop()}): render the top-level <ThemeProvider> (or <Favicon />)`, { value: link?.href ?? null, expected: fav });
    const art = cs.getPropertyValue("--piq-brand-logo-image").trim();
    if (art && art !== "none" && !document.querySelector(".piq-logo")) add("brand", "warning", null, "this theme has a logo but the page draws none: put <Logo /> in the header");
  }

  /* ---------------------------------------------------------------- fonts */
  if (on("fonts")) {
    // Only the fonts the SDK ships: a system font (Segoe UI) or one the
    // client hosts is the theme's choice, not something the app forgot.
    const loaded = new Set([...document.fonts].filter((f) => f.status === "loaded").map((f) => firstFamily(f.family)));
    const shipped = new Set(bundledFamilies);
    for (const f of usedFamilies) if (shipped.has(f) && !loaded.has(f)) add("fonts", "warning", null, `text is set in "${f}" but no such font loaded, so the browser substitutes one: import @ux-builder/tokens/fonts.css (or the theme's fonts/<theme>.css)`, { value: f });
  }

  probe.remove();
  cprobe.remove();
  return { findings, marked: [...marked].map(([el, ids]) => { const r = el.getBoundingClientRect(); return { ids, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; }) };
}
