/* Bridges (ADR-023 rule 2, FEAT-007 BRG-01 to BRG-03): each theme's tokens
   mapped onto the variables a generative UI library is styled by, so AI
   Elements and assistant-ui wear the theme. A bridge holds the theme's
   resolved values, one block per appearance, scoped like the theme
   (CONTRACT-003), so it follows run-time switching and nested themes and
   needs no `.dark` class. The selectors carry three attribute tests so they
   outrank the libraries' own `:root` and `.dark` defaults, and the theme's
   own appearance blocks, whatever the load order: the theme still sets the
   0.x aliases --accent, --border, --muted and --radius, which shadcn uses
   for other things. Inside a themed element, a bridge gives those four
   shadcn's meanings; the SDK reads only --piq-* names.

   One theming surface today:
     shadcn        shadcn/ui's variables, which style AI Elements and the
                   components assistant-ui's CLI adds.
   assistant-ui's older packaged styles (@assistant-ui/react-ui, --aui-*)
   had their own variables; that package has had no release since
   2025-10-17 and does not work with assistant-ui's current core, so it gets
   no bridge (ADR-023, amended 2026-10-19). */

import { ratio, solid } from "../../tools/contrast.mjs";

/* A colour's value from the theme: a token, or the colour in a token that holds more (the focus ring's "2px solid #D12800"). */
const colourIn = (v) => solid(v) ?? (/(#[0-9a-f]{6}|#[0-9a-f]{3})\b/i.exec(v ?? "")?.[1] ?? null);
const length = (v) => (v === undefined || v === null ? null : /^0+(\.0+)?$/.test(String(v).trim()) ? "0px" : String(v));

/* The roles a bridge reads, by the SDK's own names (the primary button is surface-coloured text on structure). */
function roles(t) {
  const c = (k) => colourIn(t[`piq-${k}`]);
  const closed = c("state-closed");
  // Text on the destructive colour: whichever of the theme's own light and dark text reads best on it.
  const onClosed = [c("color-on-accent"), c("color-surface"), c("color-text-strong")].filter(Boolean)
    .sort((a, b) => ratio(b, closed) - ratio(a, closed))[0];
  // Muted text sits on the muted panel and on the page; where the theme's muted text is too faint on either, its next-stronger text role.
  const mutedText = [c("color-text-muted"), c("color-text")].find((x) => x && ratio(x, c("color-surface-sunken")) >= 4.5 && ratio(x, c("color-ground")) >= 4.5) ?? c("color-text-muted");
  // shadcn draws primary as a fill (buttons) and as text (links, Sources): the theme's structure, unless it is too faint to read on the page or a card, then its strong text.
  const primary = [c("color-structure"), c("color-text-strong")].find((x) => x && ratio(x, c("color-ground")) >= 4.5 && ratio(x, c("color-surface")) >= 4.5) ?? c("color-structure");
  return {
    background: c("color-ground"),
    foreground: c("color-text"),
    card: c("color-surface"),
    "card-foreground": c("color-text"),
    popover: c("color-surface"),
    "popover-foreground": c("color-text"),
    primary,
    "primary-foreground": c("color-surface"),
    secondary: c("color-surface-sunken"),
    "secondary-foreground": c("color-text-strong"),
    muted: c("color-surface-sunken"),
    "muted-foreground": mutedText,
    accent: c("color-surface-sunken"),
    "accent-foreground": c("color-text-strong"),
    destructive: closed,
    "destructive-foreground": onClosed,
    border: c("color-border"),
    input: c("color-border"),
    ring: colourIn(t["piq-focus-ring"]) ?? c("color-accent"),
    "chart-1": c("color-structure"),
    "chart-2": c("color-accent"),
    "chart-3": c("state-live"),
    "chart-4": c("state-limited"),
    "chart-5": c("state-purchasing"),
    sidebar: c("color-surface"),
    "sidebar-foreground": c("color-text"),
    "sidebar-primary": primary,
    "sidebar-primary-foreground": c("color-surface"),
    "sidebar-accent": c("color-surface-sunken"),
    "sidebar-accent-foreground": c("color-text-strong"),
    "sidebar-border": c("color-border"),
    "sidebar-ring": colourIn(t["piq-focus-ring"]) ?? c("color-accent"),
  };
}

/* Text pairs (4.5:1) and non-text pairs (3:1) the libraries draw, by the surface's variable names. */
const TEXT = [
  ["foreground", "background"], ["card-foreground", "card"], ["popover-foreground", "popover"],
  ["primary-foreground", "primary"], ["secondary-foreground", "secondary"], ["muted-foreground", "muted"],
  ["muted-foreground", "background"], ["accent-foreground", "accent"], ["destructive-foreground", "destructive"],
  ["destructive", "background"], ["primary", "background"], ["primary", "card"], ["sidebar-foreground", "sidebar"], ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];
const NON_TEXT = [["ring", "background"], ["ring", "card"]];

/* The variables the surface documents: shadcn/ui's theming variables (ui.shadcn.com/docs/theming,
   as in the globals.css its CLI writes), checked 2026-10-19. */
const SHADCN_DOCUMENTED = ["background", "foreground", "card", "card-foreground", "popover", "popover-foreground", "primary", "primary-foreground", "secondary", "secondary-foreground", "muted", "muted-foreground", "accent", "accent-foreground", "destructive", "border", "input", "ring", "chart-1", "chart-2", "chart-3", "chart-4", "chart-5", "radius", "sidebar", "sidebar-foreground", "sidebar-primary", "sidebar-primary-foreground", "sidebar-accent", "sidebar-accent-foreground", "sidebar-border", "sidebar-ring"].map((v) => `--${v}`);

export const SURFACES = {
  shadcn: {
    title: "shadcn/ui (AI Elements, assistant-ui's added components)",
    documented: SHADCN_DOCUMENTED,
    variables(t) {
      const r = roles(t);
      return { ...Object.fromEntries(Object.entries(r).map(([k, v]) => [`--${k}`, v])), "--radius": length(t["piq-radius-control"]), "--font-sans": t["piq-font-body"], "--font-mono": t["piq-font-mono"] };
    },
    pairs: { text: TEXT, nonText: NON_TEXT },
  },
};

/* The contrast failures of one theme × appearance on one surface: [{ pair, ratio, floor }]. */
export function bridgeFailures(tokens, surface) {
  const r = roles(tokens);
  const out = [];
  for (const [list, floor] of [[SURFACES[surface].pairs.text, 4.5], [SURFACES[surface].pairs.nonText, 3]]) {
    for (const [fg, bg] of list) {
      if (!r[fg] || !r[bg]) { out.push({ pair: `${fg} on ${bg}`, ratio: null, floor }); continue; }
      const x = ratio(r[fg], r[bg]);
      if (x < floor) out.push({ pair: `${fg} on ${bg}`, ratio: Number(x.toFixed(2)), floor });
    }
  }
  return out;
}

/* A theme's bridge for one surface: a block per appearance, the default one also without data-appearance. */
export function bridgeCss(theme, byAppearance, defaultAppearance, surface) {
  const s = SURFACES[surface];
  const sel = `[data-theme="${theme}"][data-theme]`;
  const blocks = Object.entries(byAppearance).map(([ap, tokens]) => {
    const selectors = ap === defaultAppearance ? [`${sel}:not([data-appearance])`, `${sel}[data-appearance="${ap}"]`] : [`${sel}[data-appearance="${ap}"]`];
    const vars = Object.entries(s.variables(tokens)).filter(([, v]) => v);
    return `${selectors.join(",\n")} {\n${vars.map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  });
  return `/* ${theme} for ${s.title}: generated by @ux-builder/tokens (ADR-023). Load it before or after the library's styles and the theme's: these selectors outrank both.\n   Inside a themed element it gives --accent, --border, --muted and --radius (0.x aliases) shadcn's meanings; read --piq-* names instead. */\n${blocks.join("\n")}\n`;
}
