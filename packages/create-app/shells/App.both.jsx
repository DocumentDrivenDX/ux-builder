import { useEffect, useState } from "react";
import { registerIcons } from "@ux-builder/ui";
import { iconMessageSquare } from "@ux-builder/ui/icons";
import { AppShell } from "@ux-builder/ui/patterns";
import { Brand, ThemeSwitch } from "./ThemeSwitch.jsx";
import { Home } from "./Home.jsx";
import { Assistant } from "./Assistant.jsx";

registerIcons(iconMessageSquare);

/* The app's frame (docs/ux-builder/blueprint/app.blueprint.json, its destinations): Home, a screen of
   the responsive web app, and Assistant, its conversation. AppShell places
   the navigation for the space available, from a bottom bar at compact to
   side navigation at large. Each destination has its own path. */
const NAV = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "assistant", label: "Assistant", href: "/assistant", icon: "message-square" },
];
const at = () => NAV.find((d) => d.href === window.location.pathname)?.id ?? "home";

export function App() {
  const [current, setCurrent] = useState(at);
  useEffect(() => {
    const back = () => setCurrent(at());
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  const go = (item) => { window.history.pushState(null, "", item.href); setCurrent(item.id); };
  return (
    <AppShell nav={NAV} current={current} onNavigate={go} brand={<Brand />} actions={<ThemeSwitch />}>
      {current === "assistant" ? <Assistant /> : <Home />}
    </AppShell>
  );
}
