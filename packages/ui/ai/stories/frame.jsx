import "../ai.css";

/* Every AI sample sits in .ai-frame, where ai.css scopes the reset AI Elements expect. */
export const AiFrame = ({ children, width = "40rem" }) => <div className="ai-frame" style={{ maxInlineSize: width }}>{children}</div>;
