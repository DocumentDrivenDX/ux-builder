/* "Your themes" (US-020): the list, each theme a link to its own page,
   whose brand section previews its palette, its widgets, and its logos and
   favicon. */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { root, watch } from "../helpers.mjs";

const brandFile = (name) => JSON.parse(readFileSync(join(root(), `tokens/brands/${name}.brand.json`), "utf8"));
async function open(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Your themes" }).click();
}

test.describe("Your themes", () => {
  // @covers US-020-AC1
  test("lists every theme in the repository with its design system", async ({ page }) => {
    const errors = watch(page);
    await open(page);
    const list = page.getByRole("list", { name: "Themes" });
    for (const [name, ds] of [["praxis-carbon", "carbon"], ["databricks", "databricks"], ["plain", "own anatomy"]]) {
      await expect(list.getByRole("listitem").filter({ hasText: name }).first()).toContainText(ds);
    }
    expect(errors).toEqual([]);
  });

  // @covers US-020-AC1
  test("is a view of its own, in place of the steps, at ?view=themes; Back returns to the step you were on", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Use the sample logo" }).click();
    await page.getByRole("button", { name: "Your themes" }).click();
    await expect(page).toHaveURL(/\?view=themes$/);
    await expect(page.getByRole("heading", { level: 1, name: "Your themes" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Steps" })).toBeHidden();
    await expect(page.getByText("Start with the client's logo")).toBeHidden();
    await page.getByRole("button", { name: "Back to the builder" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("list", { name: "Steps" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Suggest palettes" }), "the logo chosen before is still there").toBeVisible();
    await page.goto("/?view=themes");
    await expect(page.getByRole("heading", { level: 1, name: "Your themes" })).toBeVisible();
    await page.goto("/?theme=praxis-carbon");
    await page.getByRole("link", { name: "All themes" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Your themes" })).toBeVisible();
  });

  // @covers US-020-AC2 @covers US-020-AC3 @covers US-021-AC8
  test("previews a theme in light and dark: palette, widgets in its anatomy and icons, logos, mark and favicon", async ({ page }) => {
    const errors = watch(page);
    await open(page);
    await page.getByRole("link", { name: "praxis-carbon", exact: true }).click();
    await expect(page).toHaveURL(/\?theme=praxis-carbon$/);
    const preview = page.getByRole("region", { name: "Preview of praxis-carbon" });
    await expect(preview).toContainText("design system Carbon");
    const brand = brandFile("praxis");
    for (const ap of ["light", "dark"]) {
      const cell = preview.locator(`[data-theme-preview="praxis-carbon:${ap}"]`);
      // The palette, every role with its value from the brand file.
      const palette = cell.getByRole("list", { name: `praxis-carbon ${ap} palette` });
      await expect(palette.getByRole("listitem")).toHaveCount(Object.keys(brand.appearances[ap].color).length + Object.keys(brand.appearances[ap].state).length);
      await expect(palette).toContainText(brand.appearances[ap].color.accent.$value);
      // The widgets take the theme's tokens: Carbon's square buttons, its accent, its icons.
      expect(await cell.locator(".piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("0px");
      expect(await cell.evaluate((el) => getComputedStyle(el).getPropertyValue("--piq-color-accent").trim().toUpperCase())).toBe(brand.appearances[ap].color.accent.$value.toUpperCase());
      await expect(cell.locator("svg.piq-icon").first()).toHaveAttribute("data-icon-set", "carbon");
      // The loading widgets in the anatomy too (US-021-AC8): Carbon's square 8px bar.
      const bar = cell.getByRole("progressbar", { name: "Prebill review" });
      await expect(bar).toHaveAttribute("aria-valuenow", "60");
      expect(await bar.evaluate((el) => [el.getBoundingClientRect().height, getComputedStyle(el).borderTopLeftRadius])).toEqual([8, "0px"]);
      await expect(cell.locator(".piq-spinner").filter({ hasText: "Syncing entries" })).toBeVisible();
      await expect(cell.locator(".piq-spinner")).not.toHaveAttribute("role", "status");
      // Artwork that draws: the appearance's logo, the mark, the favicon.
      for (const alt of [`Praxis logo, ${ap}`, `Praxis mark, ${ap}`, `Praxis favicon, ${ap}`]) {
        const img = cell.getByRole("img", { name: alt });
        await expect(img).toBeVisible();
        expect(await img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
      }
    }
    const logos = await preview.getByRole("img", { name: /Praxis logo/ }).evaluateAll((els) => els.map((e) => e.src));
    expect(logos[0]).not.toBe(logos[1]);
    expect(errors).toEqual([]);
  });

  // @covers US-020-AC3
  test("a brand without artwork shows its title in its logo colour, and no mark or favicon", async ({ page }) => {
    await open(page);
    await page.getByRole("link", { name: "plain", exact: true }).click();
    const cell = page.locator('[data-theme-preview="plain:light"]');
    await expect(page.locator('[data-theme-preview="plain:dark"]')).toHaveCount(0);
    const word = cell.locator(".tb-themes__wordmark");
    await expect(word).toHaveText("Plain");
    expect(await word.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(208, 52, 44)");
    await expect(cell).toContainText("None: the app's own");
    await expect(cell.getByRole("img", { name: /mark|favicon/ })).toHaveCount(0);
  });
});
