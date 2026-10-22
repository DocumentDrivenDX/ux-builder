/* The new app's HELIX documents (FEAT-010 HLA-01 to HLA-03; ADR-027
   decisions 5 and 6).

   Each document is the installed HELIX's template for its type, written at
   the type's output location and naming, with ddx: frontmatter. What the
   starter knows (the app's name and theme, its stack, the shell for its
   modalities (FEAT-014 MOD-05), its checks) replaces the placeholder text under the matching heading;
   everything only the product's owner can decide stays as the template
   wrote it. A heading the starter fills that a template no longer has is
   added at the end, so a later HELIX's templates never break creation. */

import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { MODALITIES } from "@ux-builder/ui/blueprint/modalities";
import { ref } from "./helix.mjs";
import { assistantPath, criteria as shellCriteria } from "./shell.mjs";

const TYPES = { "product-vision": "00-discover", prd: "01-frame", concerns: "01-frame", "feature-specification": "01-frame", "user-stories": "01-frame", "design-system": "02-design", "test-plan": "03-test", "story-test-plan": "03-test" };

/* A type's template and where its instances go, from the installed catalogue. */
function typeOf(helix, type) {
  const base = `activities/${TYPES[type]}/artifacts/${type}`;
  const meta = ref(helix, `${base}/meta.yml`) ?? "";
  const location = (/^\s*location:\s*"?([^"\n]+)"?/m.exec(meta)?.[1] ?? "").trim().replace(/^docs\/helix\//, "");
  const naming = (/^\s*naming:\s*"?([^"\n]+)"?/m.exec(meta)?.[1] ?? "").trim();
  return { base, template: ref(helix, `${base}/template.md`), location, naming };
}

/* The instance's path under docs/helix/ for its type, named by the catalogue. */
function pathFor(t, vars) {
  const fill = (s) => s.replace(/\{[^}]*number[^}]*\}|\{id\}/g, vars.number ?? "").replace(/\{[^}]*(?:title|slug|name)[^}]*\}|\[[^\]]*name[^\]]*\]/g, vars.slug ?? "");
  if (!t.location) return null;
  if (t.location.endsWith("/")) return t.location + fill(t.naming || "{number}-{slug}.md");
  const file = t.location.split("/").pop();
  return /[{[]/.test(file) ? t.location.slice(0, -file.length) + fill(file) : t.location;
}

/* Split Markdown into its frontmatter, the text before the first heading, and its sections. */
function parse(text) {
  const fm = /^---\n([\s\S]*?)\n---\n/.exec(text);
  const body = fm ? text.slice(fm[0].length) : text;
  const sections = [];
  let head = "", cur = null;
  for (const line of body.split("\n")) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { cur = { level: h[1].length, title: h[2].trim(), lines: [] }; sections.push(cur); continue; }
    if (cur) cur.lines.push(line); else head += line + "\n";
  }
  return { frontmatter: fm?.[1] ?? null, head, sections };
}

const key = (s) => s.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/* The template with ddx: id/type/status/links set, its title replaced, and the
   starter's sections merged by heading (HLA-03). */
export function draft(template, { id, type, title, links = [], sections = {}, intro, fields = {} }) {
  const t = parse(template ?? "");
  // "**Feature**: [placeholder]" lines the starter knows the answer to.
  for (const [name, value] of Object.entries(fields)) t.head = t.head.replace(new RegExp(`^\\*\\*${name}\\*\\*:.*$`, "m"), `**${name}**: ${value}`);
  const fieldLines = (lines) => lines.map((l) => { const m = /^\*\*([^*]+)\*\*:/.exec(l); return m && fields[m[1]] != null ? `**${m[1]}**: ${fields[m[1]]}` : l; });
  // Frontmatter: keep the template's keys; set id, type, status and links.
  let fm = (t.frontmatter ?? "ddx:\n  id: X").split("\n").filter((l) => !/^\s{2}(type|status):/.test(l));
  fm = fm.map((l) => (/^\s{2}id:/.test(l) ? `  id: ${id}\n  type: ${type}\n  status: draft` : l));
  if (links.length && !fm.some((l) => /^\s{2}links:/.test(l))) {
    const at = fm.findIndex((l) => /^\s{2}status:/.test(l) || /status: draft/.test(l));
    fm.splice(at + 1, 0, "  links:", ...links.flatMap(([kind, to]) => [`    - kind: ${kind}`, `      to: ${to}`]));
  }
  const wanted = new Map(Object.entries(sections).map(([h, v]) => [key(h), { heading: h, body: v }]));
  const used = new Set();
  const out = [];
  for (const [i, s] of t.sections.entries()) {
    const heading = i === 0 && title ? title : s.title;
    const w = wanted.get(key(s.title));
    out.push(`${"#".repeat(s.level)} ${heading}`);
    if (i === 0 && intro) out.push("", intro);
    if (w && !used.has(key(s.title))) { used.add(key(s.title)); out.push("", w.body.trim(), ""); }
    else out.push(...(i === 0 ? fieldLines(s.lines) : s.lines));
  }
  if (!t.sections.length && title) out.push(`# ${title}`, "", intro ?? "");
  for (const [k, w] of wanted) if (!used.has(k)) out.push("", `## ${w.heading}`, "", w.body.trim(), "");
  return `---\n${fm.join("\n")}\n---\n${t.head.trim() ? `\n${t.head.trim()}\n` : ""}\n${out.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`
    .replace(new RegExp(`\\b${type === "user-stories" ? "US" : type === "feature-specification" ? "FEAT" : type === "story-test-plan" ? "STP" : type === "test-plan" ? "TP" : "NONE"}-XXX`, "g"), id);
}

const today = () => new Date().toISOString().slice(0, 10);

/* What the starter knows, as document sections. Owner decisions are absent on purpose (HLA-02). */
function content(r, helix) {
  const app = r.name, theme = r.theme, ui = r.versions["@ux-builder/ui"], helixVersion = helix.manifest.version;
  const note = (what) => `> Drafted by \`@ux-builder/create-app\` on ${today()} from HELIX ${helixVersion}'s template. ${what}`;
  const ms = r.modalities;
  const criteria = shellCriteria(ms).map((c) => [c.id, c.text]);
  const both = ms.includes("responsive-web") && ms.length > 1;
  const chat = ms.some((m) => m !== "responsive-web");
  const kinds = ms.map((m) => `\`${m}\``).join(" and ");
  const shell = ms.map((m) => `- **\`${m}\`**: ${MODALITIES[m].shell}, built with ${MODALITIES[m].components.map((c) => `\`${c}\``).join(", ")}.`).join("\n");
  return {
    vision: { intro: note("Every section is the product owner's to write; nothing here is decided yet.") },
    prd: {
      intro: note("The product decisions are yours to write; only the technical context below is filled in."),
      sections: {
        "Technical Context": [
          `- **App**: ${app}, a React 19 + Vite app created with \`@ux-builder/create-app\`.`,
          `- **UI**: \`@ux-builder/ui\` ${ui} and \`@ux-builder/tokens\` ${r.versions["@ux-builder/tokens"]}, theme \`${theme}\`; screens are planned in \`app.blueprint.json\` and built from the SDK's patterns.`,
          "- **Checks**: `npm run lint` (no hard-coded colours, fonts or radii), `npm run check:blueprint`, `npm run audit` (every theme and appearance), `npm run test:e2e` (Playwright).",
          `- **Method**: HELIX ${helixVersion}, installed in \`.claude/skills/helix/\`; documents under \`docs/helix/\`.`,
        ].join("\n"),
      },
    },
    concerns: {
      intro: note("The stack's concerns are filled in from what the starter set up; add the product's own."),
      sections: {
        "Active Concerns": [
          "| Concern | Source | Areas | Why Active | Key Practices |",
          "|---------|--------|-------|------------|---------------|",
          "| react-vite | library | `area:ui` | The app is React 19 on Vite (chosen by the starter; `concerns.local.yml`) | Components and hooks; Vite builds |",
          "| e2e-playwright | library | `area:testing` | Core flows run in Playwright (`npm run test:e2e`) | One e2e tool; flows cite their criteria |",
          `| packaged-design-system | library | \`area:ui\` | The UI comes from \`@ux-builder/ui\` ${ui}, theme \`${theme}\` | Use the SDK's widgets and patterns; role tokens; no literals (lint, audit) |`,
          "| a11y-wcag-aa | library | `area:ui` | The audit checks contrast, targets, reflow and focus | WCAG 2.2 AA |",
          "| ux-interaction-patterns | library | `area:ui` | Screens follow the SDK's interaction rules (`app.blueprint.json`) | Plan screens in the blueprint; one primary action; safeguards; states |",
        ].join("\n"),
        "Project Overrides": [
          "| Concern | Practice | Override | Authority |",
          "|---------|----------|----------|-----------|",
          "| frontend-framework slot | HELIX's default `react-nextjs` | `react-vite`, as the starter created the app (operator override in `concerns.local.yml`) | The starter's stack |",
          "| language-runtime slot | HELIX's default `typescript-bun` | JavaScript on Node (assumption: HELIX has no Node concern) | Needs ADR |",
        ].join("\n"),
      },
    },
    feat: {
      title: "Feature Specification: FEAT-001 — The app's shell for its modalities",
      intro: note("It describes the empty shell the starter created for the app's modalities, so the app is traced from its first commit. Frame your first real feature next."),
      sections: {
        Overview: `${app} is a ${kinds} app (\`supports.modalities\` in \`app.blueprint.json\`). It starts as the empty shell for ${ms.length > 1 ? "those modalities" : "that modality"}, with no sample data, under a header with the theme's logo and a theme and appearance switcher:\n\n${shell}${both ? "\n\nWith several modalities the shell is an `AppShell` whose destinations are Home and Assistant, each built for its modality." : ""}\n\nIt is built only from \`@ux-builder/ui\` components and role tokens.`,
        "Functional Requirements by Area": `#### Shell\n\n${ms.map((m, i) => `SHL-0${i + 1}. The \`${m}\` shell: ${MODALITIES[m].shell}${m === "responsive-web" ? ", whose empty state says to frame the first feature in HELIX and plan its screens in the blueprint" : ", empty until a runtime is connected"}.`).join("\n\n")}\n\n#### Theme\n\nTHM-01. The theme and appearance can be switched, and every widget follows.`,
        "Functional Areas": `| Area | User question or job | Feature responsibility |\n|------|----------------------|------------------------|\n| Shell | "Where do I start?" | ${chat ? "Open on the shell for each modality" : "Open on the Home screen"} |\n| Theme | "Can I see it in another theme?" | Switch theme and appearance |`,
        "User Stories": "- [US-001 — Open the app and see where to start](../user-stories/US-001-open-the-app-and-see-where-to-start.md)",
        Dependencies: `- \`@ux-builder/ui\` ${ui}; the plan of the shell in \`app.blueprint.json\`; DESIGN.md.`,
      },
    },
    story: {
      title: "US-001: Open the app and see where to start",
      intro: note("It describes the starter's empty shell; rewrite it for your users as the app grows."),
      fields: { Feature: "FEAT-001 — The app's shell for its modalities", "Feature Requirements": `${ms.map((_, i) => `SHL-0${i + 1}`).join(", ")}, THM-01` },
      sections: {
        Walkthrough: [
          ...(ms.includes("responsive-web") ? [`The user opens the app; ${both ? "an AppShell with Home and Assistant shows Home" : "the Home screen"} says to frame the first feature in HELIX and plan its screens in the blueprint.`] : []),
          ...(chat ? [`The user ${both ? "opens Assistant" : "opens the app"}; an empty conversation offers its composer and says replies are generated by AI${ms.includes("hybrid-chat") ? "; a reply can carry an Adaptive Card" : ""}.`] : []),
          "The user picks another theme or appearance; the whole app follows.",
        ].map((x, i) => `${i + 1}. ${x}`).join("\n"),
        Story: `**As a** member of the team building ${app}\n**I want** to open the app and see where to start\n**So that** I can build its first feature in the shell for its modalities`,
        "Acceptance Criteria": criteria.map(([id, t]) => `- [ ] **${id}** — ${t}`).join("\n"),
        "Test Scenarios": "| Scenario | AC ID | Input / State | Action | Expected Result |\n|----------|-------|---------------|--------|-----------------|\n" + criteria.map(([id]) => `| ${id.slice(-3)} | ${id} | The starter's empty shell | See \`e2e/starter.spec.js\` | As the criterion says |`).join("\n"),
        Dependencies: "- **Feature Spec**: FEAT-001",
      },
    },
    design: {
      title: `DESIGN.md — ${app}`,
      intro: note(`The interface decisions the starter made with ux-builder; the plan of every screen is \`app.blueprint.json\`.`),
      sections: {
        "Navigation and Active State": ms.includes("responsive-web")
          ? `${both ? "Two destinations today, Home and Assistant" : "One destination today, Home"} (in \`app.blueprint.json\`), framed by the SDK's \`AppShell\`, which places navigation for the space available (a bottom bar or drawer when compact, a rail or side navigation when wide) and marks the current destination. Add destinations to the blueprint before building them.`
          : "One screen today, the conversation (in `app.blueprint.json`), filling the window under the header. Add screens to the blueprint before building them.",
        "Visual Hierarchy": `${ms.includes("responsive-web") ? "Home's page title, then its empty state (`StatePanel`) saying where to start" : "The header, then the `Conversation`: its AI disclosure, its log and its composer"}. One primary action per region (the SDK's \`emphasis.one-primary\` rule).`,
        "Interaction States": `${ms.includes("responsive-web") ? "Home's empty state comes from the SDK's `StatePanel`; every screen in the blueprint declares its empty, loading and error states." : ""}${chat ? `${ms.includes("responsive-web") ? " " : ""}The conversation's streaming, stopped and failed replies, Stop and Retry come from the SDK's \`Conversation\`.` : ""}`,
        Tokens: `From the theme \`${theme}\` (\`@ux-builder/tokens\`); the app styles its own markup only with \`--piq-*\` role tokens, which the lint rule enforces.`,
        Color: "`--piq-color-*` role tokens; no literal colours.",
        Spacing: "`--piq-space-*` steps 0 to 8.",
        Type: "The theme's fonts, `--piq-font-*`; never a font name in app code.",
      },
    },
    tp: {
      intro: note("The checks the starter set up; add the product's own."),
      sections: {
        Strategy: "Every acceptance criterion is cited by a test (`@covers US-<n>-AC<m>`). Lint and the blueprint check run on every change; the audit and the Playwright e2e run in CI (`.github/workflows/ci.yml`).",
        "Critical Paths (P0)": "1. The starter's shell (US-001): `e2e/starter.spec.js`.",
        "Build Commands": "```bash\nnpm run lint\nnpm run check:blueprint\nnpm run test:e2e\nnpm run audit\nnpx ux-builder-audit assess validate\n```",
      },
    },
    stp: {
      title: "Story Test Plan: STP-001-open-the-app-and-see-where-to-start",
      intro: note("Maps US-001 to the starter's Playwright test."),
      sections: {
        "Story Reference": "**User Story**: [[US-001-open-the-app-and-see-where-to-start]]\n**Project Test Plan**: [[test-plan]]",
        "Acceptance Criteria Test Mapping": "| AC ID | Acceptance Criterion | Test | Asserted Behavior | AC-ID Citation | Level | File |\n|-------|----------------------|------|-------------------|----------------|-------|------|\n" + criteria.map(([id, t]) => `| ${id} | ${t} | \`${id.toLowerCase()}\` | As the criterion says | \`@covers ${id}\` | E2E | \`e2e/starter.spec.js\` |`).join("\n"),
        "Primary Commands": "```bash\nnpm run test:e2e\n```",
      },
    },
  };
}

/* Write the starter set into the app (HLA-01). Returns the paths written.
   A type the installed HELIX has no template or location for is still
   written, from the starter's own sections, and the problem is printed. */
export function writeStarterSet(helix, r, { log = () => {} } = {}) {
  const c = content(r, helix);
  const docs = [
    ["product-vision", { id: "product-vision", ...c.vision }],
    ["prd", { id: "prd", links: [["informed_by", "product-vision"]], ...c.prd }],
    ["concerns", { id: "concerns", links: [["informed_by", "prd"]], ...c.concerns }],
    ["feature-specification", { id: "FEAT-001", number: "001", slug: "app-shell", links: [["informed_by", "prd"]], ...c.feat }],
    ["user-stories", { id: "US-001", number: "001", slug: "open-the-app-and-see-where-to-start", links: [["informed_by", "FEAT-001"]], ...c.story }],
    ["design-system", { id: "design-system", links: [["informed_by", "prd"], ["informed_by", "FEAT-001"]], ...c.design }],
    ["test-plan", { id: "TP-001", links: [["informed_by", "prd"], ["informed_by", "FEAT-001"]], ...c.tp }],
    ["story-test-plan", { id: "STP-001", number: "001", slug: "open-the-app-and-see-where-to-start", links: [["informed_by", "US-001"], ["informed_by", "TP-001"]], ...c.stp }],
  ];
  const written = [];
  for (const [type, d] of docs) {
    const t = typeOf(helix, type);
    const path = pathFor(t, d) ?? `${TYPES[type]}/${type}.md`;
    const missing = [t.template == null && `template (${t.base}/template.md)`, !t.location && `output location (${t.base}/meta.yml)`].filter(Boolean);
    if (missing.length) log(`HELIX ${helix.manifest.version} has no ${missing.join(" and no ")} for the ${type} type; docs/helix/${path} was drafted from the starter's own sections`);
    const file = join(r.dir, "docs/helix", path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, draft(t.template, { ...d, type }));
    written.push(`docs/helix/${path}`);
  }
  // Slot choices HELIX reads before concerns.md (its concern-selection order).
  writeFileSync(join(r.dir, "docs/helix/01-frame/concerns.local.yml"), "# Operator overrides for HELIX's concern slots (set by @ux-builder/create-app).\nslots:\n  frontend-framework: react-vite\n  e2e-framework: e2e-playwright\n");
  written.push("docs/helix/01-frame/concerns.local.yml");
  return written;
}

/* The rest of the toolchain sees HELIX (HLW-01, HLW-03): the assessment's
   manifest bound to the marker, the script to check it, and the guidance. */
export function wire(helix, r) {
  writeFileSync(join(r.dir, "ux-assessment.yml"), manifest(r));
  const pkgFile = join(r.dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
  pkg.scripts = { ...pkg.scripts, "assess:validate": "ux-builder-audit assess validate" };
  writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");
  const guide = `
## HELIX

This app is governed by HELIX ${helix.manifest.version}: the \`helix\` skill is installed in
\`.claude/skills/helix/\` (see its \`HELIX-VERSION.json\`), the marker is \`.helix.yml\`, and the
documents are in \`docs/helix/\` (vision, PRD, concerns, FEAT-001 and US-001 for the starter's
shell, DESIGN.md, the test plans). Work in this order:

1. Frame or evolve the requirement in HELIX first (\`/helix frame\`, \`/helix evolve\`): a story with
   acceptance criteria, before any code.
2. Plan its screens in \`app.blueprint.json\` and run \`npm run check:blueprint\`.
3. Build each screen from its pattern inside a \`Page\`, within the app's \`AppShell\`.
4. Cite the story's criteria in its tests (\`// @covers US-<n>-AC<m>\`), then \`npm run lint\`,
   \`npm run test:e2e\` and \`npm run audit\`.
5. Assess the UX: \`npm run assess:validate\`, then the \`ux-builder-assess\` skill in
   \`node_modules/@ux-builder/audit/skill/\`.

Each change is an episode in the trace (see "Recording the build" above): start it with the
story it serves (\`--story US-<n>\`), record its decisions, end its commits with the
\`UX-Episode:\` trailer, and end it once they are made.

Other agent hosts install HELIX from https://github.com/DocumentDrivenDX/helix/blob/main/docs/install/README.md.
`;
  for (const f of ["AGENTS.md", "CLAUDE.md"]) appendFileSync(join(r.dir, f), guide);
}

/* The UX assessment's manifest: one journey, the shell's (US-001), from where
   the app opens; the AI state applies when a modality has a conversation. */
function manifest(r) {
  const ai = r.modalities.some((m) => m !== "responsive-web");
  return `# UX assessment manifest (FEAT-009, CONTRACT-006), written by @ux-builder/create-app.
# It binds this app's HELIX documents through .helix.yml; the journeys name
# stories by ID. Check it with: npx ux-builder-audit assess validate
version: 1
app:
  name: ${r.name}
helix:
  flow: helix
run:
  start: npm run build && npx vite preview --port 4173 --strictPort --host 127.0.0.1
  baseUrl: http://127.0.0.1:4173/
  environment: local
roles:
  - id: member
    description: A member of the team using the app
    auth: none
journeys:
  - id: J-start
    story: US-001
    priority: critical
    role: member
    entry: ${r.modalities.includes("responsive-web") ? "/" : assistantPath(r.modalities)}
    states: [success, empty, ${ai ? "ai, " : ""}responsive-keyboard]
    notApplicable:
      loading: the starter's shell loads no data
      recoverable-error: the starter's shell has no form that can fail
      system-failure: the starter has no server${ai ? "" : "\n      ai: the starter has no AI feature"}
tests:
  - id: lint
    command: npm run lint
  - id: audit
    command: npm run audit
  - id: e2e
    command: npm run test:e2e
audit:
  widths: [390, 1280]
restrictions:
  writes: report-only
`;
}
