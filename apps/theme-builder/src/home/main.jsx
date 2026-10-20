import "@ux-builder/tokens/themes/ux-builder-databricks.css";
import "@ux-builder/tokens/fonts.css";
import "@ux-builder/tokens/bridges/shadcn/ux-builder-databricks.css";
import "@ux-builder/ui/ui.css";
import "@ux-builder/ui/patterns.css";
import "../app.css";
import "./home.css";
import "../microsite/microsite.css";
import { createRoot } from "react-dom/client";
import { Site } from "../microsite/Site.jsx";

// The GitHub Pages site (tools/build-pages.mjs): the home page and its section pages (?p=<section>/<page>), wearing ux-builder-databricks.
createRoot(document.getElementById("root")).render(<Site />);
