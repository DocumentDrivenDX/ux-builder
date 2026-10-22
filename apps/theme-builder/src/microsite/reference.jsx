import { DataTable, Notice, Select, StatusPill } from "@ux-builder/ui";
import { FilterBar } from "@ux-builder/ui/patterns";
import { Fragment, useMemo, useState } from "react";
import data from "virtual:microsite-data";
import { AdaptiveCard, ACTIONS, ELEMENTS } from "../../../../packages/ui/src/adaptive-cards/AdaptiveCard.jsx";
import { PAY_INVOICE } from "../../../../packages/ui/src/adaptive-cards/story-data.js";
import { href } from "./nav.js";
import "./reference.css";

/* The Reference and Proof pages generated from what ships (SD-002;
   product-microsite-ia: reference is exact lookup generated from the
   source). Everything they list comes from virtual:microsite-data
   (apps/theme-builder/microsite-data.mjs), computed from the repository when
   the site is built: the commands' own option definitions and help, the MCP
   server's own tool list, the packages' exports, the catalogue's rules,
   CONTRACT-004 and tools/check-coverage.mjs. */

const { cli, packages, rules, sources, licences, cards, coverage, notices } = data;
export const COUNTS = { rules: rules.length, sources: sources.length, tools: cli.mcp.tools.length, criteria: coverage.total };

/* Inline `code` in generated text, nothing more. */
function Code({ children }) {
  return String(children ?? "").split(/(`[^`]+`)/g).map((p, i) => (p.startsWith("`") ? <code key={i}>{p.slice(1, -1)}</code> : <Fragment key={i}>{p}</Fragment>));
}
const H2 = ({ id, children }) => <h2 id={id}>{children}</h2>;
const sentence = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const Generated = ({ children }) => <p className="uxm-cite">Generated from {children}.</p>;

/* ---- Reference: packages' entry points ---- */

export function EntryPoints() {
  return (
    <>
      {packages.map((p) => (
        <section key={p.name} className="uxr-package">
          <h3 id={`pkg-${p.name.replace(/[@/]/g, "-").replace(/^-/, "")}`}><a href={p.url}><code>{p.name}</code></a> <span className="uxm-version">v{p.version}</span></h3>
          {p.description && <p className="uxm-hint"><Code>{p.description}</Code></p>}
          {p.bin.length > 0 && <p>Command{p.bin.length > 1 ? "s" : ""}: {p.bin.map((b, i) => <Fragment key={b}>{i ? ", " : ""}<code>{b}</code></Fragment>)}</p>}
          {p.exports.length > 0 && (
            <table className="uxm-table" aria-label={`${p.name} entry points`}>
              <thead><tr><th scope="col">Import</th><th scope="col">What it gives an app</th></tr></thead>
              <tbody>
                {p.exports.map((e) => (
                  <tr key={e.key}>
                    <td><code>{e.import}</code></td>
                    <td>{e.note}{e.matches && e.matches.count > 0 && <span className="uxm-hint"> ({e.matches.count} today, e.g. {e.matches.examples.map((x, i) => <Fragment key={x}>{i ? ", " : ""}<code>{x}</code></Fragment>)})</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
      <Generated>each package's <code>package.json</code> <code>exports</code> and <code>bin</code></Generated>
    </>
  );
}

/* ---- Reference: command line and MCP ---- */

function Options({ caption, options }) {
  return (
    <table className="uxm-table" aria-label={caption}>
      <thead><tr><th scope="col">Option</th><th scope="col">Effect</th></tr></thead>
      <tbody>{options.map((o) => <tr key={o.option}><td><code>{o.option}{o.arg ? ` ${o.arg}` : ""}</code></td><td>{sentence(o.text)}</td></tr>)}</tbody>
    </table>
  );
}

export function Cli() {
  const { createApp, audit, assess, blueprint, mcp } = cli;
  return (
    <>
      <p className="uxm-lede">Every option, subcommand and MCP tool, generated from the commands' own definitions and the MCP server's own tool list when this site is built.</p>
      <H2 id="create-app">npm create @ux-builder/app</H2>
      <pre className="uxr-pre"><code>{createApp.synopsis}</code></pre>
      <Options caption="create-app options" options={createApp.options} />
      <Generated><code>packages/create-app/index.mjs</code> (its header and <code>parseArgs</code> options)</Generated>

      <H2 id="audit">ux-builder-audit</H2>
      <pre className="uxr-pre"><code>{audit.synopsis}</code></pre>
      <Options caption="ux-builder-audit options" options={audit.options} />
      <h3 id="audit-checks">Checks ({audit.checks.length})</h3>
      <DataTable caption="ux-builder-audit checks" rowKey="id" rows={audit.checks} pageSize={50}
        columns={[{ key: "id", label: "Check", sortable: true, render: (r) => <code>{r.id}</code> }, { key: "text", label: "What it reports", render: (r) => r.text }]} />
      <Generated><code>packages/audit/cli.mjs</code> and the audit's <code>RULES</code></Generated>

      <H2 id="assess">ux-builder-audit assess</H2>
      <p>The UX assessment's deterministic steps; the <code>ux-builder-assess</code> skill says how an agent runs them as one assessment.</p>
      <table className="uxm-table" aria-label="assess subcommands">
        <thead><tr><th scope="col">Subcommand</th><th scope="col">What it does</th></tr></thead>
        <tbody>{assess.commands.map((c) => <tr key={c.name}><td><code>{c.call || c.name}</code></td><td>{sentence(c.text)}</td></tr>)}</tbody>
      </table>
      <Generated><code>packages/audit/assess/cli.mjs</code> (its header and <code>--help</code>)</Generated>

      <H2 id="blueprint">ux-builder-blueprint</H2>
      <table className="uxm-table" aria-label="ux-builder-blueprint commands">
        <thead><tr><th scope="col">Command</th><th scope="col">What it does</th></tr></thead>
        <tbody>{blueprint.commands.map((c) => <tr key={c.name}><td><code>{c.call}</code></td><td>{c.text}</td></tr>)}</tbody>
      </table>
      <Generated><code>ux-builder-blueprint --help</code> (<code>packages/ui/blueprint/cli.mjs</code>)</Generated>

      <H2 id="mcp">ux-builder-mcp tools</H2>
      <p>{mcp.tools.length} tools and {mcp.resources.length} resources (<Fragment>{mcp.resources.map((r, i) => <Fragment key={r.uri}>{i ? ", " : ""}<code>{r.uri}</code></Fragment>)}</Fragment>), as the server lists them to a client.</p>
      <DataTable caption="ux-builder-mcp tools" rowKey="name" rows={mcp.tools} pageSize={50} initialSort={{ key: "name", dir: "ascending" }}
        columns={[
          { key: "name", label: "Tool", sortable: true, render: (r) => <code>{r.name}</code> },
          { key: "inputs", label: "Arguments", render: (r) => (r.inputs.length ? r.inputs.map((n, i) => <Fragment key={n}>{i ? ", " : ""}<code>{n}</code>{r.required.includes(n) ? "" : "?"}</Fragment>) : "none") },
          { key: "description", label: "Returns", render: (r) => r.description },
        ]} />
      <Generated><code>packages/mcp/server.mjs</code>'s <code>createServer</code>, listed over MCP</Generated>
    </>
  );
}

/* ---- Reference: interaction rules ---- */

const WHEN = { context: "Context", sizeClass: "Size class", input: "Input", aiRole: "AI role" };
const checkLabel = (c) => (c.kind === "review" ? "review" : `${c.kind} ${c.id}`);
const ALL = "";

export function Rules() {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState(ALL);
  const [role, setRole] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const families = useMemo(() => [...new Set(rules.map((r) => r.family))], []);
  const roles = useMemo(() => [...new Set(rules.flatMap((r) => r.when.aiRole ?? []))], []);
  const kinds = useMemo(() => [...new Set(rules.flatMap((r) => r.checks.map((c) => c.kind)))].sort(), []);
  const q = query.trim().toLowerCase();
  const shown = rules.filter((r) => (!family || r.family === family) && (!role || (r.when.aiRole ?? []).includes(role)) && (!kind || r.checks.some((c) => c.kind === kind))
    && (!q || `${r.id} ${r.title} ${r.statement}`.toLowerCase().includes(q)));
  const applied = [family && { id: "family", label: `Family: ${family}` }, role && { id: "role", label: `AI role: ${role}` }, kind && { id: "kind", label: `Checked by: ${kind}` }].filter(Boolean);
  const clear = { family: () => setFamily(ALL), role: () => setRole(ALL), kind: () => setKind(ALL) };
  const option = (all) => (v) => ({ value: v, label: v || all });
  return (
    <>
      <p className="uxm-lede">{rules.length} interaction, IA, AI and card rules, generated from <code>@ux-builder/ui</code>'s catalogue (<code>interaction.rules</code>). Each says when it applies, what checks it, and the sources it restates.</p>
      <FilterBar search={query} onSearchChange={setQuery} searchLabel="Search rules" filters={applied} onRemoveFilter={(f) => clear[f.id]()} onClearAll={applied.length ? () => { setFamily(ALL); setRole(ALL); setKind(ALL); } : undefined}>
        <Select label="Family" value={family} onChange={(e) => setFamily(e.target.value)} options={[ALL, ...families].map(option("Every family"))} />
        <Select label="AI role" value={role} onChange={(e) => setRole(e.target.value)} options={[ALL, ...roles].map(option("Any role"))} />
        <Select label="Checked by" value={kind} onChange={(e) => setKind(e.target.value)} options={[ALL, ...kinds].map(option("Any check"))} />
      </FilterBar>
      <p className="uxm-hint" role="status" data-testid="rules-shown">{shown.length} of {rules.length} rules</p>
      <DataTable caption="Interaction rules" rowKey="id" rows={shown} pageSize={100}
        columns={[
          { key: "id", label: "Rule", sortable: true, render: (r) => <span id={`rule-${r.id}`}><code>{r.id}</code><br /><span className="uxm-hint">{r.severity}</span></span> },
          { key: "statement", label: "Statement", render: (r) => <><b>{r.title}.</b> {r.statement}</> },
          { key: "when", label: "Applies when", render: (r) => (Object.keys(r.when).length || r.appliesTo ? <ul className="uxr-list">{Object.entries(r.when).map(([k, v]) => <li key={k}>{WHEN[k] ?? k}: {v.join(", ")}</li>)}{r.appliesTo?.patterns && <li>Patterns: {r.appliesTo.patterns.join(", ")}</li>}</ul> : "Always") },
          { key: "checks", label: "Checked by", render: (r) => <ul className="uxr-list">{r.checks.map((c) => <li key={checkLabel(c)}><code>{checkLabel(c)}</code></li>)}</ul> },
          { key: "sources", label: "Sources", render: (r) => <ul className="uxr-list">{r.sources.map((s) => <li key={s.url}><a href={s.url}>{s.title}</a> <span className="uxm-hint">({s.licence}, {s.wording})</span></li>)}</ul> },
        ]} />
      <p className="uxm-cite">Where each source's licence lets the rules use it, and the disclaimer: <a href={href("proof", "sources")}>Proof: Sources</a>.</p>
    </>
  );
}

/* ---- Reference: Adaptive Cards ---- */

export function AdaptiveCards() {
  const [last, setLast] = useState(null);
  const mapped = (t) => cards.mapping.some((m) => m.element.includes(`\`${t}\``));
  const drawn = [...ELEMENTS, ...ACTIONS];
  return (
    <>
      <p className="uxm-lede"><code>@ux-builder/ui/adaptive-cards</code> draws an Adaptive Card (schema {cards.version} and earlier) with the SDK's own components, in the app's theme. Nothing in a card sets its look, and nothing in it is inserted as HTML.</p>
      <H2 id="mapping">Element mapping</H2>
      <table className="uxm-table" aria-label="Adaptive Cards element mapping">
        <thead><tr><th scope="col">Card element</th><th scope="col">SDK component</th></tr></thead>
        <tbody>{cards.mapping.map((m) => <tr key={m.element}><td><Code>{m.element}</Code></td><td><Code>{m.component}</Code></td></tr>)}</tbody>
      </table>
      <Generated><a href={cards.url}>CONTRACT-004, <i>Adaptive Cards</i></a></Generated>
      <h3 id="drawn">What the renderer draws ({drawn.length})</h3>
      <ul className="uxr-chips" aria-label="Elements and actions the renderer draws">
        {drawn.map((t) => <li key={t} data-mapped={mapped(t) ? "yes" : "no"}><code>{t}</code>{!mapped(t) && <span className="uxm-hint"> (not in the mapping)</span>}</li>)}
      </ul>
      <p className="uxm-cite">From the renderer's own <code>ELEMENTS</code> and <code>ACTIONS</code>. Anything else shows its <code>fallback</code>, or a plain notice.</p>

      <H2 id="high-impact">High-impact actions</H2>
      <p>A card's author marks an action that spends money, sends something or cannot be undone in its <code>data</code>:</p>
      <pre className="uxr-pre"><code>{cards.example}</code></pre>
      <p><Code>{cards.approval}</Code></p>
      <div className="uxr-demo">
        <AdaptiveCard card={PAY_INVOICE} onAction={(a) => setLast(a)} />
        <p className="uxm-hint" role="status">{last ? `onAction was called: ${last.type} "${last.verb ?? last.id ?? ""}"` : "onAction has not been called."}</p>
      </div>
      <H2 id="checks">checkCard</H2>
      <p><code>checkCard(card)</code> checks a payload against the vendored {cards.version} schema, then the card rules ({cards.checks.map((c, i) => <Fragment key={c}>{i ? ", " : ""}<a href={`${href("reference", "rules")}#rule-${c}`}><code>{c}</code></a></Fragment>)}). The MCP server's <code>check_card</code> runs the same check.</p>
    </>
  );
}

/* ---- Proof: traceability ---- */

export function Traceability() {
  const byFeature = coverage.features.map((f) => {
    const stories = coverage.stories.filter((s) => s.feature === f.id);
    const acs = stories.flatMap((s) => s.criteria);
    return { ...f, stories: stories.length, total: acs.length, cited: acs.filter((c) => c.tests.length).length, excepted: acs.filter((c) => c.exception).length };
  }).filter((f) => f.total);
  const stories = coverage.stories.map((s) => ({ ...s, total: s.criteria.length, cited: s.criteria.filter((c) => c.tests.length).length, excepted: s.criteria.filter((c) => c.exception).length }));
  return (
    <>
      <p className="uxm-lede">Every acceptance criterion in the user stories is cited by a test that says so (<code>@covers US-n-ACm</code>), or excepted with a reason. <code>npm run coverage</code> fails the build otherwise.</p>
      <ul className="uxm-stats" aria-label="Coverage">
        <li><b data-testid="ac-total">{coverage.total}</b><span>acceptance criteria</span></li>
        <li><b data-testid="ac-cited">{coverage.cited}</b><span>cited by tests</span></li>
        <li><b data-testid="ac-excepted">{coverage.excepted}</b><span>excepted, with a reason</span></li>
        <li><b>{coverage.stories.length}</b><span>user stories</span></li>
      </ul>
      <Generated><a href={coverage.script}><code>tools/check-coverage.mjs</code></a> when this site was built</Generated>

      <H2 id="features">By feature</H2>
      <DataTable caption="Coverage by feature" rowKey="id" rows={byFeature} pageSize={30}
        columns={[
          { key: "id", label: "Feature", sortable: true, render: (r) => <a href={r.url}><b>{r.id}</b></a> },
          { key: "title", label: "Title", render: (r) => r.title },
          { key: "stories", label: "Stories", numeric: true, sortable: true },
          { key: "total", label: "Criteria", numeric: true, sortable: true },
          { key: "cited", label: "Cited", numeric: true, sortable: true },
          { key: "excepted", label: "Excepted", numeric: true, sortable: true },
        ]} />

      <H2 id="stories">By story</H2>
      <DataTable caption="Coverage by story" rowKey="id" rows={stories} pageSize={Math.max(100, stories.length)}
        columns={[
          { key: "id", label: "Story", sortable: true, render: (r) => <a href={r.url}><b>{r.id}</b></a> },
          { key: "title", label: "Title", render: (r) => r.title },
          { key: "feature", label: "Feature", sortable: true },
          { key: "total", label: "Criteria", numeric: true, sortable: true },
          { key: "cited", label: "Cited", numeric: true, sortable: true },
          { key: "excepted", label: "Excepted", numeric: true, sortable: true },
        ]} />

      <H2 id="excepted">Excepted criteria</H2>
      <p>Checked by review or an on-demand run rather than a test in CI, each with its reason, from <a href={coverage.exceptionsUrl}><code>tools/coverage-exceptions.json</code></a>. The list may only shrink: an exception that becomes cited fails the build.</p>
      <ol className="uxm-records" aria-label="Excepted criteria">
        {coverage.exceptions.map((e) => {
          const story = coverage.stories.find((s) => s.criteria.some((c) => c.id === e.id));
          const ac = story?.criteria.find((c) => c.id === e.id);
          return (
            <li key={e.id} className="uxm-record">
              <div className="uxm-record__head"><a href={story?.url}><b>{e.id}</b></a><StatusPill state="evaluation">Excepted</StatusPill></div>
              {ac && <p><Code>{ac.text}</Code></p>}
              <p><b>Reason:</b> <Code>{e.reason}</Code></p>
            </li>
          );
        })}
      </ol>

      <H2 id="reviews">Alignment reviews</H2>
      <p>Whole-repository reviews of the documents against the code, newest first.</p>
      <ul>{coverage.reviews.map((r) => <li key={r.id}><a href={r.url}><b>{r.id}</b></a>: {sentence(r.title)}</li>)}</ul>
    </>
  );
}

/* ---- Proof: sources ---- */

export function Sources() {
  const used = [...new Set(sources.map((s) => s.licence))];
  return (
    <>
      <p className="uxm-lede">The {rules.length} rules restate {sources.length} sources in the SDK's own words, each linked. Here is every source, its licence, how the rules use it, and how many rules cite it.</p>
      <DataTable caption="Sources the rules cite" rowKey="url" rows={sources.map((s) => ({ ...s, count: s.rules.length }))} pageSize={60} initialSort={{ key: "count", dir: "descending" }}
        columns={[
          { key: "title", label: "Source", sortable: true, render: (r) => <a href={r.url}>{r.title}</a> },
          { key: "licence", label: "Licence", sortable: true, render: (r) => <code>{r.licence}</code> },
          { key: "wording", label: "Wording", render: (r) => r.wording.join(", ") },
          { key: "count", label: "Rules", numeric: true, sortable: true, render: (r) => <span title={r.rules.join(", ")}>{r.count}</span> },
        ]} />
      <Generated>the rules' <code>sources</code> in <code>@ux-builder/ui</code>'s catalogue</Generated>

      <H2 id="licences">What each licence allows</H2>
      <table className="uxm-table" aria-label="Licences">
        <thead><tr><th scope="col">Licence</th><th scope="col">What it means for the rules</th><th scope="col">Sources</th></tr></thead>
        <tbody>{used.map((l) => <tr key={l}><td><code>{l}</code><br /><span className="uxm-hint">{licences[l]?.name}</span></td><td>{licences[l]?.meaning}</td><td>{sources.filter((s) => s.licence === l).length}</td></tr>)}</tbody>
      </table>
      <p className="uxm-cite"><code>npm run rules</code> (<code>tools/check-rules.mjs</code>) enforces it: a quotation only from an open licence, at most 25 words, credited in the notices.</p>

      <H2 id="counsel">Counsel's review</H2>
      <Notice tone="warning" title="Counsel's review was waived for the first release">
        {notices.amendment.map((p, i) => <Fragment key={i}>{i ? " " : ""}<Code>{p.replace(/^\*\[[^\]]*\]\*:\s*/, "")}</Code></Fragment>)}
      </Notice>
      <p>From <a href={notices.adr}>ADR-025, <i>Amendment</i></a>; the brief is <a href={notices.brief}><code>docs/legal/counsel-brief-interaction-rules.md</code></a>. Counsel's answer is tracked as bead <code>{notices.bead}</code>.</p>

      <H2 id="disclaimer">Not affiliated</H2>
      <p className="uxr-disclaimer">{notices.disclaimer}</p>
      <Generated>the guidance the SDK ships (<code>@ux-builder/ui/AGENTS.md</code>)</Generated>
    </>
  );
}
