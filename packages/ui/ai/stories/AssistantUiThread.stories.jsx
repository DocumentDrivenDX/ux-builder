import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { Thread } from "../vendor/assistant-ui/thread.aui";
import { AiFrame } from "./frame.jsx";

/* assistant-ui's Thread, as its CLI adds it, styled by shadcn's variables through the shadcn bridge.
   A local adapter streams a canned reply: nothing leaves the page. */
export default { title: "AI Components/assistant-ui/Thread", component: Thread, parameters: { library: "assistant-ui", layout: "padded" } };

const REPLY = "Witness statements are due on 14 November; the case management conference is on 2 December.";
const cannedReply = {
  async *run({ abortSignal }) {
    let text = "";
    for (const word of REPLY.split(" ")) {
      if (abortSignal.aborted) return;
      await new Promise((r) => setTimeout(r, 40));
      text += (text ? " " : "") + word;
      yield { content: [{ type: "text", text }] };
    }
  },
};
function Demo() {
  const runtime = useLocalRuntime(cannedReply);
  return <AssistantRuntimeProvider runtime={runtime}><div style={{ blockSize: "28rem" }}><Thread autoFocus={false} /></div></AssistantRuntimeProvider>;
}
export const LocalThread = { render: () => <AiFrame><Demo /></AiFrame> };
