/* @ux-builder/design (FEAT-018, CONTRACT-008): one exported function per
   ux-builder-design command, each returning what the command prints with
   --json. MCP tools wrap these same functions (ADR-036 rule 2). */

import { readFileSync } from "node:fs";

export const VERSION = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export { DesignError, findApp, writeInApp } from "./app.mjs";
export { canonical, emptyState, hasState, parsePath, readState, SCHEMA, serialize, STATE_FILE, stateGet, stateSet, validateState, writeState } from "./state.mjs";
export { status, summary } from "./status.mjs";
export { checkpoint, CHECKPOINTS, setMode } from "./checkpoints.mjs";
export { baseline } from "./baseline.mjs";
export { applyImpact, buildGraph, impact, summaryOf, trace } from "./graph.mjs";
export { goalText, kits, kitTasks, OBSERVATION_COLUMNS, testKit } from "./testkit.mjs";
export { ready, readyText } from "./ready.mjs";
export { observedFor, RUBRIC, rubric, rubricText } from "./rubric.mjs";
export { findingIdFor, humanFindings, maskPersonal, observedDimensions, observedMeasures, observeImport, parseCsv, transcriptAdd, transcriptLines } from "./sessions.mjs";
export { evaluationFindings, report, route } from "./evaluation.mjs";
export { insights, journeyStats, latestInsights } from "./insights.mjs";
export { diagnose, experimentEnd, experimentStart } from "./experiments.mjs";
export { DECISION_STATUSES, decisionAdd, decisionStatus } from "./decisions.mjs";
export { brief, BRIEF_SECTIONS, briefContent, briefHtml, principlesFile } from "./brief.mjs";
export { EVIDENCE_KINDS, evidenceAdd, evidenceList, writeEvidence } from "./research.mjs";
export { ARTIFACTS, documentTypes, jobsTable, PERSONAL_PATTERNS, exampleFile, helixIds, helixRoot, parseDocument, pathFor, templateFile, uxDocuments, validate, validateDocument } from "./documents.mjs";
export { ADOPT_SDK, init, installSkill, MCP_SERVER, SKILL_DIR, writeMcpConfig } from "./init.mjs";
