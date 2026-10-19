/* From assistant-ui (https://github.com/assistant-ui/assistant-ui), registry item "elements-collapsible-root" (https://r.assistant-ui.com/elements-collapsible-root.json), MIT:
   Copyright (c) 2026 AgentbaseAI Inc.; the licence is ai/licenses/assistant-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
"use client";

import { Collapsible } from "radix-ui";
import { forwardRef } from "react";

export const CollapsibleRoot = forwardRef<
  React.ComponentRef<typeof Collapsible.Root>,
  React.ComponentPropsWithoutRef<typeof Collapsible.Root>
>(function CollapsibleRoot(props, ref) {
  return <Collapsible.Root ref={ref} data-slot="collapsible" {...props} />;
});

export function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof Collapsible.CollapsibleTrigger>) {
  return (
    <Collapsible.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  );
}

export function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof Collapsible.CollapsibleContent>) {
  return (
    <Collapsible.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  );
}
