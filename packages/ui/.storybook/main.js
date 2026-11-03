/* Storybook for @ux-builder/ui: the workbench where each widget is
   built and reviewed in every theme. The tokens it draws on come from the
   built package (npm run build at the repo root), exactly as an app gets
   them. */

/** @type {import("@storybook/react-vite").StorybookConfig} */
export default {
  framework: "@storybook/react-vite",
  // The SDK's own components, then the AI Components group: AI Elements and assistant-ui wearing each theme through its bridge (US-045-AC4),
  // then @ux-builder/visuals drawing each graph kind in the toolbar's theme (US-166).
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx)", "../ai/stories/*.stories.@(js|jsx)", "../../visuals/stories/*.stories.@(js|jsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  core: { disableTelemetry: true },
  // Tailwind compiles only ai/ai.css, which only the AI stories import.
  async viteFinal(config) {
    const { default: tailwind } = await import("@tailwindcss/vite");
    return { ...config, plugins: [...(config.plugins ?? []), tailwind()] };
  },
};
