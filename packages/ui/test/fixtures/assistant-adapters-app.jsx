/* The same Conversation on the two runtimes' real code, for
   assistant.browser.test.mjs (US-046-AC8, AC9): #ai-sdk drives it with the
   AI SDK's own chat (AbstractChat from "ai", what useChat wraps) and
   #assistant-ui with assistant-ui's own local runtime (useLocalRuntime).
   Each gets a model that answers from memory, word by word, so the test
   sees streaming, Stop and approvals with default settings and no network.
   The app's transport and model are the only things the app writes. */
import { AbstractChat } from "ai";
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Conversation } from "../../dist/assistant.js";
import { useAiSdkConversation } from "../../dist/assistant-ai-sdk.js";
import { useAssistantUiConversation } from "../../dist/assistant-assistant-ui.js";

const REPLY = "The hearing is listed for 14 November and the bundle is due a week before it.".split(" ");
const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("Aborted", "AbortError")); });
});
const STEP = 60;

/* ---------------------------------------------------------------- AI SDK */

class State {
  constructor() { this._messages = []; this._status = "ready"; this._error = undefined; this.subs = new Set(); }
  emit() { for (const s of this.subs) s(); }
  get messages() { return this._messages; }
  set messages(v) { this._messages = v; this.emit(); }
  get status() { return this._status; }
  set status(v) { this._status = v; this.emit(); }
  get error() { return this._error; }
  set error(v) { this._error = v; this.emit(); }
  pushMessage = (m) => { this.messages = [...this._messages, m]; };
  popMessage = () => { this.messages = this._messages.slice(0, -1); };
  replaceMessage = (i, m) => { this.messages = this._messages.map((x, j) => (j === i ? m : x)); };
  snapshot = (x) => structuredClone(x);
}
class Chat extends AbstractChat {
  constructor(opts) { const state = new State(); super({ ...opts, state }); this.store = state; }
}

// The transport the app writes: here a model that answers in memory. The first request asks to create a bill, behind an approval.
const transport = {
  async sendMessages({ messages, abortSignal }) {
    const last = messages.at(-1);
    const approved = last?.role === "assistant" && last.parts.some((p) => p.state === "approval-responded");
    return new ReadableStream({
      async start(c) {
        try {
          c.enqueue({ type: "start" });
          if (approved) {
            c.enqueue({ type: "tool-output-available", toolCallId: "call-bill", output: { bill: "B-1044" } });
            c.enqueue({ type: "finish" }); c.close(); return;
          }
          const text = (last?.parts?.find((p) => p.type === "text")?.text ?? "");
          if (/bill/i.test(text)) {
            c.enqueue({ type: "tool-input-available", toolCallId: "call-bill", toolName: "create_bill", input: { matter: "Acme v Beta", total: 12400 } });
            c.enqueue({ type: "tool-approval-request", approvalId: "approval-bill", toolCallId: "call-bill" });
            c.enqueue({ type: "finish" }); c.close(); return;
          }
          c.enqueue({ type: "text-start", id: "t" });
          for (const w of REPLY) { await sleep(STEP, abortSignal); c.enqueue({ type: "text-delta", id: "t", delta: `${w} ` }); }
          c.enqueue({ type: "text-end", id: "t" });
          c.enqueue({ type: "finish" });
          c.close();
        } catch (e) { c.error(e); }
      },
    });
  },
  async reconnectToStream() { return null; },
};

function useChat(chat) {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); chat.store.subs.add(f); return () => chat.store.subs.delete(f); }, [chat]);
  return {
    messages: chat.messages, status: chat.status, error: chat.error,
    sendMessage: (m) => chat.sendMessage(m), stop: () => chat.stop(), regenerate: (o) => chat.regenerate(o),
    addToolApprovalResponse: (o) => chat.addToolApprovalResponse(o),
  };
}

function AiSdk() {
  const chat = useMemo(() => new Chat({ transport }), []);
  window.aiSdkChat = chat;
  const props = useAiSdkConversation(useChat(chat), { describeApproval: () => "Create bill B-1044 for Acme v Beta, £12,400?" });
  return <Conversation {...props} />;
}

/* ---------------------------------------------------------- assistant-ui */

const model = {
  async *run({ abortSignal }) {
    let text = "";
    for (const w of REPLY) {
      await sleep(STEP, abortSignal);
      text += `${w} `;
      yield { content: [{ type: "text", text }] };
    }
  },
};

function Thread({ thread }) {
  const props = useAssistantUiConversation(thread);
  return <Conversation {...props} />;
}
function AssistantUi() {
  const runtime = useLocalRuntime(model);
  window.assistantUiThread = runtime.thread;
  return <AssistantRuntimeProvider runtime={runtime}><Thread thread={runtime.thread} /></AssistantRuntimeProvider>;
}

const App = { "ai-sdk": AiSdk, "assistant-ui": AssistantUi }[location.hash.slice(1)];
createRoot(document.getElementById("root")).render(<div style={{ blockSize: "100dvh" }}><App /></div>);
