/* The new app's HELIX documents (FEAT-010 HLA-01 to HLA-03; ADR-027
   decisions 5 and 6).

   Each document is the installed HELIX's template for its type, written at
   the type's output location and naming, with ddx: frontmatter. What the
   starter knows (the app's name and theme, its stack, the starter screen,
   its checks) replaces the placeholder text under the matching heading;
   everything only the product's owner can decide stays as the template
   wrote it. A heading the starter fills that a template no longer has is
   added at the end, so a later HELIX's templates never break creation. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ref } from "./helix.mjs";

const TYPES = { "product-vision": "00-discover", prd: "01-frame", concerns: "01-frame", "feature-specification": "01-frame", "user-stories": "01-frame", "design-system": "02-design", "test-plan": "03-test", "story-test-plan": "03-test" };

/* A type's template and where its instances go, from the installed catalogue. */
function typeOf(helix, type) {
  const base = `activities/${TYPES[type]}/artifacts/${type}`;
  const meta = ref(helix, `${base}/meta.yml`) ?? "";
  const location = (/^\s*location:\s*"?([^"\n]+)"?/m.exec(meta)?.[1] ?? "").trim().replace(/^docs\/helix\//, "");
  const naming = (/^\s*naming:\s*"?([^"\n]+)"?/m.exec(meta)?.[1] ?? "").trim();
  return { template: ref(helix, `${base}/template.md`), location, naming };
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
  const criteria = [
    ["US-001-AC1", "Given the app opens, when the Matters card loads, then a table lists each matter with its partner, hours and status."],
    ["US-001-AC2", "Given text in Search, when it is typed, then only matters whose name contains it are listed."],
    ["US-001-AC3", "Given Add matter is pressed, when the request runs, then the button shows it is busy and a toast confirms the matter was added, with Undo."],
    ["US-001-AC4", "Given the Theme or Appearance control, when another is chosen, then every widget, the logo and the colours follow it without a reload."],
  ];
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
      title: "Feature Specification: FEAT-001 — The starter's matters screen",
      intro: note("It describes the screen the starter created, so the app is traced from its first commit. Replace it with your first real feature."),
      sections: {
        Overview: `${app} opens on a page of matters: a notice, a card with a search field, an Add matter action and a table of matters, under a header with the theme's logo and a theme and appearance switcher. It is built only from \`@ux-builder/ui\` widgets and role tokens.`,
        "Functional Requirements by Area": "#### Matters\n\nMAT-01. The screen lists the matters with partner, hours and status, and a search narrows them.\n\nMAT-02. Add matter shows it is busy and confirms with an Undo toast.\n\n#### Theme\n\nTHM-01. The theme and appearance can be switched, and every widget follows.",
        "Functional Areas": "| Area | User question or job | Feature responsibility |\n|------|----------------------|------------------------|\n| Matters | \"Which matters are there?\" | List and search the matters |\n| Theme | \"Can I see it in another theme?\" | Switch theme and appearance |",
        "User Stories": "- [US-001 — See, search and add matters](../user-stories/US-001-see-search-and-add-matters.md)",
        Dependencies: `- \`@ux-builder/ui\` ${ui}; the plan of the screen in \`app.blueprint.json\`; DESIGN.md.`,
      },
    },
    story: {
      title: "US-001: See, search and add matters",
      intro: note("It describes the starter's sample screen; rewrite it for your users when the screen changes."),
      fields: { Feature: "FEAT-001 — The starter's matters screen", "Feature Requirements": "MAT-01, MAT-02, THM-01" },
      sections: {
        Walkthrough: "1. The user opens the app; the Matters card lists the matters.\n2. The user types in Search; the table keeps only the matching matters.\n3. The user presses Add matter; the button is busy, then a toast confirms with Undo.\n4. The user picks another theme or appearance; the whole page follows.",
        Story: `**As a** member of the team using ${app}\n**I want** to see and search the matters, and add one\n**So that** I can find the matter I need`,
        "Acceptance Criteria": criteria.map(([id, t]) => `- [ ] **${id}** — ${t}`).join("\n"),
        "Test Scenarios": "| Scenario | AC ID | Input / State | Action | Expected Result |\n|----------|-------|---------------|--------|-----------------|\n" + criteria.map(([id]) => `| ${id.slice(-3)} | ${id} | The starter's sample matters | See \`e2e/starter.spec.js\` | As the criterion says |`).join("\n"),
        Dependencies: "- **Feature Spec**: FEAT-001",
      },
    },
    design: {
      title: `DESIGN.md — ${app}`,
      intro: note(`The interface decisions the starter made with ux-builder; the plan of every screen is \`app.blueprint.json\`.`),
      sections: {
        "Navigation and Active State": "One destination today (Matters, in `app.blueprint.json`). Add destinations to the blueprint before building them; with more than one, frame the app with the SDK's `AppShell`, which places navigation for the space available (a bottom bar or drawer when compact, a rail or side navigation when wide) and marks the current destination.",
        "Visual Hierarchy": "The page title, then a `Notice`, then the Matters `Card` with its one primary action (Add matter), its search `TextField` and its `DataTable`. One primary action per region (the SDK's `emphasis.one-primary` rule).",
        "Interaction States": "A busy `Button` while Add matter runs; a toast with Undo when it is done (`ToastProvider`). The table's empty and no-results states come from the SDK. Every screen in the blueprint declares its empty, loading and error states.",
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
        "Critical Paths (P0)": "1. The starter screen (US-001): `e2e/starter.spec.js`.",
        "Build Commands": "```bash\nnpm run lint\nnpm run check:blueprint\nnpm run test:e2e\nnpm run audit\nnpx ux-builder-audit assess validate\n```",
      },
    },
    stp: {
      title: "Story Test Plan: STP-001-see-search-and-add-matters",
      intro: note("Maps US-001 to the starter's Playwright test."),
      sections: {
        "Story Reference": "**User Story**: [[US-001-see-search-and-add-matters]]\n**Project Test Plan**: [[test-plan]]",
        "Acceptance Criteria Test Mapping": "| AC ID | Acceptance Criterion | Test | Asserted Behavior | AC-ID Citation | Level | File |\n|-------|----------------------|------|-------------------|----------------|-------|------|\n" + criteria.map(([id, t]) => `| ${id} | ${t} | \`${id.toLowerCase()}\` | As the criterion says | \`@covers ${id}\` | E2E | \`e2e/starter.spec.js\` |`).join("\n"),
        "Primary Commands": "```bash\nnpm run test:e2e\n```",
      },
    },
  };
}

/* Write the starter set into the app (HLA-01). Returns the paths written. */
export function writeStarterSet(helix, r) {
  const c = content(r, helix);
  const docs = [
    ["product-vision", { id: "product-vision", ...c.vision }],
    ["prd", { id: "prd", links: [["informed_by", "product-vision"]], ...c.prd }],
    ["concerns", { id: "concerns", links: [["informed_by", "prd"]], ...c.concerns }],
    ["feature-specification", { id: "FEAT-001", number: "001", slug: "starter-matters-screen", links: [["informed_by", "prd"]], ...c.feat }],
    ["user-stories", { id: "US-001", number: "001", slug: "see-search-and-add-matters", links: [["informed_by", "FEAT-001"]], ...c.story }],
    ["design-system", { id: "design-system", links: [["informed_by", "prd"], ["informed_by", "FEAT-001"]], ...c.design }],
    ["test-plan", { id: "TP-001", links: [["informed_by", "prd"], ["informed_by", "FEAT-001"]], ...c.tp }],
    ["story-test-plan", { id: "STP-001", number: "001", slug: "see-search-and-add-matters", links: [["informed_by", "US-001"], ["informed_by", "TP-001"]], ...c.stp }],
  ];
  const written = [];
  for (const [type, d] of docs) {
    const t = typeOf(helix, type);
    const path = pathFor(t, d) ?? `${TYPES[type]}/${type}.md`;
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
