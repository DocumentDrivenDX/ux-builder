import { useState } from "react";
import { AppearanceSwitch } from "./AppearanceSwitch.jsx";

export default { title: "UI Components/AppearanceSwitch", component: AppearanceSwitch, tags: ["autodocs"], parameters: { layout: "padded" } };

function Demo(props) { const [v, setV] = useState("dark"); return <AppearanceSwitch {...props} value={v} onChange={setV} />; }
export const LightAutoDark = { render: () => <Demo /> };
export const LightOnlyTheme = { render: () => <Demo available={["light"]} /> };
