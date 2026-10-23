---
"@ux-builder/ui": minor
"@ux-builder/mcp": patch
---

The operator's decisions on AR-2026-10-22 (D-1, D-2, D-4, D-6):

- **Adaptive Card tones use the status colours** (D-1). A `Container` or `Column` styled `good`, `warning` or `attention`, and an action styled `destructive`, now draw with `--piq-color-status-positive`, `-caution` and `-negative` (FEAT-017), not the availability colours (`--piq-state-live`, `-limited`, `-closed`). Cards look different in themes where the two families differ.
- **New rule `genui.inline-compact`** (D-2, US-080-AC7). A `Wizard` or `FormPage` rendered inline in a conversation whose region includes `compact` gets a blueprint warning: show one short step at a time with its progress, keep the composer and Stop reachable, and move a longer task to a screen of its own. A region that is never compact gets none.
- **A screen may declare `partial`** (D-4, US-104-AC5). `screens[].states` accepts `"partial"`; `draw` and `wireframes` already draw it with its retry. `screen.states` still asks only for empty, loading and error.
- **`checkCard` writes the episode trace** (D-6, US-106-AC2). In Node, each call also writes a `card` check event to the trace of the app at or above `{ trace: <dir> }` (default: the working directory), after it returns; `traceWritten()` resolves when that is done. `{ trace: false }`, a browser, or an app without `.ux-builder/` writes nothing, and the findings never change.
- `@ux-builder/mcp`: `check_card` calls `checkCard` with `trace: false` and writes the event itself, for the app it serves, so a call is recorded once.
