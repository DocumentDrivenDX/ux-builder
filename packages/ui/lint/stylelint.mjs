/* ux-builder/no-hard-coded-values for stylelint (FEAT-004 SDK-10, SDK-11).

     // .stylelintrc.json
     { "plugins": ["@ux-builder/ui/stylelint"],
       "rules": { "ux-builder/no-hard-coded-values": [true, {
         "theme": "databricks",                      // suggest that theme's role tokens
         "allow": [{ "value": "#4E79A7", "file": "src/charts/**", "reason": "chart series" }]
       }] } }

   `true` alone reports without suggestions. Every allow entry needs a reason. */

import stylelint from "stylelint";
import { RULE, check, checkAllow, loadTokens } from "./core.mjs";

const { createPlugin, utils } = stylelint;
const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

const rule = (primary, secondary = {}) => (root, result) => {
  const valid = utils.validateOptions(result, RULE, { actual: primary, possible: [true, false] }, { actual: secondary, possible: (v) => isObject(v), optional: true });
  if (!valid || !primary) return;
  for (const e of checkAllow(secondary.allow ?? [])) utils.report({ ruleName: RULE, result, node: root, message: `${e} (${RULE})` });
  const tokens = loadTokens(secondary.theme, "light", result.opts?.cwd ?? process.cwd());
  const file = root.source?.input?.file;
  root.walkDecls((decl) => {
    const before = decl.prop.length + (decl.raws.between ?? ":").length;
    for (const f of check(decl.prop, decl.value, { tokens, allow: secondary.allow ?? [], file })) {
      utils.report({ ruleName: RULE, result, node: decl, message: f.message, index: before + f.index, endIndex: before + f.index + f.literal.length });
    }
  });
};
rule.ruleName = RULE;
rule.messages = utils.ruleMessages(RULE, {});
rule.meta = { url: "https://github.com/DocumentDrivenDX/ux-builder#lint" };

export default createPlugin(RULE, rule);
