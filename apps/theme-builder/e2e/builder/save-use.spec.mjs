/* Steps 5 and 6, Save theme and Use in your app (US-019). */

import { expect, test } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "../../../../packages/tokens/compose.mjs";
import { MARK, root, toSave, watch } from "../helpers.mjs";

test.describe("Save theme", () => {
  // @covers US-019-AC2
  test("light and dark previews, the name prefilled, and the summary", async ({ page }) => {
    await toSave(page, { systems: ["Carbon"] });
    await expect(page.locator("#theme-name")).toHaveValue("acme-legal-carbon");
    await expect(page.locator(".tb-pair .tb-preview")).toHaveCount(2);
    const dl = page.locator(".tb-dl");
    for (const t of ["Palette", "Design system", "Icons", "Fonts", "Appearances", "Contrast"]) await expect(dl.getByText(t, { exact: true })).toBeVisible();
    await expect(dl).toContainText("brand acme-legal");
    await expect(dl).toContainText("Carbon Icons");
    await expect(dl).toContainText("IBM Plex Sans");
    await expect(dl).toContainText(/(\d+) of \1 pairings pass in both/);
  });

  // @covers US-019-AC1
  test("names are checked as you type", async ({ page }) => {
    await toSave(page, { systems: ["Carbon"] });
    const name = page.locator("#theme-name"), hint = page.locator("#theme-name-hint"), save = page.getByRole("button", { name: "Save theme", exact: true });
    for (const bad of ["Acme", "acme_legal", "-acme", "acme--x"]) {
      await name.fill(bad);
      await expect(hint).toContainText("Use lowercase letters, digits and hyphens");
      await expect(save).toBeDisabled();
    }
    await name.fill("praxis-carbon");
    await expect(hint).toContainText("already a theme called praxis-carbon");
    await name.fill("synaptiq-carbon");
    await expect(hint).toContainText("already a brand called synaptiq");
    await name.fill("names-ok-carbon");   // unused by every other test
    await expect(hint).toHaveText("Lowercase letters, digits and hyphens.");
    await expect(save).toBeEnabled();
  });

  test("a server refusal is shown and nothing is saved", async ({ page }) => {
    await page.route("**/api/save", (route) => route.fulfill({ status: 422, json: { error: "the theme would not build: test" } }));
    await toSave(page, { systems: ["Carbon"] });
    await page.locator("#theme-name").fill("refused-carbon");
    await page.getByRole("button", { name: "Save theme", exact: true }).click();
    await expect(page.getByText("the theme would not build: test")).toBeVisible();
    expect(existsSync(join(root(), "tokens/themes/refused-carbon.theme.json"))).toBe(false);
  });
});

test.describe("Save and use", () => {
  // @covers US-015-AC4 @covers US-019-AC3 @covers US-019-AC4 @covers US-015-AC5 @covers US-019-AC5 @covers US-019-AC6 @covers US-045-AC6
  test("saving writes a theme that builds, then eight tasks to use it", async ({ page }) => {
    const errors = watch(page);
    await toSave(page, { systems: ["Fluent 2"], palettes: [1] });
    await page.locator("#theme-name").fill("saveuse-fluent");
    await expect(page.getByText(/stored as brand/)).toContainText("saveuse");
    await page.getByRole("button", { name: "Save theme", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Use saveuse-fluent in your app" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("tokens/themes/saveuse-fluent.theme.json");

    const src = load(join(root(), "tokens"), join(root(), "brand"));
    expect(src.themes.get("saveuse-fluent")).toMatchObject({ brand: "saveuse", designSystem: "fluent", default: "light" });
    expect(src.brands.get("saveuse").generation.strategy).toBe("muted");
    expect(readFileSync(join(root(), "brand/saveuse/logo.svg"), "utf8")).toContain("Acme Legal logo");
    // The browser measured the sample's margins; the brand draws a framed copy (US-019-AC5).
    const framedLogo = readFileSync(join(root(), "brand/saveuse/logo-framed.svg"), "utf8");
    expect(framedLogo).toContain("Acme Legal logo");
    expect(framedLogo).toMatch(/^<svg viewBox="[\d.]+ [\d.]+ (6[4-9]|70)(\.\d+)? (6[4-9]|70)(\.\d+)?"/);
    const drawn = src.brands.get("saveuse").appearances.light.brand;
    expect(drawn["logo-image"].$value).toBe("../../brand/saveuse/logo-framed.svg");
    expect(Number(drawn["logo-aspect"].$value)).toBeCloseTo(1, 1);
    // And a changeset, so merging the pull request releases it (US-019-AC6).
    expect(readFileSync(join(root(), ".changeset/theme-saveuse-fluent.md"), "utf8")).toContain('"@ux-builder/tokens": minor');

    await expect(page.locator(".tb-task")).toHaveCount(8);
    await expect(page.locator(".tb-task h3")).toContainText(["Install the SDK", "Load the theme", "Turn the theme on", "Follow the user", "Load", "Build with the widgets", "Catch hard-coded colours", "Check it worked"]);
    const accent = src.brands.get("saveuse").appearances.light.color.accent.$value;
    await expect(page.locator("#code-verify-0")).toContainText(`"${accent}"`);
    await expect(page.locator("#code-css-0")).toHaveText('import "@ux-builder/tokens/themes/saveuse-fluent.css";\nimport "@ux-builder/ui/ui.css";');
    await expect(page.locator("#code-appearance-0")).toContainText('<ThemeProvider theme="saveuse-fluent" appearance="system">');
    await expect(page.locator("#code-fonts-0")).toContainText("ship with the operating system");

    await page.getByRole("tab", { name: "Next.js" }).click();
    await expect(page.locator("#code-attrs-0")).toContainText('<html lang="en" data-theme="saveuse-fluent" data-appearance="light">');
    await expect(page.locator("#code-appearance-0")).toContainText("prefers-color-scheme");
    await page.getByRole("tab", { name: "Plain HTML" }).click();
    await expect(page.locator("#code-css-0")).toContainText('href="/node_modules/@ux-builder/tokens/dist/themes/saveuse-fluent.css"');

    await page.getByLabel("Mark step 1 done").check();
    await page.getByLabel("Mark step 2 done").check();
    await expect(page.locator("#progress-label")).toHaveText("2 of 8 done");
    await expect(page.locator("#task-install")).toHaveClass(/tb-task--done/);
    await expect(page.locator(".tb-files")).toContainText("package.json");
    await expect(page.locator("#code-agent")).toContainText("Use the theme saveuse-fluent from @ux-builder/tokens and @ux-builder/ui");
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy terminal" }).click();
    await expect(page.getByRole("button", { name: "Copy terminal" })).toHaveText("Copied");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("npm install @ux-builder/tokens @ux-builder/ui");

    // A chat library (US-045-AC6): its command, the theme's shadcn bridge and how to connect it; none adds nothing.
    const chat = page.getByRole("radiogroup", { name: "Chat library" });
    await expect(chat.getByRole("radio")).toHaveText(["None", "AI Elements", "assistant-ui"], { useInnerText: true });
    await chat.getByRole("radio", { name: "AI Elements" }).click();
    await expect(page.locator(".tb-task")).toHaveCount(9);
    await expect(page.locator("#task-chat h3")).toContainText("Add the assistant with AI Elements");
    await expect(page.locator("#code-chat-0")).toContainText("npx ai-elements@latest add conversation message prompt-input");
    await expect(page.locator("#code-chat-1")).toContainText('href="/node_modules/@ux-builder/tokens/dist/bridges/shadcn/saveuse-fluent.css"');
    await expect(page.locator("#code-chat-2")).toContainText('import { useChat } from "@ai-sdk/react";');
    await expect(page.locator("#code-agent")).toContainText("import @ux-builder/tokens/bridges/shadcn/saveuse-fluent.css after the theme");
    await page.getByRole("tab", { name: "React + Vite" }).click();
    await chat.getByRole("radio", { name: "assistant-ui" }).click();
    await expect(page.locator("#code-chat-0")).toContainText("npx assistant-ui@latest add thread");
    await expect(page.locator("#code-chat-1")).toHaveText('import "@ux-builder/tokens/bridges/shadcn/saveuse-fluent.css";   // after the theme');
    await expect(page.locator("#code-chat-2")).toContainText('import { useChatRuntime } from "@assistant-ui/react-ai-sdk";');
    await expect(page.locator("#task-chat")).not.toContainText(/copilotkit/i);
    await chat.getByRole("radio", { name: "None" }).click();
    await expect(page.locator(".tb-task")).toHaveCount(8);
    expect(errors).toEqual([]);
  });
});

test.describe("Mark and favicon", () => {
  // @covers US-016-AC5 @covers US-019-AC7
  test("a mark added at upload is saved square as the brand's mark and favicon, and previews in Your themes", async ({ page }) => {
    const errors = watch(page);
    await toSave(page, { mark: MARK, systems: ["Carbon"] });
    await page.locator("#theme-name").fill("markup-carbon");
    await page.getByRole("button", { name: "Save theme", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Use markup-carbon in your app" })).toBeVisible();

    const saved = readFileSync(join(root(), "brand/markup/mark.svg"), "utf8");
    const [, w, h] = /<svg viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/.exec(saved) ?? [];
    expect(w).toBeTruthy();
    expect(w).toBe(h);
    const brand = load(join(root(), "tokens"), join(root(), "brand")).brands.get("markup");
    for (const ap of Object.keys(brand.appearances)) {
      expect(brand.appearances[ap].brand["mark-image"].$value).toBe("../../brand/markup/mark.svg");
      expect(brand.appearances[ap].brand.favicon.$value).toBe("../../brand/markup/mark.svg");
    }

    // Saved since the builder started, and it previews with its mark and favicon (US-020-AC4).
    await page.getByRole("button", { name: "Your themes" }).click();
    await page.getByRole("link", { name: "markup-carbon", exact: true }).click();
    const cell = page.locator('[data-theme-preview="markup-carbon:light"]');
    for (const alt of [/mark, light/, /favicon, light/]) {
      const img = cell.getByRole("img", { name: alt });
      await expect(img).toBeVisible();
      expect(await img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
});
