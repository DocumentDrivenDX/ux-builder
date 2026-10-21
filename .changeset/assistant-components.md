---
"@ux-builder/ui": minor
"@ux-builder/mcp": minor
---

The SDK's own assistant, `@ux-builder/ui/assistant` (FEAT-007; US-046 to US-048; CONTRACT-004 *Assistant and generative UI*):

- `Conversation`: the messages as a log, with each finished reply announced once (never token by token) and "Replying…" in text while one streams. The composer sends on Enter, adds a line on Shift+Enter, keeps focus, and says in text why it cannot send. It has Stop (the partial reply stays, marked "Stopped"), Retry on a failed reply, Regenerate, suggestions and "Jump to latest". Replies render from sanitised markdown: no HTML or script, links marked as opening a new tab, and code with a copy control.
- The assistant's work and its actions: reasoning behind a disclosure ("Reasoned for 6 seconds"), tool calls with their status in text, numbered sources linked from each citation, and an approval card. Nothing passes to the app until the user approves or denies. The choice is announced and recorded, only the latest request for an action can be decided, and no approval is ever read from a tool result. Artifacts open beside the conversation from the expanded size class, and full screen below it.
- `AssistantPanel`: a side panel beside the page from the expanded size class, and a full-screen sheet below it.
- Generated UI: `GenerativeComponent` renders only the catalogue's renderable components (`RENDERABLE`, `checkRenderable`), with props that pass their schema; anything else is a plain notice. `InlineForm` keeps the user's edits when its reply is regenerated, and shows what was submitted, read only.
- Every part carries CONTRACT-005's AI markers (`data-piq-ai` generated, status, plan, step, approval; `data-piq-ai-control`, `data-piq-ai-label`, `data-piq-ai-actor`).
- Adapters: `@ux-builder/ui/assistant/ai-sdk` (`useAiSdkConversation`, `fromAiSdk`) and `@ux-builder/ui/assistant/assistant-ui` (`useAssistantUiConversation`, `fromAssistantUi`). Each reads the runtime object the app already has and imports no AI library. `ai` and `@assistant-ui/react` are optional peer dependencies, and nothing contacts a vendor or reports usage.
- `catalogue.json` gains `assistant[]`, and `renderable: true` with a `propsSchema` on each component an agent may render. `AGENTS.md` gains an "Assistant" section. The styles are in `patterns.css`.
- `@ux-builder/mcp` adds `list_renderable`.
