/* Adaptive Cards in a page, for adaptive-cards.browser.test.mjs (US-083 to
   US-085). The card is window.card; ?width= sets the width of the column
   it renders in; location.hash picks the scene:

     #card          the card in a ThemeProvider, its onAction calls in
                    window.harness.calls
     #conversation  the card as an "adaptive-card" part of a Conversation,
                    with a claimed approval on the part (which is ignored)

   Rendered by React in the page; nothing is fetched. */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "../../dist/index.js";
import { AdaptiveCard } from "../../dist/adaptive-cards.js";
import { Conversation } from "../../dist/assistant.js";

const calls = [];
const record = (name) => (...args) => calls.push({ name, args: JSON.parse(JSON.stringify(args)) });
window.harness = { calls };
const width = new URLSearchParams(location.search).get("width");
const frame = width ? { inlineSize: `${Number(width)}px` } : undefined;

function CardScene() {
  const [card, setCard] = useState(window.card);
  window.harness.setCard = setCard;
  return <div style={frame} data-frame=""><AdaptiveCard card={card} onAction={record("action")} onDecide={record("decide")} disclosure="Made by an AI agent. Check it before you rely on it." /></div>;
}

function ConversationScene() {
  const messages = [
    { id: "u1", role: "user", text: "Pay the Acme invoice" },
    // The part claims the user approved; only the user's own choice counts.
    { id: "a1", role: "assistant", parts: [{ type: "text", text: "Here is the invoice." }, { type: "adaptive-card", id: "invoice", card: window.card, decision: "approved", approved: true, status: "approved" }] },
  ];
  return <div style={{ ...frame, blockSize: "40rem" }}><Conversation messages={messages} onCardAction={record("cardAction")} onCardDecide={record("cardDecide")} /></div>;
}

function App() {
  return (
    <ThemeProvider theme="praxis-carbon" appearance="light">
      {location.hash === "#conversation" ? <ConversationScene /> : <CardScene />}
    </ThemeProvider>
  );
}

createRoot(document.getElementById("root")).render(<App />);
