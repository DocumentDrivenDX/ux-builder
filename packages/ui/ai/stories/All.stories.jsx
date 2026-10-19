import * as Artifact from "./Artifact.stories.jsx";
import * as Thread from "./AssistantUiThread.stories.jsx";
import * as ChainOfThought from "./ChainOfThought.stories.jsx";
import * as CodeBlock from "./CodeBlock.stories.jsx";
import * as Confirmation from "./Confirmation.stories.jsx";
import * as Conversation from "./Conversation.stories.jsx";
import * as InlineCitation from "./InlineCitation.stories.jsx";
import * as Message from "./Message.stories.jsx";
import * as PromptInput from "./PromptInput.stories.jsx";
import * as Reasoning from "./Reasoning.stories.jsx";
import * as Shimmer from "./Shimmer.stories.jsx";
import * as Sources from "./Sources.stories.jsx";
import * as Suggestion from "./Suggestion.stories.jsx";
import * as Task from "./Task.stories.jsx";
import * as Tool from "./Tool.stories.jsx";

/* Every AI component on one page, so the audit can check them all in every theme and appearance at once (US-045-AC4). */
export default { title: "AI Components/All", parameters: { layout: "padded" } };

const FILES = [Conversation, Message, PromptInput, Reasoning, ChainOfThought, Tool, Confirmation, Sources, InlineCitation, Suggestion, Task, CodeBlock, Shimmer, Artifact, Thread];
export const EveryComponent = { render: () => (
  <div style={{ display: "grid", gap: "var(--piq-space-6)" }}>
    {FILES.map((f) => {
      const [key, story] = Object.entries(f).find(([k]) => k !== "default");
      return (
        <section key={f.default.title} aria-label={f.default.title.split("/").slice(1).join(" › ")}>
          <h2 style={{ margin: "0 0 var(--piq-space-2)", font: "var(--piq-font-size-lead) var(--piq-font-heading)", color: "var(--piq-color-text-strong)" }}>{f.default.title.split("/").slice(1).join(" › ")}</h2>
          {story.render()}
        </section>
      );
    })}
  </div>
) };
