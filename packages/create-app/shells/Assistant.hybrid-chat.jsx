import { useState } from "react";
import { Conversation } from "@ux-builder/ui/assistant";

/* The app's assistant (app.blueprint.json, screen "assistant"): the SDK's
   Conversation, empty, with its composer and AI disclosure. Its replies may
   carry Adaptive Cards ({ type: "adaptive-card", card } parts), drawn with
   SDK widgets in the app's theme; their actions arrive at onCardAction. Check
   each card before the agent sends it (checkCard from
   "@ux-builder/ui/adaptive-cards", or the MCP tool check_card).

   No runtime is connected yet: connect one with useAiSdkConversation(chat)
   from "@ux-builder/ui/assistant/ai-sdk", or useAssistantUiConversation(thread)
   from "@ux-builder/ui/assistant/assistant-ui", and pass what it returns to
   Conversation. Until then, each message is answered with a card saying so. */
const NOT_CONNECTED = {
  type: "AdaptiveCard",
  version: "1.6",
  body: [
    { type: "TextBlock", text: "No assistant is connected yet", style: "heading", wrap: true },
    { type: "TextBlock", text: "Connect a runtime in src/Assistant.jsx to answer here. Replies can include Adaptive Cards like this one, drawn in the app's theme.", wrap: true },
  ],
};
const SUGGESTIONS = ["What can this app do?"];

let last = 0;
const nextId = () => `message-${++last}`;

export function Assistant() {
  const [messages, setMessages] = useState([]);
  const send = (text) => setMessages((m) => [...m, { id: nextId(), role: "user", text },
    { id: nextId(), role: "assistant", parts: [{ type: "adaptive-card", card: NOT_CONNECTED }] }]);
  return (
    <div className="assistant-screen" data-piq-screen="assistant">
      <Conversation messages={messages} onSend={send} onCardAction={() => {}} suggestions={messages.length ? [] : SUGGESTIONS} />
    </div>
  );
}
