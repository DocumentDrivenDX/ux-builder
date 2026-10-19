/* Step 2, Pick palettes (US-015-AC1, US-017, US-018). */

import { expect, test } from "@playwright/test";
import { pick, section, toPalettes, token, watch } from "../helpers.mjs";

test.describe("Pick palettes", () => {
  test("four or more options, each with an AA badge, swatches, a note and light + dark previews", async ({ page }) => {
    const errors = watch(page);
    await toPalettes(page);
    const cards = page.locator(".tb-card");
    expect(await cards.count()).toBeGreaterThanOrEqual(4);
    await expect(cards.locator("h2")).toContainText(["Faithful", "Muted", "Vibrant", "Neutral + accent"]);
    for (let i = 0; i < await cards.count(); i++) {
      const c = cards.nth(i);
      await expect(c.locator(".tb-aa")).toHaveText(/AA · (\d+)\/\1/);
      await expect(c.locator(".tb-swatches span")).toHaveCount(7);
      await expect(c.locator(".tb-hint").first()).not.toBeEmpty();
      await expect(c.locator(".tb-preview")).toHaveCount(2);
    }
    expect(errors).toEqual([]);
  });

  // @covers US-017-AC2
  test("the view toggle shows light + dark, light only or dark only", async ({ page }) => {
    await toPalettes(page);
    const previews = page.locator(".tb-card").first().locator(".tb-preview");
    await page.getByRole("radiogroup", { name: "Preview appearance" }).getByRole("radio", { name: "Light", exact: true }).click();
    await expect(previews).toHaveCount(1);
    await expect(previews.first().locator(".tb-preview__head")).toContainText("light");
    await page.getByRole("radiogroup", { name: "Preview appearance" }).getByRole("radio", { name: "Dark", exact: true }).click();
    await expect(previews.first().locator(".tb-preview__head")).toContainText("dark");
    const ground = await token(previews.first(), "--piq-color-ground");
    await page.getByRole("radiogroup", { name: "Preview appearance" }).getByRole("radio", { name: "Light + dark" }).click();
    await expect(previews).toHaveCount(2);
    expect(await token(previews.nth(0), "--piq-color-ground")).not.toBe(ground);
  });

  test("adding and removing palettes updates the count and the next step", async ({ page }) => {
    await toPalettes(page);
    const next = section(page).getByRole("button", { name: "Pick design systems" });
    await expect(next).toBeDisabled();
    await pick(page, [0, 2]);
    await expect(page.locator("#pal-count")).toHaveText("2 selected");
    await expect(page.locator(".tb-card--on")).toHaveCount(2);
    await page.locator(".tb-card").nth(0).getByRole("button", { name: "Added to compare" }).click();
    await expect(page.locator("#pal-count")).toHaveText("1 selected");
    await expect(next).toBeEnabled();
  });

  // @covers US-015-AC3 @covers US-018-AC1 @covers US-018-AC2 @covers US-018-AC3
  test("feedback makes a new round, explains it, and keeps the selection", async ({ page }) => {
    await toPalettes(page);
    await pick(page, [0, 1]);
    const before = await token(page.locator(".tb-card").first().locator(".tb-preview").first(), "--piq-color-structure");
    await page.getByLabel(/Tell us what to change/).fill("more conservative, it's a law firm");
    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByRole("status")).toContainText("lowered saturation");
    await expect(page.getByRole("status")).toContainText("Your selections carried over");
    await expect(page.locator(".tb-pill").first()).toHaveText("Round 2");
    await expect(page.locator("#pal-count")).toHaveText("2 selected");
    await expect.poll(() => token(page.locator(".tb-card").first().locator(".tb-preview").first(), "--piq-color-structure")).not.toBe(before);
  });

  test("feedback the engine cannot express says so", async ({ page }) => {
    await toPalettes(page);
    await page.getByLabel(/Tell us what to change/).fill("add a gradient");
    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByRole("status")).toContainText("couldn't map that to a setting");
  });

  // @covers US-018-AC4
  test("the settings sliders make a new round without the model", async ({ page }) => {
    await toPalettes(page);
    await page.getByText("Adjust the settings yourself").click();
    await page.getByLabel(/Saturation/).fill("0.6");
    await page.getByRole("button", { name: "Apply settings" }).click();
    await expect(page.locator(".tb-pill").first()).toHaveText("Round 2");
    await expect(page.getByRole("status")).toContainText("chromaScale to 0.6");
  });

  // @covers US-017-AC3
  test("large colour moves are listed on the card", async ({ page }) => {
    await toPalettes(page, "pale-yellow.svg");
    const flags = page.locator(".tb-card").first().getByLabel("Large colour moves");
    await expect(flags).toBeVisible();
    await expect(flags).toContainText(/accent: #[0-9A-F]{6} → #[0-9A-F]{6}/);
  });

  // @covers US-018-AC5
  test("without an API key, feedback is disabled with the reason; sliders still work", async ({ page }) => {
    await page.route("**/api/context", async (route) => {
      const body = await (await route.fetch()).json();
      await route.fulfill({ json: { ...body, model: { available: false, reason: "No OpenAI API key: set OPENAI_API_KEY." } } });
    });
    await toPalettes(page);
    await expect(page.getByLabel(/Tell us what to change/)).toBeDisabled();
    await expect(page.getByText("No OpenAI API key: set OPENAI_API_KEY.")).toBeVisible();
    await page.getByText("Adjust the settings yourself").click();
    await page.getByLabel(/Hue shift/).fill("12");
    await page.getByRole("button", { name: "Apply settings" }).click();
    await expect(page.locator(".tb-pill").first()).toHaveText("Round 2");
  });

  test("a model error is shown on the feedback box", async ({ page }) => {
    await page.route("**/api/feedback", (route) => route.fulfill({ status: 502, json: { error: "the model proposed an invalid setting: strategies: unknown pastel" } }));
    await toPalettes(page);
    await page.getByLabel(/Tell us what to change/).fill("pastel please");
    await page.getByRole("button", { name: "Regenerate" }).click();
    await expect(page.getByText(/the model proposed an invalid setting/)).toBeVisible();
    await expect(page.locator(".tb-pill").first()).toHaveText("Round 1");
  });
});
