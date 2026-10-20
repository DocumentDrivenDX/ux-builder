---
ddx:
  id: ADR-023
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-011
    - kind: informed_by
      to: ADR-013
    - kind: informed_by
      to: ADR-016
    - kind: informed_by
      to: ADR-017
    - kind: informed_by
      to: ADR-020
    - kind: informed_by
      to: ADR-021
    - kind: informed_by
      to: CONTRACT-003
    - kind: informs
      to: FEAT-007
---

# ADR-023: Generative UI libraries are bridged, not design systems; third-party licences are checked before release

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-19 | **Accepted** 2026-10-19; amended 2026-10-19 (CopilotKit excluded, no telemetry) | Operator; harness team as owner; legal counsel for the licence rules | ADR-011, ADR-013, ADR-016, ADR-017, ADR-020, ADR-021, CONTRACT-003, FEAT-007 | Medium |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | Apps built on the SDK are adding AI assistants. Three open-source libraries supply the chat and agent UI they reach for: **AI Elements** (Vercel; shadcn/ui components copied into the app by a CLI), **assistant-ui** (React primitives plus shadcn-styled components) and **CopilotKit** (React components, hooks and a runtime). Each brings its own look, so an assistant in a Praxis Carbon app looks like the library, not like Praxis Carbon. Nothing in the SDK covers conversation, streaming, tool calls, reasoning, sources or agent approvals. And the SDK has no rule for which third-party licences it may depend on or ship. |
| Current State | A theme is a brand on a design system (ADR-013); a design system is anatomy only: shape, density, type, icons and variants (ADR-022). Themes are emitted as `--piq-*` custom properties under `[data-theme][data-appearance]` (CONTRACT-003), and an embedded view resets every token it is not given (US-011-AC6). Patterns are `.piq-*` CSS with React 19 behaviour (ADR-016, ADR-020) and adapt by size class (ADR-021). Fonts are licence-checked at build (ADR-017); bundled icon licences are kept in `packages/ui/licenses/`. No other dependency licence is checked, and the SDK's own packages declare no `license` field. |
| Requirements | Operator, 2026-10-19: themes should incorporate the generative UI libraries from AI Elements, CopilotKit and assistant-ui; check their licences and say what we need to do. Then, the same day: skip CopilotKit, since it costs money, and no telemetry at all. |
| Decision Drivers | (1) A theme must style whatever chat library an app uses, without the theme choosing the library. (2) The library is an engineering choice tied to the app's AI backend (AI SDK, CopilotKit runtime, LangGraph and others), not a brand or anatomy choice. (3) Accessibility and security cannot be left to each library: streamed text, focus while messages arrive, agent actions that need approval, and model output rendered as markup. (4) Apps built on the SDK must not send usage data to vendors by default. (5) Every licence obligation must be met by construction and checked, not remembered. |

### Licences as checked on 2026-10-19

| Library | Licence | Packages checked | What it means for us |
|---------|---------|------------------|----------------------|
| AI Elements (`vercel/ai-elements`) | **Apache-2.0** | `ai-elements` 1.9.1 (the CLI); its components depend on `ai` 7.0.145 (Apache-2.0), `streamdown` 2.7.1 (Apache-2.0) and shadcn/ui (MIT) | Permissive, with a patent grant. The CLI copies component **source** into the app, so whoever copies it redistributes it: keep the licence text and copyright notices, mark changed files, carry any NOTICE file (the repository has none today). The patent grant ends for anyone who sues over a patent in the work. |
| assistant-ui (`assistant-ui/assistant-ui`) | **MIT** | `@assistant-ui/react` 0.15.29, `@assistant-ui/react-ui`, `@assistant-ui/react-ai-sdk`, `@assistant-ui/react-markdown`, `assistant-cloud` 0.2.7: all MIT | Permissive; keep the copyright and licence notice. `assistant-cloud` is a client for assistant-ui's hosted service; it is a dependency of `@assistant-ui/react` but only contacts the service if configured. |
| CopilotKit (`CopilotKit/CopilotKit`) | **MIT** (all 30 published packages, per its `scripts/package-licenses/policy.json`; `@copilotkit/license-verifier` 0.5.0 is MIT too) | `@copilotkit/react-core`, `react-ui`, `runtime` 1.79.1 | The code is MIT, but the product is commercial. Version 2 checks a licence token (`COPILOTKIT_LICENSE_TOKEN`): with none it shows a fixed "Powered by CopilotKit · Get a license" banner over the page; some features (threads, for one) need a paid licence; an expired or invalid token disables features. The runtime and its Inspector send metadata telemetry by default (opt out with `COPILOTKIT_TELEMETRY_DISABLED=true`; Do Not Track is respected). `@copilotkit/react-core` depends on `@scarf/scarf`, which reports package installs (opt out with `SCARF_ANALYTICS=false` or `"scarfSettings": { "enabled": false }` in the app's `package.json`). |
| shadcn/ui (`shadcn-ui/ui`) | **MIT** | `shadcn` 4.22.1 | Underlies AI Elements and assistant-ui's styled components; same obligations as MIT above when its source is copied. |

None is copyleft. This table is engineering's reading of the licence files,
not legal advice; rule 7 below asks counsel to confirm it.

**Amendment, 2026-10-19 (operator):** CopilotKit is not supported, because
its features cost money and it reports telemetry by default. The SDK ships no
CopilotKit bridge or adapter, and no telemetry of any kind (rule 8). Its row
above stays as the record of why.

**Amendment, 2026-10-19 (build):** the libraries are styled through two
**theming surfaces**, found in their sources: `shadcn` (shadcn/ui's
variables, used by AI Elements and by the components assistant-ui's CLI
adds) and `assistant-ui` (the `--aui-*` variables of assistant-ui's packaged
styles, `@assistant-ui/react-ui`, which hold HSL channel values such as
`240 10% 3.9%` that the library wraps in `hsl()`). Because a surface may take
channel values, a bridge holds each theme's resolved values, not references
to `--piq-*` tokens.

**Amendment, 2026-10-19 (build, US-045-AC4):** one surface, `shadcn`.
assistant-ui's packaged styles (`@assistant-ui/react-ui`, `--aui-*`) have had
no release since 2025-10-17 and do not work with assistant-ui's current core;
its current components come from its registry (`npx assistant-ui add`) and
use shadcn's variables, as AI Elements does. The `assistant-ui` bridge is
dropped. A bridge's selectors carry three attribute tests, so it outranks
both the library's defaults and the theme's own appearance blocks: the theme
still sets the 0.x aliases `--accent`, `--border`, `--muted` and `--radius`,
which shadcn uses for other things, and inside a themed element a bridge
gives those four shadcn's meanings (the SDK reads only `--piq-*`). Where the
theme's structure or muted text is too faint for how shadcn draws `primary`
(also as text) or `muted-foreground`, the bridge uses the theme's next-stronger
text role. Previews copy AI Elements and assistant-ui components in with
`tools/vendor-ai-elements.mjs` (rule 6, `shipped: false`); the theme pages
and Storybook show them as **AI Components**, apart from the SDK's own **UI
Components**.

## Decision

We will **bridge** generative UI libraries rather than model them as design
systems, build the assistant screens as **SDK patterns**, let agents render
only **SDK components**, and **check every third-party licence before
release**.

Rules:

1. **Not a design system, not a theme choice.** A generative UI library is
   never selected in the builder's design-system step and never named in a
   theme file. Every theme works with every supported library.
2. **Bridges are generated CSS and contain no third-party code.** For each
   theme × appearance the token build emits one stylesheet per **theming
   surface**, mapping `--piq-*` role and anatomy tokens onto the library's
   CSS variables. There is one surface (amendment above):
   - `@ux-builder/tokens/bridges/shadcn/<theme>.css` — shadcn's variables
     (background, foreground, card, popover, primary, secondary, muted,
     accent, destructive, border, input, ring, chart, sidebar, radius and
     fonts), which style AI Elements and assistant-ui's registry components.

   A surface is added only when a supported library needs variables that
   shadcn's do not cover.

   A bridge is scoped like a theme (`[data-theme="T"][data-appearance="A"]`,
   CONTRACT-003), so it follows run-time theme switching and nested themes,
   and does not depend on shadcn's `.dark` class. Library names appear only
   to say what a bridge is for, never as an endorsement.
3. **The contrast gate covers bridges.** Libraries pair colours in their own
   ways (for example `primary` on `primary-foreground`); every pairing a
   bridge's library documents is checked at 4.5:1 (3:1 for non-text) in every
   theme, as themes are today. A theme whose bridge fails does not build.
4. **Assistant patterns are ours.** Conversation, message, composer,
   streaming state, stop and retry, suggestions, reasoning, tool call,
   sources, approval and artifact pane are `@ux-builder/ui` patterns
   (`@ux-builder/ui/assistant`), admitted under ADR-020 and built to ADR-016 and
   ADR-021. They take messages and callbacks as props and import no AI
   library. Thin **adapters**, one entry point per runtime
   (`@ux-builder/ui/assistant/ai-sdk`, `/assistant-ui`), connect
   them to a library's runtime or headless primitives; each library is an
   optional peer dependency, so an app installs only the one it uses.
5. **Generative UI renders SDK components only.** When a tool call renders
   UI, it names a component from an allow-list generated from
   `catalogue.json` (components marked `renderable`), with props validated
   against the catalogue. Anything else renders a plain fallback. Model
   output is never inserted as HTML or script; markdown is rendered
   sanitised.
6. **Third-party code is used as packages, not copied.** The SDK depends on
   third-party code through npm, where each package carries its own licence.
   Copying source (for example an AI Elements component) into an SDK package
   is allowed only through `licenses/vendored.json`, which records the
   source, version, licence and changed files; the files keep their
   copyright notices and gain a "Changed by …" line; the licence text and any
   NOTICE file go in the package's `licenses/`. Code copied only for previews
   (Storybook and the builder) and left out of the published package is
   recorded with `shipped: false`; its licence texts sit beside it
   (`packages/ui/ai/licenses/`), and it is not listed in the package's
   `THIRD-PARTY-NOTICES.md`, because the package does not distribute it.
7. **The licence check runs in `npm run check` and before every release.**
   `tools/check-licences.mjs` reads every published package's production,
   peer and optional peer dependency tree and `licenses/vendored.json`, and:
   - passes only these SPDX licences: MIT, Apache-2.0, ISC, BSD-2-Clause,
     BSD-3-Clause, 0BSD, CC0-1.0 (fonts stay under ADR-017's rules);
   - fails, naming the package and its licence, on anything else, including
     an unknown, missing or `SEE LICENSE IN` licence, unless the package is in
     a reviewed exception list with counsel's approval and a date;
   - fails when a vendored Apache-2.0 file has lost its notice or its
     licence text is not shipped;
   - fails when an SDK package declares no `license` field;
   - writes `THIRD-PARTY-NOTICES.md` into each published package.

   Counsel confirms the allow-list and the table above before the first
   release that depends on any of these libraries.
8. **No telemetry.** The SDK ships no package that reports usage and no
   dependency that runs an install script (where install analytics run)
   unless an exception records why the script is safe; the licence check
   enforces both (`@scarf/scarf` is named). No adapter configures a vendor's
   hosted service (such as `assistant-cloud`); an app that wants one opts in
   with its own approval. CopilotKit is not supported (amendment above).

**Key Points**: Every theme dresses AI Elements and assistant-ui | Our patterns, adapters per runtime | Agents render catalogue components only | Licences checked, no telemetry, by construction

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Each library as a second design system the user selects** | One more card in the builder | Mixes a runtime choice into anatomy (against ADR-013 and ADR-022); multiplies themes by libraries; a theme becomes tied to one library | Rejected |
| **Leave the libraries' own look** | No work | Assistants look foreign in every app; accessibility and security differ per library; nothing for agents to compose | Rejected |
| **Bridges only** | Small: generated CSS, no new components | Libraries keep their own layout and accessibility behaviour; no approval or generative UI rules; one experience per library | Rejected as the whole answer; kept as rule 2 |
| **Our own patterns only, no bridges** | One consistent experience | Teams already on a library's styled components get nothing; slower to deliver | Rejected as the whole answer; kept as rule 4 |
| **Vendor AI Elements' source into `@ux-builder/ui`** | Exact AI Elements behaviour inside the SDK | We redistribute Apache-2.0 source and own its updates; Tailwind and shadcn come with it, against ADR-016's framework-free CSS | Rejected as the default; allowed case by case under rule 6 |
| **Bridges plus our own patterns, adapters per runtime, licence check (selected)** | Every theme dresses every library at once; one accessible, secure assistant experience on any runtime; obligations met by construction | One surface to keep in step with two libraries' releases; a new check in CI | **Selected** |

## Consequences

| Type | Impact |
|------|--------|
| Positive | An assistant matches its app's theme on AI Elements or assistant-ui, including themes saved later in the builder; streaming, approval and generative UI behave the same in every app; agents compose from the catalogue; licence and telemetry obligations are checked rather than remembered; the SDK's own packages state their licence. |
| Negative | The libraries' variable names and runtime APIs change, so bridges and adapters need updating with their releases; the contrast gate grows by each bridge's pairings; `@ux-builder/ui` gains optional peer dependencies; the licence check can block a release on a transitive dependency. |
| Neutral | Choosing a library stays an app decision; the builder only shows how each looks and prints its setup. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| A library renames or drops a theming variable | M | M | Each bridge has a Storybook story running the real library, audited in every theme; dependency updates run it |
| A transitive dependency changes licence | L | H | The check runs on every install in CI and before release; the lockfile pins versions |
| A dependency starts reporting usage (a telemetry package or an install script) | L | H | Rule 8: the licence check fails on known telemetry packages and on any install script without a reviewed exception |
| Model output used to inject markup or drive an unapproved action | M | H | Rule 5 (catalogue allow-list, props validated, sanitised markdown); approvals are explicit and never automatic; `security-owasp` tests |
| Counsel disagrees with the allow-list or the reading above | L | M | Rule 7 asks for confirmation before the first release that depends on any of these libraries |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| A Praxis Carbon app's assistant, on AI Elements and on assistant-ui, passes the audit and reviewers recognise it as Praxis Carbon | A library's look cannot be reached through its variables |
| `npm run check` fails on a GPL test dependency and on a vendored file with its notice removed | A licence outside the allow-list is needed for a feature |
| No network request to a vendor from the starter's assistant with default settings | A default needs a vendor service |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **Concern selection**: none changed; FEAT-007 proposes a `third-party-licences` project concern if the operator wants one.
- **Practice override**: none. `a11y-wcag-aa` applies to every assistant pattern and bridge (rule 3); `security-owasp` applies to rendered model output and agent actions (rule 5) and to telemetry (rule 8).

## References

- AI Elements: `github.com/vercel/ai-elements` (LICENSE, Apache-2.0)
- assistant-ui: `github.com/assistant-ui/assistant-ui` (LICENSE, MIT)
- CopilotKit: `github.com/CopilotKit/CopilotKit` (LICENSE, MIT; `scripts/package-licenses/policy.json`; `packages/react-core/src/v2/components/license-warning-banner.tsx`; telemetry docs)
- shadcn/ui: `github.com/shadcn-ui/ui` (LICENSE.md, MIT)
- Scarf: `github.com/scarf-sh/scarf-js` (install analytics; denied by rule 8)
- Apache License 2.0, section 4 (redistribution); W3C WCAG 2.2 (2.4.11 Focus Not Obscured, 4.1.3 Status Messages)
- ADR-013, ADR-016, ADR-017, ADR-020, ADR-021, ADR-022; CONTRACT-003

## Review Checklist

- [x] Context names a specific problem
- [x] Decision statement is actionable
- [x] At least two alternatives were evaluated
- [x] Each alternative has concrete pros and cons
- [x] Selected option's rationale explains why it wins over the best alternative
- [x] Consequences include both positive and negative impacts
- [x] Negative consequences have documented mitigations
- [x] Risks are specific with probability and impact assessments
- [x] Validation section defines how we'll know if the decision was right
- [x] Review triggers define conditions for reconsidering the decision
- [x] Concern impact section is complete
- [x] ADR is consistent with governing feature spec and PRD requirements (FEAT-007; FR-28 to FR-31)
