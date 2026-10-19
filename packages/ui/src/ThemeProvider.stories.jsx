import { Button } from "./widgets/Button.jsx";
import { Card } from "./widgets/Card.jsx";
import { ChoicePicker } from "./widgets/ChoicePicker.jsx";
import { Select } from "./widgets/Field.jsx";
import { Notice } from "./widgets/Notice.jsx";
import { StatusPill } from "./widgets/StatusPill.jsx";
import { ThemeProvider, useTheme } from "./ThemeProvider.jsx";

export default {
  title: "Foundations/ThemeProvider",
  component: ThemeProvider,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Sets the theme an app selects (data-theme, data-appearance) on its element, resolves appearance=\"system\" from the user's preference before first paint and follows it, and lets useTheme() switch theme at run time. The nearest provider wins, so this story's own provider overrides the toolbar's theme.",
      },
    },
  },
};

const APPEARANCES = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];

function Switcher() {
  const { theme, appearance, preference, themes, setTheme, setAppearance } = useTheme();
  return (
    <div style={{ display: "grid", gap: "var(--piq-space-4)", padding: "var(--piq-space-5)", background: "var(--piq-color-ground)", color: "var(--piq-color-text)" }}>
      <div style={{ display: "flex", gap: "var(--piq-space-4)", flexWrap: "wrap", alignItems: "end" }}>
        <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={themes.map((t) => ({ value: t.name, label: t.title }))} />
        <ChoicePicker label="Appearance" options={APPEARANCES} value={preference} onChange={setAppearance} />
      </div>
      <p style={{ margin: 0, color: "var(--piq-color-text-muted)" }}>
        data-theme="{theme}" data-appearance="{appearance}"{preference === "system" ? " (from your system preference)" : ""}
      </p>
      <Card title="Five entries need a look" actions={<><Button>Confirm</Button><Button variant="secondary">Expand</Button></>}>
        Two of them are block-billed. Nothing changes until you act on an entry.
      </Card>
      <Notice tone="warning" title="Two entries over the cap" />
      <div style={{ display: "flex", gap: "var(--piq-space-2)" }}>
        <StatusPill state="live" /><StatusPill state="limited" /><StatusPill state="closed" />
      </div>
    </div>
  );
}

export const RuntimeSwitching = {
  args: { theme: "databricks", appearance: "system" },
  render: (args) => <ThemeProvider {...args}><Switcher /></ThemeProvider>,
};

export const Nested = {
  render: () => (
    <ThemeProvider theme="praxis" appearance="dark" style={{ padding: "var(--piq-space-5)", background: "var(--piq-color-ground)" }}>
      <Card title="Outer: praxis, dark"><Button>Confirm</Button></Card>
      <ThemeProvider theme="plain" appearance="light" style={{ marginTop: "var(--piq-space-4)", padding: "var(--piq-space-5)", background: "var(--piq-color-ground)" }}>
        <Card title="Inner: plain, light (the nearest provider wins)"><Button>Confirm</Button></Card>
      </ThemeProvider>
    </ThemeProvider>
  ),
};
