import { Conversation, ConversationContent, ConversationScrollButton } from "../vendor/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "../vendor/ai-elements/message";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Conversation", component: Conversation, parameters: { library: "AI Elements", layout: "padded" } };

const TURNS = [
  { id: 1, role: "user", text: "Summarise the last three filings in Acme v. Beta." },
  { id: 2, role: "assistant", text: "**Three filings since 1 October:**\n\n1. *Defence*, 3 October: denies breach of clause 14.\n2. *Reply*, 10 October: says the delay notice was late.\n3. *Disclosure list*, 17 October: 212 documents." },
  { id: 3, role: "user", text: "Which deadlines follow from them?" },
  { id: 4, role: "assistant", text: "Witness statements are due **14 November**; the case management conference is **2 December**." },
];
export const Thread = { render: () => (
  <AiFrame>
    <Conversation style={{ blockSize: "22rem" }}>
      <ConversationContent>
        {TURNS.map((t) => <Message key={t.id} from={t.role}><MessageContent><MessageResponse>{t.text}</MessageResponse></MessageContent></Message>)}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  </AiFrame>
) };
