---
ddx:
  id: example.user-journey-map.invoice-review
  type: user-journey-map
  authoring:
    home: repo
  depends_on:
    - example.feature-specification.invoice-review
    - example.user-stories.invoice-review
---

# UJM-001: Review a Flagged Invoice

**Feature**: [[FEAT-004]] Invoice review | **Map kind**: future-state | **Evidence**: 6 reviewer interviews (R-03), support tickets Q2, assessment run R-2026-10-02

## Actor and Scenario

- **Actor**: Accounts-payable reviewer — reviews 40–80 supplier invoices a day on a desktop, sometimes on a tablet in the warehouse; not a finance specialist.
- **Scenario**: An invoice is flagged as a possible duplicate. The reviewer works out why, approves or rejects it, and moves on.
- **Trigger**: The morning queue shows flagged invoices.
- **End state**: Every flagged invoice is approved or rejected with a reason, and the supplier has been told about rejections.

### Goals and Expectations

- Clear the flagged queue before the 11:00 payment run.
- Understand a flag in under a minute without opening another system.
- Never reject by accident; be able to take a rejection back.

## Journey Phases

| Phase | Actions | Thoughts | Emotion | Touchpoints | Stories / ACs |
|---|---|---|---|---|---|
| 1. Notice | Opens the queue, scans flagged count | "Twelve flagged — which are urgent?" | neutral — wary | Queue (SF-004 `queue`) | US-021-AC1 |
| 2. Investigate | Opens an invoice, reads the flag, asks the assistant why | "Duplicate of what?" | negative — confused | Invoice, assistant panel | US-022-AC1, US-022-AC2 |
| 3. Decide | Approves, or rejects with a reason | "I hope this does not pay twice." | negative — anxious | Invoice, reject-reason dialog | US-021-AC2, US-023-AC1, US-023-AC2 |
| 4. Recover | Save fails; retries | "Did it go through?" (assumption) | negative — frustrated | Invoice error state | US-021-AC3 |
| 5. Notify | Supplier is emailed about the rejection | "Will they call me?" | neutral | Email (off-product) | US-023-AC3 |
| 6. Close | Queue empty before the run | "Done." | positive — relieved | Queue empty state | uncovered: no AC states the end-of-queue summary |

### Emotion Curve

1 neutral → 2 negative → 3 negative → 4 negative → 5 neutral → 6 positive

## Insights

| ID | Insight | Phase | Evidence |
|---|---|---|---|
| I1 | Reviewers leave the app to find the matching invoice in the ERP | 2 | 5 of 6 interviews (R-03) |
| I2 | Fear of double payment drives slow, repeated checking | 3 | Interviews; 14 "did it approve?" tickets |
| I3 | A silent save failure is the worst moment of the day | 4 | UER-002 F-07 |

## Opportunities

| ID | Opportunity | Phase | Owner | Metric | Target |
|---|---|---|---|---|---|
| O1 | Assistant names the matched invoice and its differences | 2 | Review squad | Median time from open to decision | < 60 s by Q1 |
| O2 | Approval shows what will be paid and when | 3 | Review squad | "Did it approve?" tickets per month | ≤ 2 by Q1 |
| O3 | End-of-queue summary of decisions | 6 | Product (AP) | Share of sessions ending on summary | ≥ 80 % |

## Story Coverage

| Phase | Covered by | Gap |
|---|---|---|
| 1–5 | US-021, US-022, US-023 | None |
| 6 | — | End-of-queue summary has no story (O3) |

## Related Design

- **Screen flow**: [[SF-004]]
- **Usability evaluations**: [[UER-002]]

## Assumptions and Open Questions

- Phase 4 thought is an assumption; check it in the next moderated session.
