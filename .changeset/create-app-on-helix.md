---
"@ux-builder/create-app": minor
"@ux-builder/audit": patch
---

A new app starts on the latest HELIX (FEAT-010).

- `@ux-builder/create-app`: creating an app fetches the latest HELIX release's plugin package from GitHub, verifies it (GitHub's SHA-256 digest, its version, its contents; a strict tar reader that refuses links and paths outside it), and installs HELIX's skill and catalogue as the app's project skill in `.claude/skills/helix/`, with `HELIX-VERSION.json`. It writes `.helix.yml` and drafts the app's HELIX documents from that release's own templates: product vision, PRD, concerns, FEAT-001 and US-001 for the starter screen, `DESIGN.md`, the test plan and STP-001, with the starter's facts filled in and the owner's decisions left as placeholders. The app also gets `ux-assessment.yml`, a Playwright test citing US-001's criteria (`npm run test:e2e`) and guidance that puts HELIX first. Offline, the HELIX bundled at publish is used, with the reason; `--helix-version <tag>` pins a release, `--helix-offline` makes no request, `--no-helix` leaves HELIX out.
- `@ux-builder/audit`: the assessment also finds HELIX installed as a project skill (`.claude/skills/helix/references`).
