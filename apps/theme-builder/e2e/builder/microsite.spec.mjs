/* The public site's Why, Start and Concepts pages and its home page
   (SD-002, HELIX product-microsite-ia), served by the builder's dev server
   from home.html. The new pages are in the navigation, say what shipped, and
   their live demos render the SDK's real components in the site's theme. */

import { expect, test } from "@playwright/test";
import { watch } from "../helpers.mjs";

const page_ = (p) => `/home.html?p=${p}`;

test.describe("The public site", () => {
  test.beforeEach(async ({ page }) => { await page.emulateMedia({ reducedMotion: "reduce" }); });

  test("the new Start and Concepts pages are in the section navigation", async ({ page }) => {
    await page.goto(page_("start"));
    const side = page.getByRole("navigation", { name: "Site" }).first();
    for (const name of ["Assess an app's UX", "Show cards from Microsoft agents"]) await expect(side.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Assess an app's UX" })).toBeVisible();
    await page.goto(page_("concepts"));
    for (const name of ["AI and agent experience", "Flows and journeys"]) await expect(page.getByRole("heading", { level: 3, name })).toBeVisible();
  });

  test("Why says what it is not, names every affiliation, and reads Next from the open work", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("why/problem"));
    const not = page.locator("#not + ul");
    await expect(not).toContainText("Not an AI runtime or model provider");
    await expect(not).toContainText("@ux-builder/ui/adaptive-cards");
    await expect(page.locator(".uxh-foot")).toContainText("Apple, Google or Microsoft");
    await page.goto(page_("why/audience"));
    await expect(page.getByRole("heading", { level: 3, name: "App owners and UX reviewers" })).toBeVisible();
    await page.goto(page_("why/roadmap"));
    await expect(page.locator('[data-roadmap="now"]')).toContainText("FEAT-012");
    expect(await page.locator('[data-roadmap="next"] li').count()).toBeGreaterThan(0);
    await expect(page.locator('[data-roadmap="later"]')).toContainText("public distribution");
    await page.goto(page_("start/new-app"));
    const cite = page.locator(".uxm-cite").filter({ hasText: "not affiliated" });
    for (const name of ["Apple", "Google", "Microsoft", "PAIR", "Adaptive Cards", "HAX Toolkit", "Copilot"]) await expect(cite).toContainText(name);
    expect(errors).toEqual([]);
  });

  test("Start / new app covers HELIX: what is installed, the order of work and the three options", async ({ page }) => {
    await page.goto(page_("start/new-app"));
    await expect(page.locator("#helix ~ ul").first()).toContainText("US-001");
    await expect(page.getByText("Frame the requirement in HELIX first")).toBeVisible();
    for (const flag of ["--helix-version <tag>", "--helix-offline", "--no-helix"]) await expect(page.locator("table").getByText(flag, { exact: true })).toBeVisible();
    await expect(page.getByText("e2e/starter.spec.js").first()).toBeVisible();
    await expect(page.getByText("ux-assessment.yml").first()).toBeVisible();
  });

  test("Start / assess explains the manifest, the scenarios and never-approve, with the theme builder's own manifest", async ({ page }) => {
    await page.goto(page_("start/assess"));
    await expect(page.getByRole("heading", { level: 1, name: "Assess an app's UX" })).toBeVisible();
    await expect(page.getByText("npx ux-builder-audit assess validate")).toBeVisible();
    for (const s of ["Normal", "Error-prone", "Risky"]) await expect(page.getByRole("heading", { level: 3, name: s })).toBeVisible();
    await expect(page.getByText("Never approve")).toBeVisible();
    await page.getByText("The whole manifest").click();
    await expect(page.locator(".uxm-details")).toContainText("J-logo-to-theme");
  });

  test("Start / Microsoft agents renders a card in the theme, asks before a high-impact action, and runs checkCard live", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("start/microsoft-agents"));
    const demo = page.locator('[data-demo="adaptive-card"]');
    await expect(demo.getByText("Invoice INV-2041 from Acme Ltd")).toBeVisible();
    await demo.getByRole("button", { name: "Pay invoice" }).click();
    const approval = demo.locator('[data-piq-ai="approval"]');
    await expect(approval).toContainText("Pay £120.00 to Acme Ltd");
    await approval.getByRole("button", { name: "Deny" }).click();
    await expect(demo.getByText("The app received the action")).toHaveCount(0);
    const findings = page.locator('[data-demo="check-card"]');
    for (const rule of ["card.high-impact-marked", "card.action-titles", "card.heading", "card.input-label"]) await expect(findings.getByText(rule, { exact: true })).toBeVisible();
    await expect(page.locator("#unsupported + ul")).toContainText("Templating");
    expect(errors).toEqual([]);
  });

  test("Concepts / AI and agent experience runs a Conversation, an ApprovalCard, an inline Wizard and an Adaptive Card", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("concepts/ai-agent-experience"));
    const chat = page.locator('[data-demo="conversation"] .piq-conversation');
    await expect(chat).toBeVisible();
    await expect(chat.getByText("Create bill B-1044 for Acme v Beta, £12,400?")).toBeVisible();
    const approval = page.locator('[data-demo="approval"] [data-piq-ai="approval"]');
    await approval.getByRole("button", { name: "Deny" }).click();
    await expect(page.locator('[data-demo="approval"]')).toContainText("The app recorded: denied");
    await expect(page.locator('[data-demo="hybrid"] .piq-conversation').getByLabel("Client name")).toHaveValue("Acme Ltd");
    await expect(page.locator('[data-demo="adaptive-card"]').getByRole("button", { name: "Pay invoice" })).toBeVisible();
    // The demos' own headings stay out of the page's outline.
    await expect(page.locator(".uxm-outline")).not.toContainText("Step 1");
    await chat.getByLabel("Ask the assistant").fill("When is the hearing?");
    await chat.getByRole("button", { name: "Send" }).click();
    await expect(chat.getByText("14 November", { exact: false }).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Concepts / Flows and journeys shows the generated flow, two wireframes and the live blueprint check", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("concepts/flows-journeys"));
    for (const img of await page.locator('[data-demo="flow"] img, [data-demo="wireframes"] img').all()) {
      await img.scrollIntoViewIfNeeded();
      expect(await img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    expect(await page.locator('[data-demo="wireframes"] img').count()).toBe(2);
    await expect(page.locator('[data-demo="check-blueprint"]').getByText("journey.covers-errors", { exact: true })).toBeVisible();
    await expect(page.getByText("npx ux-builder-blueprint propose app.blueprint.json --out helix-proposals")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Concepts / Generative UI shows the SDK's own assistant before the bridges", async ({ page }) => {
    await page.goto(page_("concepts/generative-ui"));
    await expect(page.locator('[data-demo="conversation"] .piq-conversation')).toBeVisible();
    await expect(page.locator("#assistant ~ p").first()).toContainText("ApprovalCard");
  });

  test("home: the AI section runs the SDK's assistant with an Adaptive Card, four guards, and the plan-check-build-assess strip", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/home.html");
    const ai = page.locator(".uxh-section--ai");
    await expect(ai.locator('[data-demo="home-assistant"] .piq-conversation')).toBeVisible();
    await expect(ai.getByRole("button", { name: "Pay invoice" })).toBeVisible();
    await ai.getByRole("radio", { name: "AI Elements, bridged" }).click();
    await expect(ai.getByText("Add a settings page to the app, in our brand.")).toBeVisible();
    await expect(page.locator("section[aria-labelledby=guard-h] .uxh-cards > li")).toHaveCount(4);
    await expect(page.getByRole("heading", { level: 3, name: "AI checks on AI screens" })).toBeVisible();
    const loop = page.locator(".uxh-loop");
    await expect(loop.getByRole("heading", { level: 3 })).toHaveText(["Plan", "Check", "Build", "Assess"]);
    await loop.getByRole("link", { name: /Assess/ }).click();
    await expect(page).toHaveURL(/\?p=start\/assess$/);
    expect(errors).toEqual([]);
  });
});
