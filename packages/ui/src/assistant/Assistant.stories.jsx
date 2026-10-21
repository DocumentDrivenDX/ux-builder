import { useMemo, useState } from "react";
import { Button } from "../widgets/Button.jsx";
import { AssistantPanel, Conversation } from "./Conversation.jsx";
import { Markdown } from "./Markdown.jsx";
import { ApprovalCard, Reasoning, Sources, ToolCall, ToolCalls } from "./Parts.jsx";
import { GenerativeComponent, InlineForm } from "./Generative.jsx";
import { useAiSdkConversation } from "./adapters/ai-sdk.js";
import { useAssistantUiConversation } from "./adapters/assistant-ui.js";
import { AI_SDK_SAMPLE, ASSISTANT_UI_SAMPLE, GENERATED, SAMPLE, fakeThread, useDemoConversation, useFakeChat } from "./story-data.js";

/* The SDK's own assistant (US-046 to US-048, ADR-023): a conversation with
   its work shown and its actions approved, generated UI from the catalogue,
   and the same pattern on the AI SDK and assistant-ui. Replies come from a
   timer; nothing is fetched. */
export default { title: "Patterns/Assistant", component: Conversation, parameters: { layout: "padded" } };

const FRAME = { blockSize: "36rem", maxInlineSize: "60rem" };
const Frame = ({ children }) => <div style={FRAME} data-assistant-story="">{children}</div>;
const SUGGESTIONS = ["Summarise the last three filings", "When is the hearing?", { label: "Draft a bill", prompt: "Draft a bill for Acme v Beta for October" }];

function Demo({ initial = SAMPLE }) {
  const chat = useDemoConversation(initial);
  return <Frame><Conversation {...chat} suggestions={SUGGESTIONS} /></Frame>;
}
export const FullConversation = { render: () => <Demo /> };
export const Empty = { render: () => <Demo initial={[]} /> };

export const Streaming = { render: () => <Frame><Conversation messages={[{ id: "u", role: "user", text: "Summarise the last three filings" }, { id: "a", role: "assistant", status: "streaming", text: "The last three filings are the defence" }]} onStop={() => {}} /></Frame> };
export const Failed = { render: () => <Frame><Conversation messages={[{ id: "u", role: "user", text: "When is the hearing?" }, { id: "a", role: "assistant", status: "error", error: "The assistant could not reply. Try again." }]} onRetry={() => {}} /></Frame> };
export const Unavailable = { render: () => <Frame><Conversation messages={SAMPLE} disabledReason="The assistant is offline. Your message is kept; send it when it is back." /></Frame> };
export const GeneratedComponents = { render: () => <Frame><Conversation messages={GENERATED} onComponentSubmit={() => {}} /></Frame> };

function PanelDemo() {
  const [open, setOpen] = useState(false);
  const chat = useDemoConversation(SAMPLE);
  return (
    <div style={{ blockSize: "36rem" }} data-assistant-story="">
      <AssistantPanel open={open} onClose={() => setOpen(false)} panel={<Conversation {...chat} />}>
        <div style={{ padding: "var(--piq-space-4)" }}><h1>Acme v Beta</h1><p>Matter details.</p><Button onClick={() => setOpen(true)}>Ask the assistant</Button></div>
      </AssistantPanel>
    </div>
  );
}
export const InAPanel = { render: () => <PanelDemo /> };

function AiSdkDemo() {
  const chat = useFakeChat(AI_SDK_SAMPLE);
  const props = useAiSdkConversation(chat, { describeApproval: () => "Create bill B-1044 for Acme v Beta, £12,400?" });
  return <Frame><Conversation {...props} /></Frame>;
}
export const OnTheAiSdk = { render: () => <AiSdkDemo /> };

function AssistantUiDemo() {
  const thread = useMemo(() => fakeThread(ASSISTANT_UI_SAMPLE), []);
  const props = useAssistantUiConversation(thread);
  return <Frame><Conversation {...props} /></Frame>;
}
export const OnAssistantUi = { render: () => <AssistantUiDemo /> };

const SAMPLE_PARTS = SAMPLE[1].parts;
export const MarkdownReply = { render: () => <Markdown text={"A reply with `inline code`, a [link](https://example.com) and code:\n\n```js\nconst total = hours * rate;\n```\n\n<script>alert(1)</script><img src=x onerror=alert(1)>"} /> };
export const ReasoningPart = { render: () => <Reasoning text={SAMPLE_PARTS[0].text} seconds={6} /> };
export const ToolCallsPart = { render: () => <ToolCalls calls={[...SAMPLE_PARTS.slice(1, 3), { id: "t3", name: "send_bill", title: "Sending bill", status: "running" }]} /> };
export const OneToolCall = { render: () => <ol className="piq-tool-calls"><ToolCall name="lookup_time" title="Looked up time entries" status="failed" error="The time service did not answer." /></ol> };
export const SourcesPart = { render: () => <Sources sources={SAMPLE_PARTS[4].sources} /> };
export const Approval = { render: () => <ApprovalCard summary="Create bill B-1044 for Acme v Beta, £12,400?" details="The bill is created as a draft." onDecide={() => {}} /> };
export const GeneratedTable = { render: () => <GenerativeComponent component="DataTable" props={GENERATED[1].parts[1].props} /> };
function FormDemo() { const [values, setValues] = useState({}); const [sent, setSent] = useState(null); return <InlineForm {...GENERATED[1].parts[2].props} values={values} onValuesChange={setValues} onSubmit={setSent} submitted={sent} />; }
export const InlineFormPart = { render: () => <FormDemo /> };
