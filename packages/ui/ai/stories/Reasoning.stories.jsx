import { Reasoning, ReasoningContent, ReasoningTrigger } from "../vendor/ai-elements/reasoning";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Reasoning", component: Reasoning, parameters: { library: "AI Elements", layout: "padded" } };

export const Collapsed = { render: () => (
  <AiFrame>
    <Reasoning duration={6} defaultOpen={false}>
      <ReasoningTrigger />
      <ReasoningContent>{"The user asks about limitation. The claim is in contract, so section 5 applies. The breach date is in the defence: 3 March 2021."}</ReasoningContent>
    </Reasoning>
  </AiFrame>
) };
