/* @ux-builder/visuals: umf.visual documents drawn in a ux-builder theme (CONTRACT-009). */

import { render } from "./src/render.mjs";

export { render, draw } from "./src/render.mjs";
export { createTheme } from "./src/theme/theme.mjs";
export { check } from "./src/check.mjs";
export { portableIsTable } from "./src/mermaid/emit.mjs";
export { admit, FORMS, SUPPORTED } from "./src/schema/validate.mjs";

/** Render many documents with one set of options; a refusal is reported per document, not thrown. */
export async function renderAll(documents, options = {}) {
  const out = [];
  for (const document of documents) {
    const id = document?.extensions?.["umf.visual"]?.id;
    try { out.push({ id, ...(await render(document, options)) }); }
    catch (error) { out.push({ id, error: { code: error.code ?? "VISUAL_ERROR", message: error.message, diagnostics: error.diagnostics ?? [] } }); }
  }
  return out;
}
