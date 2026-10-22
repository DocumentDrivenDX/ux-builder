---
"@ux-builder/audit": minor
---

The audit and the assessment report by journey, with every rule spelled out (FEAT-014 MOD-08 to MOD-10, FEAT-015 RPT-01 to RPT-08):

- Every audit finding names its check (`check`) and the catalogue rule it breaks: `ruleId`, `rule: { id, title, statement, sources }`, `sources` and `fix`; theme findings name their `theme.*` rule, and a contrast finding's fix starts with the measured ratio. `rule` no longer holds the check's name: read `check`.
- `--modality responsive-web,chat,hybrid-chat` (or the blueprint's `supports.modalities`) chooses the widths and rule families. `report.json` gains `verdicts.theme` (declared theme, design system, applied, SDK-only, contrast per appearance) and `verdicts.modality` (the SDK components each modality needs, its rule families, the fixes), `pages` with the screen each maps to, and `journey`/`step` on findings.
- `index.html` opens with the verdicts and a *Rules broken* table, then each blueprint journey step by step with its screen's screenshot and findings, then *Other screens*; without journeys, by screen.
- `assess report` orders findings journey → state → step (or the state's *General*), each with its rule ID and statement or heuristic and source, evidence, severity 0 to 4 and fix; `report.md` is a HELIX `usability-evaluation-report` with `ddx:` frontmatter, drafted from the installed HELIX's template when it has that type. `assess validate-report` fails a finding that names neither `rule` nor `heuristic`.
- `assess video --pace slow|normal|fast`: a step holds 2 s and a finding max(5 s, its words at 200 a minute), scaled 1.5 or 0.6; captions carry the rule ID and statement, the problem and the fix; the chapter track has a chapter per step, `J-review · step 2: entry`.
