---
ddx:
  id: ADR-019
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informed_by
      to: ADR-014
    - kind: informs
      to: FEAT-003
    - kind: informs
      to: SD-002
---

# ADR-019: The theme builder runs locally from this repository; its OpenAI key stays on the developer's machine

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-06 | Accepted | Operator | ADR-014, FEAT-003, SD-001, SD-002 | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The theme builder (FEAT-003) interprets feedback with a language model (ADR-014), so something must hold an API key, and saving must turn into a reviewed change to this repository. The PRD left both open: where the builder runs, and who holds the key. |
| Current State | The palette engine runs in Node and the browser with no server (SD-001); `npm run brand` already writes brand and theme files; themes are reviewed as pull requests with normal code review (operator, 2026-10-06: no designer sign-off). |
| Requirements | FR-13 to FR-16; the key never reaches a browser; saving never publishes directly (BB-13). |
| Decision Drivers | The first users are developers who already clone this repository and open pull requests here. A hosted app needs a host, authentication and a server-side secret before anyone can use it. |

## Decision

1. The builder is a workspace in this repository (`apps/theme-builder`),
   started with `npm run builder`. It serves the UI and a small local API
   from one Node process on the developer's machine.
2. Feedback is interpreted by an **OpenAI** model (default `gpt-5.4-mini`,
   overridable with `BUILDER_MODEL`), chosen by the operator on 2026-10-06
   over the Anthropic API first proposed. The OpenAI key is read by that
   process from `OPENAI_API_KEY` or the macOS Keychain item `openai-api-key`.
   It is never sent to the browser. Without a key, feedback is disabled with a message and the
   settings sliders still work (BB-10).
3. Saving writes `tokens/brands/<name>.brand.json` and
   `tokens/themes/<name>.theme.json` on a new branch, commits, pushes and
   opens a pull request with `gh`. The pull request is reviewed like any
   change; nothing is published from the builder.
4. Only settings, palette values and option summaries are sent to the
   model, never the logo (ADR-014).

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| **Local tool in the repository (chosen)** | No hosting, no auth, no shared secret; saving is a normal PR; works today | Each user needs the repository, Node and a key; not for non-developers | **Proposed**: fits the first users |
| Internal hosted web app | Brand owners need nothing installed | Needs a host, SSO, a server-side key, and repository write access from the server | Later, when non-developers use it; the same API routes move to the host |
| A page inside Storybook | Already deployed with the docs | Storybook is static: no server for the key or for opening a PR | Rejected |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Phase 2 needs no infrastructure; the key's custody is the developer's, like any other personal API key. |
| Negative | Brand owners who are not developers need a developer to run it until a hosted version exists. |
| Neutral | The API routes are plain HTTP handlers, so moving to a host later changes deployment, not the builder. |

## Notes

- Accepted by the operator on 2026-10-06 "for now": revisit when people who
  are not developers need to use the builder (the hosted alternative).
- Each developer uses their own OpenAI key for now.
- Verified: 15 of 15 feedback phrases move the expected setting with
  `gpt-5.4-mini` (`npm run test:model --workspace @ux-builder/theme-builder`).
