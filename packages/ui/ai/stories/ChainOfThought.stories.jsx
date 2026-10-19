import { SearchIcon, ScaleIcon } from "lucide-react";
import { ChainOfThought, ChainOfThoughtContent, ChainOfThoughtHeader, ChainOfThoughtSearchResult, ChainOfThoughtSearchResults, ChainOfThoughtStep } from "../vendor/ai-elements/chain-of-thought";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/ChainOfThought", component: ChainOfThought, parameters: { library: "AI Elements", layout: "padded" } };

export const Steps = { render: () => (
  <AiFrame>
    <ChainOfThought defaultOpen>
      <ChainOfThoughtHeader />
      <ChainOfThoughtContent>
        <ChainOfThoughtStep icon={SearchIcon} label="Searched the matter's documents" status="complete">
          <ChainOfThoughtSearchResults>{["Defence", "Reply", "Disclosure list"].map((d) => <ChainOfThoughtSearchResult key={d}>{d}</ChainOfThoughtSearchResult>)}</ChainOfThoughtSearchResults>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep icon={ScaleIcon} label="Applied the Limitation Act 1980, s 5" status="active" />
      </ChainOfThoughtContent>
    </ChainOfThought>
  </AiFrame>
) };
