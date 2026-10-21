---
"@ux-builder/audit": minor
---

AI checks (FEAT-011, US-078 to US-080), warnings for this minor release: `ai-disclose`, `ai-correct`, `ai-stop`, `ai-starters`, `ai-declared`, `agent-approval`, `agent-plan`, `agent-interrupt`, `agent-who-acts`, `agent-recover`, `agent-summary`, `genui-review-prefill`, `card-input-label` and `card-narrow-first`. They run only on elements with CONTRACT-005's AI markup (`data-piq-ai` and its companions), so an app without it gets no AI finding; each finding names its rule (`ai.disclose`, `agent.recover`, …) and its sources. New option `--blueprint <file>`: AI markup on a screen whose blueprint declares no AI role is reported; name the screen with `data-piq-screen="<screen id>"` on the page's root.
