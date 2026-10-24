/* App modalities (FEAT-014, ADR-032; CONTRACT-005 `supports.modalities`).

   A modality is the kind of experience an app gives its users. Each one
   expands to the axes the rules already use (size classes, inputs, AI roles)
   and names its shell, the components to build with, the rule families that
   apply and the widths the audit inspects (FEAT-014's matrix). */

export const MODALITIES = {
  "responsive-web": {
    label: "Responsive web app (phone to desktop)",
    sizeClasses: ["compact", "medium", "expanded", "large"],
    inputs: ["coarse", "fine"],
    aiRoles: [],
    shell: "AppShell with an empty Home screen",
    components: ["@ux-builder/ui", "@ux-builder/ui/patterns"],
    ruleFamilies: ["nav", "layout", "modal", "action", "feedback", "loading", "screen", "emphasis", "input", "text", "view", "pattern", "flow", "journey", "theme"],
    widths: [390, 768, 1280],
  },
  chat: {
    label: "Chat app (the conversation is the interface)",
    sizeClasses: ["compact", "medium", "expanded"],
    inputs: ["coarse", "fine"],
    aiRoles: ["assistant"],
    shell: "a full-screen Conversation",
    components: ["@ux-builder/ui/assistant"],
    ruleFamilies: ["ai", "feedback", "input", "text", "theme"],
    widths: [390, 1280],
  },
  "hybrid-chat": {
    label: "Hybrid chat app (replies include Adaptive Cards and inline UI)",
    sizeClasses: ["compact", "medium", "expanded"],
    inputs: ["coarse", "fine"],
    aiRoles: ["assistant"],
    shell: "a Conversation that renders Adaptive Card parts",
    components: ["@ux-builder/ui/assistant", "@ux-builder/ui/adaptive-cards"],
    ruleFamilies: ["ai", "feedback", "input", "text", "genui", "card", "theme"],
    widths: [390, 1280],
  },
};

/* Reserved for later and refused today (ADR-032 rule 1). */
export const FUTURE_MODALITIES = ["ios", "android", "macos", "windows"];

/* Read when a blueprint names none (FEAT-014 edge case). */
export const DEFAULT_MODALITIES = ["responsive-web"];

/* Problems with a list of modality names, as plain-English lines. */
export function modalityProblems(names) {
  if (!Array.isArray(names) || names.length === 0) return [`Name at least one modality: ${Object.keys(MODALITIES).join(", ")}.`];
  const out = [];
  for (const n of names) {
    if (FUTURE_MODALITIES.includes(n)) out.push(`"${n}" is a future modality (native apps are not supported yet). Available now: ${Object.keys(MODALITIES).join(", ")}.`);
    else if (!MODALITIES[n]) out.push(`"${n}" is not a modality. Available now: ${Object.keys(MODALITIES).join(", ")}.`);
  }
  return out;
}

const union = (lists) => [...new Set(lists.flat())];

/* The union of the modalities' axes, components, rule families and widths. */
export function expandModalities(names = DEFAULT_MODALITIES) {
  const ms = names.map((n) => MODALITIES[n]).filter(Boolean);
  return {
    modalities: names.filter((n) => MODALITIES[n]),
    sizeClasses: union(ms.map((m) => m.sizeClasses)),
    inputs: union(ms.map((m) => m.inputs)),
    aiRoles: union(ms.map((m) => m.aiRoles)),
    components: union(ms.map((m) => m.components)),
    ruleFamilies: union(ms.map((m) => m.ruleFamilies)),
    widths: union(ms.map((m) => m.widths)).sort((a, b) => a - b),
  };
}

/* Rule families that apply whatever the modality: the blueprint's own
   validity, and the complexity a change adds (FEAT-018 GDL-12) (rulesFor
   with modalities keeps them; FEAT-014 MOD-06). */
export const SHARED_FAMILIES = ["blueprint", "simplicity", "task"];
