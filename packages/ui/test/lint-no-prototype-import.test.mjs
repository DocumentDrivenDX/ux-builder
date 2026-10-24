/* ux-builder/no-prototype-import (US-135-AC4; FEAT-018 GDL-42; ADR-037).

     npm test --workspace @ux-builder/ui */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Linter } from "eslint";
import uxBuilder from "../lint/eslint.mjs";

const lint = (code) => new Linter({ configType: "flat" }).verify(code, [{
  files: ["**/*.{js,jsx}"],
  languageOptions: { ecmaVersion: "latest", sourceType: "module", parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "ux-builder": uxBuilder },
  rules: { "ux-builder/no-prototype-import": "error" },
}], "app/src/App.jsx");

describe("US-135-AC4: no-prototype-import", () => {
  // @covers US-135-AC4
  test("an app source file importing from prototype/ is an error naming the import", () => {
    for (const code of [
      'import Map from "../prototype/map-first/map.compact.html";',
      'export { Detail } from "../../prototype/detail.js";',
      'const m = await import("prototype/map.js");',
      'const r = require("./prototype/x.cjs");',
    ]) {
      const [m, ...rest] = lint(code);
      assert.equal(rest.length, 0, code);
      assert.equal(m?.ruleId, "ux-builder/no-prototype-import", code);
      assert.equal(m.severity, 2);
      assert.match(m.message, /imports from a prototype: exploratory prototypes are disposable and never app code \(ADR-037\)/);
    }
    assert.match(lint('import x from "../prototype/a.js";')[0].message, /^"\.\.\/prototype\/a\.js" imports from a prototype/);
    // Prototypes in docs/ux-builder/prototypes/ (FEAT-018 GDL-80) too.
    assert.equal(lint('import m from "../docs/ux-builder/prototypes/map-first/map.compact.html";')[0]?.ruleId, "ux-builder/no-prototype-import");
  });

  test("other imports, including names that merely contain 'prototype', pass; the recommended config turns it on", () => {
    for (const code of ['import { Button } from "@ux-builder/ui";', 'import p from "./prototypes-of-ideas.js";', 'import x from "./my-prototype.js";']) assert.deepEqual(lint(code), [], code);
    assert.equal(uxBuilder.configs.recommended.rules["ux-builder/no-prototype-import"], "error");
  });
});
