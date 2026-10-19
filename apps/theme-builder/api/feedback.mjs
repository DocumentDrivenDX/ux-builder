/* POST /api/feedback (ADR-014, US-018): plain-language feedback becomes
   setting changes; the engine, in the browser, decides the colours.

   The model must call one tool, adjust_settings, whose input is SD-001's
   settings schema (every property optional) plus a one-sentence
   explanation. Its output is validated and clamped by the engine's own
   normalise(); unknown keys are dropped and reported. The logo is never
   sent. BUILDER_MODEL=mock answers from fixed phrase rules, for tests. */

import { SETTINGS, normalise, settingsSchema } from "../../../packages/engine/src/index.js";

// Small and fast is enough: the model maps a phrase to a few bounded settings.
export const DEFAULT_MODEL = "gpt-5.4-mini";

export const TOOL = {
  name: "adjust_settings",
  description: "Change palette engine settings to reflect the feedback. Only include settings that should change. You cannot pick colours directly; the engine derives every colour from the logo and these settings, then fits them for contrast.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      ...Object.fromEntries(Object.entries(settingsSchema.properties).map(([k, p]) => [k, { ...p, default: undefined }])),
      explanation: { type: "string", description: "One short sentence for the user, in plain language, saying what you changed and why (for example: \"Lowered saturation and moved the hue slightly cooler for a more conservative feel.\")." },
    },
    required: ["explanation"],
  },
};

const SYSTEM = `You help a developer choose a colour palette for a client's software theme.
They give feedback on palette options generated from the client's logo. Translate it into changes to the palette engine's settings by calling adjust_settings.
Settings: ${Object.entries(SETTINGS).map(([k, s]) => `${k} (${s.type}${s.min !== undefined ? `, ${s.min} to ${s.max}` : ""}, default ${s.default}): ${s.description}`).join("\n")}
Rules: change as few settings as needed; move them by moderate amounts unless the feedback is strong; "warmer" rotates hue toward red/orange (positive hueShift for blues and greens, negative for purples), "cooler" the other way; "conservative", "serious", "calmer" lower chromaScale and may favour the muted and neutral-accent strategies; "bolder", "brighter", "more vibrant" raise chromaScale; "less tinted", "plain greys" lower neutralTint. If the feedback asks for something the settings cannot do (a gradient, a specific hex, a font), change nothing and say what you can change instead.`;

/* Fixed phrase rules: deterministic, no network. */
export function mockModel({ feedback, settings }) {
  const f = feedback.toLowerCase(), out = {};
  const why = [];
  if (/conservative|law firm|serious|calm|muted|subdued|professional/.test(f)) { out.chromaScale = Math.round((settings.chromaScale - 0.3) * 100) / 100; out.neutralTint = Math.round(settings.neutralTint * 0.6 * 100) / 100; why.push("lowered saturation and toned down the tinted backgrounds"); }
  if (/bold|bright|vibrant|punch|vivid/.test(f)) { out.chromaScale = Math.round((settings.chromaScale + 0.25) * 100) / 100; why.push("raised saturation"); }
  if (/warm/.test(f)) { out.hueShift = settings.hueShift + 12; why.push("shifted the hue warmer"); }
  if (/cool|colder/.test(f)) { out.hueShift = settings.hueShift - 12; why.push("shifted the hue cooler"); }
  if (/grey|gray|neutral background|less tint/.test(f)) { out.neutralTint = 0; why.push("made the backgrounds plain grey"); }
  return { ...out, explanation: why.length ? `I ${why.join(" and ")}.` : "I couldn't map that to a setting; try words like warmer, cooler, more conservative or bolder." };
}

/* OpenAI chat completions, forced to call adjust_settings. */
async function callModel({ client, model, feedback, settings, options }) {
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Current settings: ${JSON.stringify(settings)}\nCurrent options (light and dark key colours): ${JSON.stringify(options)}\nFeedback: ${feedback}` },
    ],
    tools: [{ type: "function", function: { name: TOOL.name, description: TOOL.description, parameters: TOOL.input_schema } }],
    tool_choice: { type: "function", function: { name: TOOL.name } },
  });
  const call = res.choices?.[0]?.message?.tool_calls?.find((c) => c.function?.name === TOOL.name);
  if (!call) throw new Error("the model did not return setting changes");
  try { return JSON.parse(call.function.arguments); } catch { throw Object.assign(new Error("the model returned settings that are not JSON"), { status: 502 }); }
}

/* { changes, explanation, clamped, dropped } or throws with a message for the user. */
export async function feedback({ body, model }) {
  const text = String(body?.feedback ?? "").trim();
  if (!text) throw Object.assign(new Error("feedback is empty"), { status: 400 });
  if (text.length > 1000) throw Object.assign(new Error("feedback is too long (1000 characters at most)"), { status: 400 });
  const { settings } = normalise(body.settings ?? {});
  const raw = model.mock ? mockModel({ feedback: text, settings }) : await callModel({ client: model.client, model: model.name, feedback: text, settings, options: body.options ?? [] });

  const { explanation, ...proposed } = raw ?? {};
  const dropped = Object.keys(proposed).filter((k) => !SETTINGS[k]);
  for (const k of dropped) delete proposed[k];
  let result;
  try { result = normalise({ ...settings, ...proposed }); }
  catch (e) { throw Object.assign(new Error(`the model proposed an invalid setting: ${e.message}`), { status: 502 }); }
  const changes = Object.fromEntries(Object.keys(proposed).filter((k) => result.settings[k] !== settings[k]).map((k) => [k, result.settings[k]]));
  return {
    changes,
    explanation: typeof explanation === "string" && explanation.trim() ? explanation.trim() : "Settings adjusted.",
    clamped: result.clamped.filter((c) => c.name in proposed),
    dropped,
  };
}
