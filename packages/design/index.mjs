/* @ux-builder/design (FEAT-018, CONTRACT-008): one exported function per
   ux-builder-design command, each returning what the command prints with
   --json. MCP tools wrap these same functions (ADR-036 rule 2). */

import { readFileSync } from "node:fs";

export const VERSION = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export { bpFile, DesignError, findApp, layout, protoDir, proposalsDir, ux, writeInApp } from "./app.mjs";
export { canonical, emptyState, hasState, parsePath, readState, SCHEMA, serialize, STATE_FILE, stateGet, stateSet, validateState, writeState } from "./state.mjs";
export { BUILD_NEEDS, status, summary } from "./status.mjs";
export { checkpoint, CHECKPOINTS, FIRST_STEP, setMode } from "./checkpoints.mjs";
export { CHANGE_STEPS, CLOSES, explain, explainText, GLOSSARY, overview, overviewText, progress, setStep, STEPS } from "./process.mjs";
export { confirmModality, modalityStatus, SIZE_CLASSES } from "./modality.mjs";
export { migrate, migrationPlan, rewritePaths } from "./migrate.mjs";
export { carried, coverageMap, diffText, lineDiff, mapText, meaningOf, pendingReviews, reviewApprove, reviewFeedback, reviewItems, reviewList, reviewMap, reviewRespond, reviewShow, reviewTable, tierOf, TIERS } from "./review.mjs";
export { logEvent, logTurn, mark, METRICS_FILE, metrics, metricsText, MILESTONES, readEvents, TARGETS, TURN_KINDS } from "./metrics.mjs";
export { budget, budgetText, INTAKE, intake, MINUTES_PER_DECISION } from "./intake.mjs";
export { advance } from "./advance.mjs";
export { proposalsApply, proposalsPreview } from "./proposals.mjs";
export { applyImpact, buildGraph, impact, summaryOf, trace } from "./graph.mjs";
export { goalText, kits, kitTasks, OBSERVATION_COLUMNS, testKit } from "./testkit.mjs";
export { ready, readyText } from "./ready.mjs";
export { observedFor, RUBRIC, rubric, rubricText } from "./rubric.mjs";
export { excerptAdd, findingIdFor, humanFindings, maskPersonal, observedDimensions, observedMeasures, observeImport, parseCsv, transcriptAdd, transcriptLines } from "./sessions.mjs";
export { evaluationFindings, report, route } from "./evaluation.mjs";
export { insights, journeyStats, latestInsights } from "./insights.mjs";
export { diagnose, experimentEnd, experimentStart } from "./experiments.mjs";
export { adrPath, DECISION_STATUSES, decisionAdd, decisionStatus, readValidation, uiDecisions } from "./decisions.mjs";
export { currentText, documentOfType, helixDocuments, nextNumber, proposeChange, proposedDocuments, sectionOf, setSection, tableUnder } from "./helix.mjs";
export { brief, BRIEF_SECTIONS, briefContent, briefHtml } from "./brief.mjs";
export { keyOf, NEED_COLUMNS, needAdd, needsTable, peopleChecks, SEGMENT_COLUMNS, segmentAdd, segmentsTable, TASK_COLUMNS, taskAdd, taskModel } from "./people.mjs";
export { experiencePrinciples, principleAdd, PRINCIPLES_FILE, readPrinciplesFile } from "./principles.mjs";
export { claimAdd, claimContradict, claimVerify, EVIDENCE_KINDS, evidenceAdd, evidenceList, unverifiedClaims, writeEvidence } from "./research.mjs";
export { addExcerpts, addSource, CLAIM_COLUMNS, claimChecks, excerptsOf, maskProblems, proposeStudy, sourcesOf, studies, studyChecks, studyClaims, studyName, studyOf, studyPath, studyRunDir } from "./studies.mjs";
export { ARTIFACTS, businessRules, evidenceSources, documentTypes, jobsTable, RULE_ANSWERS, ruleCitations, usersTable, PERSONAL_PATTERNS, exampleFile, helixIds, helixRoot, parseDocument, pathFor, templateFile, uxDocuments, validate, validateDocument } from "./documents.mjs";
export { ADOPT_SDK, init, installSkill, MCP_SERVER, SKILL_DIR, writeMcpConfig } from "./init.mjs";
