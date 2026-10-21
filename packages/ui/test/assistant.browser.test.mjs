/* The assistant in Chromium (US-046, US-047, US-048; FEAT-007): the built
   @ux-builder/ui/assistant in fixture apps (test/fixtures/assistant-app.jsx,
   assistant-adapters-app.jsx), so streaming, focus, announcements, approvals
   and size classes run as they would in an app.

     npm run build && npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "../dist/index.js";
import { bundleFixture } from "./bundle.mjs";

const PKG = fileURLToPath(new URL("..", import.meta.url));
const SHEETS = [join(PKG, "../tokens/dist/themes.css"), join(PKG, "dist/ui.css"), join(PKG, "dist/patterns.css")];
const tmp = mkdtempSync(join(tmpdir(), "assistant-"));
let browser, appJs, adaptersJs;

before(async () => {
  browser = await chromium.launch();
  [appJs, adaptersJs] = await Promise.all([bundleFixture("assistant-app", tmp), bundleFixture("assistant-adapters-app", tmp)]);
});
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

/* A page with the fixture app at a scene; requests outside the page and page errors are recorded. */
async function open(scene, { width = 1280, height = 800, js = appJs, before = "", initial, query = "" } = {}) {
  const html = join(tmp, `p-${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(html, `<!doctype html><html lang="en" data-theme="praxis-carbon" data-appearance="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${SHEETS.map((s) => `<link rel="stylesheet" href="${pathToFileURL(s)}">`).join("")}<style>body{margin:0}</style></head><body>${before}<div id="root"></div>${initial ? `<script>window.initialMessages = ${JSON.stringify(initial).replace(/</g, "\\u003c")}</script>` : ""}<script src="${pathToFileURL(js)}"></script></body></html>`);
  const page = await browser.newPage({ viewport: { width, height } });
  page.outside = []; page.errors = []; page.dialogs = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:") && !r.url().startsWith("data:")) page.outside.push(r.url()); });
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("dialog", (d) => { page.dialogs.push(d.message()); d.dismiss(); });
  await page.goto(`${pathToFileURL(html).href}${query}#${scene}`);
  await page.locator(".piq-conversation, .piq-assistant-panel").first().waitFor();
  return page;
}
const calls = (page, name) => page.evaluate((n) => window.harness.calls.filter((c) => c.name === n).map((c) => c.args), name);
const setMessages = (page, messages) => page.evaluate((m) => window.harness.set(m), messages);
const setProps = (page, props) => page.evaluate((p) => window.harness.props(p), props);
// Counts every change to the polite announcer's text, so a test can see what was said, and how often.
const watchAnnouncer = (page) => page.evaluate(() => {
  window.said = [];
  const el = document.querySelector("[data-announcer]");
  new MutationObserver(() => { if (el.textContent) window.said.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true });
});
const composer = (page) => page.getByRole("textbox", { name: "Ask the assistant" });
const lastReply = (page) => page.locator('.piq-message[data-role="assistant"]').last();

describe("US-046 hold a conversation", () => {
  // @covers US-046-AC1
  test("AC1: a finished reply is announced once, politely, and nothing per token; in progress it says Replying… in text", async () => {
    const page = await open("demo");
    await watchAnnouncer(page);
    await composer(page).fill("Summarise the last three filings");
    await composer(page).press("Enter");
    await lastReply(page).getByText("Replying…").waitFor();
    assert.equal(await lastReply(page).getAttribute("aria-busy"), "true");
    assert.equal(await page.getByRole("status").textContent(), "Replying…");
    const log = page.getByRole("log", { name: "Conversation with the assistant" });
    assert.equal(await log.getAttribute("aria-live"), "off", "the log itself never announces tokens");
    // Several tokens arrive; nothing is said yet.
    await page.waitForFunction(() => document.querySelectorAll('.piq-message[data-role="assistant"] .piq-markdown__p').length && document.querySelector('.piq-message[data-role="assistant"] .piq-markdown__p').textContent.split(" ").length > 4);
    assert.deepEqual(await page.evaluate(() => window.said), []);
    await page.waitForFunction(() => document.querySelector('.piq-message[data-role="assistant"]').dataset.status === "done");
    await page.waitForTimeout(100);
    const said = await page.evaluate(() => window.said);
    assert.equal(said.length, 1, `one announcement, not ${said.length}`);
    assert.match(said[0], /^Assistant replied: The hearing is listed for 14 November/);
    assert.equal(await page.locator("[data-announcer]").getAttribute("aria-live"), "polite");
    assert.equal(await lastReply(page).getByText("Replying…").count(), 0);
    assert.deepEqual(page.errors, []);
    await page.close();
  });

  // @covers US-046-AC2
  test("AC2: Enter sends and focus stays in the composer; Shift+Enter adds a line; while sending is not possible it says why", async () => {
    const page = await open("harness", { initial: [] });
    const field = composer(page);
    await field.focus();
    await page.keyboard.type("First line");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("second line");
    assert.equal(await field.inputValue(), "First line\nsecond line");
    assert.deepEqual(await calls(page, "send"), [], "Shift+Enter does not send");
    await page.keyboard.press("Enter");
    assert.deepEqual(await calls(page, "send"), [["First line\nsecond line"]]);
    assert.equal(await field.inputValue(), "");
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute("aria-label") ?? document.activeElement.labels?.[0]?.textContent), "Ask the assistant", "focus stays in the composer");

    // A reply is streaming: Send is disabled, and the reason is in text, tied to the field; the draft is kept.
    await setMessages(page, [{ id: "u", role: "user", text: "Hi" }, { id: "a", role: "assistant", status: "streaming", text: "Hello" }]);
    await page.keyboard.type("Next question");
    await page.keyboard.press("Enter");
    assert.equal((await calls(page, "send")).length, 1, "nothing sent while a reply streams");
    assert.equal(await field.inputValue(), "Next question");
    assert.equal(await page.getByRole("button", { name: "Send" }).isDisabled(), true);
    const reason = "Wait for the reply to finish, or stop it.";
    await page.getByText(reason).waitFor();
    const described = await field.evaluate((el) => el.getAttribute("aria-describedby").split(" ").map((id) => document.getElementById(id)?.textContent).join(" "));
    assert.match(described, /Wait for the reply to finish/);

    // Offline: the app's own reason.
    await setMessages(page, []);
    await setProps(page, { disabledReason: "The assistant is offline. Your message is kept." });
    await page.getByText("The assistant is offline. Your message is kept.").waitFor();
    await field.press("Enter");
    assert.equal((await calls(page, "send")).length, 1);
    assert.equal(await field.inputValue(), "Next question", "the draft is kept");
    assert.equal(await page.getByRole("button", { name: "Send" }).isDisabled(), true);
    await page.close();
  });

  // @covers US-046-AC3
  test("AC3: Stop is reached by Tab and pressed from the keyboard; the partial reply stays, marked Stopped", async () => {
    const page = await open("demo", { query: "?interval=150" });
    await composer(page).fill("Summarise the last three filings");
    await composer(page).press("Enter");
    await page.waitForFunction(() => (document.querySelector('.piq-message[data-role="assistant"] .piq-markdown__p')?.textContent.split(" ").length ?? 0) >= 3);
    let name = "";
    for (let i = 0; i < 4 && name !== "Stop"; i++) { await page.keyboard.press("Tab"); name = await page.evaluate(() => document.activeElement.textContent); }
    assert.equal(name, "Stop", "Tab reaches Stop from the composer");
    await page.keyboard.press("Enter");
    await lastReply(page).getByText("Stopped", { exact: true }).waitFor();
    const kept = await lastReply(page).locator(".piq-markdown__p").textContent();
    assert.ok(kept.split(" ").length >= 3 && !/bundle a week before/.test(kept), `the partial reply stays: "${kept}"`);
    await page.waitForTimeout(400);
    assert.equal(await lastReply(page).locator(".piq-markdown__p").textContent(), kept, "nothing more arrives");
    assert.equal(await page.getByRole("button", { name: "Stop" }).count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), "TEXTAREA", "focus returns to the composer");
    await page.close();
  });

  // @covers US-046-AC4
  test("AC4: a failed reply says so in text with Retry, which asks the app to retry; earlier messages stay", async () => {
    const page = await open("demo", { query: "?interval=10" });
    for (const q of ["One", "Two", "Three"]) {
      await composer(page).fill(q);
      await composer(page).press("Enter");
      await page.waitForFunction(() => ["done", "error"].includes(document.querySelectorAll('.piq-message[data-role="assistant"]')[document.querySelectorAll('.piq-message[data-role="assistant"]').length - 1]?.dataset.status));
    }
    const failed = lastReply(page);
    await failed.getByText("The assistant could not reply. Try again.").waitFor();
    assert.equal(await page.locator(".piq-message").count(), 6, "earlier messages stay");
    const retry = failed.getByRole("button", { name: "Retry" });
    assert.equal(await retry.getAttribute("data-piq-ai-control"), "retry");
    await retry.click();
    assert.equal((await calls(page, "retry")).length, 1);
    await page.waitForFunction(() => [...document.querySelectorAll('.piq-message[data-role="assistant"]')].at(-1).dataset.status === "done");
    assert.equal(await page.locator(".piq-message").count(), 6);
    await page.close();
  });

  // @covers US-046-AC5
  test("AC5: a suggestion sends its text as a message, and the composer is still there", async () => {
    const page = await open("demo");
    const list = page.getByRole("list", { name: "Suggestions" });
    assert.equal(await list.getByRole("button").count(), 3);
    await list.getByRole("button", { name: "When is the hearing?" }).click();
    assert.deepEqual(await calls(page, "send"), [["When is the hearing?"]]);
    await page.locator('.piq-message[data-role="user"]').getByText("When is the hearing?").waitFor();
    assert.equal(await composer(page).isEditable(), true);
    await page.close();
  });

  // @covers US-046-AC6
  test("AC6: no HTML or script from a reply reaches the DOM; links are marked as leaving; code has a copy control", async () => {
    const text = "Look <img src=x onerror=\"alert('img')\"> here.\n\n<script>alert('script')</script>\n\nSee [the guide](https://example.com/guide) or [this](javascript:alert('link')).\n\n<iframe src=\"https://example.com\"></iframe><b onclick=\"alert(1)\">bold</b>\n\n```html\n<div onclick=\"x()\">code</div>\n```";
    const page = await open("harness", { initial: [{ id: "u", role: "user", text: "<img src=x onerror=alert('user')>" }, { id: "a", role: "assistant", text }] });
    const r = await page.evaluate(() => {
      const log = document.querySelector('[role="log"]');
      const attrs = [...log.querySelectorAll("*")].flatMap((el) => [...el.attributes].map((a) => a.name)).filter((n) => n.startsWith("on"));
      const link = log.querySelector('a[href="https://example.com/guide"]');
      return {
        tags: [...log.querySelectorAll("script, img, iframe, b, div[onclick]")].map((e) => e.tagName),
        attrs, links: [...log.querySelectorAll("a.piq-markdown__link")].map((a) => a.getAttribute("href")),
        target: link.target, rel: link.rel, said: link.textContent, icon: Boolean(link.querySelector('[data-icon="external-link"]')),
        code: log.querySelector("pre code").textContent, copy: [...log.querySelectorAll(".piq-markdown__code button")].map((b) => b.textContent),
      };
    });
    assert.deepEqual(r.tags, []);
    assert.deepEqual(r.attrs, []);
    assert.deepEqual(r.links, ["https://example.com/guide"], "only the http link is a link");
    assert.equal(r.target, "_blank");
    assert.match(r.rel, /noopener/);
    assert.equal(r.said, "the guide (opens in a new tab)");
    assert.ok(r.icon, "an external-link icon marks it");
    assert.equal(r.code, '<div onclick="x()">code</div>', "code is shown as text");
    assert.deepEqual(r.copy, ["Copy code"]);
    await page.waitForTimeout(100);
    assert.deepEqual(page.dialogs, [], "no script ran");
    await page.close();
  });

  // @covers US-046-AC7
  test("AC7: at compact the assistant fills the screen, from expanded it is a side panel; the newest message stays in view unless the user scrolls up", async () => {
    for (const [width, full] of [[360, true], [1280, false]]) {
      const page = await open("panel", { width });
      await page.locator("#open-assistant").click();
      await page.locator(".piq-conversation").waitFor();
      const r = await page.evaluate(() => {
        const conv = document.querySelector(".piq-conversation"), dialog = conv.closest("dialog"), aside = conv.closest("aside");
        const box = (dialog ?? aside).getBoundingClientRect(), main = document.querySelector("main").getBoundingClientRect();
        return { modal: Boolean(dialog?.matches(":modal")), aside: Boolean(aside), box: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)], beside: box.left >= main.right - 1, focus: document.activeElement.tagName };
      });
      if (full) {
        assert.equal(r.modal, true, "360px: a full-screen modal");
        assert.deepEqual(r.box, [0, 0, 360, 800]);
      } else {
        assert.equal(r.aside, true, "1280px: a side panel");
        assert.equal(r.modal, false);
        assert.equal(r.beside, true, "beside the page");
        assert.ok(r.box[2] < 640, `a panel, not the page (${r.box[2]}px)`);
      }
      assert.equal(r.focus, "TEXTAREA", `${width}px: focus in the composer ${JSON.stringify(r)}`);
      await page.close();
    }

    const many = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, role: i % 2 ? "assistant" : "user", text: `Message ${i}. `.repeat(12) }));
    const page = await open("harness", { initial: many, height: 600 });
    const log = page.getByRole("log");
    const atEnd = () => log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight < 2);
    assert.equal(await atEnd(), true, "opens at the newest message");
    await setMessages(page, [...many, { id: "s", role: "assistant", status: "streaming", text: "A new reply " }]);
    assert.equal(await atEnd(), true, "the newest stays in view as a reply arrives");
    assert.equal(await page.getByRole("button", { name: "Jump to latest" }).count(), 0);
    await log.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event("scroll")); });
    await page.getByRole("button", { name: "Jump to latest" }).waitFor();
    await setMessages(page, [...many, { id: "s", role: "assistant", status: "streaming", text: "A new reply that keeps growing ".repeat(8) }]);
    assert.equal(await log.evaluate((el) => el.scrollTop), 0, "the view stays where the user is");
    await page.getByRole("button", { name: "Jump to latest" }).click();
    assert.equal(await atEnd(), true);
    assert.equal(await page.getByRole("button", { name: "Jump to latest" }).count(), 0);
    await page.close();
  });

  // @covers US-046-AC8
  test("AC8: each adapter drives the same pattern on its runtime's real code: streaming, the announcement and Stop behave the same", async () => {
    for (const scene of ["ai-sdk", "assistant-ui"]) {
      const page = await open(scene, { js: adaptersJs });
      await watchAnnouncer(page);
      await composer(page).fill("When is the hearing?");
      await composer(page).press("Enter");
      await page.locator('.piq-message[data-role="user"]').getByText("When is the hearing?").waitFor();
      await lastReply(page).getByText("Replying…").waitFor();
      await page.getByRole("button", { name: "Stop" }).waitFor();
      await page.waitForFunction(() => document.querySelector('.piq-message[data-role="assistant"]')?.dataset.status === "done", null, { timeout: 5000 });
      assert.match(await lastReply(page).textContent(), /The hearing is listed for 14 November and the bundle is due a week before it\./, scene);
      await page.waitForTimeout(100);
      const said = await page.evaluate(() => window.said);
      assert.equal(said.length, 1, `${scene}: announced once`);
      assert.match(said[0], /^Assistant replied: The hearing is listed/);

      await composer(page).fill("And the bundle?");
      await composer(page).press("Enter");
      await page.waitForFunction(() => (document.querySelectorAll('.piq-message[data-role="assistant"]')[1]?.textContent.match(/\b(hearing|is|listed|for)\b/g)?.length ?? 0) >= 2);
      await page.getByRole("button", { name: "Stop" }).click();
      await page.waitForFunction(() => document.querySelectorAll('.piq-message[data-role="assistant"]')[1]?.dataset.status === "stopped", null, { timeout: 5000 });
      assert.equal(await lastReply(page).getByText("Stopped", { exact: true }).count(), 1, `${scene}: Stopped`);
      assert.doesNotMatch(await lastReply(page).textContent(), /week before it\./, `${scene}: partial`);
      assert.deepEqual(page.errors, [], scene);
      await page.close();
    }
  });

  // @covers US-046-AC9
  test("AC9: with default settings, a conversation on either adapter, or the pattern alone, makes no request outside the page", async () => {
    for (const [scene, js] of [["ai-sdk", adaptersJs], ["assistant-ui", adaptersJs], ["demo", appJs]]) {
      const page = await open(scene, { js });
      await composer(page).fill("When is the hearing?");
      await composer(page).press("Enter");
      await page.waitForFunction(() => document.querySelector('.piq-message[data-role="assistant"]')?.dataset.status === "done", null, { timeout: 5000 });
      await page.waitForTimeout(300);
      assert.deepEqual(page.outside, [], `${scene}: no vendor request, no telemetry`);
      await page.close();
    }
  });
});

describe("US-047 see what the assistant did and approve its actions", () => {
  // @covers US-047-AC1
  test("AC1: reasoning is collapsed behind how long it took, and the answer reads complete without it", async () => {
    const page = await open("harness");
    const reasoning = page.locator(".piq-reasoning");
    assert.equal(await reasoning.evaluate((d) => d.open), false);
    assert.equal(await reasoning.locator("summary").textContent(), "Reasoned for 6 seconds");
    assert.equal(await reasoning.locator(".piq-reasoning__text").isVisible(), false);
    assert.equal(await page.getByText("The total is £12,400.", { exact: false }).isVisible(), true);
    await reasoning.locator("summary").press("Enter");
    assert.equal(await reasoning.locator(".piq-reasoning__text").isVisible(), true, "it opens from the keyboard");
    await page.close();
  });

  // @covers US-047-AC2
  test("AC2: each tool call states its name and status in text, and shows its input and result on request", async () => {
    const page = await open("harness", { initial: [{ id: "a", role: "assistant", status: "streaming", parts: [
      { type: "tool", id: "1", name: "lookup_time", title: "Looked up time entries", status: "done", input: { month: "2026-10" }, output: { hours: 27.5 } },
      { type: "tool", id: "2", name: "calculate_fees", title: "Calculating fees", status: "running", input: { hours: 27.5 } },
      { type: "tool", id: "3", name: "send_bill", status: "failed", error: "The billing service did not answer." },
    ] }] });
    const steps = await page.locator('[data-piq-ai="plan"] > [data-piq-ai="step"]').evaluateAll((els) => els.map((e) => [e.querySelector(".piq-tool-call__name").textContent, e.querySelector(".piq-tool-call__status").textContent, e.dataset.piqAiStatus]));
    assert.deepEqual(steps, [["Looked up time entries", "Done", "done"], ["Calculating fees", "Running", "running"], ["send_bill", "Failed", "failed"]]);
    await page.getByText("The billing service did not answer.").waitFor();
    const first = page.locator(".piq-tool-call").first();
    assert.equal(await first.locator("pre").first().isVisible(), false);
    await first.getByText("Show input and result").click();
    assert.deepEqual(await first.locator("pre").evaluateAll((ps) => ps.map((p) => JSON.parse(p.textContent))), [{ month: "2026-10" }, { hours: 27.5 }]);
    assert.deepEqual(await first.locator(".piq-tool-call__label").allTextContents(), ["Input", "Result"]);
    await page.close();
  });

  // @covers US-047-AC3
  test("AC3: each citation links to its numbered source, which shows its title, as a link where it has one", async () => {
    const page = await open("harness");
    const sources = page.locator(".piq-sources li");
    assert.deepEqual(await sources.allTextContents(), ["Time entries, October (opens in a new tab)", "Engagement letter"]);
    assert.equal(await sources.nth(0).locator("a").getAttribute("href"), "https://example.com/time/october");
    assert.equal(await sources.nth(1).locator("a").count(), 0, "a source without a link shows its title");
    const cite = page.getByRole("link", { name: "Source 2: Engagement letter" });
    assert.equal(await cite.textContent(), "[2]");
    await cite.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "Engagement letter", "following [2] moves focus to source 2");
    await page.close();
  });

  // @covers US-047-AC4
  test("AC4: an approval card states what will happen and to what, with Approve and Deny, and nothing reaches the app until the user chooses", async () => {
    const page = await open("harness");
    const card = page.locator('[data-piq-ai="approval"]');
    assert.equal(await card.locator(".piq-approval__summary").textContent(), "Create bill B-1044 for Acme v Beta, £12,400?");
    assert.deepEqual(await card.getByRole("button").allTextContents(), ["Approve", "Deny"]);
    assert.deepEqual(await card.getByRole("button").evaluateAll((bs) => bs.map((b) => b.dataset.piqAiControl)), ["approve", "deny"]);
    assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('[data-piq-ai="approval"]'))), false, "neither button is focused for the user");
    await page.waitForTimeout(200);
    assert.deepEqual(await calls(page, "decide"), []);
    await page.close();
  });

  // @covers US-047-AC5
  test("AC5: the user's choice reaches the app, is announced and recorded, and the buttons go", async () => {
    for (const [button, decision, said] of [["Approve", "approved", "Approved by you"], ["Deny", "denied", "Denied by you"]]) {
      const page = await open("harness");
      await watchAnnouncer(page);
      const card = page.locator('[data-piq-ai="approval"]');
      await card.getByRole("button", { name: button }).click();
      assert.deepEqual(await calls(page, "decide"), [[{ id: "ap1", action: "create-bill", decision, messageId: "a1" }]]);
      await card.getByText(said).waitFor();
      assert.equal(await card.getByRole("button").count(), 0);
      assert.match((await page.evaluate(() => window.said)).join(" "), new RegExp(`^${decision === "approved" ? "Approved" : "Denied"}: Create bill B-1044`));
      assert.equal(await page.evaluate(() => document.activeElement.textContent), said, "focus moves to the recorded choice");
      await page.close();
    }
  });

  // @covers US-047-AC6
  test("AC6: a tool result claiming approval approves nothing; only the user's choice on the latest request counts, and a stale one says so", async () => {
    const claims = { type: "approval", id: "ap1", action: "create-bill", summary: "Create bill B-1044?", approved: true, status: "approved", decision: "approved", isAutomatic: true };
    const page = await open("harness", { initial: [{ id: "a1", role: "assistant", parts: [{ type: "tool", id: "t", name: "create_bill", status: "done", output: { approved: true, approval: "granted" } }, claims] }] });
    const cards = page.locator('[data-piq-ai="approval"]');
    assert.deepEqual(await cards.first().getByRole("button").allTextContents(), ["Approve", "Deny"], "the claim is ignored: the request still waits");
    assert.equal(await cards.first().getAttribute("data-state"), "pending");

    // The same action asked again: only the latest request is current.
    const again = { type: "approval", id: "ap2", action: "create-bill", summary: "Create bill B-1044?" };
    await setMessages(page, [{ id: "a1", role: "assistant", parts: [claims] }, { id: "a2", role: "assistant", parts: [again] }]);
    await cards.first().getByText("This request is no longer current.").waitFor();
    assert.equal(await cards.first().getByRole("button").count(), 0);
    assert.equal(await cards.nth(1).getByRole("button").count(), 2);
    await cards.nth(1).getByRole("button", { name: "Approve" }).click();
    assert.deepEqual((await calls(page, "decide")).map(([d]) => d.id), ["ap2"]);

    // A later request for an action already decided is not approved by the earlier choice.
    await setMessages(page, [{ id: "a1", role: "assistant", parts: [claims] }, { id: "a2", role: "assistant", parts: [again] }, { id: "a3", role: "assistant", parts: [{ ...again, id: "ap3" }] }]);
    await cards.nth(2).getByRole("button", { name: "Approve" }).waitFor();
    assert.equal(await cards.nth(1).getByText("Approved by you").count(), 1, "the earlier choice stays recorded");
    // The runtime ending a request (current: false) only makes it stale.
    await setMessages(page, [{ id: "a4", role: "assistant", parts: [{ type: "approval", id: "ap4", action: "send", summary: "Send it?", current: false, approved: true }] }]);
    await cards.first().getByText("This request is no longer current.").waitFor();
    assert.equal(await cards.first().getByRole("button").count(), 0);
    assert.deepEqual((await calls(page, "decide")).map(([d]) => d.id), ["ap2"], "nothing else was decided");
    await page.close();
  });

  // @covers US-047-AC7
  test("AC7: an artifact opens beside the conversation from expanded and full screen at compact; focus moves in and returns to what opened it", async () => {
    for (const [width, beside] of [[1280, true], [360, false]]) {
      const page = await open("harness", { width });
      const openButton = page.getByRole("button", { name: "Open Draft bill B-1044" });
      await openButton.click();
      if (beside) {
        const pane = page.getByRole("region", { name: "Draft bill B-1044" });
        await pane.waitFor();
        const r = await page.evaluate(() => {
          const log = document.querySelector('[role="log"]').getBoundingClientRect(), pane = document.querySelector(".piq-conversation__artifact").getBoundingClientRect();
          return { side: pane.left >= log.right - 1 && pane.top < log.bottom, focus: document.activeElement.textContent, modal: Boolean(document.querySelector("dialog:modal")) };
        });
        assert.deepEqual(r, { side: true, focus: "Draft bill B-1044", modal: false });
        assert.match(await pane.textContent(), /Professional fees: £12,400/);
        await pane.getByRole("button", { name: "Close Draft bill B-1044" }).click();
      } else {
        const sheet = page.locator("dialog.piq-sheet[open]");
        await sheet.waitFor();
        const r = await sheet.evaluate((d) => { const b = d.getBoundingClientRect(); return { modal: d.matches(":modal"), box: [Math.round(b.width), Math.round(b.height)], inside: d.contains(document.activeElement) }; });
        assert.deepEqual(r, { modal: true, box: [360, 800], inside: true });
        await page.keyboard.press("Escape");
      }
      await page.waitForFunction(() => document.activeElement?.getAttribute("aria-label") === "Open Draft bill B-1044");
      assert.equal(await page.locator(".piq-conversation__artifact, dialog.piq-sheet[open]").count(), 0, `${width}px: closed`);
      await page.close();
    }
  });
});

describe("US-048 the assistant shows its answer as SDK components", () => {
  const GENERATED = [{ id: "a1", role: "assistant", parts: [
    { type: "component", id: "fees", component: "DataTable", props: { caption: "Fees, October", columns: [{ key: "matter", label: "Matter", sortable: true }, { key: "fees", label: "Fees (£)", numeric: true, sortable: true }], rows: [{ id: "1", matter: "Initech", fees: 8800 }, { id: "2", matter: "Acme v Beta", fees: 12400 }, { id: "3", matter: "Globex", fees: 3100 }] } },
  ] }];
  const reference = renderToStaticMarkup(h("div", { id: "reference" }, h(DataTable, { caption: "Reference", columns: [{ key: "matter", label: "Matter", sortable: true }], rows: [{ id: "1", matter: "A" }] })));

  // @covers US-048-AC2
  test("AC2: a renderable component with valid props renders as the SDK's own, in the theme, and works as it does elsewhere", async () => {
    const page = await open("harness", { initial: GENERATED, before: reference });
    const frame = page.locator('.piq-generative[data-component="DataTable"]');
    assert.equal(await frame.getAttribute("data-piq-ai"), "generated");
    const table = frame.locator("table.piq-table");
    assert.deepEqual(await table.locator("tbody tr td:first-child").allTextContents(), ["Initech", "Acme v Beta", "Globex"]);
    const style = (sel) => page.locator(sel).first().evaluate((el) => { const s = getComputedStyle(el); return [s.color, s.fontFamily, s.borderBottomColor, s.backgroundColor]; });
    assert.deepEqual(await style('.piq-generative th'), await style("#reference th"), "the same look as the SDK's DataTable in the theme");
    const sort = table.getByRole("button", { name: /Matter/ });
    await sort.focus();
    await page.keyboard.press("Enter");
    assert.equal(await table.locator("th").first().getAttribute("aria-sort"), "ascending");
    assert.deepEqual(await table.locator("tbody tr td:first-child").allTextContents(), ["Acme v Beta", "Globex", "Initech"], "sortable from the keyboard");
    await page.close();
  });

  // @covers US-048-AC3
  test("AC3: a component that is not renderable, or with props that fail its schema, renders a plain fallback, and nothing from it as HTML", async () => {
    const parts = [
      { type: "component", component: "<iframe>", props: { src: "https://example.com" } },
      { type: "component", component: "DataTable", props: { columns: [{ key: "a", label: "A" }], rows: "x" } },
      { type: "component", component: "DataTable", props: { columns: [{ key: "a", label: "A" }] } },
      { type: "component", component: "Notice", props: { title: "<img src=x onerror=alert(1)>", html: "<b>x</b>" } },
      { type: "component", component: "Conversation", props: { messages: [] } },
    ];
    const page = await open("harness", { initial: [{ id: "a1", role: "assistant", parts }] });
    const frames = page.locator(".piq-generative");
    assert.equal(await frames.count(), 5);
    assert.deepEqual(await frames.allTextContents(), Array(5).fill("This content could not be shown."));
    assert.equal(await page.locator('[role="log"] iframe, [role="log"] table, [role="log"] img, [role="log"] .piq-notice').count(), 0, "not a partial render either");
    await page.waitForTimeout(100);
    assert.deepEqual(page.dialogs, []);
    await page.close();
  });

  test("GEN-04: an inline form keeps the user's edits when its message is regenerated, and shows what was submitted, read only", async () => {
    const form = (value) => ({ id: "a1", role: "assistant", parts: [{ type: "component", id: "contact", component: "InlineForm", props: { title: "Who should receive the bill?", submitLabel: "Use these details", fields: [{ name: "name", label: "Name", value }, { name: "email", label: "Email" }] } }] });
    const page = await open("harness", { initial: [form("R. Lee")] });
    const name = page.getByRole("textbox", { name: "Name" }), email = page.getByRole("textbox", { name: "Email" });
    assert.equal(await name.inputValue(), "R. Lee", "pre-filled");
    await email.fill("billing@acme.example");
    await setMessages(page, [form("S. Patel")]);
    assert.equal(await email.inputValue(), "billing@acme.example", "the edit survives regeneration");
    assert.equal(await name.inputValue(), "S. Patel", "an untouched pre-fill follows the new reply");
    assert.deepEqual(await calls(page, "submit"), [], "nothing is sent until the user submits");
    await page.getByRole("button", { name: "Use these details" }).click();
    assert.deepEqual(await calls(page, "submit"), [[{ messageId: "a1", partId: "contact", component: "InlineForm", values: { name: "S. Patel", email: "billing@acme.example" } }]]);
    const done = page.locator(".piq-inline-form[data-submitted]");
    await done.waitFor();
    assert.equal(await done.locator("input, button").count(), 0, "read only");
    assert.match(await done.textContent(), /NameS\. PatelEmailbilling@acme\.exampleSubmitted/);
    await page.close();
  });

  test("AIM-01: every part carries CONTRACT-005's AI markers", async () => {
    const page = await open("harness", { initial: [{ id: "u", role: "user", text: "Hi" }, { ...(await import("../src/assistant/story-data.js")).SAMPLE[1], status: "streaming" }] });
    const r = await page.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const status = q('[data-piq-ai="status"]');
      return {
        label: q(".piq-conversation").hasAttribute("data-piq-ai-label"),
        disclosed: q(".piq-conversation__disclosure").textContent,
        generated: q('.piq-message[data-role="assistant"] [data-piq-ai="generated"]').getAttribute("aria-describedby") === q(".piq-conversation__disclosure").id,
        userMarked: Boolean(q('.piq-message[data-role="user"] [data-piq-ai]')),
        status: [status.getAttribute("aria-live"), status.getAttribute("aria-busy"), status.textContent, status.parentElement.querySelector("button")?.textContent],
        steps: [...document.querySelectorAll('[data-piq-ai="plan"] [data-piq-ai="step"]')].map((s) => s.dataset.piqAiStatus),
        approval: [...q('[data-piq-ai="approval"]').querySelectorAll("[data-piq-ai-control]")].map((b) => b.dataset.piqAiControl),
      };
    });
    assert.deepEqual(r, { label: true, disclosed: "Replies are generated by AI and may be wrong. Check them before you rely on them.", generated: true, userMarked: false, status: ["polite", "true", "Replying…", "Stop"], steps: ["done", "done"], approval: ["approve", "deny"] });
    await setProps(page, { actor: "agent" });
    assert.equal(await page.locator('[data-piq-ai-actor="agent"]').textContent(), "The assistant is working.");
    await page.close();
  });
});
