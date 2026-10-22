import { CVD_FLOOR, DIAGRAM_PAIRS, NORMAL_FLOOR, SERIES, deltaE, measure, solid } from "../../../../tools/contrast.mjs";

/* "Diagrams and data" on a theme's page (FEAT-016, US-106): every diagram
   and chart colour in the page's appearance, each with its value and the
   contrast it is held to, worst case first; then the stroke widths and node
   corner drawn on a sample node and edges. The verdicts come from the rule
   the gate enforces (tools/contrast.mjs), so the page cannot show one CI
   would not. Drawn with divs and the theme's tokens, so the audit has
   nothing to say about it. */

const GROUPS = [
  ["Status", "Outcomes: a target met or missed, a rating, a state reached. Each colour is text on the ground and a card, and a mark on its own fill beside a label in body text.",
    ["positive", "caution", "negative", "info"].flatMap((s) => [`status-${s}`, `status-${s}-subtle`])],
  ["Series", "Categorical data and timeline lanes, assigned in this order and never cycled.", SERIES.map((s) => s.replace("piq-color-", ""))],
  ["Regions", "Groups, zones and bands, deepening from the ground.", [1, 2, 3].map((i) => `diagram-region-${i}`)],
  ["Edges", "Strong for actions and the main flow, the default for data, muted (and dashed) for returns and control.", ["diagram-edge-strong", "diagram-edge", "diagram-edge-muted"]],
  ["Lifecycle", "Fills for parts not built yet.", ["lifecycle-placeholder", "lifecycle-decided", "lifecycle-unknown"]],
];

// The pairing a token is held to that it clears by the least: as the colour drawn, or as the fill under text or a mark.
function worst(tokens, name) {
  let out = null;
  for (const [fg, bg, label, floor] of DIAGRAM_PAIRS) {
    if (fg !== name && bg !== name) continue;
    const m = measure(tokens, fg, bg);
    const margin = m ? m.ratio / floor : 0;
    if (!out || margin < out.margin) out = { label, floor, ratio: m?.ratio ?? null, margin };
  }
  return out;
}

function Token({ tokens, name }) {
  const css = `piq-color-${name}`;
  const value = tokens[css];
  const hex = solid(value);
  const w = worst(tokens, css);
  return (
    <li className="tp-viz__token" data-token={css}>
      <span className="tb-swatch" style={{ background: `var(--${css})` }} />
      <span className="tp-viz__name"><code>--{css}</code>{hex !== value && <code className="tp-viz__mix">{value}</code>}</span>
      <code>{hex ?? value}</code>
      {w && <span className="tp-viz__verdict">{w.ratio === null ? "Not measurable" : `${w.ratio.toFixed(2)}:1`} · {w.label} · {w.ratio !== null && w.ratio >= w.floor ? "passes" : "fails"} {w.floor}:1</span>}
    </li>
  );
}

export function DiagramSection({ tokens }) {
  const series = SERIES.map((s) => solid(tokens[s]));
  let closest = null;
  for (let i = 0; i + 1 < series.length; i++) {
    for (const [kind, floor, label] of [["protan", CVD_FLOOR, "protanopia"], ["deutan", CVD_FLOOR, "deuteranopia"], [null, NORMAL_FLOOR, "normal vision"]]) {
      const d = series[i] && series[i + 1] ? deltaE(series[i], series[i + 1], kind) : 0;
      if (!closest || d / floor < closest.d / closest.floor) closest = { d, floor, label, pair: `${i + 1} and ${i + 2}` };
    }
  }
  return (
    <section id="diagrams" data-nav className="tp-section tp-viz" aria-labelledby="diagrams-h">
      <h2 id="diagrams-h">Diagrams and data</h2>
      <p className="tp-lede">The colours and shapes diagrams and charts draw with, as <code>--piq-*</code> role tokens in this appearance. Each shows the contrast it is held to where it clears it by the least; the build fails a theme where any of them fails.</p>
      {GROUPS.map(([title, about, names]) => (
        <div key={title} className="tp-viz__group">
          <h3>{title}</h3>
          <p className="tp-hint">{about}</p>
          <ul className="tp-viz__tokens" aria-label={`${title} tokens`}>{names.map((n) => <Token key={n} tokens={tokens} name={n} />)}</ul>
          {title === "Series" && closest && <p className="tp-hint tp-viz__cvd">Closest neighbours: series {closest.pair}, ΔE {closest.d.toFixed(1)} under {closest.label} ({closest.d >= closest.floor ? "passes" : "fails"} {closest.floor}).</p>}
        </div>
      ))}
      <div className="tp-viz__group">
        <h3>Shape</h3>
        <p className="tp-hint">Stroke widths and node corners come from the design system.</p>
        <div className="tp-viz__sample" style={{ background: "var(--piq-color-diagram-region-1)" }}>
          <div className="tp-viz__node" data-sample="node">
            <b>Node</b>
            <span><code>--piq-radius-diagram-node</code> {tokens["piq-radius-diagram-node"]}</span>
          </div>
          <ul className="tp-viz__edges" aria-label="Edge weights">
            {[["diagram-edge-strong", "diagram-stroke-strong", "solid"], ["diagram-edge", "diagram-stroke", "solid"], ["diagram-edge-muted", "diagram-stroke", "dashed"]].map(([c, s, style]) => (
              <li key={c} data-sample={c}>
                <span className="tp-viz__line" style={{ borderBlockStart: `var(--piq-size-${s}) ${style} var(--piq-color-${c})` }} />
                <code>--piq-size-{s}</code> {tokens[`piq-size-${s}`]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
