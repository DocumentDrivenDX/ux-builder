/* Users and roles, audit log, notifications, integrations, API keys, home,
   command palette and context menu (US-042 to US-044; FEAT-006 USR-01,
   AUDIT-01, NOTIF-01, INT-01, HOME-01, SRCH-01, CTX-01), against the built
   package.

     npm run build && npm test --workspace @ux-builder/ui */

import "./dom.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { act, createElement as h, useState } from "react";
import { createRoot } from "react-dom/client";
import { MenuButton } from "../dist/index.js";
import { ApiKeys, AuditLog, CommandPalette, ContextMenu, HomeScreen, Integrations, NotificationCentre, PermissionsMatrix, StatTile, UsersAndRoles } from "../dist/patterns.js";

let root, host;
function render(el) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(el));
  return host;
}
const unmount = () => { act(() => root?.unmount()); host?.remove(); root = null; };
afterEach(unmount);
const key = (el, k, opts = {}) => act(() => { el.dispatchEvent(new window.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, ...opts })); });
const click = (el) => act(() => { el.click(); });
const type = (el, value) => act(() => { Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, value); el.dispatchEvent(new window.Event("input", { bubbles: true })); });
const choose = (sel, value) => act(() => { sel.value = value; sel.dispatchEvent(new window.Event("change", { bubbles: true })); });
const submit = (form) => act(() => { form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })); });
const text = (el) => el?.textContent.trim();
const button = (el, name) => [...el.querySelectorAll("button")].find((b) => text(b) === name || b.getAttribute("aria-label") === name);
const byLabel = (el, label) => { const l = [...el.querySelectorAll("label")].find((x) => x.textContent.trim() === label); return l && (l.control ?? document.getElementById(l.htmlFor)); };

const ROLES = [{ value: "owner", label: "Owner" }, { value: "editor", label: "Editor" }, { value: "viewer", label: "Viewer" }];
const MEMBERS = Array.from({ length: 10 }, (_, i) => ({ id: `u${i}`, name: `Member ${i + 1}`, email: `m${i + 1}@acme.test`, role: ROLES[i % 3].value }));

describe("US-042 users, roles and audit log", () => {
  // @covers US-042-AC1
  test("AC1: each member is listed with their role", () => {
    const el = render(h(UsersAndRoles, { members: MEMBERS, roles: ROLES }));
    const rows = [...el.querySelectorAll("tbody tr")];
    assert.equal(rows.length, 10);
    assert.deepEqual([text(rows[0].querySelector("th")), text(rows[0].querySelector(".piq-members__current"))], ["Member 1", "Owner"]);
    assert.equal(text(rows[1].querySelector(".piq-members__current")), "Editor");
  });

  // @covers US-042-AC2
  test("AC2: invite takes an email and a role; an address that is not an email is an error and nothing is sent", () => {
    const sent = [];
    const el = render(h(UsersAndRoles, { members: MEMBERS, roles: ROLES, onInvite: (x) => sent.push(x) }));
    click(button(el, "Invite"));
    const d = el.querySelector("dialog[open]");
    type(byLabel(d, "Email address"), "not-an-email");
    choose(byLabel(d, "Role"), "editor");
    submit(d.querySelector("form"));
    assert.deepEqual(sent, []);
    assert.equal(text(d.querySelector(".piq-field__error")), "Enter an email address, like name@example.com");
    assert.equal(byLabel(d, "Email address").getAttribute("aria-invalid"), "true");
    type(byLabel(d, "Email address"), "new@acme.test");
    submit(d.querySelector("form"));
    assert.deepEqual(sent, [{ email: "new@acme.test", role: "editor" }]);
  });

  // @covers US-042-AC3
  test("AC3: changing a role gives the app the member and role; the list shows it once the app confirms", () => {
    const changes = [];
    function App() { const [ms, setMs] = useState(MEMBERS); return h(UsersAndRoles, { members: ms, roles: ROLES, onRoleChange: (m, r) => { changes.push([m.id, r]); setMs((x) => x.map((y) => (y.id === m.id ? { ...y, role: r } : y))); } }); }
    const el = render(h(App));
    const sel = byLabel(el, "Change role for Member 1");
    choose(sel, "viewer");
    assert.deepEqual(changes, [["u0", "viewer"]]);
    assert.equal(text(el.querySelector("tbody tr .piq-members__current")), "Viewer");
  });

  // @covers US-042-AC4
  test("AC4: the matrix has a column per role and a row per permission, each cell saying Yes or No", () => {
    const perms = ["View matters", "Edit matters", "Bill", "Invite", "Delete"].map((label, i) => ({ value: `p${i}`, label }));
    const el = render(h(PermissionsMatrix, { roles: ROLES, permissions: perms, has: (r, p) => r === "owner" || (r === "editor" && p !== "p4" && p !== "p3") || (r === "viewer" && p === "p0") }));
    assert.deepEqual([...el.querySelectorAll('thead th[scope="col"]')].map(text), ["Permission", "Owner", "Editor", "Viewer"]);
    assert.deepEqual([...el.querySelectorAll('tbody th[scope="row"]')].map(text), perms.map((p) => p.label));
    assert.deepEqual([...el.querySelectorAll("tbody tr")][4].querySelectorAll("td").length, 3);
    assert.deepEqual([...[...el.querySelectorAll("tbody tr")][0].querySelectorAll("td")].map(text), ["Yes", "Yes", "Yes"]);
    assert.deepEqual([...[...el.querySelectorAll("tbody tr")][4].querySelectorAll("td")].map(text), ["Yes", "No", "No"]);
  });

  const ENTRIES = [{ id: 1, actor: "R. Lee", action: "Changed the rate", before: "£400", after: "£450", time: "2026-10-18T10:00:00Z" }, { id: 2, actor: "S. Patel", action: "Closed the matter", before: "Open", after: "Closed", time: "2026-10-17T09:00:00Z" }];

  // @covers US-042-AC5 @covers US-042-AC7
  test("AC5, AC7: each entry shows who, what, when, before and after, and nothing edits or deletes it", () => {
    const el = render(h(AuditLog, { entries: ENTRIES, locale: "en-GB" }));
    const row = [...el.querySelectorAll("tbody tr")][0];
    assert.deepEqual([...row.cells].slice(1).map(text), ["R. Lee", "Changed the rate", "£400", "£450"]);
    assert.match(text(row.cells[0]), /18 Oct 2026/);
    assert.equal(row.querySelectorAll("button, input, select, a").length, 0);
    assert.equal([...el.querySelectorAll("button")].filter((b) => /edit|delete|remove/i.test(text(b) + (b.getAttribute("aria-label") ?? ""))).length, 0);
  });

  // @covers US-042-AC6
  test("AC6: filtering by person, action and date gives the app the filters; applied ones show as removable chips", () => {
    const got = [], removed = [];
    const el = render(h(AuditLog, { entries: ENTRIES, people: [{ value: "rl", label: "R. Lee" }], actions: [{ value: "rate", label: "Changed the rate" }], filters: [{ id: "rl", label: "Person: R. Lee" }], onFilter: (f) => got.push(f), onRemoveFilter: (f) => removed.push(f.id) }));
    choose(byLabel(el, "Person"), "rl");
    choose(byLabel(el, "Action"), "rate");
    const [from, to] = el.querySelectorAll('input[type="date"]');
    type(from, "2026-10-01"); type(to, "2026-10-18");
    submit(el.querySelector(".piq-audit-log__filters"));
    assert.deepEqual(got, [{ person: "rl", action: "rate", from: "2026-10-01", to: "2026-10-18" }]);
    const chip = el.querySelector(".piq-chip");
    assert.equal(text(chip.querySelector("span")), "Person: R. Lee");
    click(chip.querySelector("button"));
    assert.deepEqual(removed, ["rl"]);
  });
});

describe("US-043 notifications, integrations and API keys", () => {
  const NOTES = [{ id: "n1", title: "Acme v. Beta was updated", href: "/m/1" }, { id: "n2", title: "Invoice 12 approved", href: "/i/12" }, { id: "n3", title: "New comment", href: "/m/1#c" }, { id: "n4", title: "Old news", href: "/x", read: true }];
  function Centre() { const [ns, setNs] = useState(NOTES); return h(NotificationCentre, { notifications: ns, onMarkRead: (n) => setNs((x) => x.map((y) => (y.id === n.id ? { ...y, read: true } : y))), onMarkAllRead: () => setNs((x) => x.map((y) => ({ ...y, read: true }))) }); }

  // @covers US-043-AC1
  test("AC1: the button's name states the unread count in text", () => {
    const el = render(h(Centre));
    assert.equal(el.querySelector(".piq-notifications > button").getAttribute("aria-label"), "Notifications, 3 unread");
  });

  // @covers US-043-AC2 @covers US-043-AC3
  test("AC2, AC3: each says Read or Unread and links to its record; mark one or all read, and the count follows", () => {
    const el = render(h(Centre));
    click(el.querySelector(".piq-notifications > button"));
    const items = () => [...el.querySelectorAll(".piq-notifications__item")];
    assert.deepEqual(items().map((i) => text(i.querySelector(".piq-notifications__state"))), ["Unread", "Unread", "Unread", "Read"]);
    assert.equal(items()[0].querySelector("a").getAttribute("href"), "/m/1");
    click(items()[0].querySelector("button"));
    assert.equal(text(items()[0].querySelector(".piq-notifications__state")), "Read");
    assert.equal(el.querySelector(".piq-notifications > button").getAttribute("aria-label"), "Notifications, 2 unread");
    click(button(el, "Mark all as read"));
    assert.equal(el.querySelector(".piq-notifications > button").getAttribute("aria-label"), "Notifications");
  });

  // @covers US-043-AC4
  test("AC4: changing a channel for a kind gives the app the kind, channel and setting", () => {
    const got = [];
    const el = render(h(NotificationCentre, { notifications: [], preferences: { kinds: [{ value: "matter", label: "Matter updates" }], channels: [{ value: "email", label: "Email" }, { value: "app", label: "In the app" }], value: { matter: { email: true } } }, onPreferenceChange: (...a) => got.push(a) }));
    click(el.querySelector(".piq-notifications > button"));
    const sw = byLabel(el, "In the app for Matter updates");
    assert.equal(sw.getAttribute("role"), "switch");
    click(sw);
    assert.deepEqual(got, [["matter", "app", true]]);
  });

  // @covers US-043-AC5
  test("AC5: each connection's status in text, Connect or Disconnect, each a request to the app", () => {
    const got = [];
    const el = render(h(Integrations, { items: [{ id: "s", name: "Slack", connected: true }, { id: "d", name: "DocuSign", connected: false }], onConnect: (i) => got.push(["connect", i.id]), onDisconnect: (i) => got.push(["disconnect", i.id]) }));
    assert.deepEqual([...el.querySelectorAll(".piq-integrations__status")].map(text), ["Connected", "Not connected"]);
    click(button(el, "Disconnect Slack"));
    click(button(el, "Connect DocuSign"));
    assert.deepEqual(got, [["disconnect", "s"], ["connect", "d"]]);
  });

  // @covers US-043-AC6 @covers US-043-AC7
  test("AC6, AC7: a new key in full once with a copy button; once closed, only masked and nowhere in the page", async () => {
    const copied = [];
    Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (t) => copied.push(t) }, configurable: true });
    function Keys() { const [created, setCreated] = useState({ name: "CI", secret: "sk_live_9f8e7d6c5b4a3210" }); return h(ApiKeys, { keys: [{ id: "k", name: "CI", last4: "3210" }], created, onCreatedClose: () => setCreated(null) }); }
    const el = render(h(Keys));
    assert.equal(text(el.querySelector(".piq-api-keys__secret")), "sk_live_9f8e7d6c5b4a3210");
    await act(async () => { button(el, "Copy key").click(); });
    assert.deepEqual(copied, ["sk_live_9f8e7d6c5b4a3210"]);
    click(button(el, "Done"));
    assert.ok(!el.innerHTML.includes("sk_live_9f8e7d6c5b4a3210"), "the full key is gone from the page");
    assert.equal(text(el.querySelector(".piq-api-keys__masked")), "•••• •••• •••• 3210");
  });

  // @covers US-043-AC8
  test("AC8: revoking asks first, naming the key; confirm revokes, cancel keeps it", () => {
    const revoked = [];
    const el = render(h(ApiKeys, { keys: [{ id: "k", name: "CI", last4: "3210" }], onRevoke: (k) => revoked.push(k.id) }));
    click(button(el, "Revoke CI"));
    let d = el.querySelector("dialog[open]");
    assert.equal(text(document.getElementById(d.getAttribute("aria-labelledby"))), "Revoke CI?");
    click(button(d, "Cancel"));
    assert.deepEqual(revoked, []);
    click(button(el, "Revoke CI"));
    click(button(el.querySelector("dialog[open]"), "Revoke"));
    assert.deepEqual(revoked, ["k"]);
  });
});

describe("US-044 home, command palette and context menu", () => {
  // @covers US-044-AC1
  test("AC1: tiles with label and number, and each list under its heading with its own empty state", () => {
    const el = render(h(HomeScreen, { title: "Good morning", tiles: [h(StatTile, { key: "a", label: "Open matters", value: "12" })],
      assigned: { title: "Assigned to you", items: [{ id: 1, label: "Review Acme v. Beta", href: "/m/1", meta: "Due today" }] }, recent: { title: "Recent", items: [], emptyText: "Nothing opened yet." } }));
    assert.deepEqual([text(el.querySelector(".piq-stat-tile__label")), text(el.querySelector(".piq-stat-tile__value"))], ["Open matters", "12"]);
    const lists = [...el.querySelectorAll(".piq-home__list")];
    assert.deepEqual(lists.map((l) => text(l.querySelector("h2"))), ["Assigned to you", "Recent"]);
    assert.equal(lists[0].querySelector("a").getAttribute("href"), "/m/1");
    assert.equal(text(lists[1].querySelector(".piq-home__empty")), "Nothing opened yet.");
  });

  function Palette({ log = [] }) {
    const [results, setResults] = useState([]);
    return h("div", null, h("button", { id: "before" }, "Somewhere"), h(CommandPalette, { recent: [{ id: "r1", label: "Acme v. Beta" }],
      results, onSearch: (q) => setResults(q ? [{ label: "Matters", items: [{ id: "m1", label: "Acme v. Beta" }, { id: "m2", label: "Acme Holdings" }] }, { label: "Actions", items: [{ id: "a1", label: "New matter" }] }] : []),
      onSelect: (it) => log.push(it.id) }));
  }

  // @covers US-044-AC2
  test("AC2: Ctrl+K, Cmd+K or the button open a modal dialog with focus in a combobox", () => {
    const el = render(h(Palette));
    for (const opts of [{ ctrlKey: true }, { metaKey: true }]) {
      key(document.body, "k", opts);
      const d = el.querySelector("dialog");
      assert.equal(d.open, true);
      assert.equal(document.activeElement.getAttribute("role"), "combobox");
      act(() => { d.dispatchEvent(new window.Event("cancel", { cancelable: true })); });
      assert.equal(d.open, false);
    }
    click(el.querySelector(".piq-palette > button"));
    assert.equal(el.querySelector("dialog").open, true);
    assert.equal(el.querySelector(".piq-palette > button").getAttribute("aria-keyshortcuts"), "Control+K Meta+K");
  });

  // @covers US-044-AC3
  test("AC3: before typing, the recent items; typing, the app's results in labelled groups", () => {
    const el = render(h(Palette));
    click(el.querySelector(".piq-palette > button"));
    const groups = () => [...el.querySelectorAll('[role="listbox"] [role="group"]')];
    assert.deepEqual(groups().map((g) => text(document.getElementById(g.getAttribute("aria-labelledby")))), ["Recent"]);
    type(document.activeElement, "acme");
    assert.deepEqual(groups().map((g) => text(document.getElementById(g.getAttribute("aria-labelledby")))), ["Matters", "Actions"]);
    assert.deepEqual(groups().map((g) => [...g.querySelectorAll('[role="option"]')].map(text)), [["Acme v. Beta", "Acme Holdings"], ["New matter"]]);
  });

  // @covers US-044-AC4
  test("AC4: Enter goes to the active result; Escape closes and returns focus to where it was", () => {
    const log = [];
    const el = render(h(Palette, { log }));
    const before = el.querySelector("#before");
    before.focus();
    key(document.body, "k", { ctrlKey: true });
    const box = document.activeElement;
    type(box, "acme");
    key(box, "ArrowDown");
    assert.equal(document.getElementById(box.getAttribute("aria-activedescendant")).textContent, "Acme Holdings");
    key(box, "Enter");
    assert.deepEqual(log, ["m2"]);
    assert.equal(el.querySelector("dialog").open, false);
    assert.equal(document.activeElement, before);
    key(document.body, "k", { ctrlKey: true });
    act(() => { el.querySelector("dialog").dispatchEvent(new window.Event("cancel", { cancelable: true })); });
    assert.equal(document.activeElement, before);
  });

  const ROW_ITEMS = (log) => [{ label: "Open", onSelect: () => log.push("open") }, { label: "Duplicate", onSelect: () => log.push("duplicate") }, { label: "Archive", onSelect: () => log.push("archive") }];

  // @covers US-044-AC5
  test("AC5: right-click, Shift+F10 or the ContextMenu key open an APG menu; arrows move, Enter chooses, Escape returns focus", () => {
    const log = [];
    const el = render(h(ContextMenu, { items: ROW_ITEMS(log), label: "Row actions" }, h("div", { tabIndex: 0, id: "row" }, "Acme v. Beta")));
    const row = el.querySelector("#row");
    act(() => { row.dispatchEvent(new window.MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 50 })); });
    const menu = el.querySelector('[role="menu"]');
    assert.equal(menu.getAttribute("aria-label"), "Row actions");
    assert.deepEqual([menu.style.insetInlineStart, menu.style.insetBlockStart], ["40px", "50px"], "at the pointer");
    assert.equal(text(document.activeElement), "Open");
    key(document.activeElement, "ArrowDown");
    assert.equal(text(document.activeElement), "Duplicate");
    key(document.activeElement, "Escape");
    assert.equal(el.querySelector('[role="menu"]'), null);
    assert.equal(document.activeElement, row);
    for (const k of [["F10", { shiftKey: true }], ["ContextMenu", {}]]) {
      row.focus();
      key(row, k[0], k[1]);
      assert.ok(el.querySelector('[role="menu"]'), k[0]);
      key(document.activeElement, "End");
      click(document.activeElement);
    }
    assert.deepEqual(log, ["archive", "archive"]);
    assert.equal(row.getAttribute("aria-haspopup"), "menu");
  });

  // @covers US-044-AC6
  test("AC6: every context-menu item is also in the row's visible action menu", () => {
    const items = ROW_ITEMS([]);
    const el = render(h("div", null, h(ContextMenu, { items }, h("div", { tabIndex: 0, id: "row" }, "Acme v. Beta")), h(MenuButton, { label: "Actions", items })));
    click(el.querySelector(".piq-menubutton button"));
    const visible = [...el.querySelectorAll('.piq-menubutton [role="menuitem"]')].map(text);
    key(el.querySelector(".piq-menubutton [role=menu]"), "Escape");
    const row = el.querySelector("#row");
    row.focus();
    key(row, "ContextMenu");
    const context = [...el.querySelectorAll('.piq-context-menu [role="menuitem"]')].map(text);
    assert.ok(context.length > 0 && context.every((c) => visible.includes(c)), `${context} in ${visible}`);
  });
});
