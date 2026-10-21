/* ux-builder-audit assess init: propose a manifest from the repository
   (FEAT-009 CTX-02, HLX-01; US-056-AC1).

   Reads the HELIX marker, flow and catalogue, the package.json scripts and
   any Playwright configuration, and lists the flow's stories as candidate
   journeys by ID only. It copies no requirement text, and leaves every value
   it cannot determine as an explicit <fill-in: …> placeholder. */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { stringify } from "yaml";
import { bind, HelixError, instances } from "./helix.mjs";

const fill = (what) => `<fill-in: ${what}>`;
const TEST_SCRIPTS = ["test", "test:unit", "test:e2e", "e2e", "test:integration"];

export function propose(dir) {
  const pkg = (() => { try { return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")); } catch { return null; } })();
  const notes = [];
  let helix = {}, stories = [], flowNote = null;
  try {
    const b = bind(dir, {});
    helix = { flow: b.flow.id, catalog: "auto" };
    const docs = instances(b.flow, b.types, { repo: b.marker.repo });
    stories = docs.filter((d) => d.id && /^US-\d+$/.test(d.id)).map((d) => ({ id: d.id, path: d.path }));
    flowNote = `HELIX: marker ${relative(dir, b.marker.file) || ".helix.yml"}, flow "${b.flow.id}" (root ${b.flow.rootRel}), catalogue ${b.catalog.source}${b.catalog.version ? ` ${b.catalog.version}` : ""}; ${docs.length} documents, ${stories.length} stories.`;
  } catch (e) {
    if (!(e instanceof HelixError)) throw e;
    helix = { flow: fill(e.code === "ambiguous" ? e.message : "the HELIX flow (no usable .helix.yml was found)") };
    notes.push(e.message);
  }
  const scripts = pkg?.scripts ?? {};
  const tests = TEST_SCRIPTS.filter((s) => scripts[s]).map((s) => ({ id: s.replace(/[:]/g, "-"), command: s === "test" ? "npm test" : `npm run ${s}` }));
  // A Playwright configuration with no script that runs it: propose running it directly.
  const config = ["", "e2e"].map((d) => existsSync(join(dir, d)) ? readdirSync(join(dir, d)).filter((f) => /^playwright\.config\.(m?[jt]s|cjs)$/.test(f)).map((f) => join(d, f)) : []).flat()[0];
  if (config && !tests.some((t) => /e2e|playwright/.test(t.command))) tests.push({ id: "e2e", command: `npx playwright test --config ${config}` });
  const manifest = {
    version: 1,
    app: { name: pkg?.name ?? basename(dir) },
    helix,
    run: {
      start: scripts.preview ? "npm run preview" : scripts.dev ? "npm run dev" : fill("the command that serves the app"),
      baseUrl: fill("the URL the app answers on, e.g. http://127.0.0.1:4173/"),
      environment: "local",
    },
    roles: [{ id: fill("a test role, e.g. reviewer"), auth: "none" }],
    journeys: (stories.length ? stories : [{ id: fill("a story ID") }]).map((s) => ({
      id: `J-${s.id.toLowerCase()}`, story: s.id, priority: fill("critical, important or secondary"), role: fill("a role id"), entry: fill("the route the journey starts at"),
    })),
    ...(tests.length ? { tests } : {}),
    restrictions: { writes: "report-only" },
  };
  const head = [
    "# UX assessment manifest (FEAT-009, CONTRACT-006). Proposed by ux-builder-audit assess init.",
    "# Fill in every <fill-in: …>, delete journeys you will not assess, then run: ux-builder-audit assess validate",
    "# It binds the app's HELIX documents through the marker; it never copies their requirements.",
    ...(flowNote ? [`# ${flowNote}`] : []),
    ...notes.map((n) => `# Note: ${n}`),
    "",
  ].join("\n");
  return { text: head + stringify(manifest, { lineWidth: 0 }), manifest };
}
