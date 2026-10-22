import { ChoicePicker, Logo, Select, useTheme } from "@ux-builder/ui";

const APPEARANCES = [{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }];

/* The theme's logo and the app's name. */
export function Brand({ as: Tag = "span" }) {
  return (
    <div className="brand">
      <Logo size="sm" />
      <Tag className="brand__name">__APP_NAME__</Tag>
    </div>
  );
}

/* Every theme @ux-builder/tokens ships, and the appearance; every widget follows without a reload. */
export function ThemeSwitch() {
  const { theme, preference, themes, setTheme, setAppearance } = useTheme();
  return (
    <div className="switcher">
      <Select label="Theme" value={theme} onChange={(e) => setTheme(e.target.value)} options={themes.map((t) => ({ value: t.name, label: t.title }))} />
      <ChoicePicker label="Appearance" options={APPEARANCES} value={preference} onChange={setAppearance} />
    </div>
  );
}
