import "@ux-builder/tokens/themes.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "./app.css";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";

// ?theme=<name> opens that theme's own page, loaded only then (it brings every story and the AI Components' CSS); otherwise the builder.
const theme = new URLSearchParams(location.search).get("theme");
const root = createRoot(document.getElementById("root"));
if (theme) import("./themepage/ThemePage.jsx").then(({ ThemePage }) => root.render(<ThemePage name={theme} />));
else root.render(<App />);
