import { CodeBlock, CodeBlockCopyButton } from "../vendor/ai-elements/code-block";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/CodeBlock", component: CodeBlock, parameters: { library: "AI Elements", layout: "padded" } };

export const Query = { render: () => (
  <AiFrame>
    <CodeBlock code={'SELECT matter, SUM(hours)\nFROM time_entries\nWHERE month = \'2026-10\'\nGROUP BY matter;'} language="sql"><CodeBlockCopyButton /></CodeBlock>
  </AiFrame>
) };
