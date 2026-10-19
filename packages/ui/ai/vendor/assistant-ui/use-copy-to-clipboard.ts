/* From assistant-ui (https://github.com/assistant-ui/assistant-ui), registry item "use-copy-to-clipboard" (https://r.assistant-ui.com/use-copy-to-clipboard.json), MIT:
   Copyright (c) 2026 AgentbaseAI Inc.; the licence is ai/licenses/assistant-ui.LICENSE.
   Changed by the UX Builder authors, 2026-10-19: import paths made relative (tools/vendor-ai-elements.mjs). */
"use client";

import { useEffect, useRef, useState } from "react";

export type UseCopyToClipboardOptions = {
  copiedDuration?: number;
};

export const useCopyToClipboard = ({
  copiedDuration = 3000,
}: UseCopyToClipboardOptions = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const scopeGenerationRef = useRef(0);

  useEffect(
    () => () => {
      scopeGenerationRef.current += 1;
      if (copiedTimerRef.current === undefined) return;

      clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = undefined;
      setIsCopied(false);
    },
    [],
  );

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    const scopeGeneration = scopeGenerationRef.current;
    navigator.clipboard.writeText(value).then(
      () => {
        if (scopeGeneration !== scopeGenerationRef.current) return;

        if (copiedTimerRef.current !== undefined) {
          clearTimeout(copiedTimerRef.current);
        }
        setIsCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          copiedTimerRef.current = undefined;
          setIsCopied(false);
        }, copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};
