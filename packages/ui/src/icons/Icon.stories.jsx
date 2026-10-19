import { Icon, ICON_NAMES } from "./Icon.jsx";

export default {
  title: "Foundations/Icons",
  component: Icon,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "One Icon component with shared names. The glyph follows the theme's design system: Material Symbols, Fluent System Icons, Carbon icons, or Lucide for themes without a set of their own. Switch the theme in the toolbar to see each set." } } },
};

export const AllIcons = {
  render: () => (
    <ul style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(8.5rem, 1fr))", gap: "var(--piq-space-3)", listStyle: "none", padding: 0, margin: 0, color: "var(--piq-color-text)" }}>
      {ICON_NAMES.map((n) => (
        <li key={n} style={{ display: "flex", alignItems: "center", gap: "var(--piq-space-2)" }}>
          <Icon name={n} size="1.5rem" /><code style={{ fontSize: "var(--piq-font-size-small)" }}>{n}</code>
        </li>
      ))}
    </ul>
  ),
};

export const InText = {
  render: () => (
    <p style={{ color: "var(--piq-color-text)", display: "flex", alignItems: "center", gap: "var(--piq-space-2)" }}>
      <Icon name="warning" style={{ color: "var(--piq-state-limited)" }} /> Two entries are over the cap.
      <Icon name="external-link" label="Opens in a new tab" />
    </p>
  ),
};
