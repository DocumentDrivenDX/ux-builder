import { PAIRS } from "../../../../tools/contrast.mjs";
import { Button, Notice } from "@ux-builder/ui";
import { useState } from "react";
import { brandNameFor, fontsOf, iconsOf, optionName } from "../model.js";
import { Preview } from "../preview/Preview.jsx";

/* Step 5, "Save theme" (prototype step 5). Saving writes the theme and its
   brand, and opens a pull request for review (the operator kept this). */

const NAME = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export function Save({ ctx, option, ds, themeName, setThemeName, brandTitle, onSave, onBack }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const brand = brandNameFor(themeName, ds.name);
  const problem = !NAME.test(themeName) ? "Use lowercase letters, digits and hyphens, starting with a letter."
    : ctx.themes.some((t) => t.name === themeName) ? `There is already a theme called ${themeName}.`
    : ctx.brands.includes(brand) ? `There is already a brand called ${brand}; choose another name.` : null;
  async function submit(e) {
    e.preventDefault();
    setSaving(true); setError(null);
    try { await onSave(); } catch (err) { setError(err.message); setSaving(false); }
  }
  const aps = ["light", "dark"].filter((ap) => option.brand.appearances[ap]);
  return (
    <section className="tb-two tb-two--save">
      <div className="tb-col">
        <h1>Save the theme</h1>
        <p className="tb-lede">{optionName(option)} × {ds.title}, in {aps.join(" and ")}.</p>
        <div className="tb-pair">{aps.map((ap) => <Preview key={ap} option={option} ds={ds} appearance={ap} brandTitle={brandTitle} showSystem />)}</div>
      </div>
      <form className="tb-panel tb-col tb-save" onSubmit={submit} aria-label="Save theme">
        <div className="tb-field">
          <label htmlFor="theme-name">Theme name</label>
          <input className="tb-input" id="theme-name" value={themeName} spellCheck="false" onChange={(e) => setThemeName(e.target.value.trim())} aria-describedby="theme-name-hint" />
          <span className="tb-hint" id="theme-name-hint">{problem ? <b className="tb-bad">{problem}</b> : "Lowercase letters, digits and hyphens."}</span>
        </div>
        <dl className="tb-dl">
          <dt>Palette</dt><dd>{optionName(option)} (brand <code>{brand}</code>)</dd>
          <dt>Design system</dt><dd>{ds.title}</dd>
          <dt>Icons</dt><dd>{iconsOf(ds)}</dd>
          <dt>Fonts</dt><dd>{fontsOf(ds)}</dd>
          <dt>Appearances</dt><dd>{aps.map((a) => a[0].toUpperCase() + a.slice(1)).join(" and ")}</dd>
          <dt>Contrast</dt><dd>{PAIRS.length} of {PAIRS.length} pairings pass in {aps.length === 2 ? "both" : aps[0]}</dd>
        </dl>
        <p className="tb-hint">Saving creates theme <code>{themeName}</code>: the palette (stored as brand <code>{brand}</code>) on {ds.title}, and opens it for review as a pull request.</p>
        {error && <Notice tone="error" title={error} />}
        <Button type="submit" disabled={!!problem || saving}>{saving ? "Saving…" : "Save theme"}</Button>
        <Button variant="text" onClick={onBack}>Back to compare</Button>
      </form>
    </section>
  );
}
