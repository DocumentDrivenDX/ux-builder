# Writing a interaction decision record

One major UX decision: the question, the alternatives, the recommendation and why, what it assumes, and its validation status, so the reason survives later iterations. Maps to a HELIX ADR or solution approach in stage 2 (H-3).

State the question as the person would ask it. List every alternative
considered, the one recommended and why, in a few lines. List each assumption
it rests on. Status starts not-tested; say what validation it needs. Update
the status with `ux-builder-design decision status` when evidence arrives.

Use `template.md`; `example.md` shows a finished one. `ux-builder-design validate` checks it.
