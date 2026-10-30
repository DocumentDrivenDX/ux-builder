# Writing a experience brief

What the app is for, for whom, and how its experience should feel, with every point marked confirmed, assumed or hypothesis. Compiled from HELIX; it holds no fact of its own.

Do not write the brief by hand: `ux-builder-design brief` compiles it from the PRD, principles.md, the stories and the design state, and each section names its source. To change a point, change its source (through a HELIX proposal) and regenerate. Mark every point
with its status in brackets: [confirmed] when the person said it or evidence
supports it, [assumed] when you assumed it to keep going, [hypothesis] when it
is a claim about users that needs evidence. Under every hypothesis, add
"Confirm by:" and what would confirm it (an interview question, a test task,
a metric). Never mark a guess as confirmed. Keep each section to a few lines;
the brief is read in one sitting.

Use `template.md`; `example.md` shows a finished one. `ux-builder-design validate` checks it.
