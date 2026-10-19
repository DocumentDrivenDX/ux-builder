/* The builder for the e2e run: a throwaway copy of tokens/ and brand/ as the
   repository, the mock model, and files-only review, so the run is
   deterministic and touches nothing real. Writes the copy's path to
   e2e/.root for the test to inspect. */

import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("../../..", import.meta.url));
const root = mkdtempSync(join(tmpdir(), "theme-builder-e2e-"));
cpSync(join(REPO, "tokens"), join(root, "tokens"), { recursive: true });
cpSync(join(REPO, "brand"), join(root, "brand"), { recursive: true });
writeFileSync(new URL(".root", import.meta.url), root);
Object.assign(process.env, { BUILDER_ROOT: root, BUILDER_MODEL: "mock", BUILDER_REVIEW: "files", PORT: process.env.PORT ?? "5190" });
await import("../server.mjs");
