/* @ux-builder/ui/icons/synaptiq: every icon of the Synaptiq brand icon library (brand/synaptiq/icons), by its number in
   the brand deck (syn-NN-MMM), with the shared names drawn in brand icons. <Icon name="syn-60-031" /> needs nothing
   imported: Icon loads the library on first use. Import from here to have it in the bundle from the start, or to list
   the names. */
import { SYNAPTIQ_LIBRARY } from "./synaptiq-library.generated.js";

export { SYNAPTIQ_LIBRARY } from "./synaptiq-library.generated.js";
export { SYNAPTIQ_SHARED } from "./synaptiq-shared.generated.js";
export const SYNAPTIQ_LIBRARY_NAMES = Object.keys(SYNAPTIQ_LIBRARY);
