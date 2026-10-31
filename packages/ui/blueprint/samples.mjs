/* Sample values for a screen's content labels, so wireframes and prototypes
   show the design's own content instead of "Item 1" and "Field 1" (VIP List
   session 2: a person could not tell the prototype was their app). Product-
   neutral: common kinds of value by what a label names; anything else is the
   label with a number ("Venue 2"). Deterministic. Internal to
   @ux-builder/ui/blueprint. */

const NAMES = ["Jordan Rivera", "Sam Kim", "Alex Morgan", "Riley Chen", "Casey Patel"];
const CITIES = ["Austin", "Denver", "Portland", "Chicago", "Atlanta"];
const STATUSES = ["Active", "Pending", "Done", "Cancelled", "Active"];
const RULES = [
  [/e-?mail/i, (i) => ["jordan@example.com", "sam@example.com", "alex@example.com", "riley@example.com", "casey@example.com"][i]],
  [/mobile|phone|cell/i, (i) => `(555) 010-${String(4200 + i * 17).slice(-4)}`],
  [/date of birth|birthday|\bdob\b/i, () => "04/12/1999"],
  [/date and time|when\b/i, (i) => `${["Fri 31 Oct", "Sat 1 Nov", "Sun 2 Nov", "Mon 3 Nov", "Tue 4 Nov"][i]}, ${["10:00 PM", "9:30 PM", "8:00 PM", "11:30 PM", "7:00 PM"][i]}`],
  [/\bdate\b|\bday\b|\bnight\b|valid on/i, (i) => ["Fri 31 Oct", "Sat 1 Nov", "Sun 2 Nov", "Mon 3 Nov", "Tue 4 Nov"][i]],
  [/\btime\b/i, (i) => ["10:00 PM", "9:30 PM", "8:00 PM", "11:30 PM", "7:00 PM"][i]],
  [/address/i, (i) => `${[412, 98, 301, 1100, 57][i]} ${["Main St", "Oak Ave", "6th St", "Elm St", "Pine Rd"][i]}`],
  [/city|town/i, (i) => CITIES[i]],
  [/distance/i, (i) => `${[0.4, 1.2, 2, 3.5, 5][i]} mi`],
  [/price|cost|amount|total \$|fee/i, (i) => `$${[12, 25, 40, 8, 60][i]}.00`],
  [/\bleft\b|remaining|available/i, (i) => ["14 left", "3 left", "Full", "22 left", "9 left"][i]],
  [/count|number of|claimed|came|total|spots|seats|quantity|qty/i, (i) => String([2, 1, 48, 31, 12][i])],
  [/status|state\b/i, (i) => STATUSES[i]],
  [/\bqr\b|barcode|code\b/i, (i) => `QR ${["7Q4K", "2M8P", "9X1C", "4H6T", "5R3B"][i]}`],
  [/\bname\b|guest|person|member|owner|customer|user|attendee|contact/i, (i) => NAMES[i]],
  [/opt-?in|consent|subscribe|promotional/i, () => "No"],
];

/* A sample value for a content label, row i (0 to 4). */
export function sampleValue(label, i = 0) {
  const r = RULES.find(([re]) => re.test(label));
  return r ? r[1](i % 5) : `${String(label).replace(/\s*\([^)]*\)\s*$/, "")} ${(i % 5) + 1}`;
}

/* A form field for a content label: { kind: text|email|tel|number|date|checkbox|radio, label, required, options? }. */
export function fieldFor(label) {
  const optional = /\(optional\)|\boptional\b/i.test(label);
  const clean = String(label).replace(/\s*\((optional|opt-?in[^)]*)\)/i, "").trim();
  const choice = /\((\d+(?:\s*(?:or|,)\s*\d+)+)[^)]*\)/.exec(label);
  if (/opt-?in|consent|subscribe|promotional|text me|email me/i.test(label)) return { kind: "checkbox", label: optional ? clean : `${clean} (optional)`, required: false };
  if (choice) return { kind: "radio", label: clean.replace(/\s*\(.*\)$/, ""), required: true, options: choice[1].split(/\s*(?:or|,)\s*/) };
  const kind = /e-?mail/i.test(label) ? "email" : /mobile|phone|cell/i.test(label) ? "tel" : /date of birth|birthday/i.test(label) ? "date-text" : /\bdate\b/i.test(label) ? "date" : /number of|count|quantity|spots|seats/i.test(label) ? "number" : "text";
  return { kind, label: optional ? `${clean} (optional)` : clean, required: !optional };
}
