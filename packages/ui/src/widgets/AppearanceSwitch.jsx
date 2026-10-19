import { useRef } from "react";
import { Icon } from "../icons/Icon.jsx";
import { iconContrast, iconMoon, iconSun } from "../icons/library.generated.js";

const OPTIONS = [
  { value: "light", icon: iconSun },
  { value: "system", icon: iconContrast },
  { value: "dark", icon: iconMoon },
];

/* Light, the system's setting, or dark, as three icons in a pill: a radio
   group (arrow keys move and choose), each option named in text for
   assistive technology and shown on hover, the chosen one raised on a disc
   so the choice is never colour alone. value is "light", "system" or
   "dark", as ThemeProvider's appearance takes; available lists the
   appearances the theme has, and the others are disabled. */
export function AppearanceSwitch({ value = "system", onChange, label = "Appearance", labels = { light: "Light", system: "Auto", dark: "Dark" }, available, className }) {
  const refs = useRef([]);
  const enabled = OPTIONS.map((o) => o.value === "system" || !available || available.includes(o.value));
  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === value));
  function move(from, step) {
    for (let n = 1; n <= OPTIONS.length; n++) {
      const i = (from + step * n + OPTIONS.length * n) % OPTIONS.length;
      if (enabled[i]) { onChange?.(OPTIONS[i].value); refs.current[i]?.focus(); return; }
    }
  }
  function onKeyDown(e) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); move(index, step); }
    else if (e.key === "Home") { e.preventDefault(); move(-1, 1); }
    else if (e.key === "End") { e.preventDefault(); move(OPTIONS.length, -1); }
  }
  return (
    <div className={`piq-appearance${className ? ` ${className}` : ""}`} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {OPTIONS.map((o, i) => (
        <button key={o.value} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={o.value === value}
          aria-label={labels[o.value]} title={labels[o.value]} tabIndex={i === index ? 0 : -1} disabled={!enabled[i]}
          className="piq-appearance__opt" onClick={() => onChange?.(o.value)}>
          <Icon icon={o.icon} />
        </button>
      ))}
    </div>
  );
}
