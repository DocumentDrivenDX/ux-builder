/* render(): a umf.visual document to SVG, Mermaid, a plate or a presentation (CONTRACT-009). */

import { admit } from "./schema/validate.mjs";
import { createTheme } from "./theme/theme.mjs";
import { createMeasure } from "./measure/measure.mjs";
import { layoutFlow } from "./layout/flow.mjs";
import { layoutSequence } from "./layout/sequence.mjs";
import { layoutState } from "./layout/state.mjs";
import { layoutStructure } from "./layout/structure.mjs";
import { layoutBlocks } from "./layout/blocks.mjs";
import { layoutComparison } from "./layout/comparison.mjs";
import { layoutTimeline } from "./layout/timeline.mjs";
import { layoutMetric } from "./layout/metric.mjs";
import { writeSvg } from "./svg/write.mjs";
import { emitMermaid, portableIsTable } from "./mermaid/emit.mjs";
import { writePlate } from "./plate.mjs";
import { writePresentation } from "./presentation.mjs";
import { report } from "./report.mjs";
import { textEquivalent } from "./text.mjs";

const LAYOUTS = {
  flow: layoutFlow,
  sequence: layoutSequence,
  state: layoutState,
  comparison: layoutComparison,
  timeline: layoutTimeline,
  metric: layoutMetric,
  structure: (v, ctx) => (v.form === "stack" || v.form === "nested" ? layoutBlocks(v, ctx) : layoutStructure(v, ctx)),
};

/** Lay a visual out in a theme: the scene, the report and warnings, without writing an output. */
export async function draw(document, options = {}) {
  const { visual, unknown } = admit(document, options);
  const theme = createTheme(options.theme, options.appearance ?? "light");
  const m = createMeasure(theme.font);
  const warnings = [];
  if (m.standIn) warnings.push({ code: "FONT_STAND_IN", message: `${m.intended} is not shipped; text is measured with ${m.family}` });
  if (unknown.length) warnings.push({ code: "INCOMPLETE", message: `Not drawn: ${unknown.join(", ")}` });
  const scene = await LAYOUTS[visual.kind](visual, { theme, m, width: options.width, warnings });
  return { visual, theme, m, scene, warnings, layout: report(scene, visual, m) };
}

export async function render(document, options = {}) {
  const output = options.output ?? "svg";
  const d = await draw(document, options);
  let content;
  if (output === "svg") content = writeSvg(d.scene, d.theme, d.visual);
  else if (output === "mermaid") content = emitMermaid(d.visual, d.theme);
  else if (output === "plate") content = writePlate(d, writeSvg(d.scene, d.theme, d.visual), textEquivalent(d.visual));
  else if (output === "presentation") {
    if (!d.visual.steps?.length) throw Object.assign(new Error("A presentation walks a visual's steps; this visual has none"), { code: "VISUAL_NO_STEPS", diagnostics: [] });
    content = writePresentation(d, writeSvg(d.scene, d.theme, d.visual));
  } else throw Object.assign(new Error(`Unknown output ${output}`), { code: "VISUAL_OUTPUT" });
  // The portable form is a Markdown table for the kinds Mermaid has no diagram for (§6.4).
  const format = output === "mermaid" ? (portableIsTable(d.visual) ? "markdown" : "mermaid") : output === "svg" ? "svg" : "html";
  return { content, format, warnings: d.warnings, layout: d.layout, text: textEquivalent(d.visual) };
}
