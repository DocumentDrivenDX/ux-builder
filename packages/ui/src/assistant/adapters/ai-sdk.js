import { useCallback, useMemo, useState } from "react";

/* @ux-builder/ui/assistant/ai-sdk: the SDK's Conversation on the AI SDK's
   chat (ADR-023 rule 4, FEAT-007 ADP-02). It reads the object useChat()
   returns (@ai-sdk/react, AI SDK 5 or later) and imports nothing from the
   AI SDK, so it adds no dependency; ai is an optional peer. It makes no
   request of its own: the chat's transport is the app's. */

const toolName = (p) => (p.type === "dynamic-tool" ? p.toolName : p.type.slice(5));
const TOOL_STATUS = {
  "input-streaming": "running", "input-available": "running", "approval-requested": "running", "approval-responded": "running",
  "output-available": "done", "output-error": "failed", "output-denied": "failed",
};

/* A tool part's approval, if it has one. Only approval-requested waits for
   the user: every other state makes the request not current. Its approved
   field, isAutomatic or the tool's output are never read as a decision. */
function approvalOf(p, describe) {
  if (!p.approval?.id) return null;
  return {
    type: "approval", id: p.approval.id, action: p.toolCallId,
    summary: describe?.(p) ?? `Run ${p.title ?? toolName(p)}?`,
    details: typeof p.approval.requestReason === "string" ? p.approval.requestReason : undefined,
    current: p.state === "approval-requested",
  };
}

function partsOf(message, describe) {
  const out = [];
  let sources = null;
  for (const p of message.parts ?? []) {
    if (p.type === "text") out.push({ type: "text", text: p.text ?? "" });
    else if (p.type === "reasoning") {
      if (out.at(-1)?.type === "reasoning") out.at(-1).text += p.text ?? "";
      else out.push({ type: "reasoning", text: p.text ?? "" });
    } else if (p.type === "dynamic-tool" || p.type.startsWith("tool-")) {
      const status = TOOL_STATUS[p.state] ?? "running";
      out.push({ type: "tool", id: p.toolCallId, name: toolName(p), title: p.title, status, input: p.input, output: p.state === "output-available" ? p.output : undefined, error: p.state === "output-denied" ? "Not run: it was denied." : p.errorText });
      const approval = approvalOf(p, describe);
      if (approval) out.push(approval);
      if (p.state === "output-available" && p.output && typeof p.output === "object" && typeof p.output.component === "string") {
        out.push({ type: "component", id: p.toolCallId, component: p.output.component, props: p.output.props });
      }
    } else if (p.type === "source-url" || p.type === "source-document") {
      if (!sources) { sources = { type: "sources", sources: [] }; out.push(sources); }
      sources.sources.push({ id: p.sourceId, title: p.title ?? p.filename ?? p.url ?? "Source", href: p.type === "source-url" ? p.url : undefined });
    }
  }
  return out;
}

/* The AI SDK's UI messages as Conversation messages. status and error are
   the chat's; stopped is the set of message ids the user stopped. */
export function fromAiSdk(messages = [], { status = "ready", error, stopped = new Set(), describeApproval } = {}) {
  const out = messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({ id: m.id, role: m.role, parts: partsOf(m, describeApproval), status: "done" }));
  const last = out.at(-1);
  const working = status === "submitted" || status === "streaming";
  if ((working || status === "error") && last?.role === "user") out.push({ id: `${last.id}:reply`, role: "assistant", parts: [], status: "done", pending: true });
  const reply = out.at(-1);
  if (reply?.role === "assistant") {
    if (working) reply.status = "streaming";
    else if (status === "error") reply.status = "error";
  }
  for (const m of out) if (stopped.has(m.id) && m.status !== "streaming") m.status = "stopped";
  return out;
}

/* Conversation props from the AI SDK chat that useChat returns: messages, onSend, onStop,
   onRetry, onRegenerate and onDecide. Spread them onto <Conversation>. */
export function useAiSdkConversation(chat, { describeApproval } = {}) {
  const [stopped, setStopped] = useState(() => new Set());
  const messages = useMemo(() => fromAiSdk(chat.messages, { status: chat.status, error: chat.error, stopped, describeApproval }), [chat.messages, chat.status, chat.error, stopped, describeApproval]);
  const onStop = useCallback(() => {
    const reply = messages.at(-1);
    if (reply?.role === "assistant" && !reply.pending) setStopped((s) => new Set(s).add(reply.id));
    chat.stop?.();
  }, [chat, messages]);
  const regenerate = useCallback((id) => {
    const m = messages.find((x) => x.id === id);
    chat.regenerate?.(m && !m.pending ? { messageId: id } : undefined);
  }, [chat, messages]);
  return {
    messages,
    onSend: useCallback((text) => chat.sendMessage?.({ text }), [chat]),
    onStop,
    onRetry: regenerate,
    onRegenerate: regenerate,
    onDecide: useCallback(({ id, decision }) => chat.addToolApprovalResponse?.({ id, approved: decision === "approved" }), [chat]),
  };
}
