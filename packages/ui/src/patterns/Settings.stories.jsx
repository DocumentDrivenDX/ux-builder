import { Switch } from "../widgets/Choice.jsx";
import { TextField } from "../widgets/Field.jsx";
import { SettingsPage } from "./Settings.jsx";

/* Settings (US-029). Resize: navigation beside the section from 840px; below,
   the list of sections, then one section with a link back. */
export default { title: "Patterns/Settings", component: SettingsPage, parameters: { layout: "padded" } };

export const Settings = {
  render: () => (
    <SettingsPage sections={[
      { id: "profile", label: "Profile", content: <TextField label="Display name" defaultValue="R. Lee" /> },
      { id: "notifications", label: "Notifications", content: <Switch label="Email me when a matter changes" defaultChecked /> },
      { id: "billing", label: "Billing", disabled: "Only owners can change billing", content: null },
      { id: "members", label: "Members", content: <p>Members of this workspace.</p> },
    ]} />
  ),
};
