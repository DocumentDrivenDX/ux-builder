# **UX Builder on HELIX**

Oct 27, 2026 · @Stephen Sklarew

## **The proposal**

ux-builder should stop keeping a second set of product documents beside HELIX's. It should become a design tool that writes into HELIX's documents and leans on HELIX's process.

Today ux-builder keeps its own brief, users, jobs, decisions, evidence, test kits, evaluation reports, insights and experiments in docs/ux-builder/. It also has its own approvals, checkpoints and validation, and mints 17 kinds of ID of its own on top of HELIX's 4\.

The proposal, in plain terms:

1. **Each fact has one home.**  
   * HELIX holds what the product is for, the decisions and the evidence.  
   * The blueprint holds how the interface is built.  
   * ux-builder's tools make wireframes, prototypes and audits from them.  
   * DDx holds runs, experiments and work items.  
2. **ux-builder stops writing its own copies** of the brief, users, jobs, decisions, evidence, test kits, evaluation reports and experiments. Each moves into the HELIX document Erik has already agreed to, or out of the repo as run output.  
3. **ux-builder uses HELIX's process instead of rebuilding it:**  
   * its interview, framing, alignment and validation modes;  
   * its concerns for accessibility and interaction patterns;  
   * DDx for experiments.  
4. **We ask HELIX for the short list Erik agreed** and nothing more: three new types and a few optional sections.  
5. **The person sees far fewer IDs.** HELIX's own IDs, plus the blueprint's names for screens and journeys, and nothing else.

What stays ux-builder's own is what HELIX doesn't do: the guided conversation, the blueprint, generated wireframes and prototypes, the audit, and the time and approval bookkeeping for one design session.

## **One home for each thing**

There are four homes, and nothing lives in two of them.

| Home | Holds | Does not hold |
| :---- | :---- | :---- |
| **HELIX** (docs/helix/) | What the product is for and for whom (PRD, with its users and needs tables); features and their tasks; stories and acceptance criteria; experience principles (principles.md); decisions (ADRs, with a Validation section); studies with real people and what they found (research plan, extended); DESIGN.md; user flows and annotated wireframes; journey maps where worth making; traceability | Anything generated or re-runnable |
| **The blueprint** (docs/ux-builder/blueprint/) | How the interface is built: screens, actions, journeys, states, the chosen modality and app frame, in a form tools can read. DESIGN.md links to it | Why it was built that way: that lives in HELIX |
| **ux-builder's tools** | The guided conversation; generated wireframes and prototypes; the audit and assessment; the approval and time bookkeeping for a session (.ux-builder/, local) | Any document a person would read later to understand the product |
| **DDx** | Work items (beads); experiments with real users; run output (audits, assessments, blueprint checks, test-session recordings), linked by path | Product intent |

This is ADR-030 ("HELIX governs; the blueprint is derived"), taken to its end. Erik's question about putting the blueprint beside the vision gets this answer:

* The *principles* that guide the UI go into principles.md, beside the vision.  
* The blueprint itself is the built structure that follows from them.

## **What ux-builder stops doing**

Every row is something ux-builder keeps today, with its replacement. The documents column lists ten files and folders that leave docs/ux-builder/.

| ux-builder today | Instead |
| :---- | :---- |
| brief.md, its own document | A page rendered on demand from the PRD, principles.md and the stories. Nothing to keep in step |
| users.md and jobs.md | The PRD's User Segments and User Needs tables |
| Tasks kept only in the blueprint | The feature specification's Task Model. The blueprint's journeys say which task they carry out |
| decisions/UXD-n | ADRs labelled area:ui, with an optional Validation section |
| evidence/EV-n and the Claims table | The study's research plan, extended with a Findings section that holds the claims |
| tests/TK-n test kits | The study's research plan holds the scenarios, success criteria and screener. The facilitator script, observation sheet and consent form are generated when the study runs, and kept outside the repo |
| evaluations/UER-n | Assess runs are run output in DDx. A study's results go into its research plan's Findings, and the fixes into the improvement backlog |
| insights/INS-\* | The metrics dashboard's Journey Funnels. The dated exports are run output |
| experiments/EXP-n | DDx. The ADR's Validation section cites the experiment |
| baseline.md for an existing app | HELIX's **backfill** mode drafts the PRD and stories from the app. ux-builder supplies the blueprint drawn from the app's screens |
| ux-builder-design validate on its own documents | HELIX's **validate** on HELIX documents. ux-builder checks only the blueprint (ux-builder-blueprint check) and that the blueprint's links into HELIX resolve |
| impact threading a change through the documents | HELIX's **evolve** threads the requirement change. ux-builder regenerates the blueprint-derived pieces afterwards |
| The coverage map, a ux-builder report | The solution design's Experience Traceability, checked by HELIX's **align**. ux-builder still draws the map for the person to review |

What's left in docs/ux-builder/:

* the blueprint and its alternatives;  
* the generated wireframes and prototypes;  
* reports.html, the index of run output, which links out and copies nothing in.

## **What ux-builder uses from HELIX**

The guide's steps keep their order and checkpoints. What each step writes, and how, comes from HELIX.

| Guided step | What it uses from HELIX |
| :---- | :---- |
| Define intent (step 1\) | **frame** writes the PRD and principles.md. **grill** asks the questions the sources can't answer. The intake keeps its one-message batch and its read-the-sources-first rule |
| Understand users (step 2\) | The PRD's users and needs tables. The **research plan** for any study, with its findings |
| Model tasks (step 3\) | The feature specification's Task Model. Business rules defined once, in the solution design |
| Explore alternatives (step 4\) | The solution design's Solution Approaches, and an **ADR** for the choice |
| Design the structure (step 5\) | DESIGN.md (navigation, states, tokens). The user flow and annotated wireframes, written from the blueprint |
| Prototype and build (step 6\) | **Concerns**: create-app selects packaged-design-system, ux-interaction-patterns and a11y-wcag-aa, so HELIX's checks and story test plans apply to the UI |
| Test with people (step 7\) | The study's research plan: scenarios and success criteria before, findings after |
| Refine (step 8\) | The improvement backlog, the metrics dashboard, and DDx for experiments |
| Any time | **check** for what's next. **evolve** for a changed requirement. **align** and **validate** for drift. **review** for a fresh-eyes read. **present** for a deck to stakeholders. DDx beads for follow-ups |

The gain is more than less code. HELIX's modes, validators, concerns and reviews start applying to UX work, and a HELIX user gets a design without learning a second document set.

## **What we ask of HELIX**

The ask is the revised list Erik approved, plus one addition from today's app-frame change. Every new section is optional, so HELIX projects without a UI see no change.

**Three new types**

1. **user-flow** (02-design). One per feature, numbered from it, with a view per screen nested under it. It holds how people move between views.  
2. **wireframe** (02-design). One per view: layouts per size class, states and events, accessibility, and the modality (screen, voice or chat).  
3. **user-journey-map** (01-frame), optional. One person's experience across several stories, keyed to a task.

**Extended types**

| Type | Addition |
| :---- | :---- |
| research-plan | One per study. Methods hold the scenarios, success criteria and screener; a new Findings section holds the claims, under ADR-039's masking rules |
| principles | Experience Principles |
| PRD | User Segments and User Needs tables, each rated for evidence and confidence |
| feature specification | A Task Model section |
| solution design | Business rules with stable IDs, as their single home; an Experience Traceability table |
| ADR | Optional Assumptions and Validation sections |
| DESIGN.md | Supported modalities, size classes and **app frame** (new since the review: ADR-041); destinations by size class |
| story test plan | Optional Journey Scenarios; an evidence reference in UX Coverage |
| metrics dashboard | Journey Funnels |

**Withdrawn**

These types are no longer asked for:

* research-evidence  
* usability-test-kit  
* usability-evaluation-report  
* experiment  
* a separate interaction-state-diagram

We also withdraw two of FEAT-018's asks:

* **Checkpoints as HELIX stop triggers (H-4).** The guide's checkpoints stay in the guide.  
* **A UX lane in the HELIX skill (H-5).** HELIX doesn't need to know ux-builder exists; ux-builder writes into HELIX documents.

## **Fewer IDs**

Erik asked us not to get carried away with J-n and T-n, and he is right. ux-builder mints 17 kinds of ID of its own today: U-, J- (twice: jobs are J-1, journeys are J-find), T-, A-, PR-, UXD-, EV-, P, TK-, F-, UER-, INS-, D-, EXP-, FB- and O-. A person in a design session shouldn't have to learn any of them.

The rule: **a person sees HELIX's IDs and plain names, nothing else.**

| Kept | Why |
| :---- | :---- |
| HELIX's own IDs: FEAT-, US-, US-n-ACm, ADR-, BR-, and the new UF- and WF- | They are the project's document IDs, and HELIX already validates them |
| Screens and journeys by name (list, capture a task) | The blueprint's keys, and they read as words |
| Participant pseudonyms (P1) | Privacy (ADR-039) |

| Dropped | Instead |
| :---- | :---- |
| U-, J-n, T- | Rows of the PRD and feature tables, named by what they say. A journey names its task by that name. Tools may give them internal keys; the person never has to read them |
| UXD-, TK-, UER-, INS-, EXP-, F- | These documents move to HELIX or DDx (above) and take those IDs |
| EV- | The study's research plan; claims are numbered rows inside it |
| A-, PR-, D-, FB-, O- | Assumptions go to the PRD's Assumptions and principles to principles.md. The rest are the tool's session bookkeeping, spoken in words, never shown as IDs |

The chain from a need to its task, journey and screen still holds. It just runs on names, and HELIX's align checks it.

## **Order of work**

Most of the overlap can go now, without waiting for HELIX. HELIX already has ADRs, principles.md, the research plan, the improvement backlog, concerns and its modes. HELIX documents keep sections a team adds, so a Findings or Validation section can be added before the templates have them.

**Now: ux-builder changes only**

1. **Show names, not IDs.** Stop showing U-, J-, T- and the session IDs in chat and documents.  
2. **Decisions become ADRs.** Write UX decisions as ADRs (area:ui), with a Validation section.  
3. **Principles move.** Write experience principles to principles.md.  
4. **Studies use the research plan.** One research plan per study, with Methods and a Findings section. Evidence records and test kits stop being written.  
5. **Run output leaves the repo.** Assess runs, evaluation reports and insight snapshots become run output: DDx, or gitignored, listed on reports.html. Their fixes go to the improvement backlog; experiments go to DDx.  
6. **create-app selects HELIX's concerns.**  
7. **The skill uses HELIX's modes.** It calls HELIX's frame, grill, validate, align, evolve and backfill where it now uses its own, and retires baseline, impact's document threading, and validate's document checks.

**When HELIX accepts the ask**

1. **propose patches HELIX's own sections.** It fills user-flow, wireframe and the new sections, not sections it inserts itself.  
2. **Users, needs and tasks are read from HELIX.** They come from the PRD and the feature specification; users.md and jobs.md go.  
3. **The brief becomes a rendered page only.**

**Then**

1. **Existing apps move over.** ux-builder-design migrate moves an existing app's docs/ux-builder/ documents into HELIX as proposals the person applies.  
2. **The old document types are removed.** The ten ux-builder document types and their commands go.

A ux-builder ADR records this split; it builds on ADR-030 and replaces the document parts of ADR-036. Each step above becomes a DDx bead.

## **Open questions**

* ☐ **Where does run output live?** DDx execution records, or a gitignored folder that reports.html indexes? The choice decides what a HELIX document cites.  
* ☐ **May a HELIX document carry a section its template doesn't have yet?** Findings in a research plan, Validation in an ADR. If HELIX's validator objects, step 4 of "Now" waits for the templates.  
* ☐ **What links a journey to its task when the task has no ID?** Its name is the readable link, but a rename breaks it. The fallback is a key in the Task Model's table that tools use and people never see.  
* ☐ **Should the brief remain at all?** Or should the person read the PRD directly, with the agent summarizing on request?  
* ☐ **How are wireframes numbered under a user flow?** As in Erik's comment (UF-004-01-\<view\>), or as WF-n with a link to the flow?  
* ☐ **Who drafts the HELIX templates?** We have drafts in docs/proposals/helix-ux-artifact-types, and they need the renames and merges agreed above.

## **Punch list: the HELIX pull request**

The PR goes to github.com/DocumentDrivenDX/helix, as one change. Each type lives in workflows/activities/\<NN-activity\>/artifacts/\<type\>/ as meta.yml, template.md, prompt.md and example.md. Paths below are from HELIX 0.18.0 as installed here; check them against main before branching.

Every new section is optional, and IDs are only the documents' own: UF-, UJM- and BR-, and a wireframe takes its flow's number. Table rows are named, not numbered.

**New types**

* ☐ **user-flow** (02-design/artifacts/user-flow/)  
  * **ID:** UF-\<FEAT number\>, one per feature.  
  * **Location:** docs/helix/02-design/flows/UF-\<n\>-\<feature\>/UF-\<n\>.md.  
  * **Sections:** Scope; Views; Flow Diagram; Transitions; Alternate Paths; Story Traceability; Dead Ends.  
  * **Relationships:** informed by feature-specification and user-stories; informs wireframe and story-test-plan.  
  * **Source:** ux-builder's draft screen-flow, with "screen" renamed "view".  
* ☐ **wireframe** (02-design/artifacts/wireframe/)  
  * **Location:** nested under its flow, UF-\<n\>-\<feature\>/UF-\<n\>-\<nn\>-\<view\>.md, as Erik suggested.  
  * **Sections:** Scope and Fidelity, naming the modality (screen, voice, chat); Layouts per size class; States and Events (the drafted interaction-state-diagram folded in); Accessibility; Open Questions.  
  * **Relationships:** informed by user-flow and design-system.  
* ☐ **user-journey-map** (01-frame/artifacts/user-journey-map/)  
  * **Optional:** optional: true in its meta.yml.  
  * **ID and location:** UJM-\<n\>, at docs/helix/01-frame/journey-maps/.  
  * **Sections:** Actor and Scenario, which names the task it maps from the feature's Task Model; Journey Phases; Insights; Opportunities; Story Coverage.

**Extended types**

* ☐ **research-plan**  
  * **One per study:** output.location becomes docs/helix/01-frame/research/\<study\>.md, and the old single research-plan.md stays valid.  
  * **Methods** gains optional Scenarios (goals, no interface words), Success Criteria (US-n-ACm) and Screener.  
  * **New optional Findings section,** holding a Claims table: Claim, Source, Basis, Confidence, Direction, Verified, Contradicting, Unknown.  
  * **Prompt:** carries ADR-039's rules: raw material is never copied in, excerpts are masked, and every claim has a basis.  
  * **Validator:** a pattern check that a Findings claim has a Source.  
* ☐ **principles:** an optional Experience Principles section, for the principles that govern how the interface behaves.  
* ☐ **prd:** under Users and Scope, optional User Segments and User Needs tables.  
  * User Segments columns: User, Context, Needs, Evidence, Confidence, Status.  
  * User Needs columns: Need, Importance, Evidence, Confidence, Status.  
  * The prompt says to rate importance and evidence separately.  
* ☐ **feature-specification:** an optional Task Model section after Functional Areas.  
  * **Columns:** Task, Goal, Users, Needs, Rules, Realized by (a journey or flow).  
* ☐ **solution-design:**  
  * **Business Rules** use stable \*\*BR-n\*\* — rule lines, and the prompt makes this section their single home.  
  * **Traceability** gains an optional Experience Traceability table (need → task → flow → view), with its gaps under Gaps.  
* ☐ **adr:** optional sections.  
  * **Assumptions.**  
  * **Validation:** not tested, tested or refuted, citing the study, the dashboard or a DDx experiment that settled it.  
* ☐ **design-system** (DESIGN.md):  
  * an optional section for Supported Modalities, Size Classes and App Frame (screen, top-bar, top-nav or side-nav);  
  * an optional Destinations by Size Class subsection under Navigation and Active State.  
* ☐ **story-test-plan:**  
  * an optional Journey Scenarios section;  
  * an Evidence column in UX Coverage, so the audit run is cited by path.  
  * Update workflows/references/ux-evidence.md to match.  
* ☐ **metrics-dashboard:** an optional Journey Funnels section: per journey, completion, the step people drop off most, and the diagnosis.

**Generated files, tests and docs**

* ☐ Regenerate workflows/graph.yml with scripts/generate\_graph.py; validate-skills.sh fails on drift.  
* ☐ Regenerate the website reference (scripts/generate-reference.py, checked by validate-website-generated.sh) and the skill's references/ floor (scripts/build-plugin-package.sh).  
* ☐ Extend tests/test\_ux\_governance.py to cover the new types and sections. Add example instances to tests/fixtures so validate-instance.sh exercises them.  
* ☐ Release notes and CHANGELOG: three new types; extensions that are all optional and backward compatible.

## **Punch list: ux-builder**

There are three stages. The first doesn't depend on the HELIX PR.

**Stage 1: now, ux-builder only**

*Decision and docs*

* ☐ **A new ADR** (ADR-042, "ux-builder writes into HELIX") records one home for each thing. It builds on ADR-030 and replaces the document parts of ADR-036 and ADR-039.  
* ☐ **FEAT-018's Asks of HELIX** are rewritten to the agreed list: H-1 revised; H-4, H-5 and H-7 withdrawn; H-2, H-3 and H-6 kept as the PRD, ADR and Task Model extensions. Amend CONTRACT-008 for every command changed below.  
* ☐ **docs/proposals/helix-ux-artifact-types** gets the agreed renames and merges (screen-flow becomes user-flow; interaction-state-diagram folds into wireframe; usability-evaluation-report is dropped). It is the draft source for the HELIX PR.

*Fewer IDs*

* ☐ **packages/design/glossary.json:** cut the ids list to HELIX's IDs and participant pseudonyms.  
* ☐ **The skill's "Never show a bare ID" rule** becomes "show names".  
* ☐ **Review tables, the coverage map, status and advance** name users, needs, tasks, assumptions and questions by what they say, not by ID.  
* ☐ **Journeys are named without the J- prefix** (capture, not J-capture). Update the blueprint examples and create-app's journey fixtures.

*Decisions become ADRs*

* ☐ **decision add** (packages/design/decisions.mjs) writes docs/helix/02-design/adr/ADR-\<n\>-\<slug\>.md with area:ui and a Validation section.  
* ☐ **decision status** edits that section.  
* ☐ **Remove** artifacts/ux-decision. The review's decision kind and the trace graph read ADRs.

*Principles*

* ☐ **Experience principles** are written to docs/helix/01-frame/principles.md, under an Experience Principles heading.  
* ☐ **The brief** reads them from there, and the state's principles and PR- IDs go.

*Studies*

* ☐ **evidence add and evidence claim** (research.mjs) write to the study's research plan. Until HELIX moves the location, that's docs/helix/01-frame/research-plan-\<study\>.md, with a Findings section holding the claims.  
* ☐ **Remove** artifacts/research-evidence.  
* ☐ **test-kit** (testkit.mjs) writes Scenarios, Success Criteria and Screener into that plan's Methods. It generates the facilitator script, observation sheet and consent form into a gitignored run folder.  
* ☐ **Remove** artifacts/test-kit.  
* ☐ **observe import, transcript add and report** write results to the plan's Findings and fixes to the improvement backlog (docs/helix/06-iterate/improvement-backlog.md), as proposals.  
* ☐ **Remove** artifacts/usability-evaluation-report.

*Run output out of the repo*

* ☐ **Gitignore** the evaluation, insights and assessment run folders.  
* ☐ **reports.html** (packages/audit/reports.mjs) lists every run by path.  
* ☐ **insights and diagnose** propose Journey Funnels for the metrics dashboard and keep the dated export as run output.  
* ☐ **Remove** artifacts/insights.  
* ☐ **experiment start\|end** creates and closes a DDx bead with the hypothesis, the metrics and the stopping rule, and writes the result into the ADR's Validation section.  
* ☐ **Remove** artifacts/experiment.

*HELIX's modes, not ours*

* ☐ **SKILL.md:** the intake uses HELIX's frame and grill to write the PRD.  
* ☐ **Existing apps** use HELIX's backfill; retire baseline and artifacts/baseline.  
* ☐ **Requirement changes** use HELIX's evolve. impact keeps only regenerating what is derived from the blueprint.  
* ☐ **Drift** uses HELIX's validate and align. ux-builder-design validate keeps only the blueprint's links into HELIX.  
* ☐ **create-app** (packages/create-app/helix-docs.mjs) writes docs/helix/01-frame/concerns.md, selecting packaged-design-system, ux-interaction-patterns and a11y-wcag-aa.

**Stage 2: after the HELIX PR merges**

* ☐ **ux-builder-blueprint propose** (packages/ui/blueprint/propose.mjs, ux-docs.mjs) fills HELIX's user-flow and wireframe types and the new optional sections. Delete packages/ui/blueprint/helix-types/ and the draft fallback.  
* ☐ **Users and needs are read from the PRD tables, and tasks from the Task Model** (packages/design/documents.mjs, graph.mjs, review.mjs). users.md, jobs.md and their artifact types go.  
* ☐ **The blueprint's tasks** reference Task Model rows by name.  
* ☐ **The coverage map** proposes the solution design's Experience Traceability.  
* ☐ **The modality, size classes and app frame** are proposed into DESIGN.md.  
* ☐ **brief** renders a page from the PRD, principles.md and the stories; artifacts/experience-brief goes.  
* ☐ **Research plans** move to HELIX's per-study location.

**Stage 3: move existing apps over**

* ☐ **ux-builder-design migrate** moves an app's docs/ux-builder/ documents into HELIX as proposals the person applies, then removes the originals.  
* ☐ **Remove the old document readers;** HELIX's validate now covers what they checked.  
* ☐ **Update the READMEs, the microsite, the skill tests and the coverage map.** Write changesets for design, ui, audit and create-app (breaking for design).

Each checkbox becomes a DDx bead under one parent bead for this change.