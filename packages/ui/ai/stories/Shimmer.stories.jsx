import { Shimmer } from "../vendor/ai-elements/shimmer";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Shimmer", component: Shimmer, parameters: { library: "AI Elements", layout: "padded" } };

export const Thinking = { render: () => <AiFrame><Shimmer>Reading the filings…</Shimmer></AiFrame> };
