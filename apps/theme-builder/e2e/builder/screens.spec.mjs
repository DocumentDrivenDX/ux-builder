/* Step 4, Compare, on screen patterns (US-032; FEAT-003 BB-18): each cell
   shows the chosen screen at a phone and a desktop width, in the cell's
   composed tokens and its design system's variants. */

import { expect, test } from "@playwright/test";
import { toCompare, watch } from "../helpers.mjs";

const screenRadio = (page, name) => page.getByRole("radiogroup", { name: "Preview screen" }).getByRole("radio", { name, exact: true });
const viewRadio = (page, name) => page.getByRole("radiogroup", { name: "Preview appearance" }).getByRole("radio", { name, exact: true });

test.describe("Compare on screens", () => {
  // @covers US-032-AC1
  test("choosing a screen renders it from @ux-builder/ui in every cell, in the cell's tokens, with nothing fetched", async ({ page }) => {
    const errors = watch(page);
    await toCompare(page, { systems: ["Carbon", "Fluent 2"] });
    const requests = [];
    page.on("request", (r) => { if (r.url().includes("/api/")) requests.push(r.url()); });
    await screenRadio(page, "Collection list").click();
    await expect(screenRadio(page, "Collection list")).toHaveAttribute("aria-checked", "true");
    const cells = page.locator(".tb-cell");
    await expect(cells).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      const screens = cells.nth(i).locator(".tb-screen");
      await expect(screens).toHaveCount(2);
      await expect(screens.first().locator(".piq-collection").first()).toBeAttached();
      expect(await screens.first().evaluate((el) => el.style.getPropertyValue("--piq-color-accent"))).toMatch(/^#/);
    }
    // Two design systems, two different shapes: the cell's own composed tokens.
    const radius = (i) => cells.nth(i).locator(".tb-screen .piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
    expect(await radius(0)).not.toBe(await radius(1));
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  // @covers US-032-AC2
  test("each screen shows a phone-width and a desktop-width rendering side by side, each laid out for its own width", async ({ page }) => {
    await toCompare(page, { systems: ["Carbon"] });
    await screenRadio(page, "Collection list").click();
    const s = page.locator(".tb-screen").first();
    const phone = s.locator(".tb-screen__frame--phone"), desktop = s.locator(".tb-screen__frame--desktop");
    const r = await s.evaluate((el) => {
      const shown = (f, sel) => f.querySelector(sel)?.checkVisibility() ?? false;
      const [p, d] = [el.querySelector(".tb-screen__frame--phone"), el.querySelector(".tb-screen__frame--desktop")];
      return {
        phone: { items: shown(p, ".piq-collection__items"), table: shown(p, ".piq-collection__table-wrap"), bar: shown(p, ".piq-shell__bar"), side: shown(p, ".piq-shell__side"), filters: shown(p, ".piq-filter-bar__open") },
        desktop: { items: shown(d, ".piq-collection__items"), table: shown(d, ".piq-collection__table-wrap"), bar: shown(d, ".piq-shell__bar"), side: shown(d, ".piq-shell__side") },
        sideBySide: Math.abs(p.getBoundingClientRect().top - d.getBoundingClientRect().top) < 1 && p.getBoundingClientRect().right <= d.getBoundingClientRect().left,
      };
    });
    expect(r.phone).toEqual({ items: true, table: false, bar: true, side: false, filters: true });
    expect(r.desktop).toEqual({ items: false, table: true, bar: false, side: true });
    expect(r.sideBySide).toBe(true);
    await expect(phone).toHaveAttribute("aria-label", "Phone width");
    await expect(desktop).toHaveAttribute("aria-label", "Desktop width");
  });

  test("every screen fits inside its cell; when the matrix is wider than the window it scrolls sideways, from the keyboard too", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await toCompare(page, { systems: ["Carbon", "Databricks"] });
    for (const name of ["Collection list", "List with detail", "Form", "Dashboard"]) {
      await screenRadio(page, name).click();
      const spills = await page.locator(".tb-cell").evaluateAll((cells) => cells.filter((c) => {
        const r = c.getBoundingClientRect();
        return [...c.querySelectorAll(".tb-screen, .tb-screen__frame")].some((f) => f.getBoundingClientRect().right > r.right + 0.5);
      }).length);
      expect(spills, `${name}: no frame spills out of its cell`).toBe(0);
    }
    const matrix = page.getByRole("region", { name: /Themes to compare/ });
    // Headless Chromium hides scrollbars, so their size is not measured here.
    expect(await matrix.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    await matrix.focus();
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => matrix.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  // @covers US-032-AC3
  test("the appearance toggle applies to every screen rendering; Light + dark shows both", async ({ page }) => {
    await toCompare(page, { systems: ["Carbon"] });
    await screenRadio(page, "Dashboard").click();
    await expect(page.locator(".tb-cell").first().locator(".tb-screen")).toHaveCount(2);
    await viewRadio(page, "Dark").click();
    const screens = page.locator(".tb-screen");
    await expect(screens).toHaveCount(2);
    for (const p of await screens.evaluateAll((els) => els.map((e) => e.dataset.preview))) expect(p).toMatch(/:dark:dashboard$/);
    await viewRadio(page, "Light + dark").click();
    await expect(screens).toHaveCount(4);
  });

  // @covers US-032-AC4
  test("each cell shows its own design system's variants, and nothing lets the brand owner change them", async ({ page }) => {
    await toCompare(page, { palettes: [0], systems: ["Carbon", "Material Design 3"] });
    await screenRadio(page, "Collection list").click();
    const direction = (title) => page.locator(".tb-cell").nth(title === "Carbon" ? 0 : 1).locator(".tb-screen__frame--desktop .piq-shell__side .piq-primary-nav__link").first().evaluate((a) => getComputedStyle(a).flexDirection);
    await expect(page.locator(".tb-matrix__head")).toHaveText(["Carbon", "Material Design 3"]);
    expect(await direction("Carbon")).toBe("row");
    expect(await direction("Material Design 3")).toBe("column");
    await expect(page.locator("main").getByText(/variant/i)).toHaveCount(0);
    await expect(page.locator("main section").first().getByRole("radiogroup")).toHaveText([/Widgets.*Dashboard/, /Light \+ dark.*Dark/]);
  });

  // @covers US-032-AC5
  test("changing the screen keeps the palettes, design systems, appearance and the chosen combination", async ({ page }) => {
    await toCompare(page, { systems: ["Carbon", "Fluent 2"] });
    await viewRadio(page, "Light").click();
    await page.locator(".tb-cell").nth(3).getByRole("radio", { name: "Choose this theme" }).click();
    const chosen = await page.locator("#chosen-label").textContent();
    for (const name of ["Form", "List with detail", "Widgets"]) {
      await screenRadio(page, name).click();
      await expect(page.locator(".tb-cell")).toHaveCount(4);
      await expect(page.locator("#chosen-label")).toHaveText(chosen);
      await expect(viewRadio(page, "Light")).toHaveAttribute("aria-checked", "true");
      await expect(page.locator(".tb-cell").nth(3)).toHaveClass(/tb-cell--chosen/);
    }
  });
});
