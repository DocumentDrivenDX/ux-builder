import { useState } from "react";
import { ChoicePicker } from "./ChoicePicker.jsx";

export default {
  title: "UI Components/ChoicePicker",
  component: ChoicePicker,
  tags: ["autodocs"],
  parameters: { docs: { description: { component: "A radio group drawn as segments: one tab stop, arrow keys, Home and End move the selection." } } },
};

const OPTIONS = [{ value: "associate", label: "Associate" }, { value: "partner", label: "Partner" }, { value: "billing", label: "Billing" }];

export const ReviewAs = {
  render: function ReviewAs() {
    const [v, setV] = useState("partner");
    return <ChoicePicker label="Review as" options={OPTIONS} value={v} onChange={setV} />;
  },
};
