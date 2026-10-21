/* The assistant in a page, for assistant.browser.test.mjs (US-046 to
   US-048). location.hash picks the scene:

     #demo       a conversation on a stand-in runtime that streams, fails on
                 the third request and retries
     #harness    a conversation whose messages the test sets
                 (window.harness.set) and whose callbacks it reads
                 (window.harness.calls)
     #panel      the assistant panel beside a page

   Rendered by React in the page; nothing is fetched. */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AssistantPanel, Conversation } from "../../dist/assistant.js";
import { SAMPLE, useDemoConversation } from "../../src/assistant/story-data.js";

const calls = [];
const record = (name) => (...args) => calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
window.harness = { calls };

function Demo() {
  const chat = useDemoConversation([], { interval: Number(new URLSearchParams(location.search).get("interval") ?? 40) });
  const wrap = (name, fn) => (...a) => { record(name)(...a); return fn(...a); };
  return <Conversation {...chat} onSend={wrap("send", chat.onSend)} onStop={wrap("stop", chat.onStop)} onRetry={wrap("retry", chat.onRetry)}
    suggestions={["Summarise the last three filings", "When is the hearing?", "Draft a bill"]} />;
}

function Harness() {
  const [messages, setMessages] = useState(window.initialMessages ?? SAMPLE);
  const [extra, setExtra] = useState({});
  useEffect(() => { window.harness.set = setMessages; window.harness.props = setExtra; }, []);
  return <Conversation messages={messages} onSend={record("send")} onStop={record("stop")} onRetry={record("retry")} onRegenerate={record("regenerate")}
    onDecide={record("decide")} onComponentSubmit={record("submit")} {...extra} />;
}

function Panel() {
  const [open, setOpen] = useState(false);
  return (
    <AssistantPanel open={open} onClose={() => setOpen(false)} panel={<Conversation messages={SAMPLE} onSend={record("send")} />}>
      <main><h1>Acme v Beta</h1><button id="open-assistant" type="button" onClick={() => setOpen(true)}>Ask the assistant</button></main>
    </AssistantPanel>
  );
}

const scene = location.hash.slice(1) || "demo";
const App = { demo: Demo, harness: Harness, panel: Panel }[scene];
createRoot(document.getElementById("root")).render(<div style={{ blockSize: "100dvh" }}><App /></div>);
