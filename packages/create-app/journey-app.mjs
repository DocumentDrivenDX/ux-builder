/* The journey skeleton (US-159; FEAT-018 GDL-81): the app built from a
   designed blueprint opens on its screens, not on an empty Home.

   A route per screen (on the History API, as the starter's shell routes), each
   screen its title, purpose and content in the blueprint's order with sample
   data made from the blueprint (no network, the same every time), the
   journeys' actions leading from step to step, the dialogs and sheets the
   blueprint declares, and each screen's states (states.mjs: loading, empty,
   error and its retry, the rest it declares or a journey names) with a
   warning where a task or step cites a business rule. ?state=<name> forces a
   state; the prototype toolbar (npm run dev, or ?prototype) forces one too,
   walks a journey and resets the sample data.

   Every file it writes starts with a header naming the blueprint and its
   hash and the file's own content hash. Run again (`create-app --prototype`),
   it replaces a file whose content still has that hash, and leaves (and
   lists) one edited by hand or not written by it. */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CURRENT } from "@ux-builder/ui/blueprint/paths";
import { screensOf, stateModels, target, walkJourney } from "@ux-builder/ui/blueprint/model";
import { assistantPath, normalize } from "./shell.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const list = (x) => (Array.isArray(x) ? x.filter((y) => y && typeof y === "object") : []);
const strings = (x) => (Array.isArray(x) ? x.filter((y) => typeof y === "string" && y.trim()) : []);
const sha = (t) => createHash("sha256").update(t).digest("hex");
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "screen";
const pascal = (s) => slug(s).split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("").replace(/^(\d)/, "S$1");
const DISMISS = { cancel: "Cancel", close: "Close", done: "Done" };

/* ------------------------------------------------------------ the model */

/* What the skeleton is made of, or { skip: why } when there is nothing to make. */
export function journeyModel(bp, { modalities } = {}) {
  const ms = normalize(modalities ?? bp?.supports?.modalities ?? ["responsive-web"]);
  if (bp?.kind === "view") return { skip: "the blueprint is a view's; its host draws it" };
  if (!ms.includes("responsive-web")) return { skip: "the app has no responsive-web modality; the conversation is its screen" };
  const screens = screensOf(bp);
  const own = [...screens.values()].map(({ s }) => s).filter((s) => s.pattern !== "Conversation");
  const journeys = list(bp?.journeys).filter((j) => typeof j.id === "string" && list(j.steps).length);
  if (!own.length || !journeys.length) return { skip: "the blueprint has no screens with journeys yet" };
  const chat = ms.some((m) => m !== "responsive-web");

  // A path per screen: its own, else the entry at /, else /<id>.
  const taken = new Set(chat ? [assistantPath(ms)] : []), paths = new Map();
  const entry = list(bp.destinations).map((d) => d.screen).find((id) => own.some((s) => s.id === id)) ?? own[0].id;
  for (const s of own) if (typeof s.path === "string" && /^\/[^?#]*$/.test(s.path) && !taken.has(s.path)) { paths.set(s.id, s.path); taken.add(s.path); }
  for (const s of [own.find((x) => x.id === entry), ...own]) {
    if (paths.has(s.id)) continue;
    let p = s.id === entry && !taken.has("/") ? "/" : `/${slug(s.id)}`;
    for (let n = 2; taken.has(p); n++) p = `/${slug(s.id)}-${n}`;
    paths.set(s.id, p); taken.add(p);
  }
  for (const [id, { s }] of screens) if (s.pattern === "Conversation") paths.set(id, assistantPath(ms));
  const pathOf = (id) => paths.get(id);
  const titleOf = (id) => screens.get(id)?.s.title ?? id;

  // Where an action leads: its own `to`, else the journey's next step.
  const go = (t) => !t ? { kind: "none" }
    : t.kind === "screen" ? { kind: "screen", path: pathOf(t.screen) }
      : t.kind === "modal" ? { kind: "modal", modal: t.modal }
        : t.kind === "state" ? { kind: "state", state: t.state === "ready" ? "ideal" : t.state }
          : { kind: t.kind };
  const nextOf = new Map(), extra = new Map(); // "screen|action" -> go; screen -> synthesized Continue actions
  const rulesAt = new Map(), fieldsAt = new Map();
  const cite = (id, rule) => { if (!rulesAt.has(id)) rulesAt.set(id, []); if (!rulesAt.get(id).includes(rule)) rulesAt.get(id).push(rule); };
  const ask = (key, names, required, inferable = false) => {
    if (!fieldsAt.has(key)) fieldsAt.set(key, []);
    for (const label of names) if (!fieldsAt.get(key).some((f) => f.label === label)) fieldsAt.get(key).push({ name: slug(label), label, required, inferable });
  };
  const tasks = new Map(list(bp.tasks).filter((t) => typeof t.id === "string").map((t) => [t.id, t]));
  const J = journeys.map((j) => {
    const { main } = walkJourney(j, screens);
    main.forEach((w, k) => {
      if (!w.node) return;
      const key = w.node.modal ? `${w.node.screen}:${w.node.modal}` : w.node.screen;
      for (const r of strings(w.st.rules)) cite(w.node.screen, r);
      ask(key, strings(w.st.inputs?.required), true);
      ask(key, strings(w.st.inputs?.inferable), false, true);
      const next = main[k + 1]?.node;
      if (!next || w.node.modal || next.modal || next.screen === w.node.screen) return;
      if (w.action && !w.to) nextOf.set(`${w.node.screen}|${w.action.id}`, { kind: "screen", path: pathOf(next.screen), journey: j.id });
      if (!w.action && typeof w.st.action !== "string") {
        if (!extra.has(w.node.screen)) extra.set(w.node.screen, []);
        const id = `continue-${slug(next.screen)}`;
        if (!extra.get(w.node.screen).some((a) => a.id === id)) extra.get(w.node.screen).push({ id, label: `Continue to ${titleOf(next.screen)}`, primary: false, go: { kind: "screen", path: pathOf(next.screen), journey: j.id } });
      }
    });
    const t = tasks.get(j.task);
    for (const r of strings(t?.rules)) for (const w of main) if (w.node) cite(w.node.screen, r);
    // A task's inputs no step asks for: on the journey's first screen.
    if (t && !main.some((w) => list([w.st.inputs]).length) && main[0]?.node) {
      ask(main[0].node.screen, strings(t.inputs?.required), true);
      ask(main[0].node.screen, strings(t.inputs?.optional), false);
    }
    return {
      id: j.id, story: typeof j.story === "string" ? j.story : null, task: j.task ?? null, goal: t?.goal ?? null,
      steps: main.filter((w) => w.node).map((w) => ({ screen: w.node.screen, path: pathOf(w.node.screen), title: w.node.modal ? `${titleOf(w.node.screen)}, ${screens.get(w.node.screen).modals.get(w.node.modal)?.title ?? w.node.modal}` : titleOf(w.node.screen), ...(w.node.modal ? { modal: w.node.modal } : {}), ...(typeof w.st.state === "string" ? { state: w.st.state } : {}), action: w.action ? { id: w.action.id, label: w.action.label ?? w.action.id } : null })),
    };
  });

  const designed = new Map(list(bp.businessRules).filter((r) => typeof r.id === "string").map((r) => [r.id, r]));
  const models = new Map(stateModels(bp).map((m) => [m.screen, m]));
  const actionOf = (a, at) => ({ id: a.id ?? slug(a.label ?? "action"), label: a.label ?? a.id ?? "Action", primary: !!a.primary, go: nextOf.get(`${at.screen}|${a.id}`) ?? go(target(a.to, at, screens)) });
  const S = own.map((s) => {
    const actions = list(s.actions).map((a) => actionOf(a, { screen: s.id }));
    if (!actions.some((a) => a.primary) && s.primaryAction?.label) actions.unshift({ id: slug(s.primaryAction.label), label: s.primaryAction.label, primary: true, go: { kind: "none" } });
    actions.push(...(extra.get(s.id) ?? []).filter((x) => !actions.some((a) => a.go.kind === "screen" && a.go.path === x.go.path)));
    const rules = (rulesAt.get(s.id) ?? []).map((id) => ({ id, ...(designed.get(id) ?? {}) }));
    const states = [...(models.get(s.id)?.states ?? ["ideal"]), ...(rules.length ? ["blocked"] : [])];
    const modals = [...screens.get(s.id).modals.values()].map((m) => ({ id: m.id, title: m.title || m.id, kind: m.kind === "sheet" ? "sheet" : "dialog", dismiss: DISMISS[m.dismiss] ?? "Close", fields: fieldsAt.get(`${s.id}:${m.id}`) ?? [], actions: list(m.actions).map((a) => actionOf(a, { screen: s.id, modal: m.id })) }));
    const content = list(s.content).filter((c) => typeof c.label === "string" && c.label.trim()).map((c) => ({ label: c.label, ...(c.kind ? { kind: c.kind } : {}) }));
    return { id: s.id, path: pathOf(s.id), title: s.title ?? s.id, purpose: s.purpose ?? null, pattern: s.pattern ?? null, component: null, file: null, content: content.length ? content : [{ label: s.title ?? s.id, kind: LISTS.has(s.pattern) ? "list" : "details" }], fields: fieldsAt.get(s.id) ?? [], actions, rules, states, modals };
  });
  const names = new Set();
  for (const s of S) { let n = `${pascal(s.id)}Screen`; for (let i = 2; names.has(n); i++) n = `${pascal(s.id)}${i}Screen`; names.add(n); s.component = n; s.file = `src/screens/${n}.jsx`; }
  const destinations = list(bp.destinations).filter((d) => paths.has(d.screen)).map((d) => ({ id: d.id ?? d.screen, label: d.label ?? titleOf(d.screen), screen: d.screen, path: pathOf(d.screen) }));
  if (chat && !destinations.some((d) => d.path === assistantPath(ms))) destinations.push({ id: "assistant", label: "Assistant", screen: "assistant", path: assistantPath(ms) });
  return { name: bp.name ?? "app", modalities: ms, chat, screens: S, journeys: J, destinations, sample: sampleOf(S) };
}

/* ------------------------------------------------------ sample data */
const LISTS = new Set(["CollectionList", "WorkQueue", "ListDetail", "AuditLog", "EditableGrid", "Board"]);
const singular = (w) => { const s = /ies$/i.test(w) ? w.replace(/ies$/i, "y") : /(ch|sh|ss|x)es$/i.test(w) ? w.slice(0, -2) : w.replace(/([^s])s$/i, "$1"); return s.charAt(0).toUpperCase() + s.slice(1); };
/* How a content item shows: a table for a list, details for a record, text for words. */
export function viewOf(c) {
  const k = String(c.kind ?? "").toLowerCase(), last = c.label.trim().split(/\s+/).pop();
  if (/text|note|message|help|copy|description/.test(k)) return "text";
  if (/list|collection|table|records|items|results|rows|feed/.test(k)) return "table";
  if (/[^su]s$/i.test(last) && !/filter|setting|detail|option|access|status|address/i.test(c.label)) return "table";
  return "details";
}
const VALUES = [
  [/date|when|day|time|schedule/i, "Sat 14 Nov, 07:30"], [/e-?mail/i, "sam.rivera@example.com"], [/phone/i, "+1 555 0100"],
  [/name|person|owner|who|author|contact/i, "Sam Rivera"], [/price|cost|amount|total|fee/i, "$24.00"], [/count|number|quantity|size/i, "12"],
  [/location|address|place|where|access|map/i, "North Fork, public access at Mile 4"], [/status|state/i, "Open"], [/note|comment|description/i, "Bring waders; the bank is steep."],
];
export const sampleValue = (label) => VALUES.find(([re]) => re.test(label))?.[1] ?? `${label} (sample)`;
const STATUS = ["Open", "In progress", "Done"], WHEN = ["Today", "Yesterday", "3 days ago"];

/* Each screen's (and dialog's) sample: its content's rows or details, and its fields' values. */
function sampleOf(screens) {
  const out = {};
  for (const s of screens) {
    out[s.id] = {
      content: s.content.map((c) => {
        const view = viewOf(c);
        if (view === "table") return { rows: [1, 2, 3].map((n, i) => ({ id: `${slug(c.label)}-${n}`, name: `${singular(c.label.trim().split(/\s+/).pop())} ${n}`, status: STATUS[i], updated: WHEN[i] })) };
        if (view === "text") return { text: `${c.label}: sample text, written from the blueprint, until the real copy is written.` };
        return { items: [{ label: c.label, value: sampleValue(c.label) }, { label: "Status", value: "Open" }, { label: "Updated", value: "Today" }] };
      }),
      fields: Object.fromEntries(s.fields.filter((f) => f.inferable).map((f) => [f.name, sampleValue(f.label)])),
    };
    for (const m of s.modals) if (m.fields.length) out[`${s.id}:${m.id}`] = { content: [], fields: Object.fromEntries(m.fields.filter((f) => f.inferable).map((f) => [f.name, sampleValue(f.label)])) };
  }
  return out;
}

/* ----------------------------------------------------------- the files */
const js = (v) => JSON.stringify(v, null, 2);
const attr = (s) => `{${JSON.stringify(s)}}`;
const COLUMNS = '[{ key: "name", label: "Name", priority: true }, { key: "status", label: "Status" }, { key: "updated", label: "Updated" }]';

function blueprintFile(m, { blueprint, hash }) {
  return `/* The designed blueprint, as the journey skeleton reads it: each screen's
   path, title, purpose, content, fields, actions (and where each leads),
   business rules, states and dialogs; the journeys in step order; the sample
   data. Change the blueprint and run create-app --prototype, rather than
   editing this file. */

export const APP = ${js({ name: m.name, blueprint, hash })};

export const DESTINATIONS = ${js(m.destinations)};

export const SCREENS = ${js(m.screens.map(({ component, file, ...s }) => s))};

export const JOURNEYS = ${js(m.journeys)};

export const SAMPLE = ${js(m.sample)};
`;
}

function screenFile(s) {
  const views = s.content.map(viewOf);
  const ui = ["Card", ...(views.includes("table") ? ["DataTable"] : []), ...(s.fields.length ? ["TextField"] : [])];
  const patterns = [...(views.includes("details") ? ["DescriptionList"] : []), ...(s.fields.length ? ["Stack"] : [])];
  const runtime = ["ScreenFrame", "useSample", ...(s.fields.length ? ["useFields"] : [])];
  const blocks = s.content.map((c, i) => {
    const v = views[i];
    if (v === "table") return `        <Card title=${attr(c.label)}>\n          <DataTable caption=${attr(c.label)} columns={COLUMNS} rows={sample.content[${i}]?.rows ?? []} />\n        </Card>`;
    if (v === "text") return `        <Card title=${attr(c.label)}>\n          <p>{sample.content[${i}]?.text}</p>\n        </Card>`;
    return `        <Card title=${attr(c.label)}>\n          <DescriptionList items={sample.content[${i}]?.items ?? []} />\n        </Card>`;
  });
  if (s.fields.length) blocks.push(`        <Card title="Details">\n          <Stack gap={3}>\n${s.fields.map((f) => `            <TextField label=${attr(f.label)}${f.required ? " required" : ""} {...field(${JSON.stringify(f.name)})} />`).join("\n")}\n          </Stack>\n        </Card>`);
  return `/* ${s.title} (docs/ux-builder/blueprint/app.blueprint.json, screen "${s.id}")${s.purpose ? `: ${s.purpose.replace(/\*\//g, "* /")}` : ""}
   Its content, highest priority first, with sample data; ScreenFrame adds
   the title and purpose, the states, the business rules, the actions and
   the dialogs. Build the real screen here, from its pattern${s.pattern ? ` (${s.pattern})` : ""}. */
import { ${ui.join(", ")} } from "@ux-builder/ui";
${patterns.length ? `import { ${patterns.join(", ")} } from "@ux-builder/ui/patterns";\n` : ""}import { ${runtime.join(", ")} } from "../journey/runtime.jsx";
import { SCREENS } from "../journey/blueprint.js";

const SCREEN = SCREENS.find((s) => s.id === ${JSON.stringify(s.id)});
${views.includes("table") ? `const COLUMNS = ${COLUMNS};\n` : ""}
export function ${s.component}() {
  const sample = useSample(SCREEN.id);
${s.fields.length ? "  const field = useFields(SCREEN.id);\n" : ""}  return (
    <ScreenFrame screen={SCREEN}>
${blocks.join("\n")}
    </ScreenFrame>
  );
}
`;
}

const ICONS = [[/home|start|today/i, "home"], [/search|find|explore|browse/i, "search"], [/setting|preference/i, "settings"], [/profile|account|me\b|people|team/i, "user"], [/calendar|schedule|plan|trip/i, "calendar"], [/help|support/i, "help"]];
const iconOf = (label, i) => ICONS.find(([re]) => re.test(label))?.[1] ?? (i === 0 ? "home" : "view");

function appFile(m) {
  const routes = m.screens.map((s) => `  ${JSON.stringify(s.path)}: ${s.component},`);
  if (m.chat) routes.push(`  ${JSON.stringify(assistantPath(m.modalities))}: Assistant,`);
  const nav = m.destinations.map((d, i) => ({ id: d.id, label: d.label, href: d.path, icon: iconOf(d.label, i), screen: d.screen }));
  return `import { AppShell } from "@ux-builder/ui/patterns";
import { Brand, ThemeSwitch } from "./ThemeSwitch.jsx";
import { NotFound, PrototypeToolbar, navigate, screenAt, useRoute } from "./journey/runtime.jsx";
import { JOURNEYS } from "./journey/blueprint.js";
${m.screens.map((s) => `import { ${s.component} } from "./screens/${s.component}.jsx";`).join("\n")}
${m.chat ? 'import { Assistant } from "./Assistant.jsx";\n' : ""}
/* The app's frame (docs/ux-builder/blueprint/app.blueprint.json): a route per
   screen, the destinations in AppShell's navigation, and the prototype
   toolbar in npm run dev (or with ?prototype). A screen reached from no
   destination marks the destination its journey started from. */
const ROUTES = {
${routes.join("\n")}
};
const NAV = ${js(nav.map(({ screen, ...n }) => n))};

function currentOf(path) {
  const own = NAV.find((d) => d.href === path);
  if (own) return own.id;
  const screen = screenAt(path)?.id;
  const journey = JOURNEYS.find((j) => j.steps.some((st) => st.screen === screen));
  return NAV.find((d) => d.href === journey?.steps[0]?.path)?.id ?? null;
}

export function App() {
  const { path } = useRoute();
  const Screen = ROUTES[path] ?? NotFound;
  return (
    <AppShell nav={NAV} current={currentOf(path)} onNavigate={(item) => navigate(item.href)} brand={<Brand />} actions={<ThemeSwitch />}>
      <PrototypeToolbar />
      <Screen key={path} />
    </AppShell>
  );
}
`;
}

function specFile(m) {
  const walks = m.journeys.map((j) => {
    // Follow the steps while each one's action leads to the next: a screen, or a dialog on it.
    const moves = [];
    for (const [k, st] of j.steps.entries()) {
      const next = j.steps[k + 1], s = m.screens.find((x) => x.id === st.screen);
      const a = next && st.action ? (st.modal ? s?.modals.find((x) => x.id === st.modal)?.actions : s?.actions)?.find((x) => x.id === st.action.id) : null;
      const click = `  await ${st.modal ? `page.getByRole("dialog").locator(${JSON.stringify(`[data-action="${a?.id}"]`)})` : `page.locator(${JSON.stringify(`[data-piq-screen="${st.screen}"] [data-action="${a?.id}"]`)})`}.first().click();`;
      if (a?.go.kind === "screen" && a.go.path === next.path && !next.modal) moves.push(`${click}\n  await expect(page).toHaveURL(new RegExp(${JSON.stringify(next.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\?|$)")}));\n  await expect(page.locator(${JSON.stringify(`[data-piq-screen="${next.screen}"]`)})).toBeVisible();`);
      else if (a?.go.kind === "modal" && next.modal === a.go.modal && next.screen === st.screen) moves.push(`${click}\n  await expect(page.getByRole("dialog", { name: ${JSON.stringify(s.modals.find((x) => x.id === next.modal)?.title)} })).toBeVisible();`);
      else break;
    }
    const first = j.steps[0];
    return `
test(${JSON.stringify(`journey ${j.id}: its actions lead from step to step`)}, async ({ page }) => {
  await page.goto(${JSON.stringify(first.path)});
  await expect(page.locator(${JSON.stringify(`[data-piq-screen="${first.screen}"]`)})).toBeVisible();
${moves.join("\n") || "  // No step's action leads to the next screen yet."}
});
`;
  });
  const s = m.screens[0];
  return `// The journey skeleton (docs/ux-builder/blueprint/app.blueprint.json): each
// journey walked by its actions, and a state forced with ?state=. It cites no
// criteria: add \`// @covers US-<n>-AC<m>\` as each screen is built for real.
import { expect, test } from "@playwright/test";
${walks.join("")}
test("?state= forces a state, and its retry recovers", async ({ page }) => {
  await page.goto(${JSON.stringify(`${s.path}?state=error`)});
  const screen = page.locator(${JSON.stringify(`[data-piq-screen="${s.id}"]`)});
  await expect(screen).toHaveAttribute("data-state", "error");
  await screen.getByRole("button", { name: "Try again" }).click();
  await expect(screen).toHaveAttribute("data-state", "ideal");
});

test("the prototype toolbar resets the sample data", async ({ page }) => {
  await page.goto(${JSON.stringify(`${s.path}?prototype`)});
  await expect(page.getByRole("complementary", { name: "Prototype toolbar" }).getByRole("button", { name: "Reset prototype data" })).toBeVisible();
});
`;
}

/* --------------------------------------------------- header and writing */
const HEADER = /^\/\/ @generated by @ux-builder\/create-app from ([^\n]*)\n\/\/ blueprint sha256:([0-9a-f]{64}) content sha256:([0-9a-f]{64})\n\/\/[^\n]*\n/;
export const stamp = (body, { blueprint, hash }) => `// @generated by @ux-builder/create-app from ${blueprint}\n// blueprint sha256:${hash} content sha256:${sha(body)}\n// Edit it freely: once edited, create-app --prototype leaves it as it is and lists it.\n${body}`;

/* A file's header, and whether its content is still as written: { generated, edited, blueprintHash }. */
export function headerOf(text) {
  const h = HEADER.exec(text);
  if (!h) return { generated: false, edited: true };
  return { generated: true, blueprint: h[1], blueprintHash: h[2], edited: sha(text.slice(h[0].length)) !== h[3] };
}

/* The starter's own files, which a first run may replace. */
const STARTER = () => ["App.web.jsx", "App.both.jsx", "App.chat.jsx"].map((f) => readFileSync(join(HERE, "shells", f), "utf8"));

/* Write the skeleton into the app at dir from its blueprint. Returns
   { generated, skip?, blueprintHash, written, unchanged, kept: [{ file, why }],
   removed, screens, journeys }. */
export function generateJourneyApp(dir, { modalities, blueprint = CURRENT.blueprint } = {}) {
  const app = resolve(dir);
  const text = readFileSync(join(app, blueprint), "utf8");
  const bp = JSON.parse(text);
  const hash = sha(text);
  const m = journeyModel(bp, { modalities });
  const r = { generated: false, blueprintHash: `sha256:${hash}`, written: [], unchanged: [], kept: [], removed: [] };
  if (m.skip) return { ...r, skip: m.skip };
  const files = {
    "src/App.jsx": appFile(m),
    "src/journey/blueprint.js": blueprintFile(m, { blueprint, hash: `sha256:${hash}` }),
    "src/journey/runtime.jsx": readFileSync(join(HERE, "journey/runtime.jsx"), "utf8"),
    ...Object.fromEntries(m.screens.map((s) => [s.file, screenFile(s)])),
    "e2e/journeys.spec.js": specFile(m),
  };
  const starter = STARTER();
  for (const [f, body] of Object.entries(files)) {
    const to = join(app, f), out = stamp(body, { blueprint, hash });
    if (existsSync(to)) {
      const have = readFileSync(to, "utf8"), h = headerOf(have);
      if (have === out) { r.unchanged.push(f); continue; }
      if (!h.generated && !starter.includes(have)) { r.kept.push({ file: f, why: "not written by the generator" }); continue; }
      if (h.generated && h.edited) { r.kept.push({ file: f, why: "edited by hand" }); continue; }
    }
    mkdirSync(dirname(to), { recursive: true });
    writeFileSync(to, out);
    r.written.push(f);
  }
  // A generated screen the blueprint no longer has, never edited, goes.
  const screensDir = join(app, "src/screens");
  for (const n of existsSync(screensDir) ? readdirSync(screensDir).sort() : []) {
    const f = `src/screens/${n}`;
    if (files[f]) continue;
    const h = headerOf(readFileSync(join(app, f), "utf8"));
    if (!h.generated) continue;
    if (h.edited) { r.kept.push({ file: f, why: "edited by hand; its screen is no longer in the blueprint" }); continue; }
    rmSync(join(app, f));
    r.removed.push(f);
  }
  return { ...r, generated: true, screens: m.screens.map((s) => ({ id: s.id, path: s.path, file: s.file })), journeys: m.journeys.map((j) => ({ id: j.id, story: j.story })) };
}

/* The starter's test without its Home test, once Home is no longer the app's first screen. */
export function withoutHome(spec) {
  return spec.replace(/\n(?:\/\/ @covers [^\n]*\n)?test\("Home: [\s\S]*?\n\}\);\n/, "\n");
}
