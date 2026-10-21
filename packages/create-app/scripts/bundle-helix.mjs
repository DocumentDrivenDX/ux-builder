#!/usr/bin/env node
/* Bundle the latest HELIX release with the starter (ADR-027 decision 4).
   Runs on `npm pack` and `npm publish` (prepack): fetches and verifies the
   latest plugin package exactly as a new app would, and writes it with its
   provenance to helix/, the copy used offline. Fails, and so stops the
   publish, if the package cannot be fetched and verified.

     node scripts/bundle-helix.mjs [--tag vX.Y.Z] */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { ASSET, BUNDLED, fetchRelease } from "../helix.mjs";

const { values } = parseArgs({ options: { tag: { type: "string" } } });
const r = await fetchRelease({ tag: values.tag, keepArchive: true });
mkdirSync(BUNDLED, { recursive: true });
for (const f of readdirSync(BUNDLED)) rmSync(join(BUNDLED, f));
writeFileSync(join(BUNDLED, ASSET(r.provenance.tag)), r.archive);
const digest = "sha256:" + createHash("sha256").update(r.archive).digest("hex");
writeFileSync(join(BUNDLED, "bundled.json"), JSON.stringify({ tag: r.provenance.tag, digest, source: r.provenance.source, fetchedAt: r.provenance.fetchedAt }, null, 2) + "\n");
// The licence record follows the bundled version (licenses/vendored.json).
const vfile = new URL("../licenses/vendored.json", import.meta.url);
const v = JSON.parse(readFileSync(vfile, "utf8"));
v.vendored[0].version = r.manifest.version;
writeFileSync(vfile, JSON.stringify(v, null, 2) + "\n");
console.log(`bundled HELIX ${r.provenance.tag} (${digest.slice(0, 19)}…, ${Math.round(r.archive.length / 1024)} KB)`);
