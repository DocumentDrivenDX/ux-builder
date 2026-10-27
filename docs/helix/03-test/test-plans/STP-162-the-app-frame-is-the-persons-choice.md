---
ddx:
  id: STP-162
  type: story-test-plan
  status: draft
  links:
    - kind: informed_by
      to: US-162
    - kind: informed_by
      to: SD-006
    - kind: informed_by
      to: TP-001
---

# Story Test Plan: STP-162-the-app-frame-is-the-person-s-choice

## Story Reference

**User Story**: [[US-162-the-app-frame-is-the-person-s-choice]]
**Technical Design**: SD-006
**Project Test Plan**: [[test-plan]]

## Scope and Objective

**Goal**: Prove US-162's criteria with fixtures only: no network, no model, no browser.
**Blocking Gate**: `npm test --workspace @ux-builder/ui`, `npm test --workspace @ux-builder/design`, `npm test --workspace @ux-builder/create-app`, `npm test --workspace @ux-builder/audit`

## Acceptance Criteria Test Mapping

| AC ID | Acceptance Criterion (Given/When/Then) | Failing Test(s) to Create or Run | Asserted Behavior (what the test verifies) | AC-ID Citation (`@covers`) | Test Level | File or Command | Setup / Data | Notes |
|-------|----------------------------------------|----------------------------------|--------------------------------------------|----------------------------|------------|-----------------|--------------|-------|
| US-162-AC1 | Given AppShell, when its frame is screen, top-bar, top-nav or side-nav, then it draws only that frame's chrome at compact, medium and expanded widths: screen nothing but the content, top-bar the top bar alone, top-nav the bottom bar when compact and the destinations across the top bar from medium, side-nav (the default) as before. | `us-162-ac1` | It draws only that frame's chrome at compact, medium and expanded widths: screen nothing but the content, top-bar the top bar alone, top-nav the bottom bar when compact and the destinations across the top bar from medium, side-nav (the default) as before | `@covers US-162-AC1` | Integration | `packages/ui/test/frames.browser.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC2 | Given a blueprint, then supports.frame is one of the four, and `ux-builder-blueprint check` warns when a frame without navigation has more than one destination, when navigation has one destination or none, or when more than five destinations are put across the top. | `us-162-ac2` | Supports.frame is one of the four, and `ux-builder-blueprint check` warns when a frame without navigation has more than one destination, when navigation has one destination or none, or when more than five destinations are put across the top | `@covers US-162-AC2` | Integration | `packages/ui/test/frames.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC3 | Given a chosen frame, then the wireframes, and the exploratory prototypes made from them, are drawn in it; without one, as before. | `us-162-ac3` | The wireframes, and the exploratory prototypes made from them, are drawn in it; without one, as before | `@covers US-162-AC3` | Integration | `packages/ui/test/frames.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC4 | Given a design folder built into an app, then the generated App passes the blueprint's frame to AppShell; without one, AppShell keeps side navigation. | `us-162-ac4` | The generated App passes the blueprint's frame to AppShell; without one, AppShell keeps side navigation | `@covers US-162-AC4` | Integration | `packages/create-app/test/journey-app.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC5 | Given a responsive-web app, when `modality` runs without `--frame`, then it exits 2 naming the four frames and the one recommended from the destinations; with it, the frame is recorded in the blueprint and the design state, `status` names it (or what to recommend from step 5), the budget counts it until chosen, and a changed frame asks again; chat alone takes no frame. | `us-162-ac5` | It exits 2 naming the four frames and the one recommended from the destinations; with it, the frame is recorded in the blueprint and the design state, `status` names it (or what to recommend from step 5), the budget counts it until chosen, and a changed frame asks again; chat alone takes no frame | `@covers US-162-AC5` | Integration | `packages/design/test/frames.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC6 | Given an audit with the blueprint, then navigation across the top bar counts as adapting, a frame with no navigation passes, and an app drawn in a frame other than the one chosen is named in the verdict's fixes. | `us-162-ac6` | Navigation across the top bar counts as adapting, a frame with no navigation passes, and an app drawn in a frame other than the one chosen is named in the verdict's fixes | `@covers US-162-AC6` | Integration | `packages/audit/test/modality-outcome.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |
| US-162-AC7 | Given the design skill and glossary, then the agent asks for the frame with the modality, shows the four, recommends one and lets the person decide, and `explain "app frame"` says what it is. | `us-162-ac7` | The agent asks for the frame with the modality, shows the four, recommends one and lets the person decide, and `explain "app frame"` says what it is | `@covers US-162-AC7` | Integration | `packages/design/test/frames.test.mjs` | Fixture blueprints and apps in temp folders; Chromium for the AppShell widths; no network | Built |

## Executable Proof

```bash
npm test --workspace @ux-builder/ui && npm test --workspace @ux-builder/design && npm test --workspace @ux-builder/create-app && npm test --workspace @ux-builder/audit
```

## Review Checklist

- [x] Every criterion maps to a test by its stable ID, with its `@covers` citation
- [x] No test depends on the network or a model
