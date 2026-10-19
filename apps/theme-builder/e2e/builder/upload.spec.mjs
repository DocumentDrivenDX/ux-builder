/* Step 1, Upload logo (US-016). */

import { expect, test } from "@playwright/test";
import { join } from "node:path";
import { LOGOS, start, watch } from "../helpers.mjs";

test.describe("Upload logo", () => {
  test("before a logo, only step 1 is open and the panel waits", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#step-1")).toHaveAttribute("aria-current", "step");
    for (const n of [2, 3, 4, 5, 6]) await expect(page.locator(`#step-${n}`)).toBeDisabled();
    await expect(page.getByText("Waiting for a logo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Suggest palettes" })).toHaveCount(0);
  });

  // @covers US-016-AC1 @covers US-016-AC2
  test("the sample logo: the brand colours by name and share, largest first", async ({ page }) => {
    const errors = watch(page);
    await start(page);
    await expect(page.getByAltText("Uploaded logo acme-legal-logo.svg")).toBeVisible();
    const chips = page.getByLabel("Brand colours we found").locator("li");
    await expect(chips).toHaveCount(3);
    await expect(chips.nth(0)).toContainText(/#1F3A5F\s*Navy · 9\d% of the logo's colour/);
    await expect(page.getByLabel("Brand colours we found")).toContainText("Terracotta");
    await expect(page.getByLabel("Brand colours we found")).toContainText("Gold");
    await expect(page.locator("#step-2")).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test("an uploaded SVG is measured by area", async ({ page }) => {
    await start(page, "two-colour.svg");
    const chips = page.getByLabel("Brand colours we found").locator("li");
    await expect(chips.first()).toContainText("#1F5FBF");
    await expect(chips.first()).toContainText("Blue");
    await expect(page.getByLabel("Brand colours we found")).toContainText("#F28C28");
  });

  test("a PNG logo is read from its pixels", async ({ page }) => {
    await start(page, "praxis-mark.png");
    await expect(page.getByLabel("Brand colours we found").locator("li").first()).toContainText(/Red|Crimson/);
  });

  test("a monochrome logo says so", async ({ page }) => {
    await start(page, "black-only.svg");
    await expect(page.getByText(/None: the logo is black, white or grey/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Suggest palettes" })).toBeVisible();
  });

  // @covers US-016-AC4
  test("an unsupported file shows the engine's error and changes nothing", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles("#logo-file", { name: "logo.svg", mimeType: "image/svg+xml", buffer: Buffer.from("GIF89a not a logo") });
    await expect(page.getByText(/unsupported file: expected an SVG or PNG logo/)).toBeVisible();
    await expect(page.getByText("Waiting for a logo")).toBeVisible();
  });

  test("an SVG's scripts never run", async ({ page }) => {
    const dialogs = [];
    page.on("dialog", (d) => { dialogs.push(d.message()); d.dismiss(); });
    await start(page, "hostile.svg");
    await expect(page.getByLabel("Brand colours we found")).toContainText("#7A3FF2");
    expect(await page.evaluate(() => globalThis.__pwned)).toBeUndefined();
    expect(dialogs).toEqual([]);
  });

  test("a dark-background version can be added, and the logo replaced", async ({ page }) => {
    await start(page);
    await page.getByRole("button", { name: "Add a dark-background version" }).click();
    await page.setInputFiles('input[aria-label="Dark-background logo"]', join(LOGOS, "black-only.svg"));
    await expect(page.getByText("dark background: black-only.svg")).toBeVisible();
    await page.getByRole("button", { name: "Replace" }).click();
    await expect(page.getByText("Waiting for a logo")).toBeVisible();
    await expect(page.locator("#step-2")).toBeDisabled();
  });

  test("Help and Your themes open from the header", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Help" }).click();
    await expect(page.getByText("How it works")).toBeVisible();
    await page.getByRole("button", { name: "Your themes" }).click();
    await expect(page.getByText("Themes in this repository")).toBeVisible();
    await expect(page.getByRole("list", { name: "Themes" })).toContainText("databricks");
  });
});

test.describe("The builder's own look", () => {
  test("it wears the praxis-v2-databricks theme, and Auto, Light and Dark switch its appearance and are remembered", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const shell = page.locator(".tb");
    await expect(shell).toHaveAttribute("data-theme", "praxis-v2-databricks");
    const picker = page.getByRole("radiogroup", { name: "Appearance" });
    await expect(picker.getByRole("radio", { name: "Auto" })).toHaveAttribute("aria-checked", "true");
    await expect(shell).toHaveAttribute("data-appearance", "dark", { timeout: 2000 });
    await page.emulateMedia({ colorScheme: "light" });
    await expect(shell).toHaveAttribute("data-appearance", "light");
    await picker.getByRole("radio", { name: "Dark" }).click();
    await expect(shell).toHaveAttribute("data-appearance", "dark");
    await page.reload();
    await expect(shell).toHaveAttribute("data-appearance", "dark");
    await page.getByRole("radiogroup", { name: "Appearance" }).getByRole("radio", { name: "Light" }).click();
    await expect(shell).toHaveAttribute("data-appearance", "light");
  });
});
