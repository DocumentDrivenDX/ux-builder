/* The local API (SD-002): context, feedback, save, and one theme to preview.
   In the static build of the theme pages for GitHub Pages (VITE_STATIC,
   tools/build-pages.mjs) there is no server: context and each theme are
   files the build wrote from the same API code, under data/. */

const STATIC = import.meta.env.VITE_STATIC === "1";

async function call(method, path, body) {
  const res = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({ error: `the server answered ${res.status}` }));
  if (!res.ok) throw new Error(data.error ?? `the server answered ${res.status}`);
  return data;
}

async function file(path, missing) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(missing);
  return res.json();
}

export const getContext = () => STATIC ? file("data/context.json", "the theme list is missing from this build") : call("GET", "/api/context");
export const postFeedback = (body) => call("POST", "/api/feedback", body);
export const postSave = (body) => call("POST", "/api/save", body);
export const getTheme = (name) => STATIC
  ? file(`data/themes/${encodeURIComponent(name)}.json`, `no theme called "${name}"`)
  : call("GET", `/api/theme?name=${encodeURIComponent(name)}`);
