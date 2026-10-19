/* GET /api/theme?name=<theme>: one theme as "Your themes" previews it
   (US-020). Composed from tokens/ on each request, as the build composes it,
   so a theme saved since the builder started previews too: for each
   appearance its resolved tokens, its palette and its artwork (logo, mark,
   favicon) as data: URLs. Artwork is read only from under brand/ (the
   loader refuses paths outside it). No secrets. */

import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { load } from "../../../packages/tokens/compose.mjs";
import { SURFACES, bridgeCss } from "../../../packages/tokens/bridges.mjs";
import { defaultAppearance, resolvedJson, themeAppearances } from "../../../packages/tokens/compose-core.mjs";

const TYPES = { ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp" };
const ARTWORK = ["logo-image", "mark-image", "favicon"];
const ICON_SETS = new Set(["material", "fluent", "carbon"]);
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

/* A brand artwork token as a data: URL, or null. */
function dataUrl(root, token) {
  if (!token?.$asset) return null;
  const type = TYPES[extname(token.$asset).toLowerCase()];
  if (!type) return null;
  try { return `data:${type};base64,${readFileSync(join(root, "brand", token.$asset)).toString("base64")}`; }
  catch { return null; }
}

export function theme({ root, name }) {
  const src = load(join(root, "tokens"), join(root, "brand"));
  const t = src.themes.get(name ?? "");
  if (!t) fail(404, `no theme called "${name}"`);
  const brand = src.brands.get(t.brand);
  const ds = t.designSystem ? src.designSystems.get(t.designSystem) : null;
  const appearances = {}, resolvedBy = {};
  for (const ap of themeAppearances(src, t)) {
    const all = resolvedJson(src, name, ap);
    resolvedBy[ap] = all;
    // The SDK's names only, and no url() values: the artwork is sent apart.
    const tokens = Object.fromEntries(Object.entries(all).filter(([k, v]) => k.startsWith("piq-") && !String(v).startsWith("url(")));
    const own = brand.appearances[ap];
    const palette = [
      ...Object.entries(own.color ?? {}).map(([role, v]) => ({ group: "color", role, hex: v.$value })),
      ...Object.entries(own.state ?? {}).map(([role, v]) => ({ group: "state", role, hex: v.$value })),
    ];
    const art = Object.fromEntries(ARTWORK.map((k) => [k, dataUrl(root, own.brand?.[k])]));
    appearances[ap] = {
      tokens,
      palette,
      logo: art["logo-image"],
      logoAspect: own.brand?.["logo-aspect"]?.$value ?? null,
      mark: art["mark-image"],
      favicon: art.favicon,
      logoPaint: own.brand?.["logo-paint"]?.$value ?? null,
    };
  }
  return {
    name: t.name,
    title: t.title,
    brand: { name: brand.name, title: brand.title, generated: Boolean(brand.generation) },
    designSystem: ds ? { name: ds.name, title: ds.title } : null,
    iconSet: ICON_SETS.has(t.designSystem) ? t.designSystem : "lucide",
    default: t.default ?? null,
    // The theme mapped onto each generative UI library's variables (ADR-023), as the build emits it.
    bridges: Object.fromEntries(Object.keys(SURFACES).map((s) => [s, { title: SURFACES[s].title, css: bridgeCss(t.name, resolvedBy, defaultAppearance(src, t), s) }])),
    // Where the SDK's Storybook runs, for the theme page's links to each story.
    storybook: process.env.STORYBOOK_URL ?? "http://localhost:6006",
    appearances,
  };
}
