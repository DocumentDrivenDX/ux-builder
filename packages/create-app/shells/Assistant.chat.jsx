import { useState } from "react";
import { Conversation } from "@ux-builder/ui/assistant";

/* The app's assistant (docs/ux-builder/blueprint/app.blueprint.json, screen "assistant"): the SDK's
   Conversation, empty, with its composer and AI disclosure. No runtime is
   connected yet: connect one with useAiSdkConversation(chat) from
   "@ux-builder/ui/assistant/ai-sdk", or useAssistantUiConversation(thread)
   from "@ux-builder/ui/assistant/assistant-ui", and pass what it returns to
   Conversation. Until then, each message is answered with a note saying so. */
const NOT_CONNECTED = "No assistant is connected to this app yet. Connect a runtime in src/Assistant.jsx to answer here.";
const SUGGESTIONS = ["What can this app do?"];

let last = 0;
const nextId = () => `message-${++last}`;

export function Assistant() {
  const [messages, setMessages] = useState([]);
  const send = (text) => setMessages((m) => [...m, { id: nextId(), role: "user", text }, { id: nextId(), role: "assistant", text: NOT_CONNECTED }]);
  return (
    <div className="assistant-screen" data-piq-screen="assistant">
      <Conversation messages={messages} onSend={send} suggestions={messages.length ? [] : SUGGESTIONS} />
    </div>
  );
}
