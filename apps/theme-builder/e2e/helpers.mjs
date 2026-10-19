/* Shared steps for the builder specs. */

import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../../..", import.meta.url));
export const LOGOS = join(REPO, "tests/fixtures/logos");
/* The throwaway repository the builder reads names from and saves into. */
export const root = () => readFileSync(new URL(".root", import.meta.url), "utf8");
export const section = (page) => page.locator("main section").first();

/* Collects page errors and console errors; assert it is empty at the end. */
export function watch(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

/* The mark the specs upload: Praxis's v2 mark, drawn on a margin. */
export const MARK = join(REPO, "brand/praxis/mark-v2.svg");

export async function start(page, logo, mark) {
  await page.goto("/");
  if (logo) await page.setInputFiles("#logo-file", join(LOGOS, logo));
  else await page.getByRole("button", { name: "Use the sample logo" }).click();
  await expect(page.getByLabel("Brand colours we found").or(page.getByText(/None: the logo is black/))).toBeVisible();
  if (mark) {
    await page.setInputFiles('input[aria-label="Mark and favicon"]', mark);
    await expect(page.getByText(/mark and favicon:/)).toBeVisible();
  }
}

export async function toPalettes(page, logo, mark) {
  await start(page, logo, mark);
  await page.getByRole("button", { name: "Suggest palettes" }).click();
  await expect(page.locator(".tb-card").first()).toBeVisible();
}

export async function pick(page, palettes = [0, 1]) {
  for (const i of palettes) await page.locator(".tb-card").nth(i).getByRole("button", { name: "Add to compare" }).click();
}

export async function toSystems(page, logo, palettes, mark) {
  await toPalettes(page, logo, mark);
  await pick(page, palettes);
  await section(page).getByRole("button", { name: "Pick design systems" }).click();
  await expect(page.getByRole("heading", { name: "Pick design systems to compare" })).toBeVisible();
}

export async function toCompare(page, { logo, mark, palettes = [0, 1], systems = ["Carbon", "Fluent 2"] } = {}) {
  await toSystems(page, logo, palettes, mark);
  for (const s of systems) await page.getByLabel(s, { exact: true }).check();
  await page.getByRole("button", { name: /^Compare \d+ combination/ }).click();
  await expect(page.locator(".tb-cell").first()).toBeVisible();
}

export async function toSave(page, opts = {}) {
  await toCompare(page, opts);
  await page.locator(".tb-cell").nth(opts.cell ?? 0).getByRole("radio").click();
  await page.getByRole("button", { name: "Save this theme" }).click();
  await expect(page.locator("#theme-name")).toBeVisible();
}

/* A preview's resolved token, read from the inline custom properties ThemeProvider set. */
export const token = (locator, name) => locator.evaluate((el, n) => el.style.getPropertyValue(n), name);
