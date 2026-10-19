import { Button, Card, Icon, Notice, ProgressBar, Select, Spinner, StatusPill, Switch, ThemeProvider } from "@ux-builder/ui";
import { composeOn, resolveAll } from "../../../../packages/tokens/compose-core.mjs";
import { iconSetOf } from "../model.js";
import { ScreenPreview } from "./Screens.jsx";

/* One palette in one design system's anatomy, in one appearance, on the
   SDK's real widgets: the prototype's preview card. The option is composed
   with the design system in the browser, exactly as the build composes a
   theme, and handed to ThemeProvider as resolved tokens. */

const cache = new Map();
export function tokensFor(option, ds, appearance) {
  const key = `${option.label}|${JSON.stringify(option.settings)}|${ds.name}|${appearance}`;
  if (!cache.has(key)) {
    const resolved = resolveAll(composeOn({ name: "option", appearances: option.brand.appearances }, ds, appearance), `option × ${ds.name}`);
    cache.set(key, Object.fromEntries([...resolved].map(([p, v]) => [`piq-${p.replace(/\./g, "-")}`, v])));
  }
  return cache.get(key);
}

const ICONS = ["search", "warning", "check-circle", "download", "calendar"];

/* The widgets every preview shows, in the icon set given. */
export function Specimen({ set }) {
  return (
    <>
      <div className="tb-preview__icons" aria-label={`${set} icons`}>{ICONS.map((n) => <Icon key={n} name={n} set={set} />)}</div>
      <Card title="Five entries need a look" actions={<><Button size="sm">Confirm</Button><Button size="sm" variant="secondary">Expand</Button><Button size="sm" variant="text" badge={5}>Pinned</Button></>} />
      <Select label="Matter" defaultValue="0412" options={[{ value: "0412", label: "2026-0412 · Halvorsen v. Atlas" }]} />
      <Switch label="Notify partner" defaultChecked />
      <Notice tone="warning" title="Two entries over the cap" />
      <div className="tb-preview__pills"><StatusPill state="live" /><StatusPill state="limited" /><StatusPill state="closed" /></div>
      <ProgressBar label="Prebill review" value={60} showValue />
      {/* A sample, not a wait: it announces nothing, like the rest of the preview. */}
      <Spinner size="sm" label="Syncing entries" showLabel role={undefined} />
    </>
  );
}

export function Preview({ option, ds, appearance, brandTitle, showSystem = false }) {
  return (
    <ThemeProvider tokens={tokensFor(option, ds, appearance)} appearance={appearance} className="tb-preview" data-preview={`${option.label}:${ds.name}:${appearance}`}>
      <div className="tb-preview__head"><b>{brandTitle}</b><span>{showSystem ? `${ds.title} · ` : ""}{appearance}</span></div>
      <Specimen set={iconSetOf(ds)} />
    </ThemeProvider>
  );
}

/* Light, dark, or both side by side: the prototype's view toggle. screen,
   if given and not "widgets", shows that screen pattern instead (US-032). */
export function Pair({ option, ds, view, brandTitle, showSystem, screen = "widgets" }) {
  const aps = (view === "both" ? ["light", "dark"] : [view]).filter((ap) => option.brand.appearances[ap]);
  if (screen !== "widgets") {
    return (
      <div className="tb-col tb-gap">
        {aps.map((ap) => <ScreenPreview key={ap} screen={screen} option={option} ds={ds} appearance={ap} brandTitle={brandTitle} />)}
      </div>
    );
  }
  return (
    <div className={`tb-pair${aps.length === 1 ? " tb-pair--single" : ""}`}>
      {aps.map((ap) => <Preview key={ap} option={option} ds={ds} appearance={ap} brandTitle={brandTitle} showSystem={showSystem} />)}
    </div>
  );
}
