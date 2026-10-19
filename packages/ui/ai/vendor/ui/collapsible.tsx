/* From shadcn/ui (https://github.com/shadcn-ui/ui), registry item "collapsible" (https://ui.shadcn.com/r/styles/new-york-v4/collapsible.json), MIT:
   Copyright (c) 2023 shadcn; the licence is ai/licenses/shadcn-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
"use client"

import { Collapsible as CollapsiblePrimitive } from "radix-ui"

function Collapsible({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return (
    <CollapsiblePrimitive.CollapsibleTrigger
      data-slot="collapsible-trigger"
      {...props}
    />
  )
}

function CollapsibleContent({
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
