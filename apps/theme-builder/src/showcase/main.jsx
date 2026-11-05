import "@ux-builder/tokens/themes.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "./showcase.css";
import { createRoot } from "react-dom/client";
import { Showcase } from "./Showcase.jsx";

// The theme showcase (showcase.html): one screen made only of the SDK's widgets and patterns,
// in the theme named by ?theme=<name> (vk-databricks by default), switchable from its top bar.
createRoot(document.getElementById("root")).render(<Showcase />);
