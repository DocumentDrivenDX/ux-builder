/* From shadcn/ui (https://github.com/shadcn-ui/ui), registry item "skeleton" (https://ui.shadcn.com/r/styles/new-york-v4/skeleton.json), MIT:
   Copyright (c) 2023 shadcn; the licence is ai/licenses/shadcn-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
import { cn } from "../lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
