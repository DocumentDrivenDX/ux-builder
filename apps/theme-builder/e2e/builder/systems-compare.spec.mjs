/* Steps 3 and 4, Pick design systems and Compare (US-016-AC3, US-017). */

import { expect, test } from "@playwright/test";
import { section, toCompare, toSystems, watch } from "../helpers.mjs";

const ICONS = { Carbon: "carbon", "Fluent 2": "fluent", "Material Design 3": "material", Databricks: "lucide" };

test.describe("Pick design systems", () => {
  test("a card per shared design system, showing the first chosen palette in it", async ({ page }) => {
    await toSystems(page);
    const cards = page.locator(".tb-card");
    await expect(cards).toHaveCount(4);
    await expect(page.locator(".tb-lede")).toContainText(/Shown with \w/);
    for (const [title, set] of Object.entries(ICONS)) {
      const card = cards.filter({ hasText: title });
      await expect(card.locator(".tb-hint")).toContainText(/Icons: .+\. Type: .+\./);
      await expect(card.locator(`svg.piq-icon[data-icon-set="${set}"]`).first()).toBeVisible();
    }
  });

  test("each system's previews use its own shapes", async ({ page }) => {
    await toSystems(page);
    const radius = (title) => page.locator(".tb-card").filter({ hasText: title }).locator(".piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(await radius("Carbon")).toBe("0px");
    expect(await radius("Material Design 3")).not.toBe("0px");
  });

  test("the compare button counts palettes x systems", async ({ page }) => {
    await toSystems(page, undefined, [0, 1, 2]);
    const next = page.getByRole("button", { name: /^Compare \d+ combination/ });
    await expect(next).toBeDisabled();
    await page.getByLabel("Carbon", { exact: true }).check();
    await expect(next).toHaveText("Compare 3 combinations");
    await page.getByLabel("Databricks", { exact: true }).check();
    await expect(next).toHaveText("Compare 6 combinations");
  });
});

test.describe("Compare", () => {
  // @covers US-015-AC2 @covers US-017-AC1
  // @covers US-016-AC3
  test("only the chosen palettes x systems, each cell in light and dark on real widgets", async ({ page }) => {
    const errors = watch(page);
    await toCompare(page, { systems: ["Carbon", "Fluent 2", "Databricks"] });
    await expect(page.locator(".tb-matrix__head")).toHaveText(["Carbon", "Databricks", "Fluent 2"]);
    await expect(page.locator(".tb-matrix__label")).toHaveCount(2);
    await expect(page.locator(".tb-cell")).toHaveCount(6);
    await expect(page.locator(".tb-cell .tb-preview")).toHaveCount(12);
    const cell = page.locator(".tb-cell").first();
    for (const w of [".piq-card", ".piq-btn", ".piq-btn__badge", "select", "input[type=checkbox]", ".piq-notice", ".piq-pill", "svg.piq-icon"]) await expect(cell.locator(w).first()).toBeVisible();
    await expect(cell.locator('svg.piq-icon[data-icon-set="carbon"]')).toHaveCount(10);
    expect(errors).toEqual([]);
  });

  // @covers US-017-AC4
  test("choosing a cell names it in the footer; choosing another moves it", async ({ page }) => {
    await toCompare(page);
    const save = page.getByRole("button", { name: "Save this theme" });
    await expect(page.locator("#chosen-label")).toContainText("none yet");
    await expect(save).toBeDisabled();
    await page.locator(".tb-cell").nth(0).getByRole("radio").click();
    await expect(page.locator("#chosen-label")).toContainText("× Carbon");
    await page.locator(".tb-cell").nth(3).getByRole("radio").click();
    await expect(page.locator("#chosen-label")).toContainText("× Fluent 2");
    await expect(page.locator(".tb-cell--chosen")).toHaveCount(1);
    await expect(page.locator(".tb-cell").nth(3).getByRole("radio")).toHaveAttribute("aria-checked", "true");
    await expect(save).toBeEnabled();
  });

  test("the view toggle applies to every cell", async ({ page }) => {
    await toCompare(page);
    await page.getByRole("radiogroup", { name: "Preview appearance" }).getByRole("radio", { name: "Dark", exact: true }).click();
    await expect(page.locator(".tb-cell .tb-preview")).toHaveCount(4);
    for (const head of await page.locator(".tb-cell .tb-preview__head").allInnerTexts()) expect(head).toContain("dark");
  });

  test("going back and dropping the chosen system clears the choice", async ({ page }) => {
    await toCompare(page);
    await page.locator(".tb-cell").nth(0).getByRole("radio").click();
    await page.getByRole("button", { name: "Back" }).last().click();
    await page.getByLabel("Carbon", { exact: true }).uncheck();
    await page.getByRole("button", { name: /^Compare \d+ combination/ }).click();
    await expect(page.locator("#chosen-label")).toContainText("none yet");
    await expect(page.locator(".tb-matrix__head")).toHaveText(["Fluent 2"]);
    await expect(section(page)).toBeVisible();
  });
});
