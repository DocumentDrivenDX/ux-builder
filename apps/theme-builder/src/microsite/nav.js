/* The microsite's information architecture (HELIX concern product-microsite-ia):
   one section per reader mode, each with a landing page that orients before
   it sends the reader deeper. A page's address is ?p=<section>/<page>; a
   section's landing page is ?p=<section>. */

export const SECTIONS = [
  {
    id: "why", title: "Why", mode: "Evaluate", question: "What is this, and is it worth my time?",
    lede: "The problem UX Builder solves, what makes it different, who it is for, and where it is going.",
    pages: [
      { id: "problem", title: "The problem and the approach", blurb: "Why apps drift from their brand, the six ideas UX Builder is built on, and what it is not." },
      { id: "audience", title: "Who it's for", blurb: "Developers, brand owners, AI coding agents, app owners and UX reviewers, and the teams that maintain the look." },
      { id: "principles", title: "Principles", blurb: "The rules every package, theme and widget is held to." },
      { id: "roadmap", title: "Roadmap and measures", blurb: "What is built, what is next (from the open work items), and how success is measured." },
    ],
  },
  {
    id: "start", title: "Start", mode: "Start", question: "How do I try it correctly?",
    lede: "From nothing to a themed screen in minutes: a new app on HELIX, shaped by its modalities, an existing app, a theme from your logo, an agent doing the work, a UX assessment, or cards from Microsoft agents.",
    pages: [
      { id: "new-app", title: "Start a new app", blurb: "One command scaffolds a React + Vite app for its modalities, on-theme and on HELIX from its first commit." },
      { id: "existing-app", title: "Add it to an existing app", blurb: "Install two packages, load the theme, wrap the app." },
      { id: "theme-from-logo", title: "Make a theme from your logo", blurb: "The guided builder: logo in, accessible palettes out, saved for review." },
      { id: "agents", title: "Work with AI coding agents", blurb: "AGENTS.md, a Claude Code skill and an MCP server that know your installed version, and the episode trace." },
      { id: "ci", title: "Keep it on-theme in CI", blurb: "Lint rules and a running-app audit that catch drift before it ships." },
      { id: "assess", title: "Assess an app's UX", blurb: "Walk an app's journeys from its HELIX stories, in three scenarios for AI, and get a report by journey, proposals and walkthrough videos." },
      { id: "microsoft-agents", title: "Show cards from Microsoft agents", blurb: "Render Adaptive Cards from Copilot, Teams and Bot Framework agents in your theme, and check them before they are sent." },
    ],
  },
  {
    id: "concepts", title: "Concepts", mode: "Decide", question: "What should I use next?",
    lede: "The model behind the SDK: what a theme is, how tokens are named, how screens adapt and connect, and how AI screens are planned, built and checked.",
    pages: [
      { id: "themes", title: "Themes: a brand on a design system", blurb: "Identity and anatomy are separate, so any brand can wear any design system." },
      { id: "tokens", title: "Role tokens and appearances", blurb: "Tokens named by what they are for, in light, dark and auto, including diagram and chart colours." },
      { id: "patterns", title: "Screen patterns and size classes", blurb: "Whole screens that adapt to the space they are given." },
      { id: "generative-ui", title: "Generative UI and embedded views", blurb: "The SDK's own assistant, bridges for AI Elements and assistant-ui, and views a host can dress." },
      { id: "ai-agent-experience", title: "AI and agent experience", blurb: "AI roles per screen, the rules they bring, the markers the audit reads, approvals and chat with inline UI." },
      { id: "flows-journeys", title: "Flows and journeys", blurb: "How screens connect, the paths a story takes through them, the checks, and the drawings and HELIX drafts made from them." },
    ],
  },
  {
    id: "reference", title: "Reference", mode: "Operate", question: "What exactly does it do?",
    lede: "Exact lookup, generated from what ships: every entry point, component, pattern, command, MCP tool, rule and card element.",
    pages: [
      { id: "packages", title: "Packages", blurb: "The public npm packages, their versions, and every entry point from their exports." },
      { id: "components", title: "UI components", blurb: "Every widget in @ux-builder/ui with its purpose and import." },
      { id: "screen-patterns", title: "Screen patterns", blurb: "Every pattern in @ux-builder/ui/patterns." },
      { id: "ai-components", title: "AI components", blurb: "The AI Elements and assistant-ui components the bridges are checked against." },
      { id: "cli", title: "Command line and MCP", blurb: "Every option of create-app and the audit, the assess and blueprint commands, and every MCP tool." },
      { id: "rules", title: "Interaction rules", blurb: "Every rule: when it applies, what checks it and the sources it restates, filterable." },
      { id: "adaptive-cards", title: "Adaptive Cards", blurb: "Which SDK component draws each card element, and how a card marks a high-impact action." },
    ],
  },
  {
    id: "proof", title: "Proof", mode: "Verify", question: "Can I trust it?",
    lede: "The project's own record, generated from the repository: decisions, features, test traceability, rule sources, releases, and every theme live.",
    pages: [
      { id: "decisions", title: "Decisions (ADRs)", blurb: "Every architecture decision, with its date, status and what was decided." },
      { id: "features", title: "Features and contracts", blurb: "What each feature promises, and the contracts an app may rely on." },
      { id: "traceability", title: "Traceability", blurb: "Every acceptance criterion cited by a test or excepted with a reason, by feature and story, and the alignment reviews." },
      { id: "sources", title: "Sources and licences", blurb: "Every source the rules cite, its licence and how it is used, counsel's status, and who we are not affiliated with." },
      { id: "live", title: "Live themes and Storybook", blurb: "Every widget and pattern rendered in the theme, not screenshots." },
      { id: "releases", title: "Releases", blurb: "What changed in each published version." },
    ],
  },
];

export function locate(param) {
  const [sid, pid] = (param ?? "").split("/");
  const section = SECTIONS.find((s) => s.id === sid) ?? null;
  const page = section?.pages.find((p) => p.id === pid) ?? null;
  return { section, page };
}

export const href = (section, page) => `?p=${section}${page ? `/${page}` : ""}`;

/* The page before and after, across sections, for the footer links. */
export function neighbours(section, page) {
  const flat = SECTIONS.flatMap((s) => [{ s, p: null }, ...s.pages.map((p) => ({ s, p }))]);
  const i = flat.findIndex((x) => x.s.id === section.id && (x.p?.id ?? null) === (page?.id ?? null));
  return { prev: flat[i - 1] ?? null, next: flat[i + 1] ?? null };
}
