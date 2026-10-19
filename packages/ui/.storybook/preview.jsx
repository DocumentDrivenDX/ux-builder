/* Every story renders inside one theme and appearance, picked from the
   toolbar, and is delivered to the widget one of two ways:

     CSS        the theme stylesheet plus data-theme / data-appearance on the
                story's frame: how the harness and the apps theme themselves
     resolved   the theme's resolved JSON set as inline custom properties, with
                no stylesheet selector in play: how the harness will hand a
                theme to an embedded view (step 6)

   A widget that looks right in both depends on nothing but the token
   contract. Artwork (url() tokens) is left out of resolved delivery: how the
   harness passes images to an embedded view is step 6's to decide. */

import "@ux-builder/tokens/themes.css";
// The SDK's bundled fonts, as an app loads them (ADR-017); Segoe UI and the system faces are not served.
import "@ux-builder/tokens/fonts.css";
import manifest from "@ux-builder/tokens/manifest.json";
// Every theme's generative UI bridges (ADR-023), scoped by data-theme, for the AI Components stories.
import.meta.glob("../../tokens/dist/bridges/*/*.css", { eager: true });
import "../src/ui.css";
import "../src/patterns.css";
import "./preview.css";

// Every theme in each of its appearances, from the token build. Keyed
// "praxis-dark" rather than "praxis.dark": Storybook drops a global from the
// URL if it has a dot in it, and a theme should be linkable (the theme
// builder's theme pages link each story in their own theme this way).
const FILES = import.meta.glob("../../tokens/dist/resolved/*.json", { eager: true, import: "default" });
const THEMES = new Set(manifest.themes.map((t) => t.name));
const RESOLVED = Object.fromEntries(Object.values(FILES).filter((r) => THEMES.has(r.theme) && !r.preview).map((r) => [`${r.theme}-${r.appearance}`, r]));
const TITLES = Object.fromEntries(manifest.themes.map((t) => [t.name, t.title]));
const ITEMS = Object.values(RESOLVED).sort((a, b) => a.theme.localeCompare(b.theme) || a.appearance.localeCompare(b.appearance))
  .map((r) => ({ value: `${r.theme}-${r.appearance}`, title: `${TITLES[r.theme]} ${r.appearance}` }));

const asVariables = (tokens) => Object.fromEntries(
  Object.entries(tokens).filter(([, v]) => !v.startsWith("url(")).map(([k, v]) => [`--${k}`, v]),
);

function withTheme(Story, { globals }) {
  const { theme, appearance, tokens } = RESOLVED[globals.theme] ?? RESOLVED["praxis-dark"];
  const frame = globals.delivery === "resolved"
    ? { style: asVariables(tokens) }
    : { "data-theme": theme, "data-appearance": appearance };
  return (
    <div className="ds-frame" style={{ colorScheme: appearance }} {...frame}>
      <Story />
    </div>
  );
}

/** @type {import("@storybook/react-vite").Preview} */
export default {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Theme and appearance",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        dynamicTitle: true,
        items: ITEMS,
      },
    },
    delivery: {
      description: "How the theme reaches the widget",
      toolbar: {
        title: "Delivery",
        icon: "transfer",
        dynamicTitle: true,
        items: [
          { value: "css", title: "CSS (data-theme)" },
          { value: "resolved", title: "Resolved JSON (embedded)" },
        ],
      },
    },
  },
  initialGlobals: { theme: "praxis-dark", delivery: "css" },
  parameters: {
    // The SDK's own components, kept apart from the AI libraries' (AI Components).
    options: { storySort: { order: ["Foundations", "UI Components", "AI Components", "Patterns"] } },
    layout: "fullscreen",
    // Report, don't fail: the themes still carry the contrast failures in
    // tools/contrast-baseline.json until step 4. Raise to "error" once the
    // baseline is empty.
    a11y: { test: "todo" },
  },
};
