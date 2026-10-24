/* @ux-builder/ui/adaptive-cards: Adaptive Cards (open-source schema 1.6)
   drawn with the SDK's own components in the app's theme, and checked
   before they are sent (ADR-029). AdaptiveCard renders a card; checkCard
   checks a payload against the vendored 1.6 schema and the card rules;
   cardSchema is that schema (MIT). Styled by @ux-builder/ui/patterns.css.
   checkCard, cardSchema and CHECKS are also at
   @ux-builder/ui/adaptive-cards/check, with no React, for Node tools. */

export { AdaptiveCard } from "./AdaptiveCard.jsx";
export { CHECKS, SUPPORTED_VERSION, cardSchema, checkCard, traceWritten } from "../../adaptive-cards/check.mjs";
