---
"@ux-builder/ui": minor
---

New ESLint rule `ux-builder/ai-neutral-voice` (a warning, US-081): it flags copy that presents the AI as a person ("I think", "I feel", "I understand", "I believe"; rule `ai.not-a-person`) or as the actor ("Copilot, summarize"; rule `ai.user-initiates`, write "Summarize" or "Summarize with Copilot"). English only. Opt a string out with `// ux-builder-ai-persona` on the line before it. The plugin now has `configs.recommended`, with all four rules and this one as a warning.
