/* The core flow (US-015), logo to a saved theme, as in the prototype. Saves
   acme-legal-carbon, which the client project then adopts. */

import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { root, section, token, watch } from "../helpers.mjs";

test("logo to a saved theme, as in the prototype", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/");

  // 1 (@covers US-016-AC1 @covers US-016-AC2)
  await page.getByRole("button", { name: "Use the sample logo" }).click();
  // The suite's first logo analysis: a fresh server loads the engine for it, which on a slow CI runner
  // takes longer than expect's 5 s default (the same analysis later in the suite takes under 2 s).
  await expect(page.getByLabel("Brand colours we found").locator("li").first()).toContainText("Navy", { timeout: 30_000 });
  await page.getByRole("button", { name: "Suggest palettes" }).click();

  // 2 (@covers US-015-AC1 @covers US-015-AC3)
  await expect(page.locator(".tb-card")).toHaveCount(5);
  for (const i of [0, 1]) await page.locator(".tb-card").nth(i).getByRole("button", { name: "Add to compare" }).click();
  const structure = () => token(page.locator(".tb-card").first().locator(".tb-preview").first(), "--piq-color-structure");
  const before = await structure();
  await page.getByLabel(/Tell us what to change/).fill("more conservative, it's a law firm");
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(page.getByRole("status")).toContainText("Your selections carried over");
  await expect.poll(structure).not.toBe(before);

  // 3, 4 (@covers US-015-AC2)
  await section(page).getByRole("button", { name: "Pick design systems" }).click();
  await page.getByLabel("Carbon", { exact: true }).check();
  await page.getByLabel("Fluent 2", { exact: true }).check();
  await page.getByRole("button", { name: "Compare 4 combinations" }).click();
  await expect(page.locator(".tb-cell .tb-preview")).toHaveCount(8);
  await page.locator(".tb-cell").nth(0).getByRole("radio").click();
  await expect(page.locator("#chosen-label")).toContainText("× Carbon");
  await page.getByRole("button", { name: "Save this theme" }).click();

  // 5 (@covers US-015-AC4)
  await expect(page.locator("#theme-name")).toHaveValue("acme-legal-carbon");
  await page.getByRole("button", { name: "Save theme", exact: true }).click();

  // 6 (@covers US-015-AC5)
  await expect(page.getByRole("heading", { name: "Use acme-legal-carbon in your app" })).toBeVisible();
  await expect(page.locator(".tb-task")).toHaveCount(8);
  await expect(page.locator("#code-fonts-0")).toHaveText('import "@ux-builder/tokens/fonts/acme-legal-carbon.css";');
  for (const f of ["tokens/brands/acme-legal.brand.json", "tokens/themes/acme-legal-carbon.theme.json", "brand/acme-legal/logo.svg"]) expect(existsSync(join(root(), f)), f).toBe(true);
  expect(errors).toEqual([]);

  // Hand the theme to the client project.
  const theme = JSON.parse(readFileSync(join(root(), "tokens/themes/acme-legal-carbon.theme.json"), "utf8"));
  writeFileSync(new URL("../.saved.json", import.meta.url), JSON.stringify({ theme: theme.name, brand: theme.brand, designSystem: theme.designSystem, root: root() }));
});
