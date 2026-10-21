---
"@ux-builder/ui": minor
"@ux-builder/mcp": minor
---

Adaptive Cards, `@ux-builder/ui/adaptive-cards` (ADR-029, FEAT-011 AIC-01 to AIC-04; US-083 to US-085; CONTRACT-004 *Adaptive Cards*):

- `AdaptiveCard` (`card`, `onAction`) draws a card of the open-source schema 1.6 with the SDK's own components, in the nearest theme: `Card`, text in the type scale with the card markdown subset (never HTML), images with their alt text, `video` or `audio` with captions, containers on the surface and status tokens, a `Grid` for a ColumnSet (one column at compact), `DescriptionList` for a FactSet, `DataTable` for a Table, buttons in a `Cluster` with a More actions menu, disclosures for Action.ShowCard and Action.ToggleVisibility, and the SDK's fields for every input, with their label, required state and error message. An element outside 1.6 shows its `fallback`, or a plain notice; a card above 1.6 says so. The card is marked `data-piq-ai="generated"`.
- Action.Submit and Action.Execute call `onAction({ type, id, verb, data, inputs })` once the inputs are valid. An action marked `"data": { "ux-builder": { "highImpact": true, "consequence" } }` asks for approval first (the assistant's `ApprovalCard`): `onAction` only after Approve, never after Deny, with the marker removed from `data`. Then the card's actions are no longer current, and activating one again is refused. A destructive action asks to confirm. Action.OpenUrl is a link that leaves the app. Nothing in the card, or claimed by a tool, approves anything.
- `checkCard(card)` checks a payload against the vendored Adaptive Cards 1.6 JSON Schema (`cardSchema`, MIT, in `adaptive-cards/schema-1.6/`) and the eleven `card.*` rules with an automatic check, returning findings with a JSON Pointer into the card. It is also at `@ux-builder/ui/adaptive-cards/check`, with no React, for Node tools. The rules name it (`"kind": "card"`).
- In a `Conversation`, a part `{ type: "adaptive-card", card }` renders the card; `onCardAction` and `onCardDecide` report what the user does, and the user's choice is kept with the message. The AI SDK and assistant-ui adapters turn a tool result `{ type: "adaptive-card", card }`, or a card itself, into that part.
- `catalogue.json` gains `adaptiveCards[]`; `AGENTS.md` gains an "Adaptive Cards" section. The styles are in `patterns.css`.
- `@ux-builder/mcp` adds `check_card` (`card`), which returns the same findings as `checkCard`.
