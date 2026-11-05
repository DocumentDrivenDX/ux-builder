"""Import the Rules sheet of ux-builder-rules-combined.xlsx into a ux-builder checkout.

    python import_rules_to_repo.py <ux-builder checkout> [--workbook PATH] [--out PATH]

Rewrites <checkout>/guidelines/rules.json (or --out) from the Rules sheet. The column
mapping and what the repo accepts are on the workbook's Import notes sheet. Rules already
in rules.json keep their place; a new rule goes after the last rule of its family, and a new
family at the end. The top of the file (version, limits, priorities, clashOrder) is kept.

Refuses, naming the rule, anything the repo's rule check (tools/check-rules.mjs) would fail
on that can be seen from here. Afterwards, in the checkout:

    npm run catalogue && npm run plugin:build && npm run rules

Needs openpyxl.
"""
import argparse, json, re, sys
from collections import OrderedDict
from pathlib import Path
from openpyxl import load_workbook

ap = argparse.ArgumentParser()
ap.add_argument("repo")
ap.add_argument("--workbook", default=str(Path(__file__).with_name("ux-builder-rules-combined.xlsx")))
ap.add_argument("--out")
a = ap.parse_args()
repo = Path(a.repo)
src_path = repo / "guidelines/rules.json"
src = json.loads(src_path.read_text(), object_pairs_hook=OrderedDict)
schema = json.loads((repo / "guidelines/schema/rules.schema.json").read_text())
rule_props = schema["$defs"]["rule"]["properties"]
LICENCES = set(schema["$defs"]["source"]["properties"]["licence"]["enum"])
WHEN = {k: set(v["items"]["enum"]) for k, v in rule_props["when"]["properties"].items()}
PLANNED = set(rule_props["plannedChecks"]["items"]["properties"]["kind"]["enum"])
CHECKS = set(rule_props["checks"]["items"]["properties"]["kind"]["enum"])
SEVERITY = set(rule_props["severity"]["enum"])
ID = re.compile(rule_props["id"]["pattern"])
OPEN = {"CC-BY-2.5", "CC-BY-4.0", "W3C", "own"}

ws = load_workbook(a.workbook, read_only=True)["Rules"]
it = ws.iter_rows(values_only=True)
hdr = list(next(it))
rows = [dict(zip(hdr, r)) for r in it if r and r[hdr.index("Rule ID")]]

problems = []
def bad(rid, msg): problems.append(f"{rid}: {msg}")
lines = lambda s: [x.strip() for x in str(s or "").split("\n") if x.strip()]
commas = lambda s: [x.strip() for x in str(s or "").split(",") if x.strip()]

def rule_of(d):
    rid = d["Rule ID"].strip()
    if not ID.match(rid): bad(rid, "the ID is not lowercase and dotted")
    o = OrderedDict(id=rid)
    for col, key in (("Title", "title"), ("Statement", "statement"), ("Rationale", "rationale")):
        v = (d[col] or "").strip()
        if not v: bad(rid, f"{col} is empty")
        o[key] = v
    if d["When (conditions)"]:
        w = OrderedDict()
        for part in str(d["When (conditions)"]).split(";"):
            m = re.match(r"^\s*(\w+):\s*(.+)$", part)
            if not m or m[1] not in WHEN: bad(rid, f"When '{part.strip()}' is not one of {sorted(WHEN)}; put words in Scope (words)"); continue
            vals = commas(m[2])
            for x in vals:
                if x not in WHEN[m[1]]: bad(rid, f"When {m[1]} '{x}' is not one of {sorted(WHEN[m[1]])}")
            w[m[1]] = vals
        if w: o["when"] = w
    if d["Applies to (patterns)"]: o["appliesTo"] = {"patterns": commas(d["Applies to (patterns)"])}
    if d.get("Scope (words)"): o["scope"] = str(d["Scope (words)"]).strip()
    kinds, ids = commas(d["Check type(s)"]), commas(d["Check ID(s)"])
    if not kinds or len(kinds) != len(ids): bad(rid, "Check type(s) and Check ID(s) must pair up, one ID per type")
    for k in kinds:
        if k not in CHECKS: bad(rid, f"check type '{k}' is not one of {sorted(CHECKS)}; an unbuilt check goes in Planned checks, with review here")
    o["checks"] = [OrderedDict(kind=k, id=i) for k, i in zip(kinds, ids)]
    if d.get("Planned checks"):
        pcs = []
        for l in lines(d["Planned checks"]):
            k, _, i = l.partition(":")
            if k.strip() not in PLANNED or not i.strip(): bad(rid, f"planned check '{l}' is not 'kind: id' with a kind of {sorted(PLANNED)}")
            pcs.append(OrderedDict(kind=k.strip(), id=i.strip()))
        o["plannedChecks"] = pcs
    if d["Severity"] not in SEVERITY: bad(rid, f"severity '{d['Severity']}' is not one of {sorted(SEVERITY)}")
    o["severity"] = d["Severity"]
    titles, urls, lics = lines(d["Sources"]), lines(d["Source URLs"]), lines(d.get("Licences"))
    if not titles: bad(rid, "cites no source")
    if not (len(titles) == len(urls) == len(lics)): bad(rid, f"Sources, Source URLs and Licences must have one line per source ({len(titles)}, {len(urls)}, {len(lics)}); unlinked notes go in Basis and evidence")
    srcs = []
    for t, u, l in zip(titles, urls, lics):
        m = re.match(r'^(.*) \((paraphrased|quoted)\)(?::\s*"(.*)")?$', t)
        if not m: bad(rid, f"source '{t}' must end (paraphrased), or (quoted): \"…\""); continue
        if not u.startswith("https://"): bad(rid, f"source link '{u}' is not https")
        if l not in LICENCES: bad(rid, f"licence '{l}' is not one of {sorted(LICENCES)}")
        s = OrderedDict(title=m[1], url=u, licence=l, wording=m[2])
        if m[2] == "quoted":
            if l not in OPEN: bad(rid, f"quotes '{m[1]}' under {l}; paraphrase it")
            if not m[3] or len(m[3].split()) > 25: bad(rid, f"a quote from '{m[1]}' must be 1 to 25 words")
            s["quote"] = m[3]
        srcs.append(s)
    o["sources"] = srcs
    if d["Priority"]: o["priority"] = d["Priority"]
    else: bad(rid, "has no priority")
    for col, key in (("Depends on (must pass first)", "dependsOn"), ("Takes precedence over", "takesPrecedenceOver")):
        if d[col]: o[key] = commas(d[col])
    h = lines(d["Heuristic impact (Nielsen)"])
    if h: o["heuristics"] = h
    if d.get("Status"): o["status"] = str(d["Status"]).strip()
    if o.get("status") == "proposed" and any(c["kind"] != "review" for c in o["checks"]):
        bad(rid, "a proposed rule's checks are reviews until its checks are built")
    return o

new = OrderedDict()
for d in rows:
    o = rule_of(d)
    if o["id"] in new: bad(o["id"], "the ID is used twice")
    new[o["id"]] = o
for o in new.values():
    for key in ("dependsOn", "takesPrecedenceOver"):
        for x in o.get(key, []):
            if x not in new: bad(o["id"], f"{key} names {x}, which is not a rule")
    for x in o.get("takesPrecedenceOver", []):
        if x in new and int(o["priority"][1]) > int(new[x]["priority"][1]): bad(o["id"], f"takes precedence over {x}, which has a higher priority")
if problems:
    print("Not imported:\n  " + "\n  ".join(problems), file=sys.stderr); sys.exit(1)

def same_key_order(o, old):  # keep a rule's fields in the order rules.json already has them
    keys = [k for k in old if k in o] + [k for k in o if k not in old]
    return OrderedDict((k, o[k]) for k in keys)
order = [same_key_order(new[r["id"]], r) for r in src["rules"] if r["id"] in new]
removed = [r["id"] for r in src["rules"] if r["id"] not in new]
for o in new.values():
    if any(x["id"] == o["id"] for x in order): continue
    fam = o["id"].split(".")[0]
    idx = max((i for i, x in enumerate(order) if x["id"].split(".")[0] == fam), default=None)
    order.append(o) if idx is None else order.insert(idx + 1, o)
src["rules"] = order
out = Path(a.out) if a.out else src_path
out.write_text(json.dumps(src, indent=2, ensure_ascii=False) + "\n")
print(f"{len(order)} rules written to {out}" + (f"; removed (not in the workbook): {', '.join(removed)}" if removed else ""))
