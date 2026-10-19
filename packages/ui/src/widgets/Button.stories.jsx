import { Button } from "./Button.jsx";

export default {
  title: "UI Components/Button",
  component: Button,
  tags: ["autodocs"],
  args: { children: "Confirm", variant: "primary" },
  argTypes: { variant: { control: "inline-radio", options: ["primary", "secondary", "text"] }, size: { control: "inline-radio", options: [undefined, "sm"] } },
};

export const Primary = {};
export const Secondary = { args: { variant: "secondary", children: "Expand" } };
export const Text = { args: { variant: "text", children: "Pinned", badge: 5 } };
export const Disabled = { args: { disabled: true } };
export const AllEmphases = {
  render: () => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button>Confirm</Button>
      <Button variant="secondary">Expand</Button>
      <Button variant="text" badge={5}>Pinned</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
};
