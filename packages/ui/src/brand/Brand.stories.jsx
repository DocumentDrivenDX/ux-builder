import { Favicon } from "./favicon.js";
import { Logo } from "./Logo.jsx";

/* The active theme's artwork: its logo and mark, and the page icon. */
export default { title: "Foundations/Brand", parameters: { layout: "padded" } };

export const LogoAndMark = { render: () => <div style={{ display: "flex", gap: "var(--piq-space-5)", alignItems: "center" }}><Logo /><Logo size="sm" /><Logo variant="mark" /></div> };
export const PageIcon = { render: () => <p style={{ color: "var(--piq-color-text)" }}><Favicon />Favicon keeps this tab's icon on the theme's favicon; it renders nothing itself.</p> };
