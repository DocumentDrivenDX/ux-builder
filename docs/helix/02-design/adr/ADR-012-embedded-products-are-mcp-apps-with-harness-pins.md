---
ddx:
  id: ADR-012
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: ADR-011
---

# ADR-012: Embedded products are MCP Apps; the harness owns pins and badges

> **Imported 2026-10-05** from the original harness prototype, unchanged in substance below this note. Its number is kept so references to it stay true. ADRs, FEATs and FRs it names other than ADR-011 and ADR-012 are the prototype's and are not part of this repository. This repository is now the home of this decision.

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-03 (amended 2026-10-04) | **Accepted** — the badge's three Databricks verification items are open; the SDK verified 2026-10-04 | Operator | Supersedes ADR-010; amends FEAT-016; informed by ADR-011, ADR-003, ADR-005; the billing-review app's ADR-007 | Medium |

> Written 2026-10-03 from four decisions the operator made that day (D1–D4
> below) and the badge design agreed with them. Accepted because the operator
> decided it, not because anything is built: nothing here is built. Three
> platform facts the badge depends on have not been checked and are listed in
> §Verification; the decision stands, and only the badge's freshness depends
> on them. The Python MCP SDK's support for tool `_meta` and for resource
> subscriptions has **not** been verified either.
>
> **Amended 2026-10-04.** The SDK is verified, and the subscription mechanism
> is different from the one written below: see *Amendment, 2026-10-04*. Where
> the text is overtaken it is marked, not rewritten.

## Context

| Aspect | Description |
|--------|-------------|
| Problem | FEAT-016 has a product answer inside the conversation: a limited view inline, Expand to the full view, and a way to keep it in the rail with a live count. ADR-010 proposed doing that with a manifest the platform app copies, a server-side proxy, and views the platform app draws natively. Since then ADR-011 has put an **AI agent harness** under the Business User experience and left the embedding protocol open between MCP Apps and A2UI. The harness, not this app, is now where products are embedded. |
| Current State | ADR-010 is Proposed and unbuilt. ADR-011 (Proposed) defines one protocol-neutral presentation package — DTCG tokens, a widget set, generated outputs including an **MCP Apps mapping** — owned by the harness team. The billing-review app specifies an embed REST API (its FEAT-012) and scopes rows by caller identity (its ADR-007). |
| Requirements | FR-115 … FR-129 as amended by FR-130 … FR-137. Sensitive records cross between applications, so where data travels, and on whose identity, matters as much as how it looks. Both deployments are on Databricks (D3). |
| Decision Drivers | One standard that many hosts already speak, rather than a private contract every product implements for us alone. Product code isolated from the harness page. No product-specific code in the harness. A count in the rail that stays current without leaking anything. |

### The MCP Apps specification, as relied on here

MCP Apps is the first official extension to the Model Context Protocol
(identifier `io.modelcontextprotocol/ui`, specification 2026-01-26). The
specification names Claude, ChatGPT, VS Code Copilot, Cursor and Goose among
its hosts. What this decision uses from it:

- A tool links to a UI resource with `_meta.ui.resourceUri` (a `ui://` URI);
  the resource is HTML with MIME type `text/html;profile=mcp-app`, rendered by
  the host in a **sandboxed iframe**, with network access governed by the
  resource's declared `csp` (`connectDomains`, `resourceDomains`, …).
- A tool's `visibility` is `["model", "app"]` by default; `["app"]` hides it
  from the model while letting the view call it with `tools/call`, which the
  host relays to the server.
- Display modes `inline`, `fullscreen` and `pip`. The host advertises
  `availableDisplayModes` in `hostContext`; the view asks for a change with
  `ui/request-display-mode` and is told the mode actually set.
- `hostContext` carries `theme` (`light` | `dark`), `styles.variables` and
  `styles.css.fonts`, `displayMode` and `containerDimensions`; changes arrive
  as `ui/notifications/host-context-changed`.
- The view may send `ui/message` (post into the conversation),
  `ui/update-model-context` (tell the model what the user is looking at) and
  `ui/open-link`.
- **Nothing** in the specification covers persistent placement — no toolbar,
  sidebar, pin, launcher or badge. That part is ours (D2, D4).

The badge uses **base MCP**, not MCP Apps: resources with `subscribe`,
`resources/subscribe`, `notifications/resources/updated` and `resources/read`.

## Decision

### D1 — MCP Apps replaces ADR-010's native rendering

An embedded product's view is an **MCP Apps view**: the product's own HTML,
served by the product's MCP server and rendered by the harness in a sandboxed
iframe. The platform app no longer draws product views, keeps a copy of a product
manifest, or proxies product reads through endpoints of its own.

The theme reaches the view as **resolved values**: the harness fills
`hostContext.styles` from ADR-011's package — its MCP Apps mapping of role
tokens to MCP Apps variable names, plus role variables for what that set lacks
— passes the resolved appearance in `hostContext.theme` (never `auto`), and
sends `ui/notifications/host-context-changed` when the user switches theme or
appearance. An organization-owned product **must** style its view from those variables
and ADR-011's widgets (ADR-011's adoption rule); a third-party product should.

### D2 — Pins are the harness's alone

- The harness draws a **Pin** control on the chrome around every MCP Apps frame
  it renders. The view never asks to be pinned; there is no view-side pin
  request.
- A pin is stored by the harness as `{server, tool, arguments, display_mode}`.
  Opening a pin **calls the tool again** and renders the result, in
  `fullscreen` unless the pin says otherwise. A pinned view is always live,
  never a snapshot.
- A product declares that a tool is pinnable, and how its badge is read, in a
  vendor-namespaced key of the tool's `_meta`:

  ```json
  "_meta": {
    "ui": { "resourceUri": "ui://billing-review/review-queue" },
    "io.praxis/pin": {
      "label": "Billing review",
      "icon": "ledger",
      "badgeResource": "billing-review://queue/summary",
      "badgeField": "counts.needs_fixing",
      "displayMode": "fullscreen"
    }
  }
  ```

- The harness announces the extension in its MCP client capabilities
  (`capabilities.extensions["io.praxis/pin"]`) at `initialize`. A product emits
  `io.praxis/pin` only to a host that announced it; any other host sees an
  ordinary MCP Apps tool.

### D3 — Both run on Databricks

The harness is a **Databricks App**. The billing-review app is a Databricks App on Lakebase.
The standalone target — a local server over local PostgreSQL — remains for
development and testing; ADR-003 is otherwise unchanged.

### D4 — The harness team owns pins and badges

The harness team owns the `io.praxis/pin` extension's specification, stored
pins, the toolbar and its badges, and the badge sessions below — as ADR-011
already makes them owners of the presentation package. A product owns only its
tool metadata and its summary resource.

### The badge: a ping, never a payload

1. The product exposes a JSON resource — for the billing-review app `billing-review://queue/summary`
   (counts by status, exposure) — and advertises `resources: {subscribe: true}`.
2. While a user is active in the harness and has the product pinned, the
   harness holds **one MCP session per user per pinned server, under that
   user's identity**. It reads the resource to draw the badge, then sends
   `resources/subscribe` for it.
3. When the user's counts change, the product sends
   `notifications/resources/updated {uri}` on that session's stream. The
   notification carries **only the URI** — no counts, no record contents.
4. The harness re-reads the resource with the same identity and redraws the
   badge. The read is scoped by the caller's identity (the billing-review app's ADR-007), so the
   product never decides in the push what a user may see.
5. On reconnect or token refresh the harness reads afresh and subscribes again.
   A missed ping costs freshness, never correctness.
6. **Fallback**, where streams cannot be held: re-read on a timer (every one to
   two minutes) and when the harness tab regains focus.

*Amended 2026-10-04 — steps 1, 2 and 5 above are overtaken at protocol
2026-07-28*: the product does not advertise `resources: {subscribe: true}` and
the harness does not send `resources/subscribe`. The harness sends
**`subscriptions/listen`** with `{"resourceSubscriptions":
["billing-review://queue/summary"]}`, and the response is the event stream. On a
dropped stream it listens again and re-reads. Steps 3, 4 and 6, and the
ping-not-payload rule, are unchanged.

How the product knows a user's counts changed is the product's business; for
the billing-review app it is a `NOTIFY` raised on every write path and a `LISTEN`ing
dispatcher that coalesces bursts per session (the billing-review app's ADR-008).

### The surface a product provides — the billing-review app first

| Kind | Name | Visibility | Purpose |
|---|---|---|---|
| Tool | `review_queue` | model, app | What the model calls for a prebill question. Returns a text summary the model reads and structured content (counts, exposure, top rows) for the view. `_meta.ui.resourceUri: ui://billing-review/review-queue`; `_meta["io.praxis/pin"]` to a host that announced it |
| Tool | `queue_page` | app | Filtering, sorting and paging from the view |
| Tool | `queue_options` | app | The filter values the view offers |
| Tool | `record_review` | app | A reviewer action on one finding (phase 2). *Built in the billing-review app 2026-10-04, in both sizes (OQ-12 answered)* |
| UI resource | `ui://billing-review/review-queue` | — | One HTML bundle. Reads `hostContext.displayMode`: `inline` shows two filters (matter, status) and at most five rows; `fullscreen` shows every filter and column, paging and entry review |
| Resource | `billing-review://queue/summary` | — | JSON, subscribable; the badge's source |

The view asks for `ui/request-display-mode {mode: "fullscreen"}` to Expand
**only** when `availableDisplayModes` includes `fullscreen`; otherwise Expand
becomes "Open in the app" through `ui/open-link`. It sends
`ui/update-model-context` with the filter and row the user is looking at, so a
follow-up question can be answered, and `ui/message` for a row's "Ask about
this". Its `csp` declares no `connectDomains`: every read and action is a
`tools/call` the harness relays.

**Key Points**: Product views are MCP Apps views in a sandbox | The theme
arrives as resolved values from ADR-011's package | Pins live in the harness,
declared by tool `_meta`, announced by capability | Badges are base-MCP
resource subscriptions — a ping, then a scoped read | Both apps on Databricks;
standalone for development | Harness team owns pin and badge

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Keep ADR-010: manifest, proxy, native rendering** | Native widgets, one look by construction; product code never runs in the page | A private contract each product implements for us alone; the platform app draws every product's view and grows with each; nothing another host can reuse; the harness would have to reimplement it | Rejected: ADR-010's case against iframes was the look and parity. ADR-011's package answers the look — the view styles itself from host variables — and parity holds because the harness renders one frame type everywhere |
| **MCP Apps, with a view-side pin request** | The product chooses where its own Pin button sits | A new request every product must implement; the host can refuse it anyway; two places to pin from | Rejected (D2): the harness's chrome is enough, needs no protocol change, and treats every product alike |
| **Push the counts in the notification** | One message instead of two | Sensitive data crosses on a channel with no request of its own; the product has to decide per push what each session may see; a missed push leaves a wrong count, not a stale one | Rejected: ping-not-payload keeps every read authenticated and scoped, and makes a missed ping harmless |
| **Harness polls only, no subscription** | No held-open streams; no `LISTEN`/`NOTIFY` | A count up to a polling interval stale; load scales with users × products × frequency | Kept as the **fallback**, not the design |
| **A2UI** (ADR-011's other candidate) | No product code runs in the client; components from the host's own catalog | Its basic catalog has no data table, which the queue is; a renderer and catalog for the harness to build; fewer hosts | Rejected for embedded products now. ADR-011's package still generates an A2UI catalog, so this stays cheap to revisit |

## Consequences

| Type | Impact |
|------|--------|
| Positive | A product built once embeds in any MCP Apps host, the harness included. Product code is isolated in its sandbox, and the harness carries no product-specific code. Pins and badges work for any product that declares `io.praxis/pin`. No counts or record contents travel on the notification channel. The platform app loses the proxy, the manifest copy and the native view it would have had to maintain. |
| Negative | The view is the product's code, so the look is matched only as far as the product applies the host's variables and ADR-011's widgets; a third-party product may not. The harness holds one MCP session per active user per pinned server. Badge freshness depends on held-open streams through the Databricks Apps proxy. `io.praxis/pin` is our own extension, so a host other than the harness shows no pin or badge. |
| Neutral | Matching, access and the request lifecycle (FEAT-005, FR-85 … FR-90) are unchanged: they still decide when a product is offered. The person ↔ billing-identity link (OQ-13) and the infosec review are still needed. The billing-review app's embed REST API (its FEAT-012) becomes the MCP surface above; the queries behind it are the same. |

## Verification — open

The badge's design is decided; three platform facts it relies on are not yet
checked:

1. **App-to-app identity on Databricks.** Whether the harness can call the billing-review app
   with the user's forwarded token (`x-forwarded-access-token`, ADR-003
   §Platform Verification) or needs its own service principal with the user
   asserted. The user's token exists only while the user is active, so badge
   sessions live only while they are — acceptable, since a badge matters only
   while someone looks at the toolbar. This narrows OQ-11 to the hosted case.
2. **Long-lived streams through the Apps proxy.** Whether a Streamable HTTP
   `GET` stream survives idle periods; if not, server keep-alives and
   reconnect, each reconnect starting with a fresh read.
3. **`LISTEN`/`NOTIFY` on the Lakebase instance** (the product's side).
   Fallback: a polled version row.

~~Also unverified: the official Python MCP SDK's support for `_meta` on tools
and for resource subscriptions, which the billing-review app's server needs.~~ **Verified
2026-10-04** — see the amendment. Item 2 now concerns the
`subscriptions/listen` response stream rather than a standing `GET` stream.

## Amendment, 2026-10-04 — SDKs verified; subscriptions at protocol 2026-07-28; the billing-review app's read-only app built

**The SDKs.** Python `mcp` 2.3.0 (whose server class is now `MCPServer`)
supports `_meta` on tools and resources, MIME types on resources, and a
Streamable HTTP app that mounts under FastAPI. The MCP Apps SDK
`@modelcontextprotocol/ext-apps` 2.0.3 provides the view side (`App`,
`useApp`, `callServerTool`, `requestDisplayMode`, `updateModelContext`,
`sendMessage`, `openLink`) and the host side (`AppBridge`,
`PostMessageTransport`) — the harness's MCP Apps support can be built on the
latter. The browser MCP client is `@modelcontextprotocol/client` 2.3.0.

**The subscription model.** The Python SDK targets MCP protocol
**2026-07-28** (SEP-2575). At that revision there is no standing `GET` stream
and no `resources/subscribe`: a client sends **`subscriptions/listen`** with a
filter and the response **is** the event stream. Events are level triggers —
`notifications/resources/updated {uri}` still carries only the URI — delivered
fire-and-forget with no replay; a client whose stream drops listens again and
re-reads, which is what step 5 already required. On the product's side,
fan-out is a pluggable `SubscriptionBus`; the billing-review app's database-carried change
signal becomes a custom bus. **For the harness:** listen at 2026-07-28 with
`resourceSubscriptions` naming each pinned product's badge resource. Earlier
revisions are still negotiated (a Python client negotiated `2025-11-25`), but
whether a product's server answers `resources/subscribe` to an earlier client
has not been checked, so the harness should not rely on it.

**The billing-review app's read-only MCP App is built** (its
ADR-008 amendment of 2026-10-04): `review_queue` with both the current
`ui.resourceUri` and the earlier flat `ui/resourceUri` metadata, app-only
`queue_page`, `queue_options` and `entry_detail`, the view inline and full
screen, the summary resource (readable; listening is the app's step 2), the
standalone caller identity, and a minimal test host built on `AppBridge`.
*Later the same day*, the operator answered OQ-12 — row actions in both sizes
— and the billing-review app added the app-only `record_review` (six actions, recorded against
the host-vouched person with `source = embedded`) and in-place entry review
inline and full screen.
Not yet: `io.praxis/pin` metadata (the app's step 2, and the extension is
still unwritten here), the change signal, and write-back. Two findings matter
to the harness: the billing-review app's summary is a resource **template**
(`billing-review://queue/summary{?fields}`) because that SDK gives the caller's
identity only to template resources — the plain URI still reads, but it is
listed under resource templates, not resources; and the view applies only
light or dark from `hostContext.theme`, not `hostContext.styles`, until
ADR-011's MCP Apps output exists.

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| Sensitive records are shown to the wrong person through an embedded view or a badge | Low | High | Every read is scoped by the caller's identity on the product side (the billing-review app's ADR-007); the notification carries only a URI; infosec review before any production deployment |
| The Apps proxy drops held-open streams | Medium | Low | Keep-alives; reconnect with a fresh read; timer fallback. Only freshness suffers |
| A product's view ignores the host's variables and looks foreign | Medium (third party) / Low (organization-owned) | Low | ADR-011's adoption rule binds organization-owned products; the frame's chrome and the product's own mark (FR-57) say whose view it is |
| `io.praxis/pin` drifts between harness and products | Medium | Medium | One versioned extension specification owned by the harness team; products key on the capability the harness announces |
| Too many badge sessions on the harness | Low | Medium | Sessions only for active users with a pin; one per server, not per pin; idle sessions closed |
| The MCP Apps specification changes | Low | Medium | Pinned to 2026-01-26; the theme mapping is a generated output of ADR-011's package |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| The billing-review app's view renders inline and full screen in the harness from one bundle, in the theme on screen, and follows a mid-conversation appearance switch | The view needs a second bundle, or guesses its appearance |
| The same billing-review server works unchanged in at least one other MCP Apps host, without pin or badge | It needs harness-specific code to render at all |
| A pin reopens a live view after a reload; another user's toolbar does not show it | A pin opens a snapshot, or leaks across people |
| A reviewer action changes the badge within seconds while streams hold, and within the fallback interval when they do not | The badge is wrong rather than late |
| No network request leaves the view for the product's origin; every read is a relayed `tools/call` | The view's `csp` needs `connectDomains` for the product |

## Supersession

- **Supersedes**: ADR-010 (Proposed, 2026-10-01) — its native rendering,
  server-side proxy and copied manifest. Its identity principle (the product
  scopes rows from the caller's identity, never a browser parameter) carries
  over unchanged.
- **Amends**: FEAT-016 — see its 2026-10-03 amendment and FR-130 … FR-137.
- **Informed by**: ADR-011, whose open protocol question this decides.
- **Superseded by**: None.

## Concern Impact

- **Concern selection**: Fills the embedding-protocol slot with MCP Apps
  (2026-01-26). Adds MCP (base protocol, Streamable HTTP) as an integration
  dependency of the Business User experience.
- **`auth`**: the app-to-app identity question (OQ-11) is narrowed to
  Databricks; the infosec review stays a prerequisite.
- **`security`**: product code runs in a sandboxed iframe with a declared
  `csp`; no product credential reaches the page; the notification channel
  carries no data.
- **`verification`**: three platform facts are recorded as unverified rather
  than assumed (§Verification).

## References

- MCP Apps specification 2026-01-26 —
  <https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx>
- ADR-010 — `docs/helix/02-design/adr/ADR-010-embedded-products-manifest-proxy-native.md` (superseded)
- ADR-011 — `docs/helix/02-design/adr/ADR-011-shared-presentation-contract-for-harness-and-embedded-products.md`
- FEAT-016 — `docs/helix/01-frame/features/FEAT-016-products-answered-in-the-conversation.md`
- The billing-review app — its FEAT-012, ADR-007 and ADR-008

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
- [x] ADR is consistent with governing feature spec and PRD requirements (FEAT-016 amended the same day)
- [x] Python MCP SDK support verified — 2026-10-04 (amendment)
- [ ] Platform facts verified — **no**: the three Databricks items are open (§Verification)
- [ ] `io.praxis/pin` extension specified — **no**: the harness team owns it (D4) and has not written it
