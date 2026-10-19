/* Every text role CI checks, drawn as real text on its real ground, so the
   accessibility panel measures what the browser actually renders. The
   pairings come from the gate itself (tools/contrast.mjs): this story can
   never check a different list from the one CI enforces. */

import { PAIRS } from "../../../../tools/contrast.mjs";
import "./TextRoles.css";

export function TextRoles() {
  return (
    <ul className="ds-roles">
      {PAIRS.map(([fg, bg, label]) => (
        <li key={`${fg}-${bg}`} className="ds-role" style={{ color: `var(--${fg})`, background: `var(--${bg})` }}>
          <span className="ds-role__label">{label[0].toUpperCase() + label.slice(1)}</span>
          <code className="ds-role__pair">--{fg} on --{bg}</code>
        </li>
      ))}
    </ul>
  );
}
