import "@ux-builder/tokens/themes/ux-builder-databricks.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/tokens/bridges/shadcn/ux-builder-databricks.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "../app.css";
import "./home.css";
import { createRoot } from "react-dom/client";
import { Home } from "./Home.jsx";

// The GitHub Pages home page (tools/build-pages.mjs), wearing the SDK's own ux-builder-databricks theme.
createRoot(document.getElementById("root")).render(<Home />);
