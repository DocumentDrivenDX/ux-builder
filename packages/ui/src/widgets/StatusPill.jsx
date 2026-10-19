/* An availability status. It is a label, never a target, and it always says
   its state in words, so colour is never the only signal. */

/* The states StatusPill takes, and the words it shows for each. */
export const STATES = {
  live: "Live",
  limited: "Limited",
  purchasing: "Purchasing",
  evaluation: "In evaluation",
  closed: "Closed",
};

export function StatusPill({ state, children }) {
  return <span className={`piq-pill piq-pill--${state}`}>{children ?? STATES[state] ?? state}</span>;
}
