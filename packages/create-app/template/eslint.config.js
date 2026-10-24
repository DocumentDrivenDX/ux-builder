import uxBuilder from "@ux-builder/ui/eslint";

export default [{
  files: ["src/**/*.{js,jsx}"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "ux-builder": uxBuilder },
  rules: {
    "ux-builder/no-hard-coded-values": ["error", { theme: "__THEME__" }],
    "ux-builder/no-foreign-ui": "error",
    "ux-builder/no-inline-svg": "error",
    "ux-builder/no-prototype-import": "error",
    "ux-builder/ai-neutral-voice": "warn",
  },
}];
