import { Source, Sources, SourcesContent, SourcesTrigger } from "../vendor/ai-elements/sources";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Sources", component: Sources, parameters: { library: "AI Elements", layout: "padded" } };

const SOURCES = [{ href: "#defence", title: "Defence, 3 October 2026" }, { href: "#engagement", title: "Engagement letter" }];
export const Cited = { render: () => (
  <AiFrame>
    <Sources defaultOpen>
      <SourcesTrigger count={SOURCES.length} />
      <SourcesContent>{SOURCES.map((s) => <Source key={s.href} href={s.href} title={s.title} />)}</SourcesContent>
    </Sources>
  </AiFrame>
) };
