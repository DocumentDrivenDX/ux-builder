# Writing a experiment

One production experiment: the hypothesis and the decision it tests, the variant, the success and guardrail metrics, how long it runs, the result and what was decided. Opened only after the experiment checkpoint.

Name the UX decision and hypothesis the experiment tests. Pick one success
metric and the guardrails that must not get worse. State the duration before
it starts. Record the result against the hypothesis, then ask the release
checkpoint before adopting the change.

Use `template.md`; `example.md` shows a finished one. `ux-builder-design validate` checks it.
