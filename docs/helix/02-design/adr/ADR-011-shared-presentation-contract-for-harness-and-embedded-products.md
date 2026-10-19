---
ddx:
  id: ADR-011
  type: adr
  status: accepted
  links:
    - kind: informs
      to: prd
    - kind: informs
      to: ADR-013
    - kind: informs
      to: ADR-015
---

# ADR-011: One presentation contract — theme tokens and widgets — shared by the harness and every embedded product

> **Imported 2026-10-05** from the original harness prototype, unchanged in substance below this note. Its number is kept so references to it stay true. ADRs, FEATs and FRs it names other than ADR-011 and ADR-012 are the prototype's and are not part of this repository. This repository is now the home of this decision.

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-01 | **Accepted** 2026-10-06 | Operator; harness team as future owner | ADR-005, ADR-008, ADR-010, FEAT-016 (FR-118, FR-121, FR-123, FR-127, FR-129), TD-018 | Medium |

> Written 2026-10-01 from a design conversation with the operator, ahead of
> any code. The embedding protocol is **not** decided here: this decision is
> written to hold whether products embed through MCP Apps or A2UI (both
> defined below), and ADR-010's native-rendering choice is under review
> against them. Nothing here is built.

> **Accepted 2026-10-06** by the operator, with these changes to what is
> written below, which is otherwise kept as decided:
>
> - **It is built.** The package this ADR calls for is `@ux-builder/tokens`
>   (DTCG tokens, role-based names, every theme and appearance, resolved
>   values for embedded views) and `@ux-builder/ui` (the shared widgets), in this
>   repository, with releases, a contrast gate and a gallery.
> - **`claude-like` is gone.** The themes are now Praxis, Plain and
>   Synaptiq, plus Praxis on Material, Fluent and Carbon, and Databricks
>   (ADR-013, ADR-018); a theme is a brand on a design system.
> - **Ownership is open.** No harness team exists yet; the operator owns the
>   package until one does.
>
> **Note, 2026-10-03.** The embedding protocol this ADR leaves open is decided
> by ADR-012: embedded products are MCP Apps views. The package's MCP Apps
> mapping is therefore the output embedded products consume. Nothing else in
> this ADR is changed by that.

## Context

| Aspect | Description |
|--------|-------------|
| Problem | An AI agent harness is to become the backbone of the Business User experience, with this application's UI ported onto it and products such as a billing-review app embedded in its conversations (FEAT-016). For the user to see one product, the harness and every embedded view must share the same colours, type, spacing **and widgets** — one dropdown, one table, one empty state — and follow the same theme and appearance live. Today nothing outside this repository can consume the presentation layer except by copying it. |
| Current State | Presentation is a token contract: 85 distinct CSS custom properties across the client brand's theme file (which also carries `plain`), `claude-like.css` (the `conversational` family) and `praxis.css` — palette, type scale, spacing, button, pill and badge tokens, availability states, logo and mark. `assets/ui.css` styles everything through them and never learns which theme is on (ADR-005); widget classes (`.btn`, `.chip`, `.seg`, `.table`, `.field`, `.option`, `.notice`) are interleaved with screen layout (`.board`, `.dossier`, `.masthead`). Appearance is resolved from the user's dark/light/auto choice in `web/App.jsx:171`. **The billing-review app already copies all four files byte-for-byte** (its ADR-005, 2026-10-01: "the platform's own files, copied unchanged") and has built its own table and navigation layer in its own stylesheet. |
| Requirements | FR-127 (the embed drawn in the theme on screen), FR-129 (identical on both Business User screens), FR-118 (inline view: two filters, at most five rows), FR-121 (a refused action shown as not recorded), FR-123 and TD-018 (an outage said, not spun), FR-57 (a product shown with its own mark). Contrast floor of 4.5:1 for text on both grounds (`tools/theme_accent.py`, `web/favicon.js`). |
| Decision Drivers | Copy-by-hand has already happened once and will silently drift with the next token change. A second product must not need a second copy. The embedding protocol is still open, so the shared layer must not depend on it. Some token names describe a colour, not a role — `--navy` is the structural colour and is near-white in the dark family; `--paper` is the ground — and those names harden the moment a second team depends on them. |

### Terms

- **Harness** — the AI agent harness being built to host the Business User
  experience; project-defined.
- **MCP Apps** — the first official extension to the Model Context Protocol
  (spec 2026-01-26, Final). A
  product's MCP server declares an HTML view the host renders in a sandboxed
  iframe; the host passes theme, appearance, CSS variables and fonts in
  `hostContext` and notifies changes with
  `ui/notifications/host-context-changed`. It standardises its own variable
  names (`--color-background-primary`, `--color-text-primary`,
  `--font-sans`, `--border-radius-md`, …). Hosts include Claude, ChatGPT, VS
  Code Copilot, Cursor and Goose.
- **A2UI** — Agent-to-User Interface (Google; v0.9, stable). The agent sends a
  declarative description of components and data; the client renders it with
  its own components from a **catalog** it advertises. No product code runs in
  the client. Its basic catalog has no data table.
- **DTCG format** — the W3C Design Tokens Community Group's Design Tokens
  Format Module, first stable version 2025.10 (28 October 2025): a
  vendor-neutral JSON format for tokens, with theming and modern colour
  spaces, read by Style Dictionary, Tokens Studio and Figma.
- **Style Dictionary** — an open-source build tool that turns token files into
  platform outputs (CSS variables, JSON, others).

No resource summaries exist yet under `docs/resources/` for these four; see
Validation.

## Decision

We will move the presentation contract out of this application into **one
versioned package, owned by the harness team, that is independent of any
embedding protocol**, and make this application, the harness and every
embedded product consumers of it. The package has three layers, each built on
the one before:

1. **Tokens — the source of truth.** DTCG-format JSON. Each theme
   (`praxis`, `claude-like`, the client brand, `plain`) and each appearance (`light`,
   `dark`) is a variant of one token set, not a separate file. Names are tiered:
   - *primitives* — the raw palette and scales, never consumed directly;
   - *roles* — `color.ground`, `color.surface`, `color.surface-sunken`,
     `color.text`, `color.text-muted`, `color.accent`, `color.structure`,
     `color.rule`, `state.live` … `state.closed`, type, spacing, radius,
     shadow;
   - *component* — button, pill, badge, field, table.

   **Brand** tokens (logo, mark, favicon, powered-by) are a separate group that
   only the harness consumes; an embedded product never draws the harness's
   brand.
2. **Widgets.** A small set, chosen from what embedded views need rather than
   from this app's screens: `Button`, `ChoicePicker` (filter), `StatusPill`,
   `DataTable` (priority-ordered rows, columns, paging), `Card`, `Notice` (the
   empty, loading, not-answered and not-recorded states of FR-121, FR-123 and
   TD-018) and `Toast` with Undo (FR-120). Each is a framework-free,
   prefixed CSS component (`.piq-btn`, `.piq-table`) plus a React 19 component
   that owns its behaviour — keyboard, focus, menus, sorting, paging and
   accessibility. Behaviour is part of the contract, specified beside the
   visuals.
3. **Generated outputs**, all from the token source:
   - CSS custom properties, including **aliases for today's names** so
     `assets/ui.css` keeps working while it migrates;
   - resolved JSON per theme × appearance, for anything that applies tokens at
     runtime;
   - an **MCP Apps mapping** from roles to MCP Apps' standard variable names,
     plus our role variables for what that set does not cover;
   - widget names and properties that are **also the names of an A2UI
     catalog** (`DataTable`, `ChoicePicker`, `StatusPill`), so a client renderer
     can be written against the same list.

**How a theme reaches an embedded view.** The harness passes the **resolved
values** for the active theme and the **resolved appearance** — `dark` or
`light`, never `auto` — and pushes a change when either changes. A product
never needs to know theme names. Under MCP Apps that is `hostContext.styles`
plus the change notification; under A2UI the client applies the tokens itself
and nothing crosses to the product. Fonts are passed explicitly, because an
iframe does not inherit the page's.

**Adoption rule.** A product the organization owns **must** build its embedded view
from the role tokens and the widget set to be embedded. A third-party product
**should**; under MCP Apps the harness can request this but not enforce it.

**Key Points**: One token source, many outputs | Roles, not colours, are the
contract | Brand stays with the harness | Widgets carry behaviour, not just
looks | Resolved values and a resolved appearance cross, never theme names or
`auto` | Neutral between MCP Apps and A2UI | This app becomes the first
consumer, not the source

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Keep copying the files** (the billing-review app's ADR-005, as practised today) | Nothing to build; each app is self-contained | Every token change is a manual change in N repositories; drift is silent and found by eye; screen layout travels with the widgets; a third-party product cannot be asked to copy our files | Rejected: it has already been done once, and the number of copies grows with every product |
| **Tokens only, no widgets** | Small; easy to adopt; colours, type and spacing match | Two products sharing every colour still ship different dropdowns, tables, empty states and focus behaviour — the billing-review app has already written its own table layer. "Looks related" is not "is one product" | Rejected: covers the cheap half of consistency and leaves the half users notice |
| **Adopt a third-party design system and theme it** | Mature widgets, accessibility and docs for free | Its token model and component names become ours; the measured themes (ADR-005) must be re-expressed in its terms; an A2UI catalog would still have to be mapped onto it; a heavy dependency for every product we ask to embed | Rejected for now: worth reopening if widget accessibility proves too costly to own |
| **Adopt MCP Apps' variable names as our token contract** | Zero mapping for MCP Apps hosts | Its set has no availability states, no accent role, no component tokens and no brand group; it ties the contract to one protocol while the protocol is undecided; A2UI would need the reverse mapping | Rejected: it is an **output** of the package, not its source |
| **One protocol-neutral package: tokens, widgets, generated outputs (chosen)** | One change propagates everywhere; consistency extends to widgets and behaviour; works under either protocol; the second product costs nothing extra | A real package with versions, owners and consumers; a renaming pass first; widget behaviour must be built and tested once, properly | **Selected**: the only option that keeps the theme and the widgets identical across the harness and products without binding the decision to a protocol not yet chosen |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A user sees one product — Praxis in dark, say — across the harness and every conforming embed, including when they switch appearance mid-conversation. A token or widget fix ships once. The billing-review app drops four copied files and its private table layer. The embedding-protocol decision gets cheaper: both MCP Apps and A2UI are outputs of the same source. FR-129's parity becomes structural for widgets as it already is for the embed component (ADR-010). |
| Negative | Token names become a public interface: renaming or removing one is a breaking change under semver, so the renaming pass (`--navy`, `--paper` and similar) has to happen **before** the first release, not after. Widget behaviour — keyboard, focus, menus, table paging — is real software with its own tests. This repository loses the ability to change a token in place; a change becomes a release of the package and a version bump here. Under MCP Apps, conformance of a third-party product is a request, not a guarantee. |
| Neutral | ADR-005 is extended, not superseded: `data-theme`, `data-family` and `data-appearance` still select the theme in this app, and no component reads the theme. ADR-008's rule is untouched — a theme may select a view; the package supplies widgets, not views. Matching, access and the request lifecycle are unaffected. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Products pin old package versions and drift visibly | High | Medium | The harness reports the package version it runs; embedding conformance names a minimum version; screenshot tests on the reference gallery run against each consuming product's pinned version |
| The renaming pass breaks this app or the billing-review app | Medium | Medium | Generated aliases for every old name for one major version; the persona suites (`npm test`) and the billing-review app's suites run against the aliased build before any old name is removed |
| A theme ships unreadable on one appearance | Medium | High | `tools/theme_accent.py`'s contrast check moves into the package and runs in CI for every theme × appearance × text role, failing the build below 4.5:1 |
| The widget set grows into a general design system nobody can own | Medium | Medium | Admission is by need from an embedded view or the harness, recorded per widget; the set starts at the seven named above |
| A third-party product ignores the tokens under MCP Apps | High | Low | Expected and accepted: such a product looks like itself; its own mark already distinguishes it (FR-57). Organization-owned products are bound by the adoption rule |
| MCP Apps or A2UI changes its variable names or catalog model | Low | Low | Both are generated mappings; a change is a regenerated output, not a contract change |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| This app and the billing-review app consume the package with **no theme or widget file copied** in either repository | Any product needs a copied token or widget file to look right |
| A token change made once appears in the harness, this app and the billing-review app after a version bump alone | A change needs a hand edit in a consumer |
| Every theme × appearance passes the 4.5:1 text contrast check in CI | A theme is released that fails it |
| The billing-review app's embedded view renders identically under Praxis dark in the harness and in its standalone app (screenshot comparison) | They differ in anything but the product's own mark |
| The harness passes a resolved appearance, and an embedded view follows a mid-conversation switch without reloading | An embedded view guesses its appearance from the operating system |
| Resource summaries exist for MCP Apps, A2UI, the DTCG format and Style Dictionary under `docs/resources/` | — (a documentation gap, not a reconsideration) |

## Supersession

- **Supersedes**: None. **Extends** ADR-005: the token contract it created
  becomes a shared, versioned interface rather than this application's
  internal detail. The billing-review app's ADR-005 ("copied unchanged") should be superseded
  in that repository when it adopts the package.
- **Superseded by**: None

## Concern Impact

- **Concern selection**: Adds a shared design-system dependency to the
  `frontend-framework` slot (React 19, ADR-006) without changing its filler.
- **`a11y`**: keyboard and screen-reader support, recorded in `concerns.md` as
  **unverified**, becomes the widget package's responsibility and is asserted
  there once rather than in each consumer. The contrast floor moves from one
  executable assertion (`web/favicon.js`) to a CI check over every theme.
- **`verification`**: the reference gallery and its screenshot tests are a new
  claim surface and must stay green.

## References

- ADR-005 — the prototype's themeable-UI decision (not part of this repository)
- ADR-008 — `docs/helix/02-design/adr/ADR-008-a-theme-may-select-a-view.md`
- ADR-010 — `docs/helix/02-design/adr/ADR-010-embedded-products-manifest-proxy-native.md`
- FEAT-016 — `docs/helix/01-frame/features/FEAT-016-products-answered-in-the-conversation.md`
- `assets/themes/*.css`, `assets/ui.css`, `web/App.jsx:171`, `tools/theme_accent.py`, `web/favicon.js`
- The billing-review app's ADR-005 ("themeable UI shared with the platform")
- MCP Apps specification 2026-01-26 — <https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx>
- A2UI v0.9 specification — <https://a2ui.org/specification/v0.9-a2ui/>
- Design Tokens Format Module 2025.10 — <https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/>

## Review Checklist

- [x] Context names a specific problem
- [x] Decision statement is actionable
- [x] At least two alternatives were evaluated — five were
- [x] Each alternative has concrete pros and cons
- [x] Selected option's rationale explains why it wins over the best alternative
- [x] Consequences include both positive and negative impacts
- [x] Negative consequences have documented mitigations
- [x] Risks are specific with probability and impact assessments
- [x] Validation section defines how we'll know if the decision was right
- [x] Review triggers define conditions for reconsidering the decision
- [x] Concern impact section is complete
- [x] ADR is consistent with governing feature spec and PRD requirements
- [ ] Package owner and repository named — **no**: the harness team is assumed
- [ ] Embedding protocol chosen — **no**: deliberately left open; this ADR holds under either
- [ ] Accepted — status remains **Proposed**
