# Counsel brief: the interaction rules restated from Apple's and Google's guidelines

**For**: legal counsel, before the first release that ships the rules (ADR-025, "Deciders" and "Risks"; FEAT-008 PRV-02)
**From**: the ux-builder maintainers
**Prepared**: 2026-10-21, from `guidelines/rules.json` as it stands on the FEAT-009 branch
**Decision asked for**: whether the rules below may ship in `@ux-builder/ui` (in `catalogue.json`, `AGENTS.md` and the Claude Code skill) and be served over MCP, as written, or what must change first.

## What ships

ux-builder is an open-source UI SDK (MIT OR Apache-2.0). FEAT-008 adds 28 rules about how an app's screens fit together and behave: navigation for the space available, modals, safeguards on destructive actions, empty and error states, emphasis, and views embedded in a host. Each rule is one or two sentences in our own words, a one-sentence rationale, the conditions it applies under, how it is checked, and links to the guidance it restates. The SDK checks a plan of an app's screens against them, and its audit checks the running app.

The rules restate guidance from four sources:

| Source | Terms as we read them (2026-10-20) | How the rules use it | Sources cited |
|---|---|---|---|
| Apple Human Interface Guidelines | Apple Website Terms of Use: no copying or republishing without consent; trade dress claimed | Paraphrase and link only; no images, assets or wording | 17 |
| Material Design 3 (m3.material.io) | Google Terms of Service; no open content licence shown | Paraphrase and link only | 11 |
| Android Developers (developer.android.com) | Content License: CC BY 2.5 (code Apache 2.0) | Paraphrase and link; quotation would be allowed with attribution | 2 |
| W3C (WCAG 2.2, WAI-ARIA Authoring Practices) | W3C Document License | Paraphrase and link; short quotation would be allowed with attribution | 9 |
| ux-builder's own decisions | Our own | Our wording | 6 |

**Quotations**: 0. No rule quotes any source. `tools/check-rules.mjs`, run on every change by `npm run check`, fails the build if a rule quotes Apple's or Google's guidelines, quotes more than 25 words of an open source, or cites no source.

**Names and marks**: source titles name the guidelines ("Apple HIG: Modality", "Material 3: Breakpoints") and link to them. The README, `AGENTS.md`, the skill and the site carry: "ux-builder is not affiliated with or endorsed by Apple or Google. Human Interface Guidelines is a trademark of Apple Inc., and Material Design is a trademark of Google LLC." No logo, image or asset of either is used.

## Questions for counsel

1. Are the statements below far enough from Apple's and Google's text that they are our own expression, given that they restate the same ideas? Which, if any, are too close?
2. Is naming the guidelines in source titles, with links, acceptable as descriptive (nominative) use?
3. Is the disclaimer above adequate where it appears, and should it also appear in `catalogue.json` and the MCP server's instructions?
4. Does restating the *structure* of guidance (for example, five destinations at most in a compact navigation bar; a modal that names its task) raise any concern beyond the wording?
5. If we later quote the Android or W3C documents (within our 25-word limit), is attribution in `THIRD-PARTY-NOTICES.md` and beside the rule sufficient?
6. Is anything needed for the views served to third-party hosts (the "view profile" rules, which cite our own ADRs)?

## The rules as they would ship

Each statement is exactly as it appears in `guidelines/rules.json`. Rationales and conditions are in that file.

| Rule | Our statement | Sources (licence, wording) |
|---|---|---|
| `blueprint.valid` | A blueprint has the fields CONTRACT-005 requires, no unknown fields, unique screen IDs, and destinations that name existing screens. | [ux-builder CONTRACT-005: blueprint](https://github.com/DocumentDrivenDX/ux-builder/blob/main/docs/helix/02-design/contracts/CONTRACT-005-interaction-rules-and-blueprint.md) (own, paraphrased) |
| `pattern.exists` | Every screen names a pattern the installed SDK ships. | [ux-builder CONTRACT-005: blueprint](https://github.com/DocumentDrivenDX/ux-builder/blob/main/docs/helix/02-design/contracts/CONTRACT-005-interaction-rules-and-blueprint.md) (own, paraphrased) |
| `nav.compact-destinations` | In an app that supports the compact or medium size class, keep the top-level destinations to five; group the rest or move them to a drawer. | [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased); [Apple HIG: Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) (apple-terms, paraphrased) |
| `nav.standing-at-expanded` | From the expanded size class, show primary navigation as a standing rail or side navigation, not behind a menu button. | [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased); [Android Developers: Design for large screens](https://developer.android.com/design/ui/large-screens) (CC-BY-2.5, paraphrased) |
| `nav.links-not-menus` | Move between top-level destinations with navigation links; keep menu buttons for actions on the current page or item. | [WAI-ARIA APG: Landmark regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) (W3C, paraphrased) |
| `layout.panes-by-size` | Use one pane in compact and medium windows, two from expanded (a list beside its detail), and three only in extra-large ones. | [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased); [Material 3: Canonical layout examples](https://m3.material.io/foundations/layout/canonical-examples/overview) (google-terms, paraphrased); [Android Developers: Design for large screens](https://developer.android.com/design/ui/large-screens) (CC-BY-2.5, paraphrased) |
| `layout.dense-medium-single-pane` | At the medium size class, use two panes only for sparse content with clear actions, such as settings; keep dense lists and tables in one. | [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased) |
| `modal.only-when-needed` | Present a task modally only when it needs focus or a decision before the person continues; otherwise keep it in the page. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased) |
| `modal.one-at-a-time` | Never open a modal on top of another, and never show more than one alert at once; close one before presenting the next. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased); [WAI-ARIA APG: Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (W3C, paraphrased) |
| `modal.titled` | Give every modal a title that says what the task is, as its accessible name. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased); [WAI-ARIA APG: Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (W3C, paraphrased) |
| `modal.dismiss` | Give every modal an obvious way out (Cancel, Close or Done), and let Escape close it. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased); [WAI-ARIA APG: Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) (W3C, paraphrased) |
| `modal.unsaved-changes` | When closing a modal would lose what the person entered, explain that and let them save, discard or keep editing. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased) |
| `modal.short-task` | Keep a modal task brief; if it needs several steps, give them a single path and no buttons that could be mistaken for dismissing it. | [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased) |
| `action.destructive-safeguard` | Give every destructive action a safeguard: Undo when the loss is expected and reversible, a confirmation only when it is unexpected or irreversible; never neither, and not both. | [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) (apple-terms, paraphrased); [WCAG 2.2: 3.3.4 Error Prevention (Legal, Financial, Data)](https://www.w3.org/TR/WCAG22/#error-prevention-legal-financial-data) (W3C, paraphrased) |
| `feedback.status-in-place` | Show the status of something next to it, passively; interrupt with an alert only for critical, actionable information. | [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) (apple-terms, paraphrased) |
| `feedback.explain-failure` | When an action cannot be carried out, say why and what to do, in text next to it. | [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) (apple-terms, paraphrased) |
| `loading.show-something` | Show placeholder content, such as a skeleton, as soon as a region starts loading; never leave it blank. | [Apple HIG: Loading](https://developer.apple.com/design/human-interface-guidelines/loading) (apple-terms, paraphrased) |
| `loading.progress-kind` | Use a determinate progress indicator when the duration is known and an indeterminate one when it is not. | [Apple HIG: Loading](https://developer.apple.com/design/human-interface-guidelines/loading) (apple-terms, paraphrased) |
| `screen.states` | A screen that shows a collection, a record or figures declares its empty, loading and error states. | [Apple HIG: Loading](https://developer.apple.com/design/human-interface-guidelines/loading) (apple-terms, paraphrased); [Apple HIG: Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback) (apple-terms, paraphrased) |
| `emphasis.one-primary` | Give each page region or dialog at most one primary (filled) button; make the others secondary or text buttons. | [Material 3: Buttons](https://m3.material.io/components/buttons/guidelines) (google-terms, paraphrased); [Apple HIG: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) (apple-terms, paraphrased) |
| `input.touch-targets` | Under touch input, make every control at least the theme's touch-target size (44 points on Apple platforms, 48 dp in Material). | [Apple HIG: Layout](https://developer.apple.com/design/human-interface-guidelines/layout) (apple-terms, paraphrased); [Material 3: States](https://m3.material.io/foundations/interaction/states/overview) (google-terms, paraphrased); [WCAG 2.2: 2.5.8 Target Size (Minimum)](https://www.w3.org/TR/WCAG22/#target-size-minimum) (W3C, paraphrased) |
| `input.no-hover-only` | Under touch input, never put content or actions where only hovering reveals them. | [WCAG 2.2: 1.4.13 Content on Hover or Focus](https://www.w3.org/TR/WCAG22/#content-on-hover-or-focus) (W3C, paraphrased); [Material 3: States](https://m3.material.io/foundations/interaction/states/overview) (google-terms, paraphrased) |
| `input.focus-visible` | Show a visible focus indicator on every focusable control, distinct from hover and selection. | [WCAG 2.2: 2.4.7 Focus Visible](https://www.w3.org/TR/WCAG22/#focus-visible) (W3C, paraphrased); [Material 3: States](https://m3.material.io/foundations/interaction/states/overview) (google-terms, paraphrased) |
| `text.line-length` | Keep running text to at most 80 characters per line, 40 to 60 where possible, by limiting the measure rather than shrinking the type. | [WCAG 2.2: 1.4.8 Visual Presentation](https://www.w3.org/TR/WCAG22/#visual-presentation) (W3C, paraphrased); [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased) |
| `view.no-shell` | An embedded view draws no app shell, primary navigation or brand; the host provides its chrome, title and pins. | [ux-builder ADR-012 and ADR-024: embedded views](https://github.com/DocumentDrivenDX/ux-builder/tree/main/docs/helix/02-design/adr) (own, paraphrased) |
| `view.size-classes` | An embedded view supports the compact and medium size classes, since a host's panel is often that narrow even on a desktop. | [ux-builder ADR-012 and ADR-024: embedded views](https://github.com/DocumentDrivenDX/ux-builder/tree/main/docs/helix/02-design/adr) (own, paraphrased); [Material 3: Breakpoints](https://m3.material.io/foundations/layout/breakpoints/overview) (google-terms, paraphrased) |
| `view.one-task` | Keep an embedded view to one screen and one task; put further steps in modal tasks or sections of that screen. | [ux-builder ADR-012 and ADR-024: embedded views](https://github.com/DocumentDrivenDX/ux-builder/tree/main/docs/helix/02-design/adr) (own, paraphrased); [Apple HIG: Modality](https://developer.apple.com/design/human-interface-guidelines/modality) (apple-terms, paraphrased) |
| `view.theme-from-host` | Take the theme only from the host's styles and appearance, and follow the host when it changes them. | [ux-builder ADR-012 and ADR-024: embedded views](https://github.com/DocumentDrivenDX/ux-builder/tree/main/docs/helix/02-design/adr) (own, paraphrased) |

## After counsel answers

Record the decision in ADR-025 (its "Deciders" row names counsel for PRV-02), change any rule counsel flags in `guidelines/rules.json`, and run `npm run check`.
