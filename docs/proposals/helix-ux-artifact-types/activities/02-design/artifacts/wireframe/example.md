---
ddx:
  id: example.wireframe.invoice
  type: wireframe
  authoring:
    home: repo
  depends_on:
    - example.screen-flow.invoice-review
    - example.user-stories.invoice-review
---

# WF-011: Invoice

**Screen flow node**: [[SF-004]] `invoice` | **Stories**: [[US-021]], [[US-022]], [[US-023]] | **State diagram**: [[ISD-011]]

## Scope and Fidelity

- **Screen**: Decide on one flagged invoice.
- **Fidelity**: mid
- **Size classes**: compact, expanded
- **Pattern**: RecordDetail

## Layouts

### Expanded

```text
┌───────────────────────────────────────────────┬──────────────────┐
│ (1) ← Queue   Invoice INV-2291   (2) Flag chip │ (6) Assistant    │
├───────────────────────────────────────────────┤  answer          │
│ (3) Supplier · amount · due date               │  (7) Insert as   │
│ (4) Line items table                           │      note        │
│                                                │  (8) Close       │
├───────────────────────────────────────────────┤                  │
│ (5) Why flagged?   (9) Reject   (10) Approve   │                  │
└───────────────────────────────────────────────┴──────────────────┘
```

### Compact

```text
┌──────────────────────┐
│ (1) ←  INV-2291  (2) │
│ (3) Summary          │
│ (4) Line items       │
│     (stacked cards)  │
├──────────────────────┤
│ (5) Why  (9) (10)    │
└──────────────────────┘
```

## Annotations

| # | Element | Kind | Annotation | Size classes | Links |
|---|---|---|---|---|---|
| 1 | Back to queue | control | Returns to the queue at the same scroll position. | all | SF-004 T9 |
| 2 | Flag chip | content | Says why the invoice is flagged ("Possible duplicate"). Not interactive. | all | US-021-AC1 |
| 3 | Summary | region | Supplier, amount and due date — the three facts reviewers check first. | all | — |
| 4 | Line items | region | Table on expanded; stacked cards on compact. | differs | — |
| 5 | Why flagged? | control | Opens the assistant panel. Disabled with "Assistant unavailable" when the service is down. | all | SF-004 T2, US-022-AC3 |
| 6 | Assistant answer | feedback | Streams the explanation and names the matched invoice. Side panel on expanded; full screen on compact. | differs | US-022-AC1 |
| 7 | Insert as note | control | Copies the answer into the decision note. | all | US-022-AC2 |
| 8 | Close panel | control | Closes the panel; focus returns to (5). Esc also closes. | all | SF-004 T3 |
| 9 | Reject | control | Opens the reject-reason dialog. Secondary style. | all | SF-004 T6 |
| 10 | Approve | control | Saves the approval. Busy while saving; blocks a second click; error inline with "Try again". | all | SF-004 T4, US-021-AC2, US-021-AC3 |

## States Covered

| State | Shown here | Or see |
|---|---|---|
| ideal | Expanded, Compact | — |
| loading, error, saving, permission-denied | — | [[ISD-011]] |

## Accessibility

- **Focus order**: 1, 2 (skipped, not focusable), 3, 4, 5, 9, 10; panel 6, 7, 8 when open.
- **Accessible names**: (1) "Back to review queue".
- **Headings and landmarks**: h1 "Invoice INV-2291"; assistant panel is a labelled complementary region.
- **Target size and input**: action bar buttons at least 44 × 44 px on coarse input.

## Open Questions

- Should Approve move to the next invoice or back to the queue? Product (AP) decides; current flow returns to the queue.
