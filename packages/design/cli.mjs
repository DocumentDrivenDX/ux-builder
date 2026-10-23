#!/usr/bin/env node
/* ux-builder-design (CONTRACT-008 Commands): the guided design loop's
   deterministic work, for the agent (through its shell) and for a person.
   Exit codes: 0 done; 1 a check failed; 2 bad input or a refusal. */

import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { DesignError, findApp, init, stateGet, stateSet, status, VERSION } from "./index.mjs";

const HELP = `ux-builder-design ${VERSION}: the guided design loop (FEAT-018, CONTRACT-008)

Usage: ux-builder-design <command> [options] [--app <dir>] [--json]

  init [--mcp]
      put the guide in this app: the skill in .claude/skills/ux-builder-design/,
      an empty design state, a starting blueprint if there is none, and with
      --mcp a .mcp.json for the ux-builder MCP server. Refuses if a design
      state exists.
  status
      where the loop stands: activity, mode, chosen alternative, untested
      assumptions, open questions, checkpoints and the next action.
  state get [<path>]
      read the design state, or one field: activity, assumptions[0].status.
  state set <path> <json>
      write one field, checked against the schema. <path>[+] appends to a
      list: state set 'assumptions[+]' '{"text":"Location is available"}'.

Options:
  --app <dir>   the app (default: the nearest folder above with .ux-builder/
                or app.blueprint.json, else the git root, else here)
  --json        print the result as JSON
  -h, --help    this help
`;

function print(result, json, text) {
  process.stdout.write(json ? JSON.stringify(result, null, 2) + "\n" : `${text}\n`);
}

function parseJson(text, what) {
  try { return JSON.parse(text); } catch {
    throw new DesignError(`${what} is not JSON: ${text}`);
  }
}

async function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { app: { type: "string" }, json: { type: "boolean" }, mcp: { type: "boolean" }, help: { type: "boolean", short: "h" } },
  });
  const [command, ...rest] = positionals;
  if (values.help || !command) { process.stdout.write(HELP); return 0; }

  if (command === "init") {
    // init works in the folder it is given (or this one): an existing app may have no .ux-builder/ yet.
    const r = init(resolve(values.app ?? "."), { mcp: values.mcp });
    print(r, values.json, [`Wrote ${r.written.join(", ")}.`, ...r.notes].join("\n"));
    return 0;
  }

  const app = values.app ? findApp(values.app) : findApp();

  if (command === "status") {
    const r = status(app);
    print(r, values.json, r.text);
    return 0;
  }
  if (command === "state") {
    const [sub, path, value] = rest;
    if (sub === "get") {
      const r = stateGet(app, { path });
      print(r, values.json, typeof r.value === "string" ? r.value : JSON.stringify(r.value, null, 2));
      return 0;
    }
    if (sub === "set") {
      if (!path || value === undefined) throw new DesignError("usage: state set <path> <json>");
      const r = stateSet(app, { path, value: parseJson(value, "the value") });
      const out = { path: r.path, value: r.value };
      print(out, values.json, `${path} set.`);
      return 0;
    }
    throw new DesignError(`unknown state command "${sub ?? ""}": use get or set`);
  }
  throw new DesignError(`unknown command "${command}"; see ux-builder-design --help`);
}

main(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
  if (e instanceof DesignError || e?.code === "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
    process.stderr.write(`ux-builder-design: ${e.message}\n`);
    for (const d of e.details ?? []) process.stderr.write(`  ${d.path}: ${d.message}\n`);
    process.exitCode = 2;
  } else {
    process.stderr.write(`ux-builder-design: ${e.stack ?? e}\n`);
    process.exitCode = 1;
  }
});
