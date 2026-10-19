/* One option on one design system, resolved in the browser exactly as the
   build would compose it (compose-core, CONTRACT-002), keyed by CSS name for
   ThemeProvider's tokens prop. */

import { composeOn, resolveAll } from "../../../../packages/tokens/compose-core.mjs";

const cache = new Map();

export function resolvedTokens(option, designSystem, appearance) {
  const key = `${option.brand.generation.strategy}|${JSON.stringify(option.settings)}|${designSystem.name}|${appearance}`;
  if (cache.has(key)) return cache.get(key);
  const brand = { name: "option", appearances: option.brand.appearances };
  const resolved = resolveAll(composeOn(brand, designSystem, appearance), `option × ${designSystem.name}`);
  const tokens = Object.fromEntries([...resolved].map(([path, value]) => [`piq-${path.replace(/\./g, "-")}`, value]));
  cache.set(key, tokens);
  return tokens;
}
