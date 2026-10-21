/* @ux-builder/ui/assistant: the SDK's own assistant patterns (ADR-023
   rule 4): a conversation, its composer, streaming, stop and retry,
   reasoning, tool calls, sources, approvals, artifacts, and generated UI
   limited to the catalogue's renderable components. They take messages and
   callbacks as props and import no AI library; connect one with
   @ux-builder/ui/assistant/ai-sdk or @ux-builder/ui/assistant/assistant-ui.
   Styled by @ux-builder/ui/patterns.css. */

export { AssistantPanel, Conversation } from "./Conversation.jsx";
export { Markdown } from "./Markdown.jsx";
export { ApprovalCard, Reasoning, Sources, ToolCall, ToolCalls } from "./Parts.jsx";
export { GenerativeComponent, InlineForm } from "./Generative.jsx";
export { RENDERABLE, checkRenderable } from "./schema.js";
