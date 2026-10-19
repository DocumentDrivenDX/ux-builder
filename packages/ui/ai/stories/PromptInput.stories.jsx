import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "../vendor/ai-elements/prompt-input";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/PromptInput", component: PromptInput, parameters: { library: "AI Elements", layout: "padded" } };

export const Composer = { render: () => (
  <AiFrame>
    <PromptInput onSubmit={() => {}}>
      <PromptInputBody><PromptInputTextarea placeholder="Ask about this matter" aria-label="Ask the assistant" /></PromptInputBody>
      <PromptInputFooter><PromptInputTools /><PromptInputSubmit status="ready" /></PromptInputFooter>
    </PromptInput>
  </AiFrame>
) };
