# Rules workbook

`ux-builder-rules-combined.xlsx` is the review copy of `guidelines/rules.json`: every rule with its priority, dependencies, precedence, sources and review columns (Verdict, Reviewer notes …), plus the rule hierarchy, the overlaps and how each was resolved, and the findings behind the proposed rules. Its **Import notes** sheet says how each column maps to `rules.json` and what the repo accepts.

To bring edits made in the workbook into the repo (needs Python with `openpyxl`), from the checkout:

```bash
python guidelines/workbook/import_rules_to_repo.py .
npm run catalogue && npm run plugin:build && npm run rules
```

The importer refuses, naming the rule, a row the rules check would fail. Imported unchanged, the workbook reproduces `rules.json` exactly.
