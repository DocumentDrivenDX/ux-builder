/* From assistant-ui (https://github.com/assistant-ui/assistant-ui), registry item "elements-surfaces" (https://r.assistant-ui.com/elements-surfaces.json), MIT:
   Copyright (c) 2026 AgentbaseAI Inc.; the licence is ai/licenses/assistant-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
import { useEffect, useLayoutEffect } from "react";

const hasWindow =
  typeof (globalThis as typeof globalThis & { window?: unknown }).window !==
  "undefined";

export const useIsomorphicLayoutEffect = hasWindow
  ? useLayoutEffect
  : useEffect;
