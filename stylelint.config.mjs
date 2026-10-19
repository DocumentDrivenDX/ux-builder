/* The repository's own use of ux-builder/no-hard-coded-values (FEAT-004 SDK-10):
   the SDK's widgets and the theme builder must be free of literal colours,
   fonts and radii. npm run lint. */

export default {
  plugins: ["@ux-builder/ui/stylelint"],
  rules: { "ux-builder/no-hard-coded-values": [true, { theme: "praxis" }] },
};
