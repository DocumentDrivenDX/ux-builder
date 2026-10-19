import { Button, Icon } from "@ux-builder/ui";
import { optionName, optionNote } from "../model.js";
import { Pair } from "../preview/Preview.jsx";
import { SCREENS } from "../preview/Screens.jsx";
import { ViewToggle } from "./ViewToggle.jsx";

/* Step 4, "Compare" (prototype step 4): the chosen palettes x the chosen
   design systems, each cell in light and dark; choose one theme. The screen
   selector shows each cell on a screen pattern instead of the widgets, at a
   phone width and a desktop width (BB-18). Each design system's own
   variants show; the builder offers no control over them (ADR-022). */

export function Compare({ options, systems, view, setView, screen = "widgets", setScreen, brandTitle, final, onChoose, onBack, onNext }) {
  const chosen = final && { o: options.find((o) => o.label === final.label), ds: systems.find((d) => d.name === final.system) };
  return (
    <>
      <section className="tb-col tb-gap">
        <div className="tb-row tb-spread tb-end">
          <div className="tb-col"><h1>Compare and choose one theme</h1><p className="tb-lede">A theme is one palette in one design system. Rows are your palettes, columns your design systems, each in light and dark with the system's own widgets and icons.</p></div>
          <div className="tb-row tb-gap tb-end">
            {setScreen && (
              <div className="tb-seg" role="radiogroup" aria-label="Preview screen">
                {SCREENS.map(([id, label]) => <button key={id} type="button" role="radio" aria-checked={screen === id} onClick={() => setScreen(id)}>{label}</button>)}
              </div>
            )}
            <ViewToggle view={view} setView={setView} />
          </div>
        </div>
        {/* Wider than the window more often than not: a visible scrollbar, and focusable so it scrolls from the keyboard (WCAG 2.1.1). */}
        <div className="tb-matrix" tabIndex={0} role="region" aria-label="Themes to compare; scroll sideways for more design systems">
          {/* A screen's frames have fixed widths, so its column is at least as wide as they are and never spills out of the cell. */}
          <div className="tb-matrix__grid" style={{ gridTemplateColumns: `150px repeat(${systems.length}, ${screen !== "widgets" ? "minmax(max-content, 1fr)" : `minmax(${view === "both" ? 440 : 240}px, 1fr)`})` }}>
            <span />
            {systems.map((ds) => <span key={ds.name} className="tb-eyebrow tb-matrix__head">{ds.title}</span>)}
            {options.map((o) => [
              <div key={o.label} className="tb-col tb-matrix__label"><b>{optionName(o)}</b><span className="tb-hint">{optionNote(o)}</span></div>,
              ...systems.map((ds) => {
                const on = final?.label === o.label && final?.system === ds.name;
                return (
                  <div key={o.label + ds.name} className={`tb-cell${on ? " tb-cell--chosen" : ""}`} id={`cell-${o.label}-${ds.name}`}>
                    <Pair option={o} ds={ds} view={view} screen={screen} brandTitle={brandTitle} />
                    <Button size="sm" variant="secondary" role="radio" aria-checked={on} onClick={() => onChoose(o.label, ds.name)}>{on ? <><Icon name="check" /> Chosen</> : "Choose this theme"}</Button>
                  </div>
                );
              }),
            ])}
          </div>
        </div>
      </section>
      <div className="tb-footbar"><div className="tb-footbar__inner">
        <span id="chosen-label"><b>Chosen theme:</b> {chosen?.o && chosen?.ds ? `${optionName(chosen.o)} × ${chosen.ds.title}` : "none yet — choose one above"}</span>
        <div className="tb-row"><Button variant="text" onClick={onBack}>Back</Button><Button disabled={!chosen?.o} onClick={onNext}>Save this theme</Button></div>
      </div></div>
    </>
  );
}
