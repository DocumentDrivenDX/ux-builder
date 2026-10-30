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

  test("the pages say what FEAT-013 to FEAT-017 shipped: modalities, the trace, videos, verdicts and diagram tokens", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("why/roadmap"));
    for (const f of ["FEAT-013", "FEAT-014", "FEAT-015", "FEAT-016", "FEAT-017"]) await expect(page.locator('[data-roadmap="now"]')).toContainText(f);
    await page.goto(page_("start/new-app"));
    await expect(page.getByText("--modality responsive-web").first()).toBeVisible();
    for (const m of ["responsive-web", "chat", "hybrid-chat"]) await expect(page.getByRole("table", { name: "Modalities" }).getByText(m, { exact: true })).toBeVisible();
    await page.goto(page_("start/agents"));
    await expect(page.locator("#trace ~ p").first()).toContainText("UX-Episode:");
    await page.goto(page_("start/ci"));
    await expect(page.locator("#audit ~ p").nth(1)).toContainText("fit of each modality");
    await page.goto(page_("start/assess"));
    await expect(page.getByText("npx ux-builder-audit assess video --run <run> --pace slow")).toBeVisible();
    await page.goto(page_("concepts/tokens"));
    await expect(page.locator("#diagrams ~ ul").first()).toContainText("--piq-color-series-1");
    await page.goto("/home.html");
    await expect(page.locator("section[aria-labelledby=pkg-h] .uxh-cards > li")).toHaveCount(7);
    expect(errors).toEqual([]);
  });

  test("Start / design explains the guided design loop: design first, what to expect, the eight steps, the terms, the checkpoints, the documents and keeping it current", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("why/roadmap"));
    await expect(page.locator('[data-roadmap="now"]')).toContainText("FEAT-018");
    await page.goto(page_("start/design"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Design the UX with your agent");
    await expect(page.getByText("npm create @ux-builder/app@latest my-idea")).toBeVisible();
    await expect(page.getByText("npm create @ux-builder/app@latest . -- --theme ux-builder-databricks")).toBeVisible();
    await expect(page.getByText("npx ux-builder-design init")).toBeVisible();
    for (const t of ["An overview first", "Step n of 8", "Terms explained", "Everything reviewed in the chat"]) await expect(page.locator("#expect ~ ul").first().getByRole("heading", { name: t })).toBeVisible();
    // The steps come from @ux-builder/design itself; the full table and the glossary have their own pages.
    await expect(page.locator("#steps ~ ol").first().locator("li")).toHaveCount(8);
    await expect(page.locator("#steps ~ ol").first()).toContainText("Design the structure.");
    await expect(page.locator('main a[href="?p=reference/glossary"]').first()).toBeVisible();
    await expect(page.locator("#modality ~ p").first()).toContainText("screen sizes");
    for (const c of ["core-1", "core-2", "core-3", "significant-change", "experiment", "release"]) await expect(page.getByRole("table", { name: "Checkpoints" }).getByText(c, { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "Design documents" }).locator("tbody tr")).toHaveCount(12);
    await expect(page.locator("#current ~ ol").first()).toContainText("npm install -D @ux-builder/design@latest @ux-builder/ui@latest");
    await expect(page.locator("#production ~ div").first()).toContainText("JourneyProvider");
    // The starter, the agents page and the command reference lead here.
    for (const from of ["start/new-app", "start/agents", "reference/cli"]) {
      await page.goto(page_(from));
      await expect(page.locator('main a[href="?p=start/design"]').first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("the guided design: the process, the glossary and a worked example, generated from @ux-builder/design", async ({ page }) => {
    const errors = watch(page);
    await page.goto(page_("concepts/guided-design"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The guided design process");
    const steps = page.getByRole("table", { name: "The guided design's steps" });
    await expect(steps.locator("tbody tr")).toHaveCount(8);
    for (const n of ["Define intent", "Design the structure", "Refine and improve"]) await expect(steps.getByText(n, { exact: true })).toBeVisible();
    for (const c of ["core-1", "core-2", "core-3"]) await expect(steps.getByText(c, { exact: true })).toBeVisible();
    for (const h of ["Checkpoints: the person decides", "Reviewed in the conversation", "Hypotheses until evidence", "Design first, the app last"]) await expect(page.getByRole("heading", { name: h })).toBeVisible();
    await page.goto(page_("reference/glossary"));
    const terms = page.getByRole("table", { name: "Design glossary" });
    for (const t of ["blueprint", "target user", "modality", "theme"]) await expect(terms.getByText(t, { exact: true })).toBeVisible();
    for (const id of ["ADR-<nnn>", "UF-<n>", "BR-<n>"]) await expect(page.getByRole("table", { name: "Design IDs" }).getByText(id, { exact: true })).toBeVisible();
    await page.goto(page_("proof/worked-example"));
    for (const h of ["The experience brief, compiled from HELIX", "The PRD's User Segments and User Needs", "A study: its sources, quotes and claims", "A feature's Task Model", "A UX decision, as a HELIX ADR", "Journey funnels on the metrics dashboard"]) await expect(page.getByRole("heading", { level: 2, name: h })).toBeVisible();
    await expect(page.locator("#ex-prd ~ div table").first()).toContainText("Weekend anglers new to an area");
    expect(errors).toEqual([]);
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
    await expect(page.locator(".uxh-cmd code", { hasText: /^\$ npx ux-builder-blueprint propose$/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Concepts / Generative UI shows the SDK's own assistant before the bridges", async ({ page }) => {
    await page.goto(page_("concepts/generative-ui"));
    await expect(page.locator('[data-demo="conversation"] .piq-conversation')).toBeVisible();
    await expect(page.locator("#assistant ~ p").first()).toContainText("ApprovalCard");
  });

  test("home: the guided design leads; the AI section runs the SDK's assistant with an Adaptive Card, four guards, and the design-build-check-learn strip", async ({ page }) => {
    const errors = watch(page);
    await page.goto("/home.html");
    const ai = page.locator(".uxh-section--ai");
    await expect(ai.locator('[data-demo="home-assistant"] .piq-conversation')).toBeVisible();
    await expect(ai.getByRole("button", { name: "Pay invoice" })).toBeVisible();
    await ai.getByRole("radio", { name: "AI Elements, bridged" }).click();
    await expect(ai.getByText("Add a settings page to the app, in our brand.")).toBeVisible();
    await expect(page.locator("section[aria-labelledby=guard-h] .uxh-cards > li")).toHaveCount(4);
    await expect(page.getByRole("heading", { level: 3, name: "AI checks on AI screens" })).toBeVisible();
    // The value proposition first: the guided design, with a moment of it in the hero.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("From an idea to an app people can actually use.");
    await expect(page.locator(".uxh-hero").getByText("npm create @ux-builder/app@latest my-idea")).toBeVisible();
    const review = page.locator(".uxh-heroapp");
    await expect(review.getByText("Step 2 of 8: Understand users")).toBeVisible();
    await review.getByRole("button", { name: "Approve" }).click();
    await expect(review.getByText("Approved", { exact: true }).first()).toBeVisible();
    await expect(page.locator(".uxh-steplist > li")).toHaveCount(8);
    await expect(page.getByRole("heading", { level: 2, name: /^\d+ packages\. Take what you need\.$/ })).toBeVisible();
    await expect(page.locator(".uxh-cards--six > li")).toHaveCount(Number((await page.locator("#pkg-h").textContent()).match(/^\d+/)[0]));
    const loop = page.locator(".uxh-loop");
    await expect(loop.getByRole("heading", { level: 3 })).toHaveText(["Design", "Build", "Check", "Learn"]);
    await loop.getByRole("link", { name: /Assess and test/ }).click();
    await expect(page).toHaveURL(/\?p=start\/assess$/);
    expect(errors).toEqual([]);
  });
});
