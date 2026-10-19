/* ux-builder/no-hard-coded-values (US-013, FEAT-004 SDK-10, SDK-11): the
   stylelint plugin, the ESLint rule, and the SDK's own source.

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";
import stylelint from "stylelint";
import eslintPlugin from "../lint/eslint.mjs";
import { check, checkAllow, literals } from "../lint/core.mjs";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const css = async (code, options = {}, codeFilename = "app/src/styles.css") => {
  const r = await stylelint.lint({ code, codeFilename, config: { plugins: ["@ux-builder/ui/stylelint"], rules: { "ux-builder/no-hard-coded-values": [true, options] } } });
  return r.results[0].warnings.map((w) => ({ line: w.line, column: w.column, text: w.text }));
};
const jsx = (code, options = {}, filename = "app/src/App.jsx") => new Linter({ configType: "flat" }).verify(code, [{
  files: ["**/*.jsx"], plugins: { "ux-builder": eslintPlugin },
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  rules: { "ux-builder/no-hard-coded-values": ["error", options] },
}], { filename }).map((m) => ({ line: m.line, text: m.message }));

describe("US-013", () => {
  // @covers US-013-AC1
  test("AC1: literal colours in CSS are reported with line and column, in every notation", async () => {
    const w = await css(`.a {\n  color: #1B3139;\n  background: rgb(10 20 30);\n  border-color: hsl(200 50% 40%);\n  outline: 2px solid oklch(0.6 0.1 30);\n  fill: crimson;\n  --brand: #abc;\n}`);
    assert.deepEqual(w.map((x) => [x.line, x.text.split(":")[0]]), [
      [2, "Hard-coded colour #1B3139"], [3, "Hard-coded colour rgb(10 20 30)"], [4, "Hard-coded colour hsl(200 50% 40%)"],
      [5, "Hard-coded colour oklch(0.6 0.1 30)"], [6, "Hard-coded colour crimson"], [7, "Hard-coded colour #abc"],
    ]);
    assert.equal(w[0].column, 10);
  });

  test("AC1: literal colours in JSX style props are reported", () => {
    const m = jsx(`export const A = () => <div style={{ color: "#1B3139", backgroundColor: \`red\`, borderColor: "var(--piq-color-border)" }} />;`);
    assert.deepEqual(m.map((x) => x.text.split(":")[0]), ["Hard-coded colour #1B3139", "Hard-coded colour red"]);
  });

  // @covers US-013-AC2
  test("AC2: literal font families and radii are reported, in CSS and JSX", async () => {
    const w = await css(`.a { font-family: "Inter", sans-serif; border-radius: 6px; border-top-left-radius: .5rem; font: 600 14px/1.4 Arial, sans-serif; }`);
    assert.deepEqual(w.map((x) => x.text.split(":")[0]), ['Hard-coded font family "Inter"', "Hard-coded radius 6px", "Hard-coded radius .5rem", "Hard-coded font family Arial"]);
    const m = jsx(`export const A = () => <div style={{ borderRadius: 8, fontFamily: "Georgia, serif" }} />;`);
    assert.deepEqual(m.map((x) => x.text.split(":")[0]), ["Hard-coded radius 8px", "Hard-coded font family Georgia"]);
  });

  // @covers US-013-AC3
  test("AC3: a literal equal to a role token in the app's theme names that token", async () => {
    const [colour, radius] = await css(`.a { color: #1B3139; border-radius: 8px; }`, { theme: "databricks" });
    assert.match(colour.text, /use var\(--piq-color-text\)/);
    assert.match(radius.text, /use var\(--piq-radius-control\)/);
    const [font] = jsx(`export const A = () => <p style={{ fontFamily: "'DM Sans', sans-serif" }} />;`, { theme: "databricks" });
    assert.match(font.text, /use var\(--piq-font-body\)/);
    const [none] = await css(`.a { color: #123456; }`, { theme: "databricks" });
    assert.match(none.text, /use a --piq-\* role token/);
  });

  // @covers US-013-AC4
  test("AC4: an allow-list entry with a reason suppresses; one without a reason is itself an error", async () => {
    const allow = [{ value: "#4E79A7", file: "src/charts/**", reason: "chart series colours" }];
    assert.deepEqual(await css(`.s1 { fill: #4E79A7; }`, { allow }, "app/src/charts/bar.css"), []);
    assert.equal((await css(`.s1 { fill: #4E79A7; }`, { allow }, "app/src/page.css")).length, 1, "only in the listed files");
    const w = await css(`.a { color: var(--piq-color-text); }`, { allow: [{ value: "#000" }] });
    assert.match(w[0].text, /allow\[0\] has no reason/);
    assert.deepEqual(jsx(`export const A = () => <i style={{ color: "#4E79A7" }} />;`, { allow: [{ value: "#4e79a7", reason: "chart" }] }), []);
    assert.deepEqual(checkAllow([{ reason: "x" }]), ["allow[0] matches nothing: give value, property or file"]);
  });

  // @covers US-013-AC5
  test("AC5: tokens, var() fallbacks, keywords, 0, generic families and fully round radii are fine", async () => {
    assert.deepEqual(await css(`.a {
      color: var(--piq-color-text, #000);
      background: transparent; border-color: currentColor; outline-color: inherit; box-shadow: none;
      border-radius: 0; font-family: system-ui, sans-serif; font: inherit;
      border-bottom-left-radius: 50%; border-top-right-radius: 999px;
      background-image: url("data:image/svg+xml;utf8,<svg fill='red'/>");
      grid-area: red; animation-name: tomato;
    }`), []);
    assert.deepEqual(jsx(`export const A = ({ c }) => <div style={{ color: c, background: "var(--piq-color-ground)", borderRadius: 0, gap: 16 }} />;`), []);
  });

  // @covers US-013-AC6
  test("AC6: the SDK's own widgets and the theme builder have no hard-coded values", async () => {
    const r = await stylelint.lint({ files: [join(ROOT, "packages/ui/src/**/*.css"), join(ROOT, "apps/theme-builder/src/**/*.css")], config: { plugins: ["@ux-builder/ui/stylelint"], rules: { "ux-builder/no-hard-coded-values": true } } });
    assert.ok(r.results.length >= 3, `${r.results.length} files`);
    assert.deepEqual(r.results.flatMap((x) => x.warnings.map((w) => `${x.source}:${w.line} ${w.text}`)), []);
    const { ESLint } = await import("eslint");
    const results = await new ESLint({ cwd: ROOT }).lintFiles(["packages/ui/src/**/*.jsx", "apps/theme-builder/src/**/*.jsx"]);
    assert.ok(results.length >= 20, `${results.length} files`);
    assert.deepEqual(results.flatMap((x) => x.messages.map((m) => `${x.filePath}:${m.line} ${m.message}`)), []);
  });
});

describe("the checks", () => {
  test("a named colour is a word on its own, not part of another word", () => {
    assert.deepEqual(literals("border", "1px solid red").map((f) => f.literal), ["red"]);
    assert.deepEqual(literals("color", "var(--red)"), []);
    assert.deepEqual(literals("transition", "red 1s"), [], "not a colour property");
  });
  test("eight-digit and four-digit hex count; other lengths do not", () => {
    assert.deepEqual(literals("color", "#11223344").map((f) => f.literal), ["#11223344"]);
    assert.deepEqual(literals("color", "#12345").map((f) => f.literal), []);
  });
  test("suggestions come only from the given theme", () => {
    assert.match(check("color", "#1B3139")[0].message, /role token/);
  });
});

describe("US-022 lint", () => {
  const lint = (code, rules) => new Linter({ configType: "flat" }).verify(code, [{
    files: ["**/*.jsx"], plugins: { "ux-builder": eslintPlugin },
    languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
    rules,
  }], { filename: "app/src/App.jsx" }).map((m) => ({ line: m.line, rule: m.ruleId, text: m.message }));

  // @covers US-022-AC8
  test("AC8: imports of other UI kits, icon sets and loaders are reported with the SDK's counterpart", () => {
    const code = [
      'import Button from "@mui/material/Button";',
      'import { Pin } from "lucide-react";',
      'import { Spin } from "antd";',
      'import { ClipLoader } from "react-spinners";',
      'const Fluent = await import("@fluentui/react-components");',
      'const icons = require("react-icons/fa");',
      'import { Button as Ok, Icon } from "@ux-builder/ui";',
      'import { iconPin } from "@ux-builder/ui/icons";',
      'import clsx from "clsx";',
      'import { debounce } from "@mui/utils";',
    ].join("\n");
    const r = lint(code, { "ux-builder/no-foreign-ui": "error" });
    assert.deepEqual(r.map((x) => x.line), [1, 2, 3, 4, 5, 6]);
    assert.match(r[0].text, /"@mui\/material\/Button" is from Material UI.*the SDK's widgets/);
    assert.match(r[1].text, /an icon set.*@ux-builder\/ui\/icons/);
    assert.match(r[3].text, /a loader library.*loading widgets/);
    assert.deepEqual(lint('import X from "antd";', { "ux-builder/no-foreign-ui": ["error", { allow: ["antd"] }] }), [], "a reviewed package can be allowed");
  });

  // @covers US-022-AC8
  test("AC8: a hand-drawn <svg> in JSX is reported; an allowed chart is not", () => {
    const code = 'export const A = () => <div><svg viewBox="0 0 16 16"><path d="M0 0h16v16z" /></svg><svg className="chart" /><Icon name="pin" /></div>;';
    const r = lint(code, { "ux-builder/no-inline-svg": ["error", { allow: ["chart"] }] });
    assert.equal(r.length, 1);
    assert.match(r[0].text, /hand-drawn <svg>.*<Icon>.*registerIcons/);
  });
});
