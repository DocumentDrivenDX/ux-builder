---
ddx:
  id: resource.iso-25062-cif
  authoring:
    home: repo
---

# ISO/IEC 25062 Common Industry Format for Usability Reports

## Source

- URL: https://www.iso.org/standard/84255.html (ISO/IEC 25062, current edition;
  the catalogue page refused automated access on 2026-10-21, so the edition
  details below need a reviewer's check)
- URL: https://nvlpubs.nist.gov/nistpubs/Legacy/IR/nistir7742.pdf (NISTIR 7742,
  US National Institute of Standards and Technology, "Customized Common
  Industry Format Template for Electronic Health Record Usability Testing")
- Owner: ISO/IEC JTC 1/SC 7 (SQuaRE series, Systems and software Quality
  Requirements and Evaluation)
- Accessed: 2026-10-21

## Summary

The Common Industry Format (CIF) is a standard structure for reporting a
usability evaluation so that readers in another organisation can judge and
compare results. The original edition targeted summative user testing; its
core report covers the product evaluated, the evaluation goals, the
participants, the context of use and method (tasks, environment, procedure),
the usability measures (effectiveness, efficiency, satisfaction) and the
results. The current edition, as reported to this proposal, broadens the
format to other evaluation approaches, including expert and heuristic review.
NISTIR 7742 shows the CIF customised into a fill-in template for one domain.

## Relevant Findings

- A report must describe the method well enough for a reader to judge, or
  repeat, the evaluation.
- Measures are reported with how they were computed and the sample they rest on.
- Participants are described by characteristics relevant to the product, not
  by identity.

## Use in HELIX

Grounds the section order of `usability-evaluation-report`: product and
goals, method, tasks, measures, results; and the check that claims stay within
what the method supports.
