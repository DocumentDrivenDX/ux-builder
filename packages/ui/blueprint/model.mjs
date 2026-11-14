/* The blueprint read as an app is built from it: screens with their modals,
   where an action leads, each journey walked, and each screen's state model
   (project.mjs, states.mjs). The same pure functions the drawings, the
   wireframes and the prototypes use, for a generator outside this package
   (@ux-builder/create-app's journey skeleton, FEAT-018). */

export { screensOf, sizesOf, target, walk, walkJourney } from "./project.mjs";
export { EXPECTED, stateModels } from "./states.mjs";
