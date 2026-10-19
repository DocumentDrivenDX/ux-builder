import { Suggestion, Suggestions } from "../vendor/ai-elements/suggestion";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Suggestion", component: Suggestions, parameters: { library: "AI Elements", layout: "padded" } };

export const Starters = { render: () => (
  <AiFrame>
    <Suggestions>{["Summarise the filings", "List the deadlines", "Draft the October bill"].map((s) => <Suggestion key={s} suggestion={s} onClick={() => {}} />)}</Suggestions>
  </AiFrame>
) };
