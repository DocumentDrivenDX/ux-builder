---
"@ux-builder/audit": minor
---

`ux-builder-audit assess video` turns a UX assessment into walkthrough videos for the product or technical leader who owns the app (FEAT-013, US-091 to US-095):

- It replays each journey the agent walked (each walkthrough step now records its browser action as `do`), the main path and each walked alternate as chapters, at a human pace with a cursor, signed in from the role's storage state before recording starts. At each checkpoint it checks the page is in the state that was inspected, stops the chapter with a card if not, and holds while each finding there is read.
- `video/<journey>.mp4` shows each finding where it was found: its elements outlined, and its problem and recommendation in plain English (each finding's new `plain` field), labelled **Checked** or **Judgment**. It needs `ffmpeg` on the PATH, which the package does not ship; without it the stage is partial and the player still works.
- `video/index.html` is an offline player in the ux-builder theme: findings pop up over the video, pause it, expand for the checkpoint's screenshot and confidence, link to the report, and can be filtered and stepped through by keyboard.
- `evidence.redact` selectors and text, and every password field, are masked from the first frame, including content that appears later and inside modal dialogs. A page without the mask discards the journey's video.
- `assess report` links each finding to its moment in the player, and `evidence.json` lists the videos. `validate-report` checks replay steps, secrets by reference, plain English, and that a video shows only backlog findings where they were found.
- New manifest field `video` (`viewports`, `holdSeconds`, `autoPause`); new records `annotations` and `video`.
