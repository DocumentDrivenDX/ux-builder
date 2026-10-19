/* From shadcn/ui (https://github.com/shadcn-ui/ui), registry item "separator" (https://ui.shadcn.com/r/styles/new-york-v4/separator.json), MIT:
   Copyright (c) 2023 shadcn; the licence is ai/licenses/shadcn-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
"use client"

import * as React from "react"
import { cn } from "../lib/utils"
import { Separator as SeparatorPrimitive } from "radix-ui"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
