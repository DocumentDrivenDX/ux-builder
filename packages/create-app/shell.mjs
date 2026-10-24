/* The new app's shell for its modalities (FEAT-014 MOD-02, MOD-04, MOD-05;
   ADR-032 decision 4; US-097).

   responsive-web  an AppShell with one empty Home screen
   chat            a full-screen Conversation, empty, with its composer
   hybrid-chat     a Conversation whose replies draw Adaptive Card parts
   several         an AppShell whose destinations are Home and Assistant

   chat and hybrid-chat together are one Conversation that draws cards. The
   blueprint, the starter's e2e test and US-001's criteria come from the same
   list, so they always agree. */

import { MODALITIES, expandModalities } from "@ux-builder/ui/blueprint/modalities";

const ORDER = Object.keys(MODALITIES);

/* The modalities in the matrix's order, each once. */
export const normalize = (names) => ORDER.filter((m) => names.includes(m));

const has = (ms, m) => ms.includes(m);
const chatty = (ms) => has(ms, "chat") || has(ms, "hybrid-chat");
const web = (ms) => has(ms, "responsive-web");
/* Where the assistant is served: its own destination beside Home, or the whole app. */
export const assistantPath = (ms) => (web(ms) ? "/assistant" : "/");

/* Each file of the shell: its path in the app, from shells/ in this package. */
export function shellFiles(modalities) {
  const ms = normalize(modalities);
  const files = { "src/App.jsx": web(ms) && chatty(ms) ? "App.both.jsx" : web(ms) ? "App.web.jsx" : "App.chat.jsx" };
  if (web(ms)) files["src/Home.jsx"] = "Home.jsx";
  if (chatty(ms)) files["src/Assistant.jsx"] = has(ms, "hybrid-chat") ? "Assistant.hybrid-chat.jsx" : "Assistant.chat.jsx";
  return files;
}

/* The blueprint: supports.modalities with the size classes and inputs they
   derive, and the shell's destinations and screens (with their AI roles). */
export function blueprintFor(name, modalities) {
  const ms = normalize(modalities);
  const x = expandModalities(ms);
  const destinations = [], screens = [];
  if (web(ms)) {
    destinations.push({ id: "home", label: "Home", screen: "home" });
    screens.push({ id: "home", title: "Home", pattern: "HomeScreen", path: "/", states: ["empty", "loading", "error"] });
  }
  if (chatty(ms)) {
    destinations.push({ id: "assistant", label: "Assistant", screen: "assistant" });
    screens.push({ id: "assistant", title: "Assistant", pattern: "Conversation", path: assistantPath(ms), ai: { roles: x.aiRoles, essential: true } });
  }
  return { version: 1, kind: "app", name, supports: { modalities: ms, sizeClasses: x.sizeClasses, inputs: x.inputs }, destinations, screens };
}

/* US-001's criteria: one per modality's shell, then the theme switch. Each is
   [id, criterion, the e2e test's name, the test's body]. */
export function criteria(modalities) {
  const ms = normalize(modalities);
  const both = web(ms) && chatty(ms);
  const at = assistantPath(ms);
  const out = [];
  if (web(ms)) out.push([
    `Given the app opens, at any size from compact to large, then an \`AppShell\`${both ? " with the destinations Home and Assistant" : " with one destination"} shows the Home screen, whose empty state says to frame the first feature in HELIX and plan its screens in the blueprint; its navigation is a bottom bar at compact and side navigation at large.`,
    `Home: the AppShell${both ? "'s destinations are Home and Assistant, and its" : "'s one"} Home screen says where to start, from compact to large`,
    `  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const empty = page.locator("[data-piq-screen=home] .piq-state-panel");
  await expect(empty).toContainText("Frame the first feature in HELIX");
  await expect(empty).toContainText("docs/ux-builder/blueprint/app.blueprint.json");
  await expect(page.locator(".piq-shell__bar")).toBeVisible();
  await expect(page.locator(".piq-shell__side")).toBeHidden();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.locator(".piq-shell__side")).toBeVisible();
  await expect(page.locator(".piq-shell__bar")).toBeHidden();
  const nav = page.locator(".piq-shell__side").getByRole("link");
  await expect(nav).toHaveText(${JSON.stringify(both ? ["Home", "Assistant"] : ["Home"])});
  await expect(page.locator('.piq-shell__side [aria-current="page"]')).toHaveText("Home");`,
  ]);
  const open = both
    ? `  await page.goto("/");
  await page.locator(".piq-shell__side").getByRole("link", { name: "Assistant" }).click();
  await expect(page).toHaveURL(/\\/assistant$/);`
    : `  await page.goto(${JSON.stringify(at)});`;
  const where = both ? "Given the Assistant destination" : "Given the app opens";
  if (has(ms, "chat")) out.push([
    `${where}, then ${both ? "a" : "a full-screen"} \`Conversation\` from \`@ux-builder/ui/assistant\` shows, empty, with its composer and the AI disclosure; a message sent is answered with a note that no assistant is connected yet.`,
    `Assistant: ${both ? "a" : "a full-screen"}, empty Conversation with its composer and the AI disclosure`,
    `${open}
  const conversation = page.locator(".piq-conversation");
  await expect(conversation).toBeVisible();
  await expect(conversation.locator(".piq-message")).toHaveCount(0);
  await expect(conversation.locator(".piq-conversation__disclosure")).toContainText("generated by AI");${both ? "" : `
  const box = await conversation.boundingBox();
  expect(box.height).toBeGreaterThan(page.viewportSize().height / 2);`}
  const composer = page.getByRole("textbox", { name: "Ask the assistant" });
  await composer.fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(conversation.locator('.piq-message[data-role="assistant"]')).toContainText("No assistant is connected");`,
  ]);
  if (has(ms, "hybrid-chat")) out.push([
    `${where}, then a \`Conversation\` from \`@ux-builder/ui/assistant\` shows, empty, with its composer and the AI disclosure, and a reply's Adaptive Card part is drawn with the SDK's widgets in the theme (\`@ux-builder/ui/adaptive-cards\`).`,
    "Assistant: the Conversation draws a reply's Adaptive Card part",
    `${open}
  const conversation = page.locator(".piq-conversation");
  await expect(conversation.locator(".piq-message")).toHaveCount(0);
  await expect(conversation.locator(".piq-conversation__disclosure")).toBeVisible();
  await page.getByRole("textbox", { name: "Ask the assistant" }).fill("Hello");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(conversation.locator('.piq-message[data-role="assistant"] .piq-adaptive-card__heading')).toHaveText("No assistant is connected yet");`,
  ]);
  out.push([
    "Given the Theme or Appearance control, when another is chosen, then every widget, the logo and the colours follow it without a reload.",
    "the theme and appearance follow the controls without a reload",
    `  await page.goto("/");
  // The ThemeProvider's element (src/main.jsx), which every widget sits in.
  const root = page.locator(".app[data-theme]");
  const before = await root.getAttribute("data-theme");
  const options = await page.getByLabel("Theme").locator("option").evaluateAll((o) => o.map((x) => x.value));
  // Any other theme with a dark appearance (plain has only light).
  const other = options.find((v) => v !== before && v !== "plain");
  await page.getByLabel("Theme").selectOption(other);
  await expect(root).toHaveAttribute("data-theme", other);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(root).toHaveAttribute("data-appearance", "dark");`,
  ]);
  return out.map(([text, name, body], i) => ({ id: `US-001-AC${i + 1}`, text, name, body }));
}

/* The starter's e2e test: one test per US-001 criterion, each citing it. */
export function starterSpec(modalities) {
  const cs = criteria(modalities);
  return `// The starter screen (docs/helix/01-frame/user-stories/US-001-open-the-app-and-see-where-to-start.md).
// Each test cites the criterion it proves, so HELIX traceability and the UX
// assessment see them. Replace these with your own as the shell changes.
import { expect, test } from "@playwright/test";
${cs.map((c) => `
// @covers ${c.id}
test(${JSON.stringify(c.name)}, async ({ page }) => {
${c.body}
});
`).join("")}`;
}

/* The agent guidance's paragraph on the app's modalities (FEAT-014 MOD-07). */
export function modalityGuide(modalities) {
  const ms = normalize(modalities);
  const x = expandModalities(ms);
  const list = JSON.stringify(ms);
  return `This app's modalities are ${ms.map((m) => `\`${m}\``).join(" and ")} (\`supports.modalities\` in \`docs/ux-builder/blueprint/app.blueprint.json\`). For each:

${ms.map((m) => `- \`${m}\`: ${MODALITIES[m].shell}; build with ${MODALITIES[m].components.map((c) => `\`${c}\``).join(", ")}; its rules are the ${MODALITIES[m].ruleFamilies.map((f) => `\`${f}.*\``).join(", ")} families.`).join("\n")}

Get the rules for them with the MCP tool \`get_rules\` and \`"modalities": ${list}\` (or \`rulesFor({ modalities: ${list} })\` from \`@ux-builder/ui/blueprint\`), and the guidance with \`get_guidance\` and the same modalities. Screens support ${x.sizeClasses.join(", ")} and ${x.inputs.join(" and ")} input${x.aiRoles.length ? `; the assistant's screen has the AI role ${x.aiRoles.map((r) => `\`${r}\``).join(", ")}` : ""}.`;
}
