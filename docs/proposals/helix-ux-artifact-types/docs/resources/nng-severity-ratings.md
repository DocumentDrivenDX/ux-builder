---
ddx:
  id: resource.nng-severity-ratings
  authoring:
    home: repo
---

# NN/g Severity Ratings for Usability Problems

## Source

- URL: https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/
- Owner: Nielsen Norman Group (NN/g); scale by Jakob Nielsen
- Accessed: 2026-10-21

## Summary

Severity combines three factors: how often the problem occurs (frequency), how
hard it is to overcome when it occurs (impact), and whether users can learn to
get past it or it bothers them repeatedly (persistence). Market impact — the
effect on the product's reputation or adoption — is weighed as an overall
modifier. Problems are rated on a five-point scale: 0 not a usability problem,
1 cosmetic (fix if time allows), 2 minor (low priority), 3 major (important to
fix, high priority) and 4 catastrophe (must fix before release).

## Relevant Findings

- Ratings from one evaluator are unreliable; averaging several evaluators'
  independent ratings is more dependable.
- Rate after all problems are found, so ratings are comparable.

## Use in HELIX

Grounds the `Severity` field of `usability-evaluation-report` findings and the
requirement to show frequency, impact and persistence behind each rating.
