/* GET /api/context: what the browser needs and may know. The shared design
   systems (to compose and fit options in the browser), the names already
   taken, and whether feedback is available. No secrets. Each anatomy carries
   its baseTokens (layout measures and pattern variants, CONTRACT-002 step 0)
   explicitly: load() keeps them off the file's own properties. */

import { load } from "../../../packages/tokens/compose.mjs";

export function context({ root, model }) {
  const src = load(`${root}/tokens`, `${root}/brand`);
  return {
    designSystems: [...src.designSystems.values()].map((d) => { const { file, ...ds } = d; return { ...ds, baseTokens: d.baseTokens }; }).sort((a, b) => a.name.localeCompare(b.name)),
    // Palettes are first shown on neutral widgets (the prototype's step 2): the plain theme's anatomy.
    neutral: { name: "neutral", title: "Neutral", ...src.themes.get("plain").anatomy, baseTokens: src.themes.get("plain").anatomy.baseTokens },
    themes: [...src.themes.values()].map((t) => ({ name: t.name, title: t.title, designSystem: t.designSystem ?? null, public: t.public === true })).sort((a, b) => a.name.localeCompare(b.name)),
    taken: [...new Set([...src.brands.keys(), ...src.themes.keys()])].sort(),
    brands: [...src.brands.keys()].sort(),
    model: model.available ? { available: true, name: model.name } : { available: false, reason: model.reason },
  };
}
