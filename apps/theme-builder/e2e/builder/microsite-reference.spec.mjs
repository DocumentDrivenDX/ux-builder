/* The project site's generated Reference and Proof pages (SD-002;
   product-microsite-ia), served from the builder's own front end
   (home.html?p=<section>/<page>). Each page shows what the repository holds
   today: the counts here are read from the source, not typed. */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, watch } from "../helpers.mjs";

const read = (p) => readFileSync(join(REPO, p), "utf8");
const rules = JSON.parse(read("packages/ui/catalogue.json")).interaction.rules;
const tools = [...read("packages/mcp/server.mjs").matchAll(/registerTool\("([a-z_]+)"/g)].map((m) => m[1]);
const open = (page, p) => page.goto(`/home.html?p=${p}`);
const rows = (page, name) => page.getByRole("table", { name }).locator("tbody tr");

test.describe("The site's Reference and Proof pages", () => {
  test("the Reference and Proof landing pages list the generated pages", async ({ page }) => {
    const errors = watch(page);
    await open(page, "reference");
    for (const t of ["Interaction rules", "Adaptive Cards", "Command line and MCP"]) await expect(page.getByRole("heading", { level: 3, name: t })).toBeVisible();
    await open(page, "proof");
    for (const t of ["Traceability", "Sources and licences"]) await expect(page.getByRole("heading", { level: 3, name: t })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Command line and MCP: every MCP tool, and the commands' options", async ({ page }) => {
    const errors = watch(page);
    await open(page, "reference/cli");
    await expect(rows(page, "ux-builder-mcp tools")).toHaveCount(tools.length);
    for (const t of tools) await expect(page.getByRole("table", { name: "ux-builder-mcp tools" }).getByText(t, { exact: true })).toBeVisible();
    for (const o of ["--blueprint <file>", "--helix-offline", "--no-helix"]) await expect(page.getByRole("table", { name: "create-app options" }).getByText(o, { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "ux-builder-audit options" }).getByText("--write-baseline <f>", { exact: true })).toBeVisible();
    await expect(page.getByRole("table", { name: "assess subcommands" }).locator("tbody tr")).toHaveCount(16);
    await expect(page.getByRole("table", { name: "ux-builder-blueprint commands" }).locator("tbody tr")).toHaveCount(5);
    expect(errors).toEqual([]);
  });

  test("Packages: every entry point from the packages' exports", async ({ page }) => {
    await open(page, "reference/packages");
    const ui = Object.keys(JSON.parse(read("packages/ui/package.json")).exports);
    await expect(page.getByRole("table", { name: "@ux-builder/ui entry points" }).locator("tbody tr")).toHaveCount(ui.length);
    for (const i of ["@ux-builder/ui/blueprint", "@ux-builder/ui/assistant/ai-sdk", "@ux-builder/ui/adaptive-cards", "@ux-builder/audit/skill/*"]) await expect(page.getByText(i, { exact: true }).first()).toBeVisible();
  });

  test("Interaction rules: all of them, filtered by family, AI role and check", async ({ page }) => {
    const errors = watch(page);
    await open(page, "reference/rules");
    await expect(page.getByTestId("rules-shown")).toHaveText(`${rules.length} of ${rules.length} rules`);
    expect(rules.length).toBe(84);
    await expect(rows(page, "Interaction rules")).toHaveCount(84);
    await page.getByLabel("Family").selectOption("card");
    const cards = rules.filter((r) => r.id.startsWith("card.")).length;
    await expect(rows(page, "Interaction rules")).toHaveCount(cards);
    await expect(page.getByRole("list", { name: "Applied filters" })).toContainText("Family: card");
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByLabel("AI role").selectOption("agent");
    await expect(rows(page, "Interaction rules")).toHaveCount(rules.filter((r) => r.when?.aiRole?.includes("agent")).length);
    await page.getByLabel("Checked by").selectOption("lint");
    await expect(rows(page, "Interaction rules")).toHaveCount(rules.filter((r) => r.when?.aiRole?.includes("agent") && r.checks.some((c) => c.kind === "lint")).length);
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByLabel("Search rules").fill("modal");
    await expect(rows(page, "Interaction rules").first()).toContainText("modal");
    expect(errors).toEqual([]);
  });

  test("Adaptive Cards: every element mapped, and a high-impact action asks first", async ({ page }) => {
    const errors = watch(page);
    await open(page, "reference/adaptive-cards");
    await expect(page.getByRole("table", { name: "Adaptive Cards element mapping" })).toContainText("DescriptionList");
    await expect(page.getByRole("list", { name: "Elements and actions the renderer draws" }).locator("li")).not.toHaveCount(0);
    await expect(page.locator('[data-mapped="no"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Pay invoice" }).click();
    await expect(page.getByText("Pay £120.00 to Acme Ltd").last()).toBeVisible();
    await expect(page.getByText("onAction has not been called.")).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByText(/onAction was called: Action.Execute "pay"/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Traceability: check-coverage's counts, every excepted criterion with its reason, and the alignment reviews", async ({ page }) => {
    const errors = watch(page);
    const { coverage } = await import(join(REPO, "tools/check-coverage.mjs"));
    const c = coverage();
    await open(page, "proof/traceability");
    await expect(page.getByTestId("ac-total")).toHaveText(String(c.total));
    await expect(page.getByTestId("ac-cited")).toHaveText(String(c.cited));
    await expect(page.getByTestId("ac-excepted")).toHaveText(String(c.excepted));
    await expect(page.getByRole("list", { name: "Excepted criteria" }).locator("> li")).toHaveCount(c.exceptions.length);
    await expect(rows(page, "Coverage by story")).toHaveCount(Object.keys(c.byStory).length);
    await expect(page.getByRole("link", { name: "AR-2026-10-21-repo" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Sources: every source the rules cite, the licences, counsel's status and the disclaimer", async ({ page }) => {
    const errors = watch(page);
    const urls = new Set(rules.flatMap((r) => r.sources.map((s) => s.url)));
    await open(page, "proof/sources");
    await expect(rows(page, "Sources the rules cite")).toHaveCount(urls.size);
    await expect(page.getByRole("table", { name: "Licences" }).locator("tbody tr")).toHaveCount(new Set(rules.flatMap((r) => r.sources.map((s) => s.licence))).size);
    await expect(page.getByText("ux-builder-78483e2c").last()).toBeVisible();
    await expect(page.getByText(/waived counsel's review/)).toBeVisible();
    for (const who of ["Apple or Google", "Microsoft"]) await expect(page.getByText(new RegExp(`not affiliated with or endorsed by ${who}`))).toBeVisible();
    expect(errors).toEqual([]);
  });
});
