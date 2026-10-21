/* A theme's own page (?theme=<name>): it wears the theme in light, dark or
   auto; a menu on the left reaches its brand, its CSS for each appearance,
   and every widget and screen pattern, each rendered from its Storybook
   story with a link to that story in the theme. */

import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, watch } from "../helpers.mjs";

const catalogue = JSON.parse(readFileSync(join(REPO, "packages/ui/catalogue.json"), "utf8"));
const names = (k) => catalogue[k].filter((w) => w.type === "component").map((w) => w.name).sort((a, b) => a.localeCompare(b));
const resolved = (theme, ap) => JSON.parse(readFileSync(join(REPO, `packages/tokens/dist/resolved/${theme}.${ap}.json`), "utf8")).tokens;
const accent = (page) => page.locator(".tp").evaluate((el) => getComputedStyle(el).getPropertyValue("--piq-color-accent").trim().toUpperCase());

test.describe("A theme's page", () => {
  // @covers US-020-AC5 @covers US-020-AC6
  test("opens from Your themes and from its URL, and wears the theme; the switch picks light, dark or the system's", async ({ page }) => {
    const errors = watch(page);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.getByRole("button", { name: "Your themes" }).click();
    await page.getByRole("link", { name: "praxis-v2-databricks", exact: true }).click();
    await expect(page).toHaveURL(/\?theme=praxis-v2-databricks$/);
    await expect(page.getByRole("heading", { level: 1, name: "Praxis V2 Databricks" })).toBeVisible();
    await expect(page).toHaveTitle("Praxis V2 Databricks · Theme");

    const sw = page.getByRole("radiogroup", { name: "Theme appearance" });
    await sw.getByRole("radio", { name: "Auto" }).click();
    expect(await accent(page)).toBe(resolved("praxis-v2-databricks", "dark")["piq-color-accent"].toUpperCase());
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(() => accent(page)).toBe(resolved("praxis-v2-databricks", "light")["piq-color-accent"].toUpperCase());
    await sw.getByRole("radio", { name: "Dark" }).click();
    await expect(sw.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
    await expect.poll(() => accent(page)).toBe(resolved("praxis-v2-databricks", "dark")["piq-color-accent"].toUpperCase());
    // Arrow keys move the choice, as in any radio group.
    await sw.getByRole("radio", { name: "Dark" }).press("ArrowLeft");
    await expect(sw.getByRole("radio", { name: "Auto" })).toHaveAttribute("aria-checked", "true");
    await expect(sw.getByRole("radio", { name: "Auto" })).toBeFocused();
    expect(errors).toEqual([]);
  });

  // @covers US-020-AC7 @covers US-020-AC8
  test("the menu reaches the brand, the CSS for light, dark and auto, and every widget and screen pattern", async ({ page }) => {
    await page.goto("/?theme=praxis-carbon");
    const nav = page.getByRole("navigation", { name: "Theme contents" });
    await expect(nav.getByRole("link", { name: "Logos and palette" })).toBeVisible();
    const links = await nav.getByRole("link").allTextContents();
    const ai = JSON.parse(readFileSync(join(REPO, "packages/ui/ai/vendor/components.json"), "utf8")).components;
    expect(links).toEqual(["Logos and palette", "Light", "Dark", "Auto", "Generative UI bridges", ...names("widgets"), "About these", ...ai.map((c) => `${c.name}, ${c.library}`), ...names("patterns"), "Conversation", ...names("assistant").filter((n) => n !== "Conversation")]);
    await expect(nav.locator(".tp-nav__group")).toHaveText(["Brand", "CSS", "UI Components", "AI Components", "Screen patterns", "Assistant"]);

    await nav.getByRole("link", { name: "Dark", exact: true }).click();
    await expect(page).toHaveURL(/#css-dark$/);
    const dark = page.locator("#css-dark");
    await expect(dark).toContainText('data-theme="praxis-carbon" data-appearance="dark"');
    await expect(dark).toContainText(`--piq-color-accent: ${resolved("praxis-carbon", "dark")["piq-color-accent"]};`);
    await expect(nav.getByRole("link", { name: "Dark", exact: true })).toHaveAttribute("aria-current", "location");
    await expect(page.locator("#css-auto")).toContainText('appearance="system"');
    const bridges = page.locator("#css-bridges");
    await expect(bridges).toContainText('@import "@ux-builder/tokens/bridges/shadcn/praxis-carbon.css"');
    await expect(bridges.locator(".tp-code")).toHaveCount(1);   // one surface: AI Elements and assistant-ui both use shadcn's variables
    await expect(bridges).toContainText(`--background: ${resolved("praxis-carbon", "dark")["piq-color-ground"]};`);

    await nav.getByRole("link", { name: "Tooltip" }).click();
    await expect(page.locator("#widget-Tooltip")).toBeInViewport();
    await expect(nav.getByRole("link", { name: "Tooltip" })).toHaveAttribute("aria-current", "location");
  });

  // @covers US-020-AC9
  // @covers US-046-AC10
  test("the Assistant section shows a conversation with a tool call, sources and an approval in the theme, and each assistant component from its story", async ({ page }) => {
    const errors = watch(page);
    for (const [theme, ap] of [["praxis-carbon", "light"], ["databricks", "dark"]]) {
      await page.emulateMedia({ colorScheme: ap });
      await page.goto(`/?theme=${theme}`);
      await expect(page.getByRole("navigation", { name: "Theme contents" }).getByRole("link", { name: "Conversation", exact: true })).toBeVisible();
      const conv = page.locator("#assistant-Conversation .tp-sample .piq-conversation");
      await expect(conv).toHaveCount(1);
      await expect(conv.locator('[data-piq-ai="step"]').first()).toContainText("Looked up time entries");
      await expect(conv.locator(".piq-sources li")).toHaveCount(2);
      await expect(conv.locator('[data-piq-ai="approval"]').getByRole("button")).toHaveText(["Approve", "Deny"]);
      for (const name of names("assistant")) {
        await expect(page.locator(`#assistant-${name} .tp-sample`), `${name} has a sample`).toHaveCount(1);
        await expect(page.locator(`#assistant-${name} .tp-sample`)).not.toContainText("did not render here");
      }
      const tokens = resolved(theme, ap);
      expect((await conv.locator(".piq-approval").evaluate((el) => getComputedStyle(el).borderInlineStartColor))).toBeTruthy();
      expect(await page.locator(".tp").evaluate((el) => getComputedStyle(el).getPropertyValue("--piq-color-accent").trim().toUpperCase())).toBe(tokens["piq-color-accent"].toUpperCase());
    }
    expect(errors).toEqual([]);
  });

  test("every widget and pattern renders from its own story, linked to that story in Storybook in this theme", async ({ page }) => {
    const errors = watch(page);
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/?theme=praxis-carbon");
    await page.getByRole("radiogroup", { name: "Theme appearance" }).getByRole("radio", { name: "Light" }).click();
    for (const [kind, list] of [["widget", names("widgets")], ["pattern", names("patterns")]]) {
      for (const name of list) {
        const entry = page.locator(`#${kind}-${name}`);
        await expect(entry.locator(".tp-sample"), `${name} has a sample`).toHaveCount(1);
        await expect(entry.locator(".tp-sample"), `${name}'s story renders`).not.toContainText("did not render here");
        const story = await entry.locator(".tp-sample").getAttribute("data-story");
        await expect(entry.getByRole("link", { name: "Open in Storybook" })).toHaveAttribute("href", `http://localhost:6006/?path=/story/${story}&globals=theme:praxis-carbon-light`);
      }
    }
    // Its own story first: Button's sample is the Button story, not one that merely contains a button.
    expect(await page.locator("#widget-Button .tp-sample").getAttribute("data-story")).toMatch(/^ui-components-button--/);
    // The samples wear the theme: Carbon's square buttons.
    expect(await page.locator("#widget-Button .piq-btn").first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("0px");
    expect(errors).toEqual([]);
  });

  // @covers US-020-AC5 @covers US-020-AC6
  // @covers US-045-AC5
  test("AI Components sit apart from the UI Components: each AI Elements and assistant-ui component in the theme, with its library, docs and Storybook story", async ({ page }) => {
    const errors = watch(page);
    const ai = JSON.parse(readFileSync(join(REPO, "packages/ui/ai/vendor/components.json"), "utf8")).components;
    expect(ai.map((c) => c.library)).toEqual(expect.arrayContaining(["AI Elements", "assistant-ui"]));
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/?theme=praxis-carbon");
    await page.getByRole("radiogroup", { name: "Theme appearance" }).getByRole("radio", { name: "Light" }).click();
    await expect(page.getByRole("heading", { level: 2, name: "UI Components" })).toBeVisible();
    const section = page.getByRole("region", { name: "AI Components" });
    await expect(section).toContainText('@import "@ux-builder/tokens/bridges/shadcn/praxis-carbon.css";');
    const light = resolved("praxis-carbon", "light");
    for (const c of ai) {
      const entry = section.locator(`#ai-${c.name}`);
      await expect(entry.getByRole("heading", { level: 3 })).toContainText(`${c.library} · ${c.licence}`);
      await expect(entry.locator(".tp-sample")).toHaveCount(1);
      await expect(entry.locator(".tp-sample")).not.toContainText("did not render here");
      const id = await entry.locator(".tp-sample").getAttribute("data-story");
      expect(id).toMatch(/^ai-components-/);
      await expect(entry.getByRole("link", { name: "Open in Storybook" })).toHaveAttribute("href", `http://localhost:6006/?path=/story/${id}&globals=theme:praxis-carbon-light`);
      await expect(entry.getByRole("link", { name: "Docs" })).toHaveAttribute("href", c.docs);
    }
    // They wear the theme through the shadcn bridge's variables: the conversation's page colour and type are Praxis Carbon's.
    const conv = section.locator("#ai-Conversation .tp-sample__canvas");
    expect(await conv.evaluate((el) => getComputedStyle(el).getPropertyValue("--background").trim().toUpperCase())).toBe(light["piq-color-ground"].toUpperCase());
    expect(await section.locator("#ai-Message .ai-frame").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/IBM Plex Sans/);
    // And none of them is among the UI Components.
    for (const c of ai) await expect(page.locator(`#widgets #ai-${c.name}`)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a theme with one appearance offers only it and Auto; an unknown theme says so", async ({ page }) => {
    await page.goto("/?theme=plain");
    const sw = page.getByRole("radiogroup", { name: "Theme appearance" });
    await expect(sw.getByRole("radio", { name: "Dark" })).toBeDisabled();
    await expect(page.locator("#css-dark")).toContainText("has no dark appearance");
    await page.goto("/?theme=no-such-theme");
    await expect(page.getByRole("alert")).toContainText('no theme called "no-such-theme"');
    await expect(page.getByRole("link", { name: "Back to the UX Builder" })).toHaveAttribute("href", "./");
  });

  // @covers US-020-AC7
  test("on a phone the menu sits above the content and nothing scrolls sideways", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/?theme=praxis-carbon");
    // No sample takes focus or moves the page as it renders (an error summary or a chat composer would).
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => [scrollY, document.activeElement === document.body])).toEqual([0, true]);
    const nav = await page.getByRole("navigation", { name: "Theme contents" }).boundingBox();
    const main = await page.locator(".tp-main").boundingBox();
    expect(nav.y + nav.height).toBeLessThanOrEqual(main.y + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
