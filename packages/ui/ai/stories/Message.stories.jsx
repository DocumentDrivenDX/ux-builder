import { CopyIcon, RefreshCcwIcon } from "lucide-react";
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from "../vendor/ai-elements/message";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Message", component: Message, parameters: { library: "AI Elements", layout: "padded" } };

export const Exchange = { render: () => (
  <AiFrame>
    <Message from="user"><MessageContent>What is the limitation period for the claim?</MessageContent></Message>
    <Message from="assistant">
      <MessageContent><MessageResponse>{"For breach of contract, **six years** from the breach (Limitation Act 1980, s 5). The breach here was on 3 March 2021, so the period ends on **3 March 2027**."}</MessageResponse></MessageContent>
      <MessageActions>
        <MessageAction label="Copy" tooltip="Copy"><CopyIcon className="size-4" /></MessageAction>
        <MessageAction label="Retry" tooltip="Retry"><RefreshCcwIcon className="size-4" /></MessageAction>
      </MessageActions>
    </Message>
  </AiFrame>
) };
