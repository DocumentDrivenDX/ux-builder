# Writing the target users

The people the product is for, as evidence-backed records: each user's context, needs and the jobs they hold with an importance for each, rated for evidence and confidence like the jobs. Segments, not personas with invented biographies.

One row per target user, with a stable U-<n> ID. Describe the user as a
segment ("weekend anglers new to an area"), never as an invented person:
no names, ages, photos or hobbies, which nothing uses and which make
guesses look like facts.

- **Context**: where and how they use the product, when it changes the
  design (on a phone at the riverbank, one hand free; planning at a desk
  the night before; expert or new).
- **Needs**: accessibility needs and constraints ("none known" when there
  are none).
- **Jobs**: the jobs from `jobs.md` this user holds, each with how much it
  matters to them: `J-1 high, J-3 low`. The same job can matter more to
  one user than another.
- **Evidence, confidence, status**: as in the jobs table. A user you
  proposed without evidence is low confidence and a hypothesis.

The brief's Target users is generated from this file. Name a task's users
in the blueprint (`"users": ["U-1"]`) so the test kit and reports can be
organized by them.

Use `template.md`; `example.md` shows a finished one. `ux-builder-design validate` checks it.
