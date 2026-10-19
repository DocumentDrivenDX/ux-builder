/* From AI Elements (https://github.com/vercel/ai-elements), registry item "suggestion" (https://registry.ai-sdk.dev/suggestion.json), Apache-2.0:
   Copyright 2023 Vercel, Inc.; the licence is ai/licenses/ai-elements.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
"use client";

import { Button } from "../ui/button";
import {
  ScrollArea,
  ScrollBar,
} from "../ui/scroll-area";
import { cn } from "../lib/utils";
import type { ComponentProps } from "react";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
