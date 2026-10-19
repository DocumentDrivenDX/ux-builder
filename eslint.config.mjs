/* The repository's own use of ux-builder/no-hard-coded-values on JSX style props
   (FEAT-004 SDK-10). npm run lint. */

import uxBuilder from "@ux-builder/ui/eslint";

export default [{
  files: ["packages/ui/src/**/*.jsx", "apps/theme-builder/src/**/*.jsx"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "ux-builder": uxBuilder },
  rules: { "ux-builder/no-hard-coded-values": ["error", { theme: "praxis" }] },
}];
