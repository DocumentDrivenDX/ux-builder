import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "../vendor/ai-elements/tool";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Tool", component: Tool, parameters: { library: "AI Elements", layout: "padded" } };

export const Calls = { render: () => (
  <AiFrame>
    <Tool defaultOpen>
      <ToolHeader type="tool-search_time_entries" state="output-available" />
      <ToolContent>
        <ToolInput input={{ matter: "2026-0412", month: "2026-10" }} />
        <ToolOutput output={<p className="p-2 text-sm">38 entries, 61.5 hours</p>} errorText={undefined} />
      </ToolContent>
    </Tool>
    <Tool><ToolHeader type="tool-calculate_fees" state="input-available" /></Tool>
  </AiFrame>
) };
