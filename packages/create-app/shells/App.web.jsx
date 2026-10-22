import { AppShell } from "@ux-builder/ui/patterns";
import { Brand, ThemeSwitch } from "./ThemeSwitch.jsx";
import { Home } from "./Home.jsx";

/* The app's frame (app.blueprint.json, its destinations): AppShell places the
   navigation for the space available, from a bottom bar at compact to side
   navigation at large. Add a destination to the blueprint before adding it here. */
const NAV = [{ id: "home", label: "Home", href: "/", icon: "home" }];

export function App() {
  return (
    <AppShell nav={NAV} current="home" brand={<Brand />} actions={<ThemeSwitch />}>
      <Home />
    </AppShell>
  );
}
