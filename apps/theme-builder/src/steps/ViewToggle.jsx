/* Light + dark, Light, Dark: the prototype's preview toggle, shared by steps 2-4. */

const VIEWS = [["both", "Light + dark"], ["light", "Light"], ["dark", "Dark"]];

export function ViewToggle({ view, setView }) {
  return (
    <div className="tb-seg" role="radiogroup" aria-label="Preview appearance">
      {VIEWS.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}>{l}</button>)}
    </div>
  );
}
