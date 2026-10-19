---
ddx:
  id: ADR-014
  type: adr
  status: accepted
  links:
    - kind: informed_by
      to: prd
    - kind: informs
      to: FEAT-002
    - kind: informs
      to: FEAT-003
---

# ADR-014: The AI steers palette generation; a deterministic engine decides the colours

| Date | Status | Deciders | Related | Confidence |
|------|--------|----------|---------|------------|
| 2026-10-05 | Accepted | Operator | FEAT-002 (FR-8–FR-12), FEAT-003 (BB-07, BB-08) | High |

## Context

| Aspect | Description |
|--------|-------------|
| Problem | The brand builder must turn plain-language feedback ("warmer", "more conservative, it's a law firm") into new palette options. Something has to interpret the language; something has to produce colours that are on-brand, reproducible and readable. |
| Current State | `tools/theme_accent.py` is deterministic and contrast-aware but takes no feedback. No component interprets language. |
| Requirements | FR-10 (every option passes the gate), FR-11 (feedback shapes new options without the interpreter choosing final colours), FR-12 (a palette is reproducible from recorded settings). |
| Decision Drivers | A model choosing hex values directly is not reproducible, cannot guarantee contrast, and is hard to review. Language interpretation is exactly what a model is good at. |

## Decision

We will split the work in two:

- **The engine** (FEAT-002) is deterministic: logo + a bounded set of named
  settings (strategy, hue shift, chroma scale, neutral tint, accent role, …)
  in, palette options out. It contains no model call, fits every colour to the
  contrast gate, and records the settings with each option.
- **The interpreter** is a language model: an OpenAI model via the OpenAI API (ADR-019; Claude via the Anthropic API until 2026-10-06). It receives the
  feedback, the current settings and a description of the options (palette
  values and the engine's own notes), and returns **only setting changes**,
  validated against the engine's schema, plus a one-line explanation shown to
  the person (BB-08). It never returns colour values.

Invalid or out-of-range settings are rejected or clamped by the engine, and
reported. If the interpreter is unavailable, the person adjusts settings
directly (BB-10).

**Key Points**: The model steers, never paints | Every option still passes the
gate | Settings, not colours, are recorded | Works without the model

## Alternatives

| Option | Pros | Cons | Evaluation |
|--------|------|------|------------|
| The model generates palettes directly | Most expressive; least engine to build | Not reproducible; contrast not guaranteed (must be checked and fixed after); hard to review; output varies by model version | Rejected: fails FR-10 and FR-12 by construction |
| No AI: settings sliders only | Fully deterministic; no API dependency | Brand owners must translate taste into hue degrees and chroma; fails the operator's request for feedback-driven regeneration | Rejected: contradicts the PRD |
| Keyword rules map phrases to settings | Deterministic; no API | Brittle; cannot handle "it's a law firm" or compound feedback | Rejected: does not meet BB-07 for real feedback |
| **Model returns setting changes; engine decides colours (chosen)** | Language understanding plus reproducibility and guaranteed contrast; explanation shown to the user; degrades to sliders | Needs a settings schema and an API dependency; expressiveness bounded by the settings | **Selected**: the only option meeting FR-10, FR-11 and FR-12 together |

## Consequences

| Type | Impact |
|------|--------|
| Positive | Every brand is reproducible from its file; the gate cannot be bypassed by the model; changing model versions changes interpretation, not colour maths; feedback can be audited as setting diffs. |
| Negative | The settings schema bounds what feedback can achieve; requests outside it ("add a gradient") must be declined. An API key and model choice must be managed. |
| Neutral | The engine is usable from the command line and in CI with no model at all. |

## Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| The interpreter misreads feedback | Medium | Low | The explanation (BB-08) shows what changed; history lets the person go back (BB-09) |
| The schema is too narrow to express common feedback | Medium | Medium | Log declined feedback; extend the schema by reviewed change, with golden tests |
| Logo or brand data sent to a third-party model | Low | Medium | Send settings and palette values only; sending the logo image requires explicit operator enablement (concerns: `security-owasp`) |

## Validation

| Success Metric | Review Trigger |
|----------------|----------------|
| 100% of options from feedback rounds pass the gate | Any option reaches a person failing the gate |
| ≤ 3 feedback rounds to acceptance, median | Median exceeds 5 rounds over 10 sessions |
| Declined-feedback rate ≤ 15% | Above 15%: revisit the settings schema |

## Supersession

- **Supersedes**: None
- **Superseded by**: None

## Concern Impact

- **`security-owasp`**: model calls are server-side; the key never reaches the
  browser.
- **`testing`**: the engine gets golden tests; the interpreter gets a
  regression set of feedback → expected setting direction.

## References

- FEAT-002 — `docs/helix/01-frame/features/FEAT-002-logo-palette-engine.md`
- FEAT-003 — `docs/helix/01-frame/features/FEAT-003-guided-brand-builder.md`
- `tools/theme_accent.py`
