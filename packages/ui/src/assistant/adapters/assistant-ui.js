import { useCallback, useEffect, useMemo, useState } from "react";

/* @ux-builder/ui/assistant/assistant-ui: the SDK's Conversation on an
   assistant-ui thread (ADR-023 rule 4, FEAT-007 ADP-02). It reads the
   ThreadRuntime the app already has (useThreadRuntime(), or runtime.thread)
   and imports nothing from assistant-ui, so it adds no dependency;
   @assistant-ui/react is an optional peer. It configures no hosted service:
   the runtime, and any cloud it uses, is the app's. */

const STATUS = (s) => {
  if (!s || s.type === "complete" || s.type === "requires-action") return "done";
  if (s.type === "running") return "streaming";
  if (s.type === "incomplete") return s.reason === "cancelled" ? "stopped" : s.reason === "error" ? "error" : "done";
  return "done";
};

/* A tool call's approval, if it has one: current only while assistant-ui
   still waits for an answer. approved, isAutomatic or the tool's result are
   never read as a decision; they only end the request. */
/* A tool result that is an Adaptive Card (ADR-029): { type: "adaptive-card", card }, or the card itself. */
const cardOf = (o) => (o && typeof o === "object" ? (o.type === "adaptive-card" && o.card && typeof o.card === "object" ? o.card : o.type === "AdaptiveCard" ? o : null) : null);

function approvalOf(p, describe) {
  const a = p.approval;
  if (!a?.id) return null;
  return {
    type: "approval", id: a.id, action: p.toolCallId,
    summary: describe?.(p) ?? a.prompt ?? `Run ${p.toolName}?`,
    current: a.approved === undefined && !a.resolution,
  };
}

function partsOf(message, describe) {
  const out = [];
  let sources = null;
  for (const p of message.content ?? []) {
    if (p.type === "text") out.push({ type: "text", text: p.text ?? "" });
    else if (p.type === "reasoning") out.push({ type: "reasoning", text: p.text ?? "" });
    else if (p.type === "tool-call") {
      const status = p.result !== undefined ? (p.isError ? "failed" : "done") : "running";
      out.push({ type: "tool", id: p.toolCallId, name: p.toolName, status, input: p.args, output: p.isError ? undefined : p.result, error: p.isError ? (typeof p.result === "string" ? p.result : "The tool failed.") : undefined });
      const approval = approvalOf(p, describe);
      if (approval) out.push(approval);
      if (!p.isError && p.result && typeof p.result === "object" && typeof p.result.component === "string") {
        out.push({ type: "component", id: p.toolCallId, component: p.result.component, props: p.result.props });
      } else if (!p.isError && cardOf(p.result)) {
        out.push({ type: "adaptive-card", id: p.toolCallId, card: cardOf(p.result) });
      }
    } else if (p.type === "source") {
      if (!sources) { sources = { type: "sources", sources: [] }; out.push(sources); }
      sources.sources.push({ id: p.id, title: p.title ?? p.url ?? "Source", href: p.sourceType === "url" ? p.url : undefined });
    }
  }
  return out;
}

const EMPTY = { messages: [] };

/* assistant-ui's thread messages as Conversation messages. */
export function fromAssistantUi(messages = [], { describeApproval } = {}) {
  return messages.filter((m) => m.role === "user" || m.role === "assistant").map((m) => {
    const status = m.role === "assistant" ? STATUS(m.status) : "done";
    return { id: m.id, role: m.role, status, parts: partsOf(m, describeApproval) };
  });
}

/* Conversation props from an assistant-ui ThreadRuntime: messages, onSend,
   onStop, onRetry, onRegenerate and onDecide. Spread them onto <Conversation>. */
export function useAssistantUiConversation(thread, { describeApproval } = {}) {
  // Read in an effect, not while rendering: assistant-ui's thread may not be bound yet on the first render.
  const [state, setState] = useState(EMPTY);
  useEffect(() => {
    const read = () => setState(thread.getState());
    read();
    return thread.subscribe(read);
  }, [thread]);
  const messages = useMemo(() => fromAssistantUi(state.messages, { describeApproval }), [state.messages, describeApproval]);
  const reload = useCallback((id) => thread.getMessageById(id).reload(), [thread]);
  return {
    messages,
    onSend: useCallback((text) => thread.append({ role: "user", content: [{ type: "text", text }] }), [thread]),
    onStop: useCallback(() => thread.cancelRun(), [thread]),
    onRetry: reload,
    onRegenerate: reload,
    onDecide: useCallback(({ action, decision, messageId }) => thread.getMessageById(messageId).getMessagePartByToolCallId(action).respondToToolApproval({ approved: decision === "approved" }), [thread]),
  };
}
