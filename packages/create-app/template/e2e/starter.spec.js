// The starter screen (docs/helix/01-frame/user-stories/US-001-see-search-and-add-matters.md).
// Each test cites the criterion it proves, so HELIX traceability and the UX
// assessment see them. Replace these with your own as the screen changes.
import { expect, test } from "@playwright/test";

const matters = (page) => page.getByRole("table", { name: "Matters" });

// @covers US-001-AC1
test("the matters are listed with their partner, hours and status", async ({ page }) => {
  await page.goto("/");
  await expect(matters(page).getByRole("row")).toHaveCount(4);
  await expect(matters(page)).toContainText("Halvorsen v. Atlas");
  await expect(matters(page)).toContainText("R. Okafor");
  await expect(matters(page)).toContainText("12.4");
});

// @covers US-001-AC2
test("search lists only the matters whose name contains the text", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Search").fill("estate");
  await expect(matters(page).getByRole("row")).toHaveCount(2);
  await expect(matters(page)).toContainText("Okafor estate");
});

// @covers US-001-AC3
test("Add matter is busy while it runs, then a toast confirms it with Undo", async ({ page }) => {
  await page.goto("/");
  const add = page.getByRole("button", { name: "Add matter" });
  await add.click();
  await expect(add).toHaveAttribute("aria-busy", "true");
  await expect(page.getByText("Matter added.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
});

// @covers US-001-AC4
test("the theme and appearance follow the controls without a reload", async ({ page }) => {
  await page.goto("/");
  // The ThemeProvider's element (src/main.jsx), which every widget sits in.
  const root = page.locator(".app[data-theme]");
  const before = await root.getAttribute("data-theme");
  const options = await page.getByLabel("Theme").locator("option").evaluateAll((o) => o.map((x) => x.value));
  // Any other theme with a dark appearance (plain has only light).
  const other = options.find((v) => v !== before && v !== "plain");
  await page.getByLabel("Theme").selectOption(other);
  await expect(root).toHaveAttribute("data-theme", other);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(root).toHaveAttribute("data-appearance", "dark");
});
