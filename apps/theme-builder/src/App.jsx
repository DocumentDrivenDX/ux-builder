import { analyse, analysePixels, generate, inflate, normalise, SETTINGS } from "@ux-builder/engine/browser";
import { AppearanceSwitch, Button, Icon, Notice, ThemeProvider } from "@ux-builder/ui";
import { useEffect, useMemo, useState } from "react";
import { getContext, postFeedback, postSave } from "./api.js";
import brandmark from "./assets/logo.svg?raw";
import { Themes } from "./Themes.jsx";
import { brandFromFile, optionName, titleOf } from "./model.js";
import { Compare } from "./steps/Compare.jsx";
import { Palettes } from "./steps/Palettes.jsx";
import { Save } from "./steps/Save.jsx";
import { Systems } from "./steps/Systems.jsx";
import { Upload } from "./steps/Upload.jsx";
import { Use } from "./steps/Use.jsx";

/* The theme builder (FEAT-003): the prototype's six steps on the real engine,
   real widgets and a local API (SD-002, ADR-019). */

// The builder wears one of the SDK's own themes; the person picks its appearance.
const THEME = "ux-builder-databricks";
const APPEARANCES = ["system", "light", "dark"];
const PREF = "theme-builder-appearance";
const savedAppearance = () => { try { const v = localStorage.getItem(PREF); return APPEARANCES.includes(v) ? v : "system"; } catch { return "system"; } };

const STEPS = ["Upload logo", "Pick palettes", "Pick design systems", "Compare", "Save theme", "Use in your app"];

async function readLogo(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = file.type || (/\.svg$/i.test(file.name) ? "image/svg+xml" : "image/png");
  return { filename: file.name, bytes, url: URL.createObjectURL(new Blob([bytes], { type })) };
}
/* An SVG's colours by drawn area: drawn as an <img> (no script runs) onto a
   canvas, then counted like a PNG's pixels. */
async function svgByArea(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const w = img.naturalWidth || 512, h = img.naturalHeight || 512, k = 512 / Math.max(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k)); canvas.height = Math.max(1, Math.round(h * k));
  const g = canvas.getContext("2d");
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  return analysePixels(g.getImageData(0, 0, canvas.width, canvas.height).data, { format: "svg" });
}

/* Where a logo draws: the bounds of its visible pixels as fractions of the
   image, measured on a canvas (the SVG drawn as an <img>, so no script
   runs). A PNG with margins is also cropped here, at full size, since only
   the browser can re-encode it; the server frames an SVG itself. A mark
   (square) is always cropped to a square around its drawing. */
async function frameOf(read, { square = false } = {}) {
  const img = new Image();
  img.src = read.url;
  await img.decode();
  const W = img.naturalWidth || 512, H = img.naturalHeight || 512, k = 1024 / Math.max(W, H);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(W * k)); canvas.height = Math.max(1, Math.round(H * k));
  const g = canvas.getContext("2d");
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = g.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const bounds = { x: x0 / width, y: y0 / height, w: (x1 - x0 + 1) / width, h: (y1 - y0 + 1) / height };
  if (!/\.png$/i.test(read.filename) || (!square && bounds.w > 0.97 && bounds.h > 0.97)) return { bounds };
  const crop = document.createElement("canvas");
  const cw = Math.max(1, Math.round(bounds.w * W)), ch = Math.max(1, Math.round(bounds.h * H));
  const side = Math.round(Math.max(cw, ch) * 1.04);
  crop.width = square ? side : cw; crop.height = square ? side : ch;
  const [dx, dy] = square ? [Math.round((side - cw) / 2), Math.round((side - ch) / 2)] : [0, 0];
  crop.getContext("2d").drawImage(img, bounds.x * W, bounds.y * H, cw, ch, dx, dy, cw, ch);
  const blob = await new Promise((ok) => crop.toBlob(ok, "image/png"));
  return { bounds, base64: toBase64(new Uint8Array(await blob.arrayBuffer())) };
}
const upload = (l) => ({ filename: l.filename, base64: toBase64(l.bytes), ...(l.frame && { frame: l.frame }) });

function toBase64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const summary = (o, ap) => { const c = o.brand.appearances[ap]?.color; return c && { structure: c.structure.$value, accent: c.accent.$value, ground: c.ground.$value }; };

export function App() {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [logo, setLogo] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [regenerating, setRegenerating] = useState(false);
  const [palettes, setPalettes] = useState({});
  const [systems, setSystems] = useState({});
  const [view, setView] = useState("both");
  const [screen, setScreen] = useState("widgets");
  const [final, setFinal] = useState(null);
  const [themeName, setThemeName] = useState("");
  const [saved, setSaved] = useState(null);
  // "Your themes" is a view of its own (?view=themes), in place of the steps; "help" opens above them.
  const [panel, setPanelState] = useState(() => (new URLSearchParams(location.search).get("view") === "themes" ? "themes" : null));
  const setPanel = (p) => {
    setPanelState(p);
    const url = new URL(location.href);
    if (p === "themes") url.searchParams.set("view", "themes"); else url.searchParams.delete("view");
    history.replaceState(null, "", url);
    window.scrollTo(0, 0);
  };
  const [appearance, setAppearance] = useState(savedAppearance);
  const chooseAppearance = (v) => { setAppearance(v); try { localStorage.setItem(PREF, v); } catch { /* not remembered */ } };

  useEffect(() => { getContext().then(setCtx, (e) => setError(e.message)); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const round = rounds.at(-1);
  const brandName = logo ? brandFromFile(logo.filename) : "brand";
  const brandTitle = titleOf(brandName);
  const chosenP = useMemo(() => (round ? round.options.filter((o) => palettes[o.label]) : []), [round, palettes]);
  const chosenS = useMemo(() => (ctx ? ctx.designSystems.filter((d) => systems[d.name]) : []), [ctx, systems]);

  function regenerate(settings, meta) {
    const r = generate(logo.analysis, settings, { designSystems: ctx.designSystems });
    // Selections carry over by strategy, as the prototype says.
    const kept = new Set(round.options.filter((o) => palettes[o.label]).map((o) => o.strategy));
    setPalettes(Object.fromEntries(r.options.filter((o) => kept.has(o.strategy)).map((o) => [o.label, true])));
    setRounds((all) => [...all, { settings: r.options[0]?.settings ?? normalise(settings).settings, options: r.options, ...meta }]);
    setFinal(null);
  }

  async function onLogo(file) {
    setError(null);
    const read = await readLogo(file);
    let analysis;
    try {
      analysis = await analyse(read.bytes, { inflate });   // validates the file; reads an SVG's markup
      if (analysis.format === "svg") {
        const byArea = await svgByArea(read.url).catch(() => null);
        if (byArea && !(byArea.monochrome && !analysis.monochrome)) analysis = byArea;
      }
    } catch (e) { setError(e.message); return; }
    const frame = await frameOf(read).catch(() => null);
    setLogo({ ...read, analysis, frame });
    setScanning(true); setTimeout(() => setScanning(false), 900);
    const r = generate(analysis, {}, { designSystems: ctx.designSystems });
    setRounds([{ settings: r.options[0]?.settings, options: r.options, explanation: null }]);
    setPalettes({}); setFinal(null); setSaved(null);
  }

  async function onFeedback(text) {
    setRegenerating(true);
    try {
      const r = await postFeedback({ feedback: text, settings: round.settings, options: round.options.map((o) => ({ label: o.label, strategy: o.strategy, light: summary(o, "light"), dark: summary(o, "dark") })) });
      regenerate({ ...round.settings, ...r.changes }, { explanation: r.explanation, feedback: text });
    } finally { setRegenerating(false); }
  }
  const onSettings = (s) => regenerate(s, { explanation: `you set ${Object.keys(SETTINGS).filter((k) => s[k] !== round.settings[k]).map((k) => `${k} to ${s[k]}`).join(", ") || "the same settings"}.` });

  async function onSave() {
    const option = round.options.find((o) => o.label === final.label);
    const r = await postSave({ name: themeName, designSystem: final.system, option, logo: upload(logo), ...(logo.dark && { darkLogo: upload(logo.dark) }), ...(logo.mark && { mark: upload(logo.mark) }) });
    setSaved({ ...r, name: themeName });
    setCtx({ ...ctx, themes: [...ctx.themes, { name: themeName }], brands: [...ctx.brands, r.files.find((f) => f.startsWith("tokens/brands/")).slice(14, -11)] });
    setStep(6);
  }

  const canGo = (n) => n === 1 || (n === 2 && !!logo) || (n === 3 && chosenP.length > 0) || (n === 4 && chosenP.length > 0 && chosenS.length > 0) || (n === 5 && !!final) || (n === 6 && !!saved);
  const finalOption = final && round?.options.find((o) => o.label === final.label);
  const finalSystem = final && ctx?.designSystems.find((d) => d.name === final.system);

  return (
    <ThemeProvider theme={THEME} appearance={appearance} className="tb">
      <header className="tb-hdr"><div className="tb-wrap tb-row tb-spread">
        <div className="tb-brandmark" dangerouslySetInnerHTML={{ __html: brandmark }} />
        <div className="tb-row tb-hdr__tools">
        <AppearanceSwitch value={appearance} onChange={chooseAppearance} />
        <nav aria-label="Help" className="tb-row">
          <button type="button" className="tb-link" aria-expanded={panel === "help"} onClick={() => setPanel(panel === "help" ? null : "help")}>Help</button>
          <button type="button" className="tb-link" aria-pressed={panel === "themes"} onClick={() => setPanel(panel === "themes" ? null : "themes")}>Your themes</button>
        </nav>
        </div>
      </div></header>
      <main className="tb-wrap tb-main" aria-live="polite">
        {panel === "themes" && (
          <section className="tb-col tb-gap" aria-labelledby="themes-h">
            <div className="tb-row tb-spread tb-end">
              <div className="tb-col"><h1 id="themes-h">Your themes</h1><p className="tb-lede">Every theme in this repository. Open one for its own page: its logos and palette, its CSS in light, dark and auto, and every widget and screen pattern in it.</p></div>
              <Button variant="secondary" onClick={() => setPanel(null)}><Icon name="arrow-left" />Back to the builder</Button>
            </div>
            {ctx ? <Themes themes={ctx.themes} /> : <p>Loading…</p>}
          </section>
        )}
        {/* The steps stay mounted while Your themes is shown, so nothing done in them is lost. */}
        <div className="tb-contents" hidden={panel === "themes"}>
        {panel === "help" && <div className="tb-panel tb-helppanel"><b>How it works</b><p className="tb-hint">Upload a logo; the engine finds its brand colours and suggests palettes that pass contrast in light and dark. Pick palettes and design systems to compare, choose one combination as your theme, save it for review, and follow the steps to use it. Feedback is turned into engine settings by an AI model (OpenAI); it never picks colours itself.</p></div>}
        <ol className="tb-steps" aria-label="Steps">
          {STEPS.map((l, i) => (
            <li key={l}><button type="button" id={`step-${i + 1}`} aria-current={step === i + 1 ? "step" : undefined} className={i + 1 < step ? "done" : ""} disabled={!canGo(i + 1)} onClick={() => setStep(i + 1)}><span className="n">{i + 1}</span><span>{l}</span></button></li>
          ))}
        </ol>
        {error && <Notice tone="error" title={error} />}
        {!ctx && !error && <p>Loading…</p>}
        {ctx && step === 1 && <Upload logo={logo} scanning={scanning} onLogo={onLogo} onReplace={() => { setLogo(null); setRounds([]); }}
          onDarkLogo={async (f) => { const d = await readLogo(f); setLogo({ ...logo, dark: { ...d, frame: await frameOf(d).catch(() => null) } }); }}
          onMark={async (f) => { const m = await readLogo(f); setLogo({ ...logo, mark: { ...m, frame: await frameOf(m, { square: true }).catch(() => null) } }); }} onNext={() => setStep(2)} />}
        {ctx && step === 2 && round && <Palettes ctx={ctx} round={round} roundNumber={rounds.length} regenerating={regenerating} picked={palettes}
          onToggle={(l) => setPalettes({ ...palettes, [l]: !palettes[l] })} view={view} setView={setView} brandTitle={brandTitle}
          onFeedback={onFeedback} onSettings={onSettings} onBack={() => setStep(1)} onNext={() => setStep(3)} />}
        {ctx && step === 3 && <Systems ctx={ctx} first={{ option: chosenP[0] ?? round.options[0], name: optionName(chosenP[0] ?? round.options[0]) }} picked={systems}
          onToggle={(n) => setSystems({ ...systems, [n]: !systems[n] })} view={view} setView={setView} brandTitle={brandTitle} palettes={chosenP.length}
          onBack={() => setStep(2)} onNext={() => { if (final && !(chosenP.some((o) => o.label === final.label) && systems[final.system])) setFinal(null); setStep(4); }} />}
        {ctx && step === 4 && <Compare options={chosenP} systems={chosenS} view={view} setView={setView} screen={screen} setScreen={setScreen} brandTitle={brandTitle} final={final}
          onChoose={(label, system) => { setFinal({ label, system }); setThemeName(`${brandName}-${system}`); }} onBack={() => setStep(3)} onNext={() => setStep(5)} />}
        {ctx && step === 5 && finalOption && <Save ctx={ctx} option={finalOption} ds={finalSystem} themeName={themeName} setThemeName={setThemeName} brandTitle={brandTitle} onSave={onSave} onBack={() => setStep(4)} />}
        {ctx && step === 6 && saved && <Use saved={saved} option={finalOption} ds={finalSystem} brandTitle={brandTitle} />}
        </div>
      </main>
    </ThemeProvider>
  );
}
