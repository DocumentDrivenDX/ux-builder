---
ddx:
  id: US-046
  type: user-stories
  status: draft
  links:
    - kind: informed_by
      to: FEAT-007
    - kind: informed_by
      to: ADR-023
    - kind: informed_by
      to: ADR-021
---

# US-046: Hold a conversation with an assistant

**Feature**: FEAT-007 — Generative UI
**Feature Requirements**: CONV-01–07, ADP-01–03, BLD-01
**PRD Requirements**: FR-29
**Priority**: P1
**Status**: Draft

## Story

**As an** end user of an app built on the SDK, including one who uses a keyboard or a screen reader
**I want** to ask the assistant something, follow its reply as it arrives, stop it, and try again when it fails
**So that** I can work with the assistant as easily as with the rest of the app

## Context

Requested by the operator on 2026-10-19. ADR-023 makes the conversation an
SDK pattern that imports no AI library, connected to a runtime by an
adapter. Streaming is the hard part for assistive technology: announcing
every token floods a screen reader, announcing nothing leaves the user
waiting. The pattern announces each finished reply once (WCAG 4.1.3).

## Walkthrough

1. On a matter page the user opens the assistant panel; focus is in the
   composer, labelled "Ask the assistant".
2. They type "Summarise the last three filings" and press Enter; focus stays
   in the composer.
3. The reply streams; the message says "Replying…" and a Stop button appears.
   A screen reader hears nothing until the reply finishes, then hears it once.
4. They ask a second question and press Stop half-way; the partial reply
   stays, marked "Stopped".
5. The third request fails: "The assistant could not reply. Try again." with
   Retry; earlier messages stay.
6. On a phone the conversation fills the screen; on a desktop it is a side
   panel.

## Acceptance Criteria

- [ ] **US-046-AC1** — Given a conversation, when an assistant reply finishes, then the reply is announced once to assistive technology through a polite live region, and nothing is announced per token while it streams; a reply in progress says "Replying…" in text.
- [ ] **US-046-AC2** — Given the composer, when the user presses Enter, then the message is sent and focus stays in the composer; Shift+Enter adds a line; while sending is not possible the composer is disabled with the reason in text.
- [ ] **US-046-AC3** — Given a streaming reply, when the user tabs to Stop and presses it, then streaming stops, the partial reply stays and is marked "Stopped" in text.
- [ ] **US-046-AC4** — Given a failed reply, when it fails, then the message says so in text with Retry, which asks the app to retry; earlier messages stay.
- [ ] **US-046-AC5** — Given suggestions, when the user chooses one, then its text is sent as a message; the composer is still available.
- [ ] **US-046-AC6** — Given a reply containing HTML, a script and a markdown link, when it renders, then no HTML or script reaches the DOM, the link is marked as leaving the app, and a code block has a copy control.
- [ ] **US-046-AC7** — Given the conversation at compact and at expanded, when it renders, then it fills the screen at compact and is a side panel from expanded; as replies arrive the newest stays in view unless the user has scrolled up, when "Jump to latest" appears.
- [ ] **US-046-AC8** — Given `@ux-builder/ui/assistant`, when its imports are read, then it imports no AI library; each adapter (AI SDK, assistant-ui) drives the same pattern, and an app importing no adapter installs no AI library.
- [ ] **US-046-AC9** — Given the starter's assistant on either adapter with default settings, when a conversation runs, then no request goes to any vendor service and nothing reports usage.
- [ ] **US-046-AC10** — Given Compare and a theme page in the builder, when the Assistant screen is chosen, then a conversation with a tool call, sources and an approval shows in each palette and design system.

## Edge Cases

- **Very long reply or wide code**: the log and code block scroll within themselves; the page does not scroll sideways.
- **The runtime unreachable**: the composer says so and keeps the draft.
- **Reduced motion**: no typing animation; text appears as it arrives.
- **The user leaves and returns**: the conversation and the draft are the app's to restore; the pattern shows what it is given.

## Test Scenarios

| Scenario | AC ID | Input / State | Action | Expected Result |
|----------|-------|---------------|--------|-----------------|
| Announce once | US-046-AC1 | A reply streaming 40 tokens | Finish | One polite announcement; "Replying…" before |
| Send | US-046-AC2 | Text in composer | Enter; Shift+Enter | Sent, focus kept; new line |
| Stop | US-046-AC3 | Streaming | Tab to Stop; Enter | Partial kept; "Stopped" |
| Retry | US-046-AC4 | A failure | Retry | App asked to retry; history kept |
| Suggestion | US-046-AC5 | Three suggestions | Choose one | Sent as a message |
| Sanitise | US-046-AC6 | `<img onerror>`, `<script>`, a link, code | Render | No HTML or script; link marked; copy control |
| Sizes | US-046-AC7 | 360 px; 1280 px | Render; scroll up while streaming | Full screen; side panel; "Jump to latest" |
| Adapters | US-046-AC8 | AI SDK and assistant-ui adapters | Run the same conversation | Same pattern, same behaviour; no AI library without an adapter |
| No telemetry | US-046-AC9 | Starter, default settings | Converse; watch the network | Only the app's own runtime is called |
| Builder | US-046-AC10 | Two palettes × two systems | Choose Assistant | Every cell shows the conversation |

## Dependencies

- **Stories**: US-024 (shell and side panel), US-045, US-049
- **Feature Spec**: FEAT-007
- **PRD Requirements**: FR-29
- **External**: CONTRACT-004 revision (`@ux-builder/ui/assistant` and adapter entry points)

## Out of Scope

- Storing conversations, choosing models, and the runtime (the app's).
- Voice input and output.
