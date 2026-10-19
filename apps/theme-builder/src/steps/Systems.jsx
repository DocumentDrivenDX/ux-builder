import { Button } from "@ux-builder/ui";
import { SYSTEM_INFO, fontsOf, iconsOf } from "../model.js";
import { Pair } from "../preview/Preview.jsx";
import { ViewToggle } from "./ViewToggle.jsx";

/* Step 3, "Pick design systems" (prototype step 3). */

export function Systems({ ctx, first, picked, onToggle, view, setView, brandTitle, palettes, onBack, onNext }) {
  const n = palettes * ctx.designSystems.filter((d) => picked[d.name]).length;
  return (
    <section className="tb-col tb-gap">
      <div className="tb-row tb-spread tb-end">
        <div className="tb-col"><h1>Pick design systems to compare</h1><p className="tb-lede">{ctx.designSystems.map((d) => d.title).join(", ").replace(/, ([^,]*)$/, " and $1")} each bring their own shapes, type and icons. Shown with {first.name}.</p></div>
        <div className="tb-row"><ViewToggle view={view} setView={setView} /><span className="tb-pill tb-pill--warm">{Object.values(picked).filter(Boolean).length} selected</span></div>
      </div>
      <div className="tb-grid4">
        {ctx.designSystems.map((ds) => {
          const on = !!picked[ds.name];
          return (
            <div key={ds.name} className={`tb-card${on ? " tb-card--on" : ""}`}>
              <label className="tb-row tb-check"><input type="checkbox" checked={on} onChange={() => onToggle(ds.name)} /> {ds.title}</label>
              <Pair option={first.option} ds={ds} view={view} brandTitle={brandTitle} />
              <span className="tb-hint">{SYSTEM_INFO[ds.name]?.blurb ?? ""} Icons: {iconsOf(ds)}. Type: {fontsOf(ds)}.</span>
            </div>
          );
        })}
      </div>
      <div className="tb-row tb-spread"><Button variant="text" onClick={onBack}>Back</Button><Button onClick={onNext} disabled={!n}>Compare {n} combination{n === 1 ? "" : "s"}</Button></div>
    </section>
  );
}
