/* The local API (SD-002): context, feedback, save, and one theme to preview. */

async function call(method, path, body) {
  const res = await fetch(path, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({ error: `the server answered ${res.status}` }));
  if (!res.ok) throw new Error(data.error ?? `the server answered ${res.status}`);
  return data;
}

export const getContext = () => call("GET", "/api/context");
export const postFeedback = (body) => call("POST", "/api/feedback", body);
export const postSave = (body) => call("POST", "/api/save", body);
export const getTheme = (name) => call("GET", `/api/theme?name=${encodeURIComponent(name)}`);
