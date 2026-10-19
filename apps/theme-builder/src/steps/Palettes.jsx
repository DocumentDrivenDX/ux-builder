import { PAIRS } from "../../../../tools/contrast.mjs";
import { SETTINGS } from "@ux-builder/engine/browser";
import { Button, Icon, TextArea } from "@ux-builder/ui";
import { useState } from "react";
import { optionName, optionNote } from "../model.js";
import { Pair } from "../preview/Preview.jsx";
import { ViewToggle } from "./ViewToggle.jsx";

/* Step 2, "Pick palettes to compare" (prototype step 2): multi-select,
   light + dark on neutral widgets, feedback, plus the settings sliders and
   flagged moves the operator kept. */

const SLIDERS = { hueShift: "Hue shift (°)", chromaScale: "Saturation", neutralTint: "Background tint", stateHarmony: "Status colours lean to the brand" };

export function Palettes({ ctx, round, roundNumber, regenerating, picked, onToggle, view, setView, brandTitle, onFeedback, onSettings, onBack, onNext }) {
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const off = !ctx.model.available;
  const count = round.options.filter((o) => picked[o.label]).length;
  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    try { await onFeedback(text.trim()); } catch (err) { setError(err.message); }
  }
  return (
    <section className="tb-col tb-gap">
      <div className="tb-row tb-spread tb-end">
        <div className="tb-col"><h1>Pick palettes to compare</h1><p className="tb-lede">Choose as many as you like. Every option passes the 4.5:1 contrast check in light and dark. Shown on neutral widgets; you pick design systems next.</p></div>
        <div className="tb-row"><ViewToggle view={view} setView={setView} /><span className="tb-pill">Round {roundNumber}</span><span className="tb-pill tb-pill--warm" id="pal-count">{count} selected</span></div>
      </div>
      {round.explanation && !regenerating && <p className="tb-status" role="status">From your feedback: {round.explanation} Your selections carried over.</p>}
      <div className="tb-grid4">
        {regenerating ? round.options.map((o) => <div key={o.label} className="tb-skeleton" />) : round.options.map((o) => {
          const on = !!picked[o.label], L = o.brand.appearances.light?.color ?? o.brand.appearances.dark.color, D = o.brand.appearances.dark?.color ?? L, S = (o.brand.appearances.light ?? o.brand.appearances.dark).state;
          const flagged = o.moves.filter((m) => m.flagged);
          return (
            <article key={o.label} className={`tb-card${on ? " tb-card--on" : ""}`} data-option={o.label}>
              <div className="tb-row tb-spread"><h2>{optionName(o)}</h2><span className="tb-aa">AA · {PAIRS.length}/{PAIRS.length}</span></div>
              <div className="tb-swatches">{[[3, L.structure], [2, L.accent], [2, L.ground], [1, D.ground], [1, S.live], [1, S.limited], [1, S.closed]].map(([f, t], i) => <span key={i} style={{ flex: f, background: t.$value }} />)}</div>
              <p className="tb-hint">{optionNote(o)}</p>
              {flagged.length > 0 && (
                <ul className="tb-flags" aria-label="Large colour moves">
                  {flagged.map((m) => <li key={m.appearance + m.role}><Icon name="warning" /> {m.appearance} {m.role.replace(/^\w+\./, "")}: <code>{m.from}</code> → <code>{m.to}</code></li>)}
                </ul>
              )}
              <Pair option={o} ds={ctx.neutral} view={view} brandTitle={brandTitle} />
              <Button variant="secondary" aria-pressed={on} onClick={() => onToggle(o.label)}>{on ? <><Icon name="check" /> Added to compare</> : "Add to compare"}</Button>
            </article>
          );
        })}
      </div>
      <form className="tb-panel tb-feedback" onSubmit={submit} aria-label="Feedback">
        <TextArea label="Not quite? Tell us what to change" rows={2} placeholder="e.g. This is for a law firm: more conservative, less orange" value={text} onChange={(e) => setText(e.target.value)} disabled={off || regenerating}
          error={error ?? undefined} hint={off ? ctx.model.reason : "The AI turns this into generator settings; it never picks colours itself, so every result still passes contrast."} />
        <Button type="submit" variant="secondary" disabled={off || regenerating || !text.trim()}>{regenerating ? "Regenerating…" : "Regenerate"}</Button>
      </form>
      <Sliders settings={round.settings} onSettings={onSettings} disabled={regenerating} />
      <div className="tb-row tb-spread"><Button variant="text" onClick={onBack}>Back</Button><Button onClick={onNext} disabled={!count}>Pick design systems</Button></div>
    </section>
  );
}

function Sliders({ settings, onSettings, disabled }) {
  const [draft, setDraft] = useState(settings);
  const [shown, setShown] = useState(settings);
  if (shown !== settings) { setShown(settings); setDraft(settings); }
  return (
    <details className="tb-panel tb-sliders">
      <summary>Adjust the settings yourself</summary>
      <form className="tb-sliders__form" onSubmit={(e) => { e.preventDefault(); onSettings(draft); }} aria-label="Settings">
        {Object.entries(SLIDERS).map(([k, label]) => {
          const s = SETTINGS[k], step = s.max - s.min > 10 ? 1 : 0.05;
          return (
            <label key={k} className="tb-slider"><span>{label} <code>{draft[k]}</code></span>
              <input type="range" min={s.min} max={s.max} step={step} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
            </label>
          );
        })}
        <Button type="submit" variant="secondary" disabled={disabled}>Apply settings</Button>
      </form>
    </details>
  );
}
