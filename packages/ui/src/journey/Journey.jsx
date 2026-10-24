/* Journey events (FEAT-018 GDL-62; ADR-038): JourneyProvider hands the
   app's own sink the moments a journey passes through, so the app can route
   them into its own analytics. Events are { type, journey, screen, step, at }
   with type journey-start, step, complete, abandon, error-shown,
   empty-result or no-results-search, and never any user content. No sink,
   no events: nothing is emitted or stored. The SDK sends nothing anywhere;
   where events go is the app's code. */

import { createContext, useContext, useEffect, useLayoutEffect, useMemo } from "react";

const JourneyContext = createContext(null);

/* The tracker behind a provider: which journeys are under way, and the
   step the user is on. A journey left for another before it completes is
   abandoned, and so is every journey still under way when the provider goes. */
function tracker(sink) {
  const active = new Map();
  let current = null;
  const emit = (type, journey, at) => sink({ type, journey, screen: at?.screen ?? null, step: at?.step ?? null, at: new Date().toISOString() });
  const leave = (journey) => { emit("abandon", journey, active.get(journey)); active.delete(journey); };
  return {
    step(journey, step, screen) {
      for (const j of [...active.keys()]) if (j !== journey) leave(j);
      if (!active.has(journey)) emit("journey-start", journey, { step, screen });
      active.set(journey, { step, screen });
      current = journey;
      emit("step", journey, { step, screen });
    },
    complete(journey) { if (!active.has(journey)) return; emit("complete", journey, active.get(journey)); active.delete(journey); },
    abandon(journey) { if (active.has(journey)) leave(journey); },
    signal(type) { if (current && active.has(current)) emit(type, current, active.get(current)); },
    end() { for (const j of [...active.keys()]) leave(j); current = null; },
  };
}

/* Hands the app's own sink each journey event (journey-start, step,
   complete, abandon, error-shown, empty-result, no-results-search) for its
   own analytics: wrap the app, or the part a journey runs in. Without a sink
   it does nothing, and the SDK sends nothing anywhere. */
export function JourneyProvider({ sink, children }) {
  const t = useMemo(() => (typeof sink === "function" ? tracker(sink) : null), [sink]);
  useEffect(() => () => t?.end(), [t]);
  return <JourneyContext.Provider value={t}>{children}</JourneyContext.Provider>;
}

/* Mark the screen a component renders as step `step` of `journeyId` (the
   blueprint's IDs). The screen is the given one, else the page's
   data-piq-screen. Returns { complete, abandon, errorShown, emptyResult,
   noResultsSearch } for what the app knows that the SDK cannot see. */
export function useJourneyStep(journeyId, step, { screen } = {}) {
  const t = useContext(JourneyContext);
  // A layout effect, so the step is known before a panel inside it (a passive effect, which runs later) reports.
  useLayoutEffect(() => {
    if (!t) return;
    const on = screen ?? (typeof document !== "undefined" ? document.querySelector("[data-piq-screen]")?.getAttribute("data-piq-screen") : null) ?? null;
    t.step(journeyId, step, on);
  }, [t, journeyId, step, screen]);
  return useMemo(() => ({
    complete: () => t?.complete(journeyId),
    abandon: () => t?.abandon(journeyId),
    errorShown: () => t?.signal("error-shown"),
    emptyResult: () => t?.signal("empty-result"),
    noResultsSearch: () => t?.signal("no-results-search"),
  }), [t, journeyId]);
}

/* For the SDK's own panels: report `type` for the current step while `when`
   holds. Outside a provider with a sink it does nothing. */
export function useJourneySignal(type, when = true) {
  const t = useContext(JourneyContext);
  useEffect(() => { if (when && type) t?.signal(type); }, [t, type, when]);
}
