import { useState } from "react";
import { Conversation } from "../assistant/Conversation.jsx";
import { AdaptiveCard } from "./AdaptiveCard.jsx";
import { checkCard } from "../../adaptive-cards/check.mjs";
import { CLEAN, COLUMNS, DESTRUCTIVE, EVERY_ELEMENT, MARKUP, NEWER, PAY_INVOICE, PICTURE } from "./story-data.js";
import expenseReport from "../../test/fixtures/adaptive-cards/samples/v1.5-Scenarios-ExpenseReport.json";
import flightItinerary from "../../test/fixtures/adaptive-cards/samples/v1.5-Scenarios-FlightItinerary.json";
import inputsWithValidation from "../../test/fixtures/adaptive-cards/samples/v1.5-Scenarios-InputsWithValidation.json";
import foodOrder from "../../test/fixtures/adaptive-cards/samples/v1.5-Scenarios-FoodOrder.json";

/* Adaptive Cards (ADR-029): cards an agent sends, drawn with the SDK's own
   components in the theme the toolbar picks. The official samples are
   Microsoft's (MIT), with their images swapped for an inline one, so
   nothing is fetched. */
export default { title: "Patterns/Adaptive Cards", component: AdaptiveCard, parameters: { layout: "padded" } };

const DISCLOSURE = "Made by an AI agent. Check it before you rely on it.";
const Frame = ({ children, width = "40rem" }) => <div style={{ maxInlineSize: width }} data-adaptive-card-story="">{children}</div>;
const offline = (card) => JSON.parse(JSON.stringify(card), function (k, v) {
  return typeof v === "string" && /^https?:/.test(v) && ((k === "url" && this.type !== "Action.OpenUrl" && !this.mimeType) || k === "iconUrl" || k === "poster" || k === "backgroundImage") ? PICTURE : v;
});

/* The card, with what onAction received below it. */
function Demo({ card, width }) {
  const [last, setLast] = useState(null);
  return (
    <Frame width={width}>
      <AdaptiveCard card={card} onAction={setLast} disclosure={DISCLOSURE} />
      <p className="piq-adaptive-card__notice" aria-live="polite">{last ? `onAction: ${JSON.stringify(last)}` : "No action yet."}</p>
    </Frame>
  );
}

export const PayInvoice = { render: () => <Demo card={PAY_INVOICE} /> };
export const EveryElement = { render: () => <Demo card={EVERY_ELEMENT} /> };
export const Clean = { render: () => <Demo card={CLEAN} /> };
export const DestructiveAction = { render: () => <Demo card={DESTRUCTIVE} /> };
export const CompactColumns = { render: () => <Demo card={COLUMNS} width="22.5rem" /> };
export const TextNotHtml = { render: () => <Demo card={MARKUP} /> };
export const NewerVersion = { render: () => <Demo card={NEWER} /> };
export const OfficialSamples = {
  render: () => (
    <div style={{ display: "grid", gap: "var(--piq-space-5)" }}>
      {[expenseReport, flightItinerary, inputsWithValidation, foodOrder].map((c, i) => <Demo key={i} card={offline(c)} />)}
    </div>
  ),
};

/* What checkCard says about a draft an agent is about to send. */
const DRAFT = {
  type: "AdaptiveCard", version: "1.6",
  body: [{ type: "TextBlock", text: "Order" }, { type: "Input.Text", id: "q", placeholder: "Quantity" }, { type: "ColumnSet", columns: [1, 2, 3, 4].map((n) => ({ type: "Column", items: [{ type: "TextBlock", text: `Column ${n}`, wrap: true }] })) }],
  actions: Array.from({ length: 7 }, (_, i) => ({ type: "Action.Submit", title: `Option ${i + 1}` })),
};
export const CheckedDraft = {
  render: () => (
    <Frame>
      <ul className="piq-adaptive-card__list">{checkCard(DRAFT).map((f, i) => <li key={i}><code>{f.rule}</code> {f.path || "(card)"}: {f.message}</li>)}</ul>
    </Frame>
  ),
};

/* A card in a conversation: the user's choice on it is kept with the message. */
export const InAConversation = {
  render: () => (
    <div style={{ blockSize: "40rem", maxInlineSize: "48rem" }}>
      <Conversation messages={[
        { id: "u1", role: "user", text: "Pay the Acme invoice" },
        { id: "a1", role: "assistant", parts: [{ type: "text", text: "Here is the invoice. Check the amount before you pay." }, { type: "adaptive-card", id: "invoice", card: PAY_INVOICE }] },
      ]} onCardAction={() => {}} />
    </div>
  ),
};
