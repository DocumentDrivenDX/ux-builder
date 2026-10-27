/* The journey skeleton's runtime (US-159): a route per screen on the History
   API, each screen's states, its business-rule warnings and its dialogs, the
   sample data (in localStorage, else in memory) and the prototype toolbar.
   The screens in src/screens/ render their content inside ScreenFrame; what
   they show comes from ./blueprint.js. ?state=<name> forces a state on any
   screen; ?prototype shows the toolbar outside `npm run dev`. */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Card, Dialog, Notice, Select, Sheet, Skeleton, TextField, useToast } from "@ux-builder/ui";
import { Cluster, Page, PageHeader, Stack, StatePanel } from "@ux-builder/ui/patterns";
import { APP, JOURNEYS, SAMPLE, SCREENS } from "./blueprint.js";

/* ------------------------------------------------------------ routes */
const ROUTE = "ux-builder:route";
const onRoute = (f) => { window.addEventListener("popstate", f); window.addEventListener(ROUTE, f); return () => { window.removeEventListener("popstate", f); window.removeEventListener(ROUTE, f); }; };
const here = () => window.location.pathname + window.location.search;

/* The path and query the app is at. */
export function useRoute() {
  const at = useSyncExternalStore(onRoute, here, () => "/");
  const url = new URL(at, "http://prototype.invalid");
  return { path: url.pathname, params: url.searchParams };
}

/* Go to a path, keeping ?prototype; state forces a state there. */
export function navigate(path, { state, replace = false } = {}) {
  const now = new URLSearchParams(window.location.search), next = new URLSearchParams();
  if (now.has("prototype")) next.set("prototype", now.get("prototype"));
  if (state) next.set("state", state);
  const q = next.toString();
  window.history[replace ? "replaceState" : "pushState"](null, "", `${path}${q ? `?${q}` : ""}`);
  window.dispatchEvent(new Event(ROUTE));
}

export const screenAt = (path) => SCREENS.find((s) => s.path === path) ?? null;

/* ------------------------------------------------------- sample data */
const KEY = `ux-builder-prototype:${APP.name}`;
const SAMPLED = "ux-builder:sample";
let memory = null;
const fresh = () => structuredClone(SAMPLE);
function read() {
  if (memory) return memory;
  try { const s = JSON.parse(window.localStorage.getItem(KEY) ?? "null"); memory = s?.hash === APP.hash ? s.data : fresh(); } catch { memory = fresh(); }
  return memory;
}
function write(data) {
  memory = data;
  try { window.localStorage.setItem(KEY, JSON.stringify({ hash: APP.hash, data })); } catch { /* memory only */ }
  window.dispatchEvent(new Event(SAMPLED));
}
const onSample = (f) => { window.addEventListener(SAMPLED, f); return () => window.removeEventListener(SAMPLED, f); };

/* Put the sample data back as the blueprint made it. */
export function resetSampleData() {
  try { window.localStorage.removeItem(KEY); } catch { /* memory only */ }
  memory = fresh();
  window.dispatchEvent(new Event(SAMPLED));
}

/* A screen's (or a dialog's, "screen:dialog") sample data: { content, fields }. */
export function useSample(id) {
  return useSyncExternalStore(onSample, read, read)[id] ?? { content: [], fields: {} };
}

/* field(name): a TextField's name, value and onChange, kept in the sample data. */
export function useFields(id) {
  const sample = useSample(id);
  return (name) => ({
    name,
    value: sample.fields?.[name] ?? "",
    onChange: (e) => { const all = read(); write({ ...all, [id]: { content: [], ...all[id], fields: { ...all[id]?.fields, [name]: e.target.value } } }); },
  });
}

/* ----------------------------------------------------------- screens */
const PANELS = ["empty", "no-results", "forbidden", "error", "partial"];
const SETTLE = 400;

/* A screen: its title and purpose, its business-rule warnings, then its
   content in the state it is in, its actions and its dialogs. */
export function ScreenFrame({ screen, children }) {
  const { params } = useRoute();
  const { show } = useToast();
  const forced = params.get("state");
  const [own, setOwn] = useState(() => (screen.states.includes("loading") ? "loading" : "ideal"));
  const [open, setOpen] = useState(null);
  const state = forced ?? own;
  // Loading settles into the content, unless ?state= holds it.
  useEffect(() => {
    if (forced || own !== "loading") return undefined;
    const t = setTimeout(() => setOwn("ideal"), SETTLE);
    return () => clearTimeout(t);
  }, [forced, own]);
  const to = (st) => { if (forced) navigate(screen.path, { replace: true }); setOwn(st); };
  const act = (a) => {
    const go = a.go ?? { kind: "none" };
    if (go.kind === "screen") navigate(go.path);
    else if (go.kind === "modal") setOpen(go.modal);
    else if (go.kind === "state") to(go.state);
    else if (go.kind === "back") window.history.back();
    else show({ message: go.kind === "external" ? `"${a.label}" leaves the app; the prototype stays here.` : `"${a.label}" leads nowhere yet: give it a "to" in the blueprint.` });
  };
  const button = (a, variant = a.primary ? "primary" : "secondary") => <Button key={a.id} variant={variant} data-action={a.id} onClick={() => act(a)}>{a.label}</Button>;
  const primary = screen.actions.filter((a) => a.primary), others = screen.actions.filter((a) => !a.primary);
  const blocked = state === "blocked";

  let body;
  if (state === "loading") body = <div aria-busy="true"><Skeleton lines={2} /><Skeleton lines={6} /></div>;
  else if (state === "partial") body = <><StatePanel kind="partial" onRetry={() => to("loading")} />{children}</>;
  else if (PANELS.includes(state)) body = <StatePanel kind={state} onRetry={() => to("loading")} onClearFilters={() => to("ideal")} action={state === "empty" && primary[0] ? button(primary[0]) : undefined} />;
  else if (state === "not-found") body = <StatePanel kind="empty" title="This record no longer exists"><p>It may have been deleted or moved.</p></StatePanel>;
  else if (blocked) body = <>{screen.rules.map((r) => <Notice key={r.id} tone="error" role="alert" title={r.blocked ?? `${r.id} blocks this`}>{r.recover ?? "How the user recovers is not designed yet (businessRules in the blueprint)."}</Notice>)}{children}</>;
  else if (state === "ideal") body = children;
  else body = <><Notice tone="success" role="status" title={`${screen.title}: ${state}`} />{children}</>;
  // In loading, empty, error and the like, the screen's own actions wait; back stays (states.mjs).
  const content = state !== "loading" && state !== "not-found" && !PANELS.filter((p) => p !== "partial").includes(state);

  return (
    <Page data-piq-screen={screen.id} data-state={state}>
      <PageHeader title={screen.title} description={screen.purpose} actions={content && !blocked && primary.length ? primary.map((a) => button(a)) : undefined} />
      <Stack>
        {screen.rules.map((r) => <Notice key={r.id} tone="warning" title={r.before ?? `Business rule ${r.id}`} data-rule={r.id}>{r.trigger ? `${r.id}, when ${r.trigger.charAt(0).toLowerCase()}${r.trigger.slice(1)}.` : `${r.id}: how the user meets it is not designed yet (businessRules in the blueprint).`}</Notice>)}
        {body}
        {others.some((a) => content || a.go?.kind === "back") && <Cluster>{others.filter((a) => content || a.go?.kind === "back").map((a) => button(a))}</Cluster>}
      </Stack>
      {screen.modals.map((m) => <Modal key={m.id} screen={screen} modal={m} open={open === m.id} onClose={() => setOpen(null)} act={act} />)}
    </Page>
  );
}

/* A dialog or sheet the blueprint declares, with its fields and actions. */
function Modal({ screen, modal, open, onClose, act }) {
  const field = useFields(`${screen.id}:${modal.id}`);
  const body = modal.fields.length ? <Stack>{modal.fields.map((f) => <TextField key={f.name} label={f.label} required={f.required} {...field(f.name)} />)}</Stack> : <p>{modal.title}</p>;
  const actions = <>{modal.actions.map((a) => <Button key={a.id} variant={a.primary ? "primary" : "secondary"} data-action={a.id} onClick={() => { onClose(); act(a); }}>{a.label}</Button>)}<Button variant="secondary" onClick={onClose}>{modal.dismiss}</Button></>;
  if (modal.kind === "sheet") return <Sheet open={open} onClose={onClose} title={modal.title} side="end"><Stack>{body}<Cluster>{actions}</Cluster></Stack></Sheet>;
  return <Dialog open={open} onClose={onClose} title={modal.title} actions={actions}>{body}</Dialog>;
}

/* An address no screen has. */
export function NotFound() {
  const { path } = useRoute();
  return (
    <Page data-piq-screen="not-found">
      <PageHeader title="No screen here" />
      <StatePanel kind="empty" title="No screen at this address" action={<Button onClick={() => navigate(SCREENS[0].path)}>Go to {SCREENS[0].title}</Button>}><p>The blueprint has no screen at {path}.</p></StatePanel>
    </Page>
  );
}

/* ----------------------------------------------------------- toolbar */
/* In `npm run dev`, or with ?prototype: force a state, reset the sample data, walk a journey. */
export function PrototypeToolbar() {
  const { path, params } = useRoute();
  if (!(import.meta.env?.DEV || params.has("prototype"))) return null;
  const screen = screenAt(path);
  // Folded by default, one line above the app, so the person sees their app first; journeys by their goal, not their ID (US-161-AC7).
  return (
    <aside aria-label="Prototype toolbar" data-prototype-toolbar="" style={{ padding: "var(--piq-space-2) var(--piq-space-4)", borderBlockEnd: "1px solid var(--piq-color-border)" }}>
      <details>
        <summary>Prototype controls</summary>
        <Stack gap={2}>
          <Cluster>
            {screen && <Select label="Screen state" value={params.get("state") ?? ""} onChange={(e) => navigate(path, { state: e.target.value || undefined, replace: true })} options={[{ value: "", label: "As it opens" }, ...screen.states.map((s) => ({ value: s, label: s }))]} />}
            <Button variant="secondary" onClick={resetSampleData}>Reset prototype data</Button>
          </Cluster>
          {JOURNEYS.map((j) => (
            <Cluster key={j.id} as="nav" gap={1} aria-label={`Journey: ${j.goal || j.id}`}>
              <span>{j.goal || j.id}</span>
              {j.steps.map((st, k) => <Button key={k} variant="text" size="sm" aria-current={st.path === path ? "step" : undefined} onClick={() => navigate(st.path, { state: st.state })}>{k + 1}. {st.title}</Button>)}
            </Cluster>
          ))}
        </Stack>
      </details>
    </aside>
  );
}
