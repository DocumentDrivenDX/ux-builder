/* A browser for component tests: happy-dom's window as the globals React
   needs, and a matchMedia whose dark-mode answer a test controls. */

import { Window } from "happy-dom";

const win = new Window({ url: "http://localhost/" });
// Node has its own navigator (a getter); define over it rather than assign.
for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "Element", "Event", "MutationObserver", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
  const value = k === "window" ? win : typeof win[k] === "function" && !/^[A-Z]/.test(k) ? win[k].bind(win) : win[k];
  Object.defineProperty(globalThis, k, { value, configurable: true, writable: true });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let dark = false;
const listeners = new Set();
win.matchMedia = (query) => ({
  media: query,
  get matches() { return query.includes("dark") ? dark : false; },
  addEventListener: (_, fn) => listeners.add(fn),
  removeEventListener: (_, fn) => listeners.delete(fn),
});
export function setSystemDark(value) {
  dark = value;
  for (const fn of [...listeners]) fn({ matches: dark });
}
export const mediaListeners = () => listeners.size;
