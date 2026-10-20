import "@ux-builder/tokens/themes.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "./app.css";
import { createRoot } from "react-dom/client";

// ?theme=<name> opens that theme's own page, loaded only then (it brings every story and the AI Components' CSS); otherwise the builder.
// The static build for GitHub Pages has no builder (it needs the local server, ADR-019): its other pages are the theme list.
const theme = new URLSearchParams(location.search).get("theme");
const root = createRoot(document.getElementById("root"));
if (theme) import("./themepage/ThemePage.jsx").then(({ ThemePage }) => root.render(<ThemePage name={theme} />));
else if (import.meta.env.VITE_STATIC === "1") import("./themepage/ThemeIndex.jsx").then(({ ThemeIndex }) => root.render(<ThemeIndex />));
else import("./App.jsx").then(({ App }) => root.render(<App />));
