/* Settings for the settings browser test (US-029-AC6): rendered by React in
   a box the test resizes. Bundled by settings.browser.test.mjs. */
import { createRoot } from "react-dom/client";
import { TextField } from "../../dist/index.js";
import { SettingsPage } from "../../dist/patterns.js";

const SECTIONS = [
  { id: "profile", label: "Profile", content: <TextField id="name" label="Display name" /> },
  { id: "notifications", label: "Notifications", content: <p>Notifications</p> },
  { id: "billing", label: "Billing", disabled: "Only owners can change billing", content: <p>Billing</p> },
];
createRoot(document.getElementById("root")).render(<SettingsPage sections={SECTIONS} />);
