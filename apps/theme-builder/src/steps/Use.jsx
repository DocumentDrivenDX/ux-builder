import { Button, ChoicePicker, Icon } from "@ux-builder/ui";
import { useState } from "react";
import { fontsOf, iconsOf, optionName } from "../model.js";
import { Preview } from "../preview/Preview.jsx";

/* Step 6, "Use in your app" (prototype step 6): nine tasks per framework,
   with the code filled in for this theme, progress, and a prompt for a
   coding agent. The code reflects what the SDK ships today. */

/* The chat libraries a theme dresses (ADR-023): each copies its components
   into the app with its own command line, wears the theme through the shadcn
   bridge, and runs on the AI SDK. The SDK's own assistant patterns and their
   adapters come with US-046. CopilotKit is not supported. */
export const CHAT_LIBRARIES = [
  { id: "none", label: "None" },
  { id: "ai-elements", label: "AI Elements", licence: "Apache-2.0", add: "npx ai-elements@latest add conversation message prompt-input reasoning tool sources confirmation",
    runtime: ["app's chat component", `import { useChat } from "@ai-sdk/react";\nimport { Conversation, ConversationContent } from "@/components/ai-elements/conversation";\nimport { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";\n\nconst { messages, sendMessage, status } = useChat();`], install: "npm install ai @ai-sdk/react" },
  { id: "assistant-ui", label: "assistant-ui", licence: "MIT", add: "npx assistant-ui@latest add thread",
    runtime: ["app's chat component", `import { AssistantRuntimeProvider } from "@assistant-ui/react";\nimport { useChatRuntime } from "@assistant-ui/react-ai-sdk";\nimport { Thread } from "@/components/assistant-ui/thread";\n\nconst runtime = useChatRuntime();\n<AssistantRuntimeProvider runtime={runtime}><Thread /></AssistantRuntimeProvider>`], install: "npm install @assistant-ui/react @assistant-ui/react-ai-sdk ai" },
];

function chatTask({ t, chat, fw }) {
  const lib = CHAT_LIBRARIES.find((c) => c.id === chat);
  if (!lib || lib.id === "none") return [];
  const css = fw === "html" ? `<link rel="stylesheet" href="/node_modules/@ux-builder/tokens/dist/bridges/shadcn/${t}.css">` : `import "@ux-builder/tokens/bridges/shadcn/${t}.css";   // after the theme`;
  return [{ id: "chat", title: `Add the assistant with ${lib.label}`, why: `${lib.label} (${lib.licence}) copies its components into your app, styled by shadcn/ui's variables (it needs Tailwind CSS 4, which its command line sets up). The shadcn bridge gives those variables ${t}'s values, in light and dark. Connect it to your model through the AI SDK; keep the app's own server between the two. Nothing here reports usage.`,
    files: ["components/", "package.json", fw === "html" ? "index.html" : "src/main.jsx"],
    code: [["terminal", `${lib.add}\n${lib.install}`], ["after the theme's CSS", css], lib.runtime] }];
}

function tasksFor({ t, ds, fw, accent, chat }) {
  const entry = fw === "next" ? "app/layout.tsx" : fw === "html" ? "index.html" : "src/main.jsx";
  const page = fw === "next" ? "app/layout.tsx" : "index.html";
  const loadsFonts = Object.values(ds.fonts).some((f) => f.source !== "system");
  const imports = fw === "html"
    ? `<link rel="stylesheet" href="/node_modules/@ux-builder/tokens/dist/themes/${t}.css">\n<link rel="stylesheet" href="/node_modules/@ux-builder/ui/dist/ui.css">`
    : `import "@ux-builder/tokens/themes/${t}.css";\nimport "@ux-builder/ui/ui.css";`;
  const attrs = fw === "next"
    ? `export default function RootLayout({ children }) {\n  return (\n    <html lang="en" data-theme="${t}" data-appearance="light">\n      <body>{children}</body>\n    </html>\n  );\n}`
    : `<html lang="en" data-theme="${t}" data-appearance="light">`;
  const appearance = fw === "vite"
    ? [["src/main.jsx", `import { ThemeProvider } from "@ux-builder/ui";\n\ncreateRoot(root).render(\n  <ThemeProvider theme="${t}" appearance="system">\n    <App />\n  </ThemeProvider>\n);`]]
    : [["inline script, in <head>", `const dark = matchMedia("(prefers-color-scheme: dark)");\nconst apply = () => document.documentElement.dataset.appearance =\n  dark.matches ? "dark" : "light";\napply(); dark.addEventListener("change", apply);`]];
  const fonts = !loadsFonts ? [["nothing to load", `/* ${fontsOf(ds)} ship with the operating system. */`]]
    : fw === "html" ? [["<head>", `<link rel="stylesheet" href="/node_modules/@ux-builder/tokens/dist/fonts/${t}.css">`]]
    : [[entry, `import "@ux-builder/tokens/fonts/${t}.css";`]];
  return [
    { id: "install", title: "Install the SDK", why: `Theme ${t} ships in @ux-builder/tokens once its pull request is merged and released.`, files: ["package.json"],
      code: [["terminal", "npm install @ux-builder/tokens @ux-builder/ui"]] },
    { id: "css", title: "Load the theme", why: "One file for the theme, then the widgets. Load them once, before your own CSS.", files: [entry], code: [[entry, imports]] },
    { id: "attrs", title: "Turn the theme on", why: "Name the theme on <html>. Switch data-appearance to change light and dark.", files: [page], code: [[page, attrs]] },
    { id: "appearance", title: "Follow the user’s light or dark setting", why: fw === "vite" ? "Optional. ThemeProvider resolves the system setting before first paint and follows it." : "Optional. Resolve the system setting before first paint so the page never flashes the wrong appearance.", files: [fw === "vite" ? "src/main.jsx" : page], code: appearance },
    { id: "fonts", title: `Load ${fontsOf(ds)}`, why: loadsFonts ? "The SDK ships the fonts; this loads only the faces the theme uses." : "Nothing to load.", files: loadsFonts ? [fw === "html" ? "index.html" : entry] : [], code: fonts },
    { id: "widgets", title: "Build with the widgets and role tokens", why: `Use the SDK’s components; they take their look from the theme, including ${iconsOf(ds)}. Style your own markup with --piq-* role tokens, never hex values.`, files: ["src/**"],
      code: [["component", `import { Button, TextField, DataTable, Icon } from "@ux-builder/ui";\n\n<Button>Confirm</Button>\n<Icon name="warning" />   {/* renders ${iconsOf(ds)} */}`], ["your CSS", ".matter-row {\n  color: var(--piq-color-text);\n  border-bottom: var(--piq-border-default);\n}"]] },
    ...chatTask({ t, chat, fw }),
    { id: "lint", title: "Catch hard-coded colours in CI", why: "The SDK’s lint rule flags literal colours, font families and radii, and suggests the role token.", files: [".stylelintrc.json", "package.json"],
      code: [[".stylelintrc.json", `{ "plugins": ["@ux-builder/ui/stylelint"],\n  "rules": { "ux-builder/no-hard-coded-values": [true, { "theme": "${t}" }] } }`], ["package.json", '"scripts": { "lint:styles": "stylelint \\"src/**/*.css\\"" }']] },
    { id: "verify", title: "Check it worked", why: "Open the app and run this in the browser console. It should print the theme’s accent, and every SDK widget should show the new look.", files: [],
      code: [["browser console", `getComputedStyle(document.documentElement)\n  .getPropertyValue("--piq-color-accent")   // "${accent}"`]] },
  ];
}

function Code({ id, file, text, copied, onCopy }) {
  return (
    <div className="tb-code">
      {file && <div className="tb-code__file">{file}</div>}
      <pre id={`code-${id}`}>{text}</pre>
      <button type="button" className="tb-copy" aria-label={`Copy ${file || "code"}`} onClick={() => onCopy(id, text)}>{copied === id ? "Copied" : "Copy"}</button>
    </div>
  );
}

export function Use({ saved, option, ds, brandTitle }) {
  const [fw, setFw] = useState("vite");
  const [chat, setChat] = useState("none");
  const [done, setDone] = useState({});
  const [copied, setCopied] = useState(null);
  const t = saved.name;
  const accent = option.brand.appearances.light?.color.accent.$value ?? option.brand.appearances.dark.color.accent.$value;
  const tasks = tasksFor({ t, ds, fw, accent, chat });
  const count = tasks.filter((x) => done[x.id]).length;
  const files = [...new Set(tasks.flatMap((x) => x.files))];
  const copy = async (id, text) => { try { await navigator.clipboard.writeText(text); } catch { /* select by hand */ } setCopied(id); };
  const agent = `Use the theme ${t} from @ux-builder/tokens and @ux-builder/ui in this app.\n1. Install @ux-builder/tokens and @ux-builder/ui.\n2. Import @ux-builder/tokens/themes/${t}.css, @ux-builder/tokens/fonts/${t}.css and @ux-builder/ui/ui.css once, before app CSS.\n3. Set data-theme="${t}" and data-appearance on <html> following prefers-color-scheme, or wrap the app in <ThemeProvider theme="${t}" appearance="system">.\n4. Replace hand-made buttons, fields, tables and icons with @ux-builder/ui components.\n5. Replace hard-coded colours, font families and radii with --piq-* role tokens.\nVerify: --piq-color-accent on <html> is ${accent}.`;
  const lib = CHAT_LIBRARIES.find((c) => c.id === chat && c.id !== "none");
  const agentPrompt = lib ? `${agent}\nAssistant: run ${lib.add}, import @ux-builder/tokens/bridges/shadcn/${t}.css after the theme, and connect it through the AI SDK; send no telemetry.` : agent;
  return (
    <section className="tb-col tb-gap">
      <p className="tb-status" role="status">Theme <b>{t}</b> saved{saved.pr ? <> and opened for review: <a href={saved.pr}>{saved.pr}</a></> : <> to {saved.files.join(", ")}; commit them and open a pull request</>}. Follow the steps below to use it in your app.</p>
      <div className="tb-col"><h1>Use {t} in your app</h1><p className="tb-lede">{tasks.length === 8 ? "Eight" : "Nine"} tasks, about {tasks.length === 8 ? 15 : 25} minutes. Tick them off as you go; the code below is filled in for this theme and your framework.</p></div>
      <div className="tb-use">
        <div className="tb-col">
          <div className="tb-tabs" role="tablist" aria-label="Framework">
            {[["vite", "React + Vite"], ["next", "Next.js"], ["html", "Plain HTML"]].map(([id, l]) => <button key={id} type="button" role="tab" aria-selected={fw === id} onClick={() => setFw(id)}>{l}</button>)}
          </div>
          <ChoicePicker label="Chat library" options={CHAT_LIBRARIES.map((c) => ({ value: c.id, label: c.label }))} value={chat} onChange={setChat} />
          {tasks.map((x, i) => (
            <div key={x.id} className={`tb-task${done[x.id] ? " tb-task--done" : ""}`} id={`task-${x.id}`}>
              <input type="checkbox" id={`done-${x.id}`} checked={!!done[x.id]} onChange={(e) => setDone({ ...done, [x.id]: e.target.checked })} aria-label={`Mark step ${i + 1} done`} />
              <label htmlFor={`done-${x.id}`}><h3><span className="tb-hint">{i + 1}</span> {x.title}</h3></label>
              <div className="tb-task__body"><p>{x.why}</p>{x.code.map(([f, c], j) => <Code key={j} id={`${x.id}-${j}`} file={f} text={c} copied={copied} onCopy={copy} />)}</div>
            </div>
          ))}
        </div>
        <aside className="tb-col tb-aside">
          <div className="tb-panel tb-col"><span className="tb-eyebrow">Progress</span><b id="progress-label">{count} of {tasks.length} done</b>
            <div className="tb-progress" role="progressbar" aria-valuemin={0} aria-valuemax={tasks.length} aria-valuenow={count}><i style={{ width: `${(count / tasks.length) * 100}%` }} /></div></div>
          <div className="tb-panel tb-col"><span className="tb-eyebrow">Your theme</span>
            <Preview option={option} ds={ds} appearance={option.brand.appearances.light ? "light" : "dark"} brandTitle={brandTitle} showSystem />
            <span className="tb-hint">{optionName(option)} × {ds.title} · {iconsOf(ds)} · {fontsOf(ds)}</span></div>
          <div className="tb-panel tb-col"><span className="tb-eyebrow">Files you'll touch</span><ul className="tb-files">{files.map((f) => <li key={f}><code>{f}</code></li>)}</ul></div>
          <div className="tb-panel tb-col"><span className="tb-eyebrow">Using a coding agent?</span><span className="tb-hint">Paste this into Claude Code in your app's repository.</span>
            <Code id="agent" text={agentPrompt} copied={copied} onCopy={copy} /></div>
        </aside>
      </div>
      <div className="tb-row"><Button variant="text" onClick={() => window.scrollTo(0, 0)}><Icon name="chevron-up" /> Back to top</Button></div>
    </section>
  );
}
