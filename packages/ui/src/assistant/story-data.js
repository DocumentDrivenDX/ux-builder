import { useCallback, useEffect, useRef, useState } from "react";

/* Sample conversations and stand-in runtimes for the assistant's stories,
   the builder's Assistant screen and the browser tests. Nothing here is part
   of @ux-builder/ui/assistant, and nothing is fetched: replies come from a
   timer. */

export const BILL = "Create bill B-1044 for Acme v Beta, £12,400";

/* A finished exchange with every part: reasoning, tool calls, cited sources, an approval and an artifact. */
export const SAMPLE = [
  { id: "u1", role: "user", text: "Draft a bill for Acme v Beta for October" },
  {
    id: "a1", role: "assistant", parts: [
      { type: "reasoning", text: "The user wants October's bill. I need the time entries and the engagement letter's rates.", seconds: 6 },
      { type: "tool", id: "t1", name: "lookup_time", title: "Looked up time entries", status: "done", input: { matter: "Acme v Beta", month: "2026-10" }, output: { entries: 31, hours: 27.5 } },
      { type: "tool", id: "t2", name: "calculate_fees", title: "Calculated fees", status: "done", input: { hours: 27.5, rate: 450 }, output: { total: 12400 } },
      { type: "text", text: "October has **27.5 hours** across 31 entries [1], billed at the agreed rate of £450 an hour [2]. The total is £12,400.\n\nSee the [billing guide](https://example.com/billing) for how rates are set." },
      { type: "sources", sources: [{ id: "s1", title: "Time entries, October", href: "https://example.com/time/october" }, { id: "s2", title: "Engagement letter" }] },
      { type: "approval", id: "ap1", action: "create-bill", summary: `${BILL}?`, details: "The bill is created as a draft and sent to the partner for review." },
      { type: "artifact", id: "art1", title: "Draft bill B-1044", content: "## Acme v Beta\n\n- Professional fees: £12,400\n- Hours: 27.5\n\nPayable within 30 days." },
    ],
  },
];

/* Replies a generated table, an inline form, and a request the conversation refuses. */
export const GENERATED = [
  { id: "u1", role: "user", text: "Show October's fees" },
  {
    id: "a1", role: "assistant", parts: [
      { type: "text", text: "Here are October's fees by matter." },
      { type: "component", id: "fees", component: "DataTable", props: { caption: "Fees, October", columns: [{ key: "matter", label: "Matter", sortable: true }, { key: "fees", label: "Fees (£)", numeric: true, sortable: true }], rows: [{ id: "1", matter: "Acme v Beta", fees: 12400 }, { id: "2", matter: "Globex", fees: 3100 }, { id: "3", matter: "Initech", fees: 8800 }] } },
      { type: "component", id: "contact", component: "InlineForm", props: { title: "Who should receive the bill?", submitLabel: "Use these details", fields: [{ name: "name", label: "Name", value: "R. Lee" }, { name: "email", label: "Email" }, { name: "copy", label: "Copy the partner", type: "checkbox" }] } },
      { type: "component", id: "frame", component: "<iframe>", props: { src: "https://example.com" } },
    ],
  },
];

const REPLIES = [
  "The last three filings are the **defence** (2 October), the **reply** (9 October) and a **witness statement** (16 October). Each is on the matter's documents tab.",
  "The hearing is listed for 14 November. The court asked for the bundle a week before, by 7 November, and the skeleton argument two days before.",
];

/* A stand-in runtime: each send streams a canned reply word by word; the
   third fails, and Retry then succeeds. Stop keeps what has arrived. */
export function useDemoConversation(initial = [], { interval = 60, failOn = 3 } = {}) {
  const [messages, setMessages] = useState(initial);
  const timer = useRef(null), sends = useRef(0);
  const stopTimer = () => { clearInterval(timer.current); timer.current = null; };
  useEffect(() => stopTimer, []);
  const stream = useCallback((id, text) => {
    const words = text.split(" ");
    let n = 0;
    stopTimer();
    timer.current = setInterval(() => {
      n++;
      const done = n >= words.length;
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, text: words.slice(0, n).join(" "), status: done ? "done" : "streaming" } : m)));
      if (done) stopTimer();
    }, interval);
  }, [interval]);
  const reply = useCallback((id) => {
    sends.current++;
    if (sends.current === failOn) {
      setMessages((ms) => [...ms.filter((m) => m.id !== id), { id, role: "assistant", text: "", status: "streaming" }]);
      setTimeout(() => setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, status: "error", error: "The assistant could not reply. Try again." } : m))), interval * 3);
      return;
    }
    setMessages((ms) => [...ms.filter((m) => m.id !== id), { id, role: "assistant", text: "", status: "streaming" }]);
    stream(id, REPLIES[sends.current % REPLIES.length]);
  }, [failOn, interval, stream]);
  return {
    messages,
    onSend: (text) => {
      const n = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setMessages((ms) => [...ms, { id: `u-${n}`, role: "user", text }]);
      reply(`a-${n}`);
    },
    onStop: () => {
      stopTimer();
      setMessages((ms) => ms.map((m) => (m.status === "streaming" ? { ...m, status: "stopped" } : m)));
    },
    onRetry: (id) => reply(id),
    onRegenerate: (id) => reply(id),
  };
}

/* A stand-in for useChat() (@ai-sdk/react): AI SDK UI messages, streamed. */
export function useFakeChat(initial = []) {
  const [messages, setMessages] = useState(initial);
  const [status, setStatus] = useState("ready");
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  const run = (id) => {
    const words = REPLIES[0].split(" ");
    let n = 0;
    setStatus("streaming");
    setMessages((ms) => [...ms, { id, role: "assistant", parts: [{ type: "text", text: "" }] }]);
    timer.current = setInterval(() => {
      n++;
      setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, parts: [{ type: "text", text: words.slice(0, n).join(" ") }] } : m)));
      if (n >= words.length) { clearInterval(timer.current); setStatus("ready"); }
    }, 60);
  };
  return {
    messages, status, error: undefined,
    sendMessage: ({ text }) => { const n = Date.now().toString(36); setMessages((ms) => [...ms, { id: `u-${n}`, role: "user", parts: [{ type: "text", text }] }]); run(`a-${n}`); },
    stop: () => { clearInterval(timer.current); setStatus("ready"); },
    regenerate: () => { setMessages((ms) => (ms.at(-1)?.role === "assistant" ? ms.slice(0, -1) : ms)); run(`a-${Date.now().toString(36)}`); },
    addToolApprovalResponse: ({ id, approved }) => setMessages((ms) => ms.map((m) => ({ ...m, parts: m.parts.map((p) => (p.approval?.id === id ? { ...p, state: approved ? "approval-responded" : "output-denied", approval: { ...p.approval, approved } } : p)) }))),
  };
}

export const AI_SDK_SAMPLE = [
  { id: "u1", role: "user", parts: [{ type: "text", text: "Draft a bill for Acme v Beta for October" }] },
  { id: "a1", role: "assistant", parts: [
    { type: "reasoning", text: "Find the hours, then the rate." },
    { type: "tool-lookup_time", toolCallId: "t1", state: "output-available", input: { month: "2026-10" }, output: { hours: 27.5 } },
    { type: "text", text: "October has 27.5 hours [1]." },
    { type: "source-url", sourceId: "s1", url: "https://example.com/time/october", title: "Time entries, October" },
    { type: "tool-create_bill", toolCallId: "t2", state: "approval-requested", input: { matter: "Acme v Beta", total: 12400 }, approval: { id: "ap1" } },
  ] },
];

/* A stand-in for assistant-ui's ThreadRuntime: getState, subscribe and the methods the adapter calls. */
export function fakeThread(initial = []) {
  let state = { messages: initial, isRunning: false };
  const subs = new Set();
  let timer = null;
  const set = (next) => { state = { ...state, ...next }; for (const s of subs) s(); };
  const edit = (id, fn) => set({ messages: state.messages.map((m) => (m.id === id ? fn(m) : m)) });
  const run = () => {
    const id = `a-${Date.now().toString(36)}`, words = REPLIES[1].split(" ");
    let n = 0;
    set({ isRunning: true, messages: [...state.messages, { id, role: "assistant", content: [{ type: "text", text: "" }], status: { type: "running" } }] });
    timer = setInterval(() => {
      n++;
      const done = n >= words.length;
      edit(id, (m) => ({ ...m, content: [{ type: "text", text: words.slice(0, n).join(" ") }], status: done ? { type: "complete", reason: "stop" } : { type: "running" } }));
      if (done) { clearInterval(timer); set({ isRunning: false }); }
    }, 60);
  };
  const thread = {
    getState: () => state,
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
    append: ({ content }) => { set({ messages: [...state.messages, { id: `u-${Date.now().toString(36)}`, role: "user", content, status: { type: "complete", reason: "unknown" } }] }); run(); },
    cancelRun: () => {
      clearInterval(timer);
      set({ isRunning: false, messages: state.messages.map((m) => (m.status?.type === "running" ? { ...m, status: { type: "incomplete", reason: "cancelled" } } : m)) });
    },
    getMessageById: (id) => ({
      reload: () => { set({ messages: state.messages.filter((m) => m.id !== id) }); run(); },
      getMessagePartByToolCallId: (toolCallId) => ({
        respondToToolApproval: async ({ approved }) => edit(id, (m) => ({ ...m, content: m.content.map((p) => (p.toolCallId === toolCallId ? { ...p, approval: { ...p.approval, approved } } : p)) })),
      }),
    }),
  };
  return thread;
}

export const ASSISTANT_UI_SAMPLE = [
  { id: "u1", role: "user", content: [{ type: "text", text: "When is the hearing?" }], status: { type: "complete", reason: "unknown" } },
  { id: "a1", role: "assistant", status: { type: "requires-action", reason: "tool-calls" }, content: [
    { type: "tool-call", toolCallId: "t1", toolName: "find_hearing", args: { matter: "Acme v Beta" }, argsText: "", result: { date: "2026-11-14" } },
    { type: "text", text: "The hearing is on 14 November [1]." },
    { type: "source", sourceType: "url", id: "s1", url: "https://example.com/listing", title: "Court listing" },
    { type: "tool-call", toolCallId: "t2", toolName: "add_to_calendar", args: { date: "2026-11-14" }, argsText: "", approval: { id: "ap2", prompt: "Add the hearing on 14 November to your calendar?" } },
  ] },
];
