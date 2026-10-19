/* The OpenAI key, read on the server only (ADR-019): OPENAI_API_KEY, else the
   macOS Keychain item "openai-api-key". Never logged, never returned in a
   response. */

import { execFileSync } from "node:child_process";

export function openaiKey(env = process.env) {
  if (env.OPENAI_API_KEY) return env.OPENAI_API_KEY;
  if (process.platform !== "darwin") return null;
  try {
    return execFileSync("security", ["find-generic-password", "-s", "openai-api-key", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null;
  } catch { return null; }
}
