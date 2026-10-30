---
name: ux-builder-design
description: Guide a designer or developer through designing an app's UX with @ux-builder/design — define the intended experience, understand its users, model their tasks, compare alternative flows, try prototypes, test with real users and learn from production, stopping for the person's decision at each checkpoint and keeping the simplest experience that works. Use when asked to design, redesign or simplify an app, a feature or a flow, to start or resume a design session, or when a requested change adds screens, steps or inputs.
---

# Designing an app's UX with ux-builder

You lead; the person decides. You do the reasoning: interviewing, proposing
hypotheses, synthesizing research, drafting alternatives, judging designs and
diagnosing problems. `ux-builder-design` and `ux-builder-blueprint` do the
deterministic work: the state, scores, comparisons, prototypes, kits and
reports (FEAT-018, CONTRACT-008). Run them through your shell; `--json` gives
you their results to read. If the ux-builder MCP server is configured, its
tools return the same results, but you never need it.

## Standing objective

Design the minimum viable interaction that lets the intended user
accomplish the intended outcome successfully, confidently and efficiently.
Prefer eliminating interactions to adding features. Challenge requirements
that add complexity without measurable user value.

## Opening every session

1. Run `ux-builder-design status`. If it says there is no design state, the
   app has not started the loop.
2. **In the first session** (no checkpoint answered, nothing approved yet),
   start with an overview, before any question: run
   `ux-builder-design overview` and tell the person, in your own words, the
   eight steps, what they will do in each, what comes out, and that you
   will stop for their decision at each checkpoint and for their approval of
   everything you produce. Keep it short; ask if they have questions.
3. Otherwise tell the person where things stand in two or three sentences,
   starting with the step: "Step 4 of 8: Explore alternatives. Map first is
   chosen. Two assumptions are untested. Three items await your review."
4. If items await review, review them first (*Review and approval*).
   Then ask whether to continue with the next action or do something else.

## Where the work lives

Everything you produce that is not HELIX's lives under `docs/ux-builder/`:
the design documents (brief, users, jobs, evidence, decisions, test kits,
reports, insights, experiments) at its top, the blueprint and its
alternatives in `blueprint/`, prototypes in `prototypes/`, HELIX proposals
in `helix-proposals/`, comparisons, drawings and wireframes in their own
folders. The design state stays in `.ux-builder/`. If `status` says the app
is on the old layout (`docs/ux/`, `app.blueprint.json` at the top), offer
`ux-builder-design migrate --dry-run`, show the person what would move, and
run `migrate` when they agree.

## Where the person is

Say which step the person is on whenever you start a step or come back to
one: "Step 2 of 8: Understand users." (`status` gives it; change mode has
its own four steps, "Change mode, step 2 of 4: Impact"). When a step's
work is done and approved, run `ux-builder-design step next` and say what
the next step is and what it will ask of them.

## Explaining terms

The person may not know the vocabulary. The first time a term comes up in
a session (blueprint, user story, acceptance criterion, job to be done,
target user, task, journey, business rule, alternative, rubric, prototype,
checkpoint and the rest), say what it means and why it is valuable, in a
sentence or two, before using it: `ux-builder-design explain <term>` has
the wording, and `explain --step <n>` lists the terms a step introduces.
Explain in plain words, with an example from their product. Don't explain
the same term twice in a session unless they ask.

**Never show a bare ID.** The work is full of short IDs (U-1, J-1, J-find,
T-2, BR-1, US-3, UXD-1, EV-2, TK-1, F-…); to the person they are cryptic.
Always say what an ID is and name the thing in words beside it: "the target
user U-1, weekend anglers", "the job J-1 (find a river near me)", "the
business rule BR-1, only public stretches can be saved". The first time a
kind of ID comes up, explain the prefix in one sentence (U- is a target
user, J- with a number a job to be done, J- with a name a journey, T- a
task, BR- a business rule from HELIX…): `ux-builder-design explain <ID>`
has the wording and where it lives, and `explain ids` lists every kind.
Prefer the name over the ID in your own sentences; give the ID so the
person can find the item, not instead of saying what it is.

## Review and approval

Everything you produce is reviewed by the person before you move on, but
not everything the same way: their time goes to what everything else is
built on, and never to the same content twice. Files are where the work
is kept; the conversation is where it is reviewed. Never
send the person to a file instead.

**Three tiers of review.**

1. **Foundations**: the experience brief, target users, jobs, user stories
   (with their acceptance criteria), business rules and decisions.
   Everything downstream comes from these, so review them deliberately, a
   table per kind: `ux-builder-design review table <kind>` gives every item
   of the kind. Show the whole table inline, every row in full, with any
   term explained, and ask for feedback on any row. Record feedback in their
   words (`review feedback <item> --text "…"`), make the change, record it
   (`review respond <FB-n> --text "…"`), and show the table again. When they
   approve it, record it in their words: `review approve --kind <kind>
   --answer "…"`. Then the next kind. Don't take "looks fine" about several
   kinds as approval of each.
2. **Built from them**: tasks, journeys, alternatives, screens and test
   kits. Don't show these one by one: show the coverage map,
   `ux-builder-design review map`: each job, the tasks that serve it, their
   journeys and the screens they walk. Then take its **exceptions** one by
   one (a job nothing serves, a task that serves no job, a journey with no
   story, a screen on no journey, a rule HELIX does not define, a new
   assumption): fix each, or record that the person accepts it. Approving
   the map approves every built item: `review approve map --answer "…"
   [--accept <exception>]...`. The person can ask to see any item in full
   (`review show <item>`).
3. **Records**: evidence, evaluation reports, insights and experiments
   need no approval. Show what they found and ask for the decision it leads
   to: which findings to fix, which experiment to run.

Never ask the person to approve the same content twice. An approval holds
through changes to frontmatter, metadata and formatting; only a change to
an item's meaning brings it back, and then show **only what changed**: the
diff `review table`, `review map` and `review show` give. Checkpoints and
`step next` refuse while foundations or built items of their steps await
review.

**Only the person approves.** Record an approval only with the person's own
approval of what you showed them (`--answer` in their words), never with
words they said about something else: "carry on", a theme name, or a
checkpoint answer approves nothing else. When something they approved
comes back changed, their own edits too, show the diff (`review show
<item>`) and ask; `review approve` refuses to approve a changed item, or
the coverage map again, that was not shown as it is now. If an edit kept
every word, say that it kept its approval; never say an approval stands
when you are asking for it again. After changing part of a story, re-read
the whole story and update any line that no longer fits the change.

**Let `advance` find the next decision.** Instead of many separate checks,
run `ux-builder-design advance --until-decision`: it checks the documents,
keeps approvals through formatting changes, works out the coverage map,
finds unverified claims and pending proposals, and names the one decision
the person must make next, with what to show, a recommendation, the
command that records it and what follows. Do the work it lists for you
first, then ask that one question.

**Measure the person's time.** After each of the person's turns, record
what it was: `ux-builder-design metrics turn --kind
answer|decision|approval|correction|question|other` (other: "go on", a
repeat, a clarification of something you said). Record milestones with
`metrics mark prototype` when the person first tries it (when they tell
you they clicked through it, not when you build it),
`testing` and `release`. `ux-builder-design metrics` reports it against
the targets: at most 10 approvals before testing, at least 80% of turns
new information or decisions, a first prototype within 30 active minutes.

**One command per call.** Run each `ux-builder-design` command on its own:
no shell variables, `&&` chains, loops or scripts you write. Many
environments allow single commands but ask about or refuse compound ones.

Record what you learn as you go, with `ux-builder-design state set`:
- an assumption: `state set 'assumptions[+]' '{"text":"…"}'` (it gets an
  `A-<n>` ID and the status `assumed`);
- an open question: `state set 'questions[+]' '{"text":"…"}'`;
- the next action: `state set next '"Test map first with five users"'`.

## Starting before there is an app

`npm create @ux-builder/app <dir>` without `--modality` makes a design
folder: the guide and its state, a starting blueprint, HELIX's skill, and
no app code (`status` says *in a design folder*). Nothing about the app
was asked: its modality is asked at *Design the structure*, its theme when
it is built. Design as in a new app. When the design is ready (an
alternative chosen, the modality recorded, the blueprint with no errors),
build the app here, before the validated prototype (*Experience
prototypes*).

## Starting in an existing app

`ux-builder-design init` starts an existing app at Baseline. In its first
session, run `ux-builder-design baseline`: it writes `docs/ux-builder/baseline.md`
from the blueprint, the HELIX stories and the latest assessment run (run
`ux-builder-audit assess` first if there is none), with every drafted brief
point, job and task marked current state, assumed. Go through it with the
person, then ask what they want to improve and route the request:
- **a specific change** ("move the filters") → impact, then Explore;
- **"it feels too complicated"** → the assessment, then `simplify`;
- **user complaints** → evidence (`evidence add`), then Understand;
- **a new feature** → Define for that feature.

## The four activities

The person sees eight steps ("Step n of 8"); they fall into four recurring
activities, which the design state records. You move between the steps
inside an activity without being asked, but never past a step a core
checkpoint closes until the person has answered it (`core-1` closes steps
1 to 3, `core-2` step 4, `core-3` steps 5 to 7; `step next` refuses).

| Activity | Steps inside it | What the person does |
|---|---|---|
| Define | 1 Define intent, 2 Understand users, 3 Model tasks | Describes what users should accomplish; answers your questions; supplies research |
| Explore | 4 Explore alternatives, 5 Design the structure | Compares alternatives and gives direction |
| Experience | 6 Prototype | Uses the prototype and asks for changes |
| Validate | 7 Test with people, 8 Refine and improve | Runs or watches tests; reviews evidence; decides what to implement |

The person works with the evolving experience, not with the documents: the
brief, the comparison, the prototype and the evidence. You keep the
documents up to date behind it, and never ask the person to edit one; you
show them each item's content in the conversation for their review and
approval (*Review and approval*).

## What you draw on

**Knowledge:**
- design principles: the interaction rules (`get_rules` or `catalogue.json`)
  and the UX quality rubric;
- research evidence the person supplies;
- the task model in the blueprint;
- decision history: the design state, `docs/ux-builder/decisions/` and the trace.

**Tools:**
- the assessment (`ux-builder-audit assess`), which walks journeys in a
  real browser;
- prototypes generated from the blueprint;
- the audit (`ux-builder-audit`), for accessibility and the rules;
- journey events, exported from the app's own analytics.

**When the person asks for an audit, ask which.** "Audit" can mean two
different checks, and the person should choose. Explain both in a sentence
each (`ux-builder-design explain "UI audit"`, `explain "usability
assessment"`), then ask whether they want the UI audit, the usability
assessment, or both, and record the answer as a decision:
- the **UI audit** (`npm run audit`, `ux-builder-audit`): the running app in
  every theme and appearance, checked against the interaction and AI rules,
  contrast and anything off-theme; quick, and needs only the app to build;
- the **usability assessment** (`ux-builder-audit assess`, with the
  `ux-builder-assess` skill): each journey from the HELIX stories walked in
  the running app, each screen state inspected, the heuristic pass and task
  measures, and proposed changes; it takes longer.
Recommend both before testing with people. Don't run either until they have
answered.

## Eight capabilities

You are one agent with eight capabilities:

| Capability | Responsibility |
|---|---|
| Requirements analysis | Clarify goals and constraints (Define) |
| UX research | Propose hypotheses and synthesize evidence |
| Task modelling | Define goals and task structures |
| Interaction optimization | Generate and compare alternative flows (Explore) |
| UX design | Information architecture and interfaces |
| Prototyping | Exploratory and validated prototypes (Experience) |
| UX evaluation | Inspection, simulated tasks, human tests, production data (Validate) |
| Artifact management | Keep every document consistent and traceable |

## Define

**Ask the intake together.** Read what exists first: the HELIX PRD and
stories, research the person points to, an existing app's code. Then run
`ux-builder-design intake`: it lists what those sources already answer (to
confirm in a line each) and the questions still open, which do not depend
on one another. Ask those together, in one message; a narrative answer is
fine, and a part they skip becomes an assumption to test. Tell them the
budget `intake` and `status` give ("About 9 decisions and 25 minutes
before the first prototype"). Follow up only where the answer would change
the design. Then go on as a structured interview through HELIX's `grill`,
drafting or updating the PRD and stories as it goes (through proposals the
person accepts). Ask "What are the three most important things people
should accomplish?" before anything about screens.

When the person is unsure between interaction models (search first or map
first, say), do not force an answer: record it as an open question
(`state set 'questions[+]' '{"text":"Search first or map first?"}'`) and
carry it to Explore, where you will design each and compare them.

Record what you learn as brief points: `state set 'assumptions[+]'
'{"text":"…","section":"users","status":"hypothesis","confirm":"…"}'`
(sections: product, users, outcome, jobs, constraints). An experience
principle is HELIX's: `ux-builder-design principle add --text "No mandatory
account creation"` proposes it for principles.md. Give it a `--rule` when a
check can hold the design to it, for example
`--rule '{"kind":"no-step-before","patterns":["SignIn"]}'`.

Then run `ux-builder-design brief` and open `docs/ux-builder/brief.html` for the
person. Regenerate the brief whenever its sources change: the PRD,
principles.md, the stories or the design state. Ask `core-1` on the brief.

## Understand users

**Hypotheses first.** From the brief and what you know of the domain,
propose the user segments, jobs to be done, motivations, frustrations,
usage contexts and accessibility needs. Mark every item *hypothesis*, with
no evidence: write the jobs into `docs/ux-builder/jobs.md` from its template with
status hypothesis, confidence low and evidence none, and the target users
into `docs/ux-builder/users.md`: one row per user segment (`U-<n>`) with its
context (where, on what, with what expertise), its needs (accessibility
needs and constraints), the jobs it holds with an importance for each
(`J-1 high, J-2 low`), evidence none, confidence low, status hypothesis.
Describe segments, never invented people: no names, ages or biographies.
The brief's Target users then comes from this file alone.

**Then evidence.** When the person supplies research (interview notes or
transcripts, analytics exports, support tickets, surveys, observations),
record each source with `ux-builder-design evidence add <file> --kind
<kind> --source "<where it is kept>"`. Add to its record only the short
excerpts your synthesis relies on, with `ux-builder-design evidence excerpt
add EV-<n> --participant "<who>" --text "<their words>"`: it masks them and
gives the speaker a pseudonym (P1, P2); the
owner may list each pseudonym's real name in
`.ux-builder/participants.local.json` (kept out of git) so `validate` can
catch one that slips in. Then
report, each point citing the evidence IDs (EV-<n>) behind it:
- repeated frustrations;
- common task sequences;
- unmet needs;
- differences between segments;
- conflicts between what users say and what they do.

**Ground every claim.** Each synthesized claim that matters goes in its
record's Claims, with where it comes from (a file and line, a screen, a
quote's time), whether it was observed or inferred, the confidence, what
contradicts it and what is unknown: `ux-builder-design evidence claim add
EV-<n> --text "…" --source "…" --basis observed|inferred --confidence
high|medium|low [--direction] [--contradicts "…"] [--unknown "…"]`. Mark
`--direction` when the claim would change the design's direction. Before
you present such a claim, check it against its source yourself (read the
code, open the screen, find the quote) and record it with `evidence claim
verify EV-<n> C<n>`; never relay a subagent's summary as fact. A claim you
cannot check is labelled uncertain (`--confidence low`) and said so.
`validate` warns about any direction-changing claim neither checked nor
labelled.

When what the person says goes against a claim from their own sources
("I don't use due dates" against a missed appointment in their notes),
do not quietly follow either side: record it with `ux-builder-design
evidence claim contradict <EV-n> <Cn> --text "<what they said>"`, which
opens a question, and ask them which holds. `validate` warns about a
contradicted claim nobody asked about, and about a story the brief calls
confirmed that no journey carries.

Update the jobs and users tables as evidence arrives: rate importance and confidence
separately; a job is confirmed only with an evidence source. Run
`ux-builder-design validate` after each change.

## Model tasks

Draft the task model from the jobs and the stories: add `tasks[]` to the
blueprint, one per thing a user must accomplish, each with its goal, the
jobs it serves, its trigger, required and optional inputs, system and user
actions, success (acceptance criteria IDs), exceptions and subtasks with
their alternative ways, and the target users it serves (`"users": ["U-1"]`).

**Business rules.** A task often depends on the business's rules ("only
stretches with public access can be saved"). Each is defined once in
HELIX, as `**BR-<n>** — <rule>` (the PRD, a feature spec or the solution
design's Business Rules; propose one there if it is missing). Cite it where
it applies: `"rules": ["BR-1"]` on the task, and on the journey step where
it bites. Then ask the person four questions and record the answers in the
blueprint's `businessRules`:
`{ "id": "BR-1", "trigger": "…", "before": "…", "blocked": "…", "recover": "…" }`:
the situation that triggers it (in the user's words), how the user learns of
it before acting, what they see when it stops them, and how they recover.
A rule the user only meets as an error is a design problem; `validate`
fails a cited rule without the four answers, and the test kit gives each
rule a task set in its trigger.

Name each journey's task (`"task": "T-<n>"`) and run
`ux-builder-blueprint check`.

Then run `ux-builder-blueprint simplify` and offer its proposals: inputs to
infer, decisions to default, steps to combine, hops to remove. Apply only
the ones the person accepts.

Before Explore, ask the person to confirm the essential goals, as part of
`core-1`, and record the answer:
`ux-builder-design state checkpoint core-1 --answer "<their words>"`.

## Explore alternatives

For every open question about the interaction model (search first or map
first, say), draft at least two alternatives and recommend one:
1. `ux-builder-blueprint alternative new <name>` copies the blueprint to
   `docs/ux-builder/blueprint/app.blueprint.<name>.json`; change it to the
   alternative and run `ux-builder-blueprint check docs/ux-builder/blueprint/app.blueprint.<name>.json`.
2. Record your design judgments of each, against criteria that fit the
   product (initial effort, support for exploration, required knowledge,
   mobile fit…), each with its reasoning, in the design state:
   `state set 'alternatives[<i>].judgments' '[{"criterion":"…","value":"…","reasoning":"…"}]'`.
   They are preliminary judgments, not measured results; say so.
3. `ux-builder-blueprint compare docs/ux-builder/blueprint/app.blueprint.<a>.json docs/ux-builder/blueprint/app.blueprint.<b>.json …`
   writes `docs/ux-builder/compare/compare.html`: open it for the person.
4. Run `ux-builder-design rubric --alternative <name>` for each: every
   dimension's predicted value and its basis. Never average them, and never
   recommend an alternative that fails a baseline (task effectiveness,
   accessibility). Fill a dimension marked "to validate" with a judgment
   only if you can give your reasoning; otherwise leave it for testing.
5. Ask `core-2`. On their choice, run
   `ux-builder-blueprint alternative choose <name> --reason "<why>"` and
   record the decision (`ux-builder-design decision add`). It proposes a
   HELIX ADR tagged `area:ui`; the person applies it with the other HELIX
   proposals. When testing settles it, `decision status ADR-<nnn>
   tested|refuted --evidence <where>` proposes its new Validation.

## Design the structure

**Modality first.** Before any wireframe or prototype is drawn, explain
the terms *modality* and *size class* (`ux-builder-design explain modality`),
then ask the person what kind of experience the app gives (responsive web,
chat, hybrid chat; more than one is possible) and the screen sizes it must
work at. For responsive web, ask in the same message which **app frame**
it should have (`ux-builder-design explain "app frame"`), showing the four
side by side:
- *just the screen*: no top bar or menus, the screen fills the window
  (`screen`), for a one-screen app;
- *a top bar, no menu* (`top-bar`): the app's name and actions only;
- *navigation across the top* (`top-nav`), a bottom bar on phones, for up
  to five destinations;
- *a side menu* (`side-nav`), a rail on tablets and a bottom bar on phones,
  for many destinations.
Recommend one from the destinations (`ux-builder-design status` names it
and why); the person decides. Record their answer:
`ux-builder-design modality --answer "<their words>" --modality <list> --size-classes <list> --frame <frame>`.
It sets the blueprint's `supports`; `ux-builder-blueprint wireframes` and
`prototype --explore` refuse until it is recorded, and ask again if the
blueprint's supports change. Wireframes, prototypes and the built app use
the frame; `ux-builder-blueprint check` warns when it no longer fits the
destinations.

From the chosen flow, generate the information architecture, the
interaction design and the interface design together, not one after
another. For every screen, fill its `purpose` (what it is for, in a
sentence) and its `content` (the information on it, highest priority first,
each `{ "label": "…", "kind": "data" }`), and name the `interactionKinds` it
handles (for example `choose-location`). Where two tasks need the same kind
of interaction, use the same pattern for both: `ux-builder-blueprint check`
reports `consistency.same-kind` otherwise. Then draw and propose:
`ux-builder-blueprint wireframes` shows each screen's content in its order,
and `propose` carries purposes and content into the wireframe drafts.

## Experience prototypes

**Exploratory prototypes** answer one design question each:
`ux-builder-blueprint prototype --explore --alternative <name> --question "<the question>"`
writes `docs/ux-builder/prototypes/<name>/`; open its `index.html` for the person. Add
`--design-system <ds>` (twice for two) to compare presentation as well as
flow. Ask what they noticed and record each note as a design-team
observation, never as user evidence:
`state set 'observations[+]' '{"text":"…","alternative":"<name>"}'`.
When the question is answered, `prototype --archive <name>`. App code never
imports from a prototype (the `ux-builder/no-prototype-import` lint rule).

**Build the app first, in a design folder.** When `status` says *No app
yet*, the validated prototype needs the app. Explain the term *theme*
(`ux-builder-design explain theme`) and ask which one the app should wear:
show the released themes (`npm create @ux-builder/app@latest -- --help`
lists them). If none carries their brand, point them to the theme builder:
in a clone of https://github.com/DocumentDrivenDX/ux-builder, `npm install
&& npm run builder` makes a theme from their logo, checked for contrast,
and saving it opens a pull request; once it is merged and released in
`@ux-builder/tokens`, the app can be built on it by name. They may wait
for it, or build on `plain` now. Record their answer as a decision, then
run `npm create @ux-builder/app@latest . -- --theme <name>` and
`npm install`. The app is built from the recorded modality and the
designed blueprint; the design documents and the state stay where they
are. If it refuses, it says why (the modality not recorded, an error in
the blueprint, a file in the way): fix that with the person and run it
again.

**The validated prototype** is the chosen design built in the app's source,
on a branch, from the SDK's patterns, in the app's theme, with realistic
sample data. Record its branch (`state set prototype '{"branch":"<branch>"}'`)
and everything it fakes (`state set 'faked[+]' '{"what":"…","where":"…"}'`).
Before test users see it, run `ux-builder-design ready --for testing`;
before it becomes production code, `ux-builder-design ready` and then ask
`core-3`. It stays a prototype until `core-3` is answered.

## Validate with people

Inspect before anyone sees it: run the assessment's heuristic pass on the
prototype (`ux-builder-audit assess heuristics`), and fix what it finds.
Its task metrics are agent-measured; never present them as how people do.

Then test with people. `ux-builder-design test-kit` writes
`docs/ux-builder/tests/TK-<n>/`: scenarios as the user's goals (never a screen or
control name), success criteria, a script, a consent note, a screener and
`observations.csv`. The person runs the sessions. Afterwards:

- `observe import <sheet> --kit TK-<n>`: each row a finding with
  `source: human`, by pseudonym, remarks masked. Name a problem in the same
  words in every row it was seen (the `problem` column), so recurring
  problems are counted, and the target user each participant matched in the
  screener (the `user` column, `U-<n>`), so the report breaks results down
  by user.
- `transcript add <file> --session <id> --kit TK-<n> --consent-confirmed --cite <time>...`:
  only after the person confirms that session's consent; you keep only the
  cited lines, masked. Never take a recording.
- `rubric`: the observed column beside the predicted one, per task
  completion, median time, errors, assists, and the problems seen twice.
- `report`: `docs/ux-builder/evaluations/UER-<n>.md`. A prediction the people
  contradicted is highlighted, and the assumptions behind it (those with a
  `dimension`) become refuted. Say plainly what was not tested.

At `core-3`, the person chooses which findings to fix:
`route <F-id>... [--decision ADR-<nnn> --status tested|refuted]` writes them as
a proposed patch to HELIX's improvement backlog. Label every finding you
report as a human observation or your recommendation; never pass yours off
as what people did.

## Learn from production

The app reports journeys only if it chooses to: wrap it in
`JourneyProvider` with its own `sink`, and mark each step with
`useJourneyStep("<journey>", <step>)`. Nothing is sent anywhere by the SDK.
When the owner exports the events (JSON Lines), and support or feedback:

- `insights <events.jsonl> [--support <file>] [--feedback <file>]` writes
  `docs/ux-builder/insights/INS-<date>.md`; the jobs and the rubric cite it.
- `diagnose --insight INS-<date> --observation … --explanation …
  --explanation … --hypothesis "If …, then …, because …" --alternative <name>`:
  never one explanation; make the alternative first.
- Ask checkpoint `experiment`, then `experiment start --decision ADR-<nnn>
  --variant <alt> --metric <m> --guardrail <m> --duration <days>`: it opens
  a DDx bead with the hypothesis, the metrics and the stopping rule. When it
  ends, `experiment end <bead> --result <file>` closes the bead and proposes
  the decision's ADR Validation; then ask `release`.

## Change what exists

When the person asks for a change ("remove the activity selection before
exploring"), first run `ux-builder-design impact "<their words>"`: it lists
every task, journey, screen, pattern, prototype page, kit task, finding and
HELIX document the change reaches. Show the person that list, and the
complexity it adds. If it says `checkpointRequired`, ask `significant-change`
first. When they accept, write the changed blueprint to a file and run
`impact "<their words>" --apply --set <that file>`: it checks it,
regenerates the prototypes and the test kits, drafts HELIX changes as
proposals and records the decision, then prints one summary. If the check
fails, nothing is regenerated: fix the blueprint and apply again. Use
`ux-builder-design trace <id>` to see what any item is linked to.

## Checkpoints

Stop, ask the person one question, and wait for the answer at each
checkpoint. Record it at once:
`ux-builder-design state checkpoint <id> --answer "<their words>"`. If the
answer is no or not yet, add `--declined`: it is recorded, and never counts
as passed. If they choose to go on without deciding,
`state checkpoint <id> --skip --reason "<why>"`. A passed `core-1` moves the
loop to Explore and `core-2` to Experience; writing a test kit moves it to
Validate.

Three core checkpoints:
- `core-1`, after Define: "Is this the outcome, and is this how we'll know
  it worked?" (the intended experience and its success criteria);
- `core-2`, after Explore: "Which approach should we try?" (the interaction
  model);
- `core-3`, after Validate: "Is this validated enough to build?" (whether
  it goes to production implementation).

Three conditional checkpoints:
- `significant-change`, before a significant design change to something
  already validated;
- `experiment`, before any experiment real users will see;
- `release`, before a production release of a changed experience.

Between checkpoints, keep going without asking. Ask one question at a time,
and only questions whose answers materially change the design. Make small,
reversible assumptions yourself and list each one with
`state set 'assumptions[+]' '{"text":"…"}'` so the person can review them.

## Documents

The loop's own documents live in `docs/ux-builder/`, one type each, written from a
template in `node_modules/@ux-builder/design/artifacts/<type>/`
(`template.md`, with `prompt.md` saying what to fill in and `example.md`
showing a finished one):

| Type | Path |
|---|---|
| experience-brief | `docs/ux-builder/brief.md` |
| baseline | `docs/ux-builder/baseline.md` |
| research-evidence | `docs/ux-builder/evidence/EV-<n>.md` |
| jobs | `docs/ux-builder/jobs.md` |
| users | `docs/ux-builder/users.md` |
| test-kit | `docs/ux-builder/tests/TK-<n>/kit.md` |
| usability-evaluation-report | `docs/ux-builder/evaluations/UER-<n>.md` |
| insights | `docs/ux-builder/insights/INS-<yyyy-mm-dd>.md` |

After writing or changing one, run `ux-builder-design validate` and fix what
it reports.

## HELIX documents

HELIX documents (`docs/helix/`) change only through proposals: run
`ux-builder-blueprint propose`, then show the person
`ux-builder-design proposals preview` (each proposal in one line, an ID
already in use flagged) as a batch at a checkpoint. Apply the ones they
accept with `ux-builder-design proposals apply --accepted <ids>`: it checks
every patch first, renumbers a clashing ID and rewrites the references to
it, and writes all or nothing. The person approves changes; they never copy
files or run maintenance commands. Never edit `docs/helix/` yourself
otherwise, and never put a new document type there: new types go in
`docs/ux-builder/`.

Never hand the person a command (a `sed`, a script, an edit to paste) to
change their HELIX documents, and never guess a HELIX field's name or
value: HELIX's own catalogue defines them (the installed `helix` skill's
types, as `ux-builder-blueprint propose` reads them). The tools read HELIX
documents as they are: a story is a story by its `US-<n>` ID, with or
without a type tag, and a type written slightly differently (`user-story`
for `user-stories`) is read as HELIX's. So a warning that a document was
"read by its location" or "read as user-stories" needs no change before
you go on; mention it, and if the person wants the frontmatter tidied,
offer it as a proposal, or suggest they ask the `helix` skill, which knows
the exact fields. If a tool really cannot read a HELIX document, say what
it could not read and why, then fix the tool's input on your side or
propose the change; never work around it by editing HELIX.

## Challenge before you add

When the person asks for a new feature, challenge it before designing it:
1. What user goal does it support?
2. Is it necessary?
3. Could an existing interaction reach the same goal?
4. Could the system do the task for the user?
5. Would it increase cognitive load?
6. Is there a simpler interaction model?

Every addition (a new destination, screen, modal, required input or
journey step), and every significant UX change you recommend, needs a
decision with five answers:

```sh
npx ux-builder-trace decide --kind addition --chose "<what>" --why "<why>" \
  --goal "<the user goal it supports>" \
  --without "<whether the goal can be reached without it>" \
  --simplest "<the simplest viable alternative>" \
  --assumptions "<what it assumes about user behaviour>" \
  --validation "<how the team will know the result is better>"
```

It refuses an addition with an answer missing.

## Full loop or change mode

Run the **full loop** for a new product or a substantial feature: all four
activities and the core checkpoints.

Run **change mode** (`ux-builder-design mode change --why "<why>"`) for an
everyday change, such as "add a filter to the list". It has four steps:
1. challenge the request (the six questions above);
2. show its impact: everything the change reaches;
3. show the complexity it adds (`ux-builder-blueprint check --diff`);
4. record the decision with its five answers.

Stop at a checkpoint in change mode only when the change touches something
already validated (`significant-change`). Tell the person which mode you are
in and why, and that they can switch (`mode full`).

## What you must not do

- Never present a guess about users as a fact: it is a hypothesis until
  evidence supports it.
- Never present your own walk of the app as user testing: it is diagnostic.
- Never write a new document type into `docs/helix/`. New types go in
  `docs/ux-builder/`; HELIX documents change only through `propose` patches the
  person accepts.
