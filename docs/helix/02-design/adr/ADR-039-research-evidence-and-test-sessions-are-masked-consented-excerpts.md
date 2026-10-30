---
ddx:
  id: ADR-039
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: FEAT-018
    - kind: informed_by
      to: ADR-035
    - kind: informs
      to: CONTRACT-008
    - kind: informs
      to: ADR-042
    - kind: informs
      to: SD-006
---

# ADR-039: Research evidence and test sessions are kept as masked, consented excerpts; recordings stay with the owner

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-23 | **Accepted** 2026-10-23 (operator: accepted FEAT-018's proposed decisions D-4 and D-5) | Operator | FEAT-018, ADR-035, ADR-036, CONTRACT-008 | Medium |

## Context

FEAT-018 asks the agent to synthesize research (interviews, analytics,
support tickets, surveys) and to analyse usability sessions, including
recordings and transcripts when the owner authorizes it. That material is
about real people. ADR-035 already masks secrets in transcripts before
anything is written, using the trace's masking.

## Decision

1. **Excerpts, not raw material.** `ux-builder-design evidence add` and
   `transcript add` store, under `docs/ux/evidence/`, only the excerpts the
   synthesis cites and a reference to where the owner keeps the source.
   Raw files are never copied into the repository.
2. **Masked and pseudonymous.** Everything stored passes through the
   trace's masking (`@ux-builder/trace` `mask`), plus the app's
   `.ux-builder/config.json` redact patterns. Participants appear only as
   pseudonyms (`P1`, `P2`). To catch a real name slipping into an excerpt,
   the owner may list each pseudonym's name in
   `.ux-builder/participants.local.json`, which is kept out of git;
   `validate` fails an excerpt that contains one. Email addresses and phone
   numbers in an excerpt fail too.
3. **Consent recorded per session.** `transcript add` refuses a session
   without `--consent-confirmed`; the confirmation, who gave it and when
   are recorded with the excerpt.
4. **Transcripts, not recordings** (D-5). Recordings stay with the owner.
   The guide works from transcripts the owner supplies, or that the owner's
   own tools produce locally.
5. **Stage 1 location** (D-4). Jobs and evidence live in `docs/ux/` now and
   move to the PRD's user needs section in stage 2 (FEAT-018 H-2).
6. **Labelled origin.** Every finding says whether it is a human
   observation or an agent recommendation; agent claims about users stay
   *hypothesis* until evidence supports them.

*[Amended 2026-10-24 — FEAT-018 GDL-80, CONTRACT-008 Layout]* The decision stands; evidence (here `docs/ux/evidence/`) is now in `docs/ux-builder/evidence/`.

*[Amended 2026-10-29 — ADR-042]* Decision 5 is replaced: evidence and claims live in the study's research plan, `docs/helix/01-frame/research/<study>.md`, under Findings. Decisions 1 to 4 and 6 stand and apply there.

## Alternatives Considered

| Option | Evaluation |
|---|---|
| Store recordings with the app | Large, personal, hard to mask; little gain over transcripts. Rejected |
| Keep evidence outside the repository entirely | Synthesis must be reviewable and traceable from jobs and findings. Rejected; excerpts stay |
| No consent check | Analysing people's sessions without recorded consent is not acceptable. Rejected |

## Consequences

| Type | Impact |
|---|---|
| Positive | Research is traceable and reviewable without personal data in the repository |
| Negative | A person must confirm consent per session; masking can over-redact |
| Neutral | Owners keep their own research storage and retention rules |
