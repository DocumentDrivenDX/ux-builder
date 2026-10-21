/* Start an app with a shell command and wait until it answers; stop it
   afterwards. Shared by the audit's --serve and the assessment's baseline. */

import { spawn } from "node:child_process";

export async function serve({ command, url, cwd = process.cwd(), timeoutMs = 60_000, status = 500 }) {
  const child = spawn(command, { shell: true, stdio: "ignore", detached: true, cwd });
  const stop = () => { if (child.exitCode == null) { try { process.kill(-child.pid); } catch { /* gone */ } } };
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try { if ((await fetch(url)).status < status) return { stop }; } catch { /* starting */ }
    if (child.exitCode != null) { const e = new Error(`"${command}" exited (${child.exitCode}) before ${url} answered`); e.code = "exited"; throw e; }
    await new Promise((r) => setTimeout(r, 250));
  }
  stop();
  const e = new Error(`${url} did not answer within ${Math.round(timeoutMs / 1000)} s of "${command}"`);
  e.code = "timeout";
  throw e;
}
