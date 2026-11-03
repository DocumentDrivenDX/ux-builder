/* One story per kind and form @ux-builder/visuals draws (US-166), each from a umf fixture. The
   drawing follows the toolbar: a new theme or appearance draws it again in that theme's fonts and
   colours, as a page embedding the SVG would. */

import { useEffect, useState } from "react";
import { render } from "../index.mjs";

const RESOLVED = import.meta.glob("../../tokens/dist/resolved/*.json", { eager: true, import: "default" });
const FIXTURES = import.meta.glob("../test/fixtures/umf/*/*.json", { eager: true, import: "default" });

/** The fixture each story draws, by kind and form. */
export const STORY_FIXTURES = {
  "flow/network": "helix-context",
  "flow/pipeline": "beacon-overview",
  "flow/zoned": "beacon-deployment",
  "flow/lanes": "beacon-field-guide",
  "sequence/lifelines": "beacon-reply-draft",
  "sequence/ladder": "helix-request-ladder",
  "state/machine": "helix-authoring-state",
  "state/lifecycle": "beacon-ticket-lifecycle",
  "structure/entities": "tpl-sd-domain",
  "structure/tree": "umf-extensions",
  "structure/stack": "beacon-stack",
  "structure/nested": "beacon-estate-landscape",
  "timeline/milestones": "umf-releases",
  "timeline/roadmap": "visuals-roadmap",
  "timeline/history": "helix-releases",
  "comparison/matrix": "helix-adr-options",
  "comparison/quadrant": "layout-engines",
  "comparison/before-after": "visuals-before-after",
  "metric/stat": "umf-ac-satisfied",
  "metric/bar": "umf-ac-status",
  "metric/line": "umf-ac-trend",
  "metric/meter": "umf-ac-coverage",
};

const fixture = (id) => Object.entries(FIXTURES).find(([path]) => path.endsWith(`/${id}.json`))?.[1];
/* "praxis-dark" (the toolbar's key) to that theme's resolved JSON. */
function resolved(key = "praxis-dark") {
  const cut = key.lastIndexOf("-");
  const [theme, appearance] = [key.slice(0, cut), key.slice(cut + 1)];
  return Object.values(RESOLVED).find((r) => r.theme === theme && r.appearance === appearance && !r.preview);
}

function Drawing({ id, themeKey, output = "svg" }) {
  const [state, setState] = useState({ svg: "", error: null });
  useEffect(() => {
    let live = true;
    const theme = resolved(themeKey);
    render(fixture(id), { theme, appearance: theme.appearance, output })
      .then((r) => live && setState({ svg: r.content, error: null }))
      .catch((error) => live && setState({ svg: "", error: `${error.code}: ${error.message}` }));
    return () => { live = false; };
  }, [id, themeKey, output]);
  if (state.error) return <p role="alert">{state.error}</p>;
  // The renderer's SVG is the sanctioned drawing (CONTRACT-009); "chart" is the class no-inline-svg allows.
  return <div className="chart" style={{ overflowX: "auto", padding: 16 }} dangerouslySetInnerHTML={{ __html: state.svg }} />;
}

const story = (form) => ({
  name: form,
  render: (_, { globals }) => <Drawing id={STORY_FIXTURES[form]} themeKey={globals.theme} />,
  parameters: { docs: { description: { story: `\`${form}\`, drawn from umf's \`${STORY_FIXTURES[form]}\` fixture.` } } },
});

export default {
  title: "Visuals/Every kind",
  parameters: { layout: "fullscreen" },
  // The fixture table is data, not a story.
  excludeStories: ["STORY_FIXTURES"],
};

export const FlowNetwork = story("flow/network");
export const FlowPipeline = story("flow/pipeline");
export const FlowZoned = story("flow/zoned");
export const FlowLanes = story("flow/lanes");
export const SequenceLifelines = story("sequence/lifelines");
export const SequenceLadder = story("sequence/ladder");
export const StateMachine = story("state/machine");
export const StateLifecycle = story("state/lifecycle");
export const StructureEntities = story("structure/entities");
export const StructureTree = story("structure/tree");
export const StructureStack = story("structure/stack");
export const StructureNested = story("structure/nested");
export const TimelineMilestones = story("timeline/milestones");
export const TimelineRoadmap = story("timeline/roadmap");
export const TimelineHistory = story("timeline/history");
export const ComparisonMatrix = story("comparison/matrix");
export const ComparisonQuadrant = story("comparison/quadrant");
export const ComparisonBeforeAfter = story("comparison/before-after");
export const MetricStat = story("metric/stat");
export const MetricBar = story("metric/bar");
export const MetricLine = story("metric/line");
export const MetricMeter = story("metric/meter");
