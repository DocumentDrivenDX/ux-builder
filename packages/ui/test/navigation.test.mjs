/* Navigation widgets and patterns (US-024; FEAT-004 SDK-19; FEAT-006 NAV-01
   to NAV-06, SCR-01, SCR-02), against the built package: roles, keyboard and
   state as the WAI-ARIA Authoring Practices describe them.
   navigation.browser.test.mjs checks layout per size class in Chromium.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { Breadcrumbs, MenuButton, Sheet, Tabs } from "../dist/index.js";
import { AppShell, ErrorScreen, PrimaryNav, WorkspaceSwitcher } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; });
const key = (el, k) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true })); });
const click = (el) => act(() => { el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true })); });
const focused = () => document.activeElement;

const NAV = [
  { id: "home", label: "Home", href: "/", icon: "home" },
  { id: "matters", label: "Matters", href: "/matters", icon: "view" },
  { id: "billing", label: "Billing", icon: "copy", items: [{ id: "invoices", label: "Invoices", href: "/billing/invoices" }, { id: "rates", label: "Rates", href: "/billing/rates" }] },
  { id: "clients", label: "Clients", href: "/clients", icon: "user" },
  { id: "reports", label: "Reports", href: "/reports", icon: "download" },
  { id: "settings", label: "Settings", href: "/settings", icon: "settings" },
];

describe("US-024 primary navigation", () => {
  // @covers US-024-AC1
  test("AC1: destinations are links in a labelled navigation landmark, no menu roles, the current one marked", () => {
    const el = render(h(PrimaryNav, { items: NAV, current: "matters", label: "Main" }));
    const nav = el.querySelector("nav");
    assert.equal(nav.getAttribute("aria-label"), "Main");
    assert.equal(el.querySelectorAll('[role="menu"], [role="menuitem"], [role="menubar"]').length, 0);
    const links = [...nav.querySelectorAll("a")];
    assert.ok(links.length >= 4 && links.every((a) => a.getAttribute("href")));
    const current = nav.querySelectorAll('[aria-current="page"]');
    assert.equal(current.length, 1);
    assert.equal(current[0].textContent, "Matters");
    assert.equal(current[0].tagName, "A");
  });

  // @covers US-024-AC2
  test("AC2: a group opens and closes by its disclosure button, by click, Enter or Space, and reports aria-expanded", () => {
    const el = render(h(PrimaryNav, { items: NAV, current: "matters" }));
    const btn = [...el.querySelectorAll("button")].find((b) => b.textContent.includes("Billing"));
    const list = document.getElementById(btn.getAttribute("aria-controls"));
    assert.equal(btn.getAttribute("aria-expanded"), "false");
    assert.equal(list.hidden, true);
    click(btn);
    assert.equal(btn.getAttribute("aria-expanded"), "true");
    assert.equal(list.hidden, false);
    assert.deepEqual([...list.querySelectorAll("a")].map((a) => a.textContent), ["Invoices", "Rates"]);
    // A native button turns Enter and Space into a click; the group listens to the click.
    for (const k of ["Enter", " "]) {
      act(() => { btn.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true })); btn.click(); });
    }
    assert.equal(btn.getAttribute("aria-expanded"), "true", "toggled twice: open again");
    click(btn);
    assert.equal(btn.getAttribute("aria-expanded"), "false");
  });

  test("a group holding the current page starts open; onNavigate replaces following a link", () => {
    const seen = [];
    const el = render(h(PrimaryNav, { items: NAV, current: "invoices", onNavigate: (item) => seen.push(item.id) }));
    const btn = [...el.querySelectorAll("button")].find((b) => b.textContent.includes("Billing"));
    assert.equal(btn.getAttribute("aria-expanded"), "true");
    const ev = new window.MouseEvent("click", { bubbles: true, cancelable: true });
    act(() => { el.querySelector('a[href="/clients"]').dispatchEvent(ev); });
    assert.deepEqual(seen, ["clients"]);
    assert.equal(ev.defaultPrevented, true);
  });
});

describe("US-024 menu button", () => {
  const items = (log) => ["Profile", "Preferences", "Archived", "Sign out"].map((label) => ({ label, onSelect: () => log.push(label), disabled: label === "Archived" }));

  // @covers US-024-AC5
  test("AC5: Enter opens on the first item; arrows move, skipping disabled; Escape closes and returns focus to the button", () => {
    const log = [];
    const el = render(h(MenuButton, { label: "Account", items: items(log) }));
    const btn = el.querySelector("button");
    assert.deepEqual([btn.getAttribute("aria-haspopup"), btn.getAttribute("aria-expanded")], ["menu", "false"]);
    btn.focus();
    key(btn, "Enter");
    const menu = el.querySelector('[role="menu"]');
    assert.ok(menu, "open");
    assert.equal(btn.getAttribute("aria-expanded"), "true");
    assert.equal(btn.getAttribute("aria-controls"), menu.id);
    assert.equal(menu.getAttribute("aria-label"), "Account");
    assert.equal(focused().textContent, "Profile");
    key(focused(), "ArrowDown");
    assert.equal(focused().textContent, "Preferences");
    key(focused(), "ArrowDown");
    assert.equal(focused().textContent, "Sign out", "Archived is disabled and skipped");
    key(focused(), "ArrowDown");
    assert.equal(focused().textContent, "Profile", "wraps");
    key(focused(), "End");
    assert.equal(focused().textContent, "Sign out");
    key(focused(), "Home");
    assert.equal(focused().textContent, "Profile");
    key(focused(), "s");
    assert.equal(focused().textContent, "Sign out", "type-ahead");
    key(focused(), "Escape");
    assert.equal(el.querySelector('[role="menu"]'), null);
    assert.equal(focused(), btn);
    assert.deepEqual(log, []);
  });

  test("Up opens on the last item; choosing an item runs it, closes and returns focus; items are menuitems", () => {
    const log = [];
    const el = render(h(MenuButton, { label: "Account", items: items(log) }));
    const btn = el.querySelector("button");
    btn.focus();
    key(btn, "ArrowUp");
    assert.equal(focused().textContent, "Sign out");
    assert.ok([...el.querySelectorAll('[role="menu"] > li')].every((li) => li.getAttribute("role") === "none"));
    assert.equal(el.querySelectorAll('[role="menuitem"]').length, 4);
    assert.equal(el.querySelector('[aria-disabled="true"]').textContent, "Archived");
    click(focused());
    assert.deepEqual(log, ["Sign out"]);
    assert.equal(el.querySelector('[role="menu"]'), null);
    assert.equal(focused(), btn);
  });

  test("a click outside closes it without moving focus; checked items are radio items", () => {
    const el = render(h("div", null, h("p", { id: "away" }, "elsewhere"), h(MenuButton, { label: "View", items: [{ label: "List", checked: true }, { label: "Board", checked: false }] })));
    click(el.querySelector("button"));
    assert.deepEqual([...el.querySelectorAll('[role="menuitemradio"]')].map((i) => i.getAttribute("aria-checked")), ["true", "false"]);
    act(() => { el.querySelector("#away").dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })); });
    assert.equal(el.querySelector('[role="menu"]'), null);
  });
});

describe("US-024 workspace switcher", () => {
  const spaces = (n) => ["London", "New York", "Paris", "Tokyo", "Sydney", "Chicago", "Boston", "Hong Kong"].slice(0, n).map((label, i) => ({ id: `w${i}`, label }));

  // @covers US-024-AC6
  test("AC6: with 8 workspaces the popup offers a search that narrows the list; with 7 it is a menu with no search", () => {
    const seven = render(h(WorkspaceSwitcher, { workspaces: spaces(7), current: "w1" }));
    click(seven.querySelector("button"));
    assert.ok(seven.querySelector('[role="menu"]'));
    assert.equal(seven.querySelector('input, [role="combobox"]'), null);
    assert.equal(seven.querySelector('[aria-checked="true"]').textContent, "New York");
    act(() => root.unmount()); host.remove();

    const switched = [];
    const el = render(h(WorkspaceSwitcher, { workspaces: spaces(8), current: "w1", onSwitch: (id) => switched.push(id) }));
    const btn = el.querySelector("button");
    assert.equal(btn.getAttribute("aria-label"), "Workspace: New York");
    click(btn);
    const box = el.querySelector('[role="combobox"]');
    assert.equal(focused(), box);
    assert.equal(box.getAttribute("aria-label"), "Search workspaces");
    assert.equal(el.querySelectorAll('[role="option"]').length, 8);
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(box, "lon");
      box.dispatchEvent(new window.Event("input", { bubbles: true }));
    });
    assert.deepEqual([...el.querySelectorAll('[role="option"]')].map((o) => o.textContent), ["London"]);
    assert.equal(box.getAttribute("aria-activedescendant"), el.querySelector('[role="option"]').id);
    key(box, "Enter");
    assert.deepEqual(switched, ["w0"]);
    assert.equal(el.querySelector('[role="combobox"]'), null, "closed");
    assert.equal(focused(), btn, "focus back on the button");
  });

  test("Escape closes the search popup and returns focus", () => {
    const el = render(h(WorkspaceSwitcher, { workspaces: spaces(8), current: "w0" }));
    const btn = el.querySelector("button");
    click(btn);
    key(el.querySelector('[role="combobox"]'), "Escape");
    assert.equal(el.querySelector('[role="combobox"]'), null);
    assert.equal(focused(), btn);
  });
});

describe("US-024 breadcrumbs", () => {
  // @covers US-024-AC4
  test("AC4: an ordered list in a navigation landmark labelled Breadcrumb, the last item current, and a link to the parent", () => {
    const el = render(h(Breadcrumbs, { items: [{ label: "Clients", href: "/clients" }, { label: "Acme", href: "/clients/acme" }, { label: "Matters" }] }));
    const nav = el.querySelector("nav");
    assert.equal(nav.getAttribute("aria-label"), "Breadcrumb");
    const items = [...nav.querySelectorAll("ol > li")];
    assert.deepEqual(items.map((li) => li.textContent), ["Clients", "Acme", "Matters"]);
    assert.equal(items[2].querySelector('[aria-current="page"]').textContent, "Matters");
    assert.equal(nav.querySelectorAll('[aria-current="page"]').length, 1);
    const back = nav.querySelector(".piq-breadcrumbs__back");
    assert.equal(back.getAttribute("href"), "/clients/acme");
    assert.equal(back.textContent, "Acme");
  });
});

describe("tabs", () => {
  const TABS = [{ id: "overview", label: "Overview", panel: "O" }, { id: "documents", label: "Documents", panel: "D", count: 12 }, { id: "billing", label: "Billing", panel: "B" }];

  test("roles, one tab in the tab order, arrows wrap and show each panel, Home and End", () => {
    const changes = [];
    const el = render(h(Tabs, { tabs: TABS, label: "Matter", onChange: (id) => changes.push(id) }));
    const list = el.querySelector('[role="tablist"]');
    assert.equal(list.getAttribute("aria-label"), "Matter");
    const tabs = () => [...el.querySelectorAll('[role="tab"]')];
    const panel = () => el.querySelector('[role="tabpanel"]:not([hidden])');
    assert.deepEqual(tabs().map((t) => t.tabIndex), [0, -1, -1]);
    assert.equal(panel().getAttribute("aria-labelledby"), tabs()[0].id);
    assert.equal(tabs()[0].getAttribute("aria-controls"), panel().id);
    tabs()[0].focus();
    key(tabs()[0], "ArrowRight");
    assert.equal(focused(), tabs()[1]);
    assert.equal(tabs()[1].getAttribute("aria-selected"), "true");
    assert.equal(panel().textContent, "D");
    key(focused(), "End");
    assert.equal(panel().textContent, "B");
    key(focused(), "ArrowRight");
    assert.equal(panel().textContent, "O", "wraps");
    key(focused(), "ArrowLeft");
    assert.equal(panel().textContent, "B");
    key(focused(), "Home");
    assert.deepEqual(changes, ["documents", "billing", "overview", "billing", "overview"]);
    assert.equal(tabs()[1].querySelector(".piq-tabs__count").textContent, "12");
  });

  test("controlled: the app owns the selected tab", () => {
    function App() { const [v, setV] = useState("billing"); return h(Tabs, { tabs: TABS, value: v, onChange: setV }); }
    const el = render(h(App));
    assert.equal(el.querySelector('[aria-selected="true"]').textContent, "Billing");
    click(el.querySelectorAll('[role="tab"]')[0]);
    assert.equal(el.querySelector('[aria-selected="true"]').textContent, "Overview");
  });
});

describe("sheet", () => {
  test("a modal dialog with a name; Escape and the close button ask to close; focus returns to the opener", () => {
    let closes = 0;
    function App() {
      const [open, setOpen] = useState(false);
      return h("div", null,
        h("button", { id: "opener", onClick: () => setOpen(true) }, "Filters"),
        h(Sheet, { open, onClose: () => { closes++; setOpen(false); }, title: "Filters" }, h("p", null, "body")));
    }
    const el = render(h(App));
    const opener = el.querySelector("#opener");
    opener.focus();
    click(opener);
    const dialog = el.querySelector("dialog");
    assert.equal(dialog.open, true);
    assert.equal(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent, "Filters");
    act(() => { dialog.dispatchEvent(new window.Event("cancel", { cancelable: true })); });
    assert.equal(closes, 1);
    assert.equal(dialog.open, false);
    assert.equal(focused(), opener);
    click(opener);
    click(el.querySelector(".piq-sheet__close"));
    assert.equal(closes, 2);
    assert.equal(el.querySelector(".piq-sheet__close").getAttribute("aria-label"), "Close");
  });
});

describe("US-024 app shell and error screens", () => {
  test("the bottom bar shows five destinations, or four and More when there are more; More opens the drawer", () => {
    const el = render(h(AppShell, { nav: NAV, current: "matters", brand: h("span", null, "Acme") }, h("p", null, "content")));
    const bar = el.querySelector(".piq-shell__bar");
    assert.deepEqual([...bar.querySelectorAll(".piq-shell__bar-label")].map((s) => s.textContent), ["Home", "Matters", "Billing", "Clients", "More"]);
    assert.equal(bar.querySelector('[aria-current="page"]').textContent, "Matters");
    const more = [...bar.querySelectorAll("button")].find((b) => b.textContent === "More");
    click(more);
    const dialog = el.querySelector("dialog.piq-sheet");
    assert.equal(dialog.open, true);
    assert.deepEqual([...dialog.querySelectorAll("nav > ul > li > a, nav > ul > li > button")].map((a) => a.textContent.trim()), NAV.map((n) => n.label), "the drawer has every destination, in order");
    const small = render(h(AppShell, { nav: NAV.slice(0, 5), current: "home" }));
    assert.deepEqual([...small.querySelectorAll(".piq-shell__bar .piq-shell__bar-label")].map((s) => s.textContent), ["Home", "Matters", "Billing", "Clients", "Reports"]);
  });

  test("a skip link leads to the content; the side navigation and the bar list the same destinations in the same order", () => {
    const el = render(h(AppShell, { nav: NAV.slice(0, 5), current: "home", actions: h(MenuButton, { label: "Account", items: [] }) }, h("p", null, "content")));
    const skip = el.querySelector(".piq-shell__skip");
    assert.equal(skip.getAttribute("href"), `#${el.querySelector("main").id}`);
    const side = [...el.querySelectorAll(".piq-shell__side nav > ul > li > :first-child .piq-primary-nav__label")].map((x) => x.textContent);
    const bar = [...el.querySelectorAll(".piq-shell__bar .piq-shell__bar-label")].map((x) => x.textContent);
    assert.deepEqual(side, bar);
  });

  // @covers US-024-AC7
  test("AC7: each error screen has one level-1 heading and a way forward", () => {
    for (const kind of ["not-found", "forbidden", "offline", "maintenance", "session-expired"]) {
      const el = render(h(ErrorScreen, { kind }));
      assert.equal(el.querySelectorAll("h1").length, 1, kind);
      assert.ok(el.querySelector("h1").textContent.length > 5, kind);
      assert.ok(el.querySelector(".piq-error-screen__actions a[href], .piq-error-screen__actions button"), `${kind} leads on`);
      act(() => root.unmount()); host.remove(); root = null;
    }
    const custom = render(h(ErrorScreen, { kind: "not-found", title: "No such matter", actions: h("a", { href: "/matters" }, "Back to matters") }));
    assert.equal(custom.querySelector("h1").textContent, "No such matter");
    assert.equal(custom.querySelector(".piq-error-screen__actions a").getAttribute("href"), "/matters");
  });
});
