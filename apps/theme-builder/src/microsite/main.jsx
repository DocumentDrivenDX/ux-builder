import "@ux-builder/tokens/themes/ux-builder-databricks.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/tokens/bridges/shadcn/ux-builder-databricks.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "../app.css";
import "../home/home.css";
import "./microsite.css";
import { createRoot } from "react-dom/client";
import { Site } from "./Site.jsx";

// A draft of the project site, laid out by HELIX's product-microsite-ia concern (tools/build-microsite-draft.mjs).
createRoot(document.getElementById("root")).render(<Site />);
