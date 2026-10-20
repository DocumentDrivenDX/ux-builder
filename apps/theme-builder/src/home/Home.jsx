import { Button, Card, ChoicePicker, DataTable, Icon, Notice, ProgressBar, Select, StatusPill, Switch, TextField, ThemeProvider } from "@ux-builder/ui";
import { iconBell, iconBot, iconCheck, iconCopy, iconPalette, iconPlug, iconScanEye, iconShieldCheck, iconSparkles, iconTerminal, iconWand2 } from "@ux-builder/ui/icons";
import { useState } from "react";
import { ROOT } from "../site-root.js";
import { AiFrame } from "../../../../packages/ui/ai/stories/frame.jsx";
import { CodeBlock, CodeBlockCopyButton } from "../../../../packages/ui/ai/vendor/ai-elements/code-block";
import { Message, MessageContent, MessageResponse } from "../../../../packages/ui/ai/vendor/ai-elements/message";
import { PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit, PromptInputTextarea, PromptInputTools } from "../../../../packages/ui/ai/vendor/ai-elements/prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "../../../../packages/ui/ai/vendor/ai-elements/reasoning";
import { Suggestion, Suggestions } from "../../../../packages/ui/ai/vendor/ai-elements/suggestion";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "../../../../packages/ui/ai/vendor/ai-elements/tool";
import logoOnDark from "../../../../brand/ux-builder/logo-on-dark.svg?url";
import logoOnLight from "../../../../brand/ux-builder/logo-on-light.svg?url";
import tokensPkg from "../../../../packages/tokens/package.json";
import uiPkg from "../../../../packages/ui/package.json";
import createPkg from "../../../../packages/create-app/package.json";
import auditPkg from "../../../../packages/audit/package.json";
import mcpPkg from "../../../../packages/mcp/package.json";

/* The GitHub Pages home page's sections (tools/build-pages.mjs), shown by the
   site's shell (microsite/Site.jsx). They wear the SDK's own
   ux-builder-databricks theme and are built only from the SDK: its widgets,
   its AI Components (AI Elements, through the theme's shadcn bridge) and its
   role tokens. The intro video before the page is in home.html. */

const REPO = "https://github.com/DocumentDrivenDX/ux-builder";

// The UX Builder brand on each shared design system, light and dark: the build's own resolved tokens.
const RESOLVED = import.meta.glob("../../../../packages/tokens/dist/resolved/ux-builder.*.json", { eager: true, import: "default" });
const SYSTEMS = [
  { value: "databricks", label: "Databricks", set: undefined },
  { value: "material", label: "Material 3", set: "material" },
  { value: "fluent", label: "Fluent 2", set: "fluent" },
  { value: "carbon", label: "Carbon", set: "carbon" },
];
function previewTokens(system, appearance) {
  const file = Object.entries(RESOLVED).find(([path]) => path.endsWith(`/ux-builder.${system}.${appearance}.json`))?.[1];
  // The artwork's url()s are relative to the package, and an embedded view's Logo draws nothing (CONTRACT-001), so the demo shows the artwork itself.
  const tokens = Object.fromEntries(Object.entries(file?.tokens ?? {}).filter(([k, v]) => k.startsWith("piq-") && !String(v).startsWith("url(")));
  return { tokens, logo: appearance === "dark" ? logoOnDark : logoOnLight };
}

export const PACKAGES = [
  { pkg: tokensPkg, icon: iconPalette, what: "Every theme as CSS, every token's value as JSON, the fonts and brand artwork." },
  { pkg: uiPkg, icon: iconWand2, what: "React 19 widgets and screen patterns, ThemeProvider, 2,130 icons, lint rules and agent guidance." },
  { pkg: createPkg, icon: iconSparkles, what: "A new React + Vite app on the SDK from its first commit, with lint, the audit and CI." },
  { pkg: auditPkg, icon: iconScanEye, what: "Drives the running app through every theme in light and dark and reports anything off-theme." },
  { pkg: mcpPkg, icon: iconPlug, what: "The SDK over MCP: themes, widgets and props, tokens and icons for any coding agent." },
];

export function Copy({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* no clipboard */ } };
  return <Button variant="text" size="sm" onClick={copy} aria-label={`${label}: ${text}`}><Icon icon={copied ? iconCheck : iconCopy} />{copied ? "Copied" : label}</Button>;
}

/* A line to copy: a shell command gets a prompt; code does not, and wraps rather than scrolls. */
export function Command({ text, code = false }) {
  return <div className={`uxh-cmd${code ? " uxh-cmd--code" : ""}`}><code>{!code && <span aria-hidden="true">$ </span>}{text}</code><Copy text={text} /></div>;
}

export function Hero() {
  return (
    <section className="uxh-hero" aria-labelledby="hero-h">
      <div className="uxh-wrap uxh-hero__grid">
        <div className="uxh-col">
          <span className="uxh-eyebrow"><Icon icon={iconSparkles} />Open-source UI SDK for AI-era apps</span>
          <h1 id="hero-h">Turn a logo into a theme. Ship apps that <em>can't drift</em> from it.</h1>
          <p className="uxh-lede">UX Builder reads a brand, proposes palettes that already pass contrast, and pairs them with a design system. Your app, and the coding agents that write it, build with widgets and AI components that follow the theme everywhere: light, dark and every screen.</p>
          <Command text="npm create @ux-builder/app my-app" />
          <div className="uxh-row">
            <a className="uxh-btn uxh-btn--primary" href={`${ROOT}themes/?theme=ux-builder-databricks`}>See this theme's page<Icon name="arrow-right" /></a>
            <a className="uxh-btn" href={REPO}>Star on GitHub</a>
          </div>
          <ul className="uxh-stats" aria-label="In the box">
            <li><b>32</b><span>widgets</span></li>
            <li><b>56</b><span>screen patterns</span></li>
            <li><b>16</b><span>AI components</span></li>
            <li><b>2,130</b><span>icons</span></li>
          </ul>
        </div>
        <HeroApp />
      </div>
    </section>
  );
}

/* A small app made of the SDK's widgets, wearing the page's theme. */
export function HeroApp() {
  const [previews, setPreviews] = useState(true);
  return (
    <div className="uxh-heroapp"><Card title="Deploy settings" actions={<StatusPill state="live" />}>
      <div className="uxh-col">
        <TextField label="Project name" defaultValue="acme-assistant" />
        <Select label="Region" defaultValue="eu" options={[{ value: "us", label: "US East" }, { value: "eu", label: "EU West" }, { value: "ap", label: "Asia Pacific" }]} />
        <Switch label="Preview every pull request" checked={previews} onChange={(e) => setPreviews(e.target.checked)} />
        <ProgressBar label="Build" value={72} showValue />
        <div className="uxh-row"><Button>Deploy</Button><Button variant="secondary">Roll back</Button></div>
      </div>
    </Card></div>
  );
}

const ROWS = [
  { id: 1, name: "checkout-assistant", owner: "Payments", calls: 18240, state: "live" },
  { id: 2, name: "support-copilot", owner: "Support", calls: 9615, state: "limited" },
  { id: 3, name: "contract-review", owner: "Legal ops", calls: 4120, state: "evaluation" },
  { id: 4, name: "sales-briefs", owner: "Revenue", calls: 2210, state: "purchasing" },
];
const COLUMNS = [
  { key: "name", label: "Assistant", sortable: true },
  { key: "owner", label: "Team", sortable: true },
  { key: "calls", label: "Calls this week", numeric: true, sortable: true, render: (r) => r.calls.toLocaleString("en") },
  { key: "state", label: "Status", render: (r) => <StatusPill state={r.state} /> },
];

/* The same screen in the UX Builder brand on each shared design system. */
export function LiveDemo() {
  const [system, setSystem] = useState("databricks");
  const [ap, setAp] = useState("light");
  const { tokens, logo } = previewTokens(system, ap);
  const set = SYSTEMS.find((s) => s.value === system)?.set;
  return (
    <section className="uxh-section" aria-labelledby="demo-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconPalette} />Live, not a screenshot</span>
          <h2 id="demo-h">One brand. Four design systems. Zero restyling.</h2>
          <p className="uxh-lede">A theme is a brand on a design system. Switch the system and the same widgets take its type, shape, density and icons, while the brand's colours and logo stay. App code doesn't change at all.</p>
        </div>
        <div className="uxh-row uxh-controls">
          <ChoicePicker label="Design system" options={SYSTEMS.map(({ value, label }) => ({ value, label }))} value={system} onChange={setSystem} />
          <ChoicePicker label="Appearance" options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} value={ap} onChange={setAp} />
        </div>
        <ThemeProvider tokens={tokens} appearance={ap} favicon={false} className="uxh-stage" data-preview={`ux-builder.${system}.${ap}`}>
          <div className="uxh-stage__bar">
            <img className="uxh-stage__logo" src={logo} alt={`UX Builder on ${SYSTEMS.find((s) => s.value === system)?.label}`} />
            <span className="uxh-row uxh-stage__icons"><Icon name="search" set={set} label="Search" /><Icon icon={iconBell} set={set} label="Notifications" /><Icon name="settings" set={set} label="Settings" /></span>
          </div>
          <Notice tone="info" title="3 assistants need review">Their evaluations finished overnight. Review them before Friday's release.</Notice>
          <DataTable caption="Assistants" columns={COLUMNS} rows={ROWS} pageSize={4} initialSort={{ key: "calls", dir: "descending" }} />
          <div className="uxh-row"><Button>Review now</Button><Button variant="secondary">Export</Button><Button variant="text">Dismiss</Button></div>
        </ThemeProvider>
      </div>
    </section>
  );
}

const SETTINGS_CODE = `import { SettingsPage } from "@ux-builder/ui/patterns";
import { Switch, TextField } from "@ux-builder/ui";

export function Settings() {
  return (
    <SettingsPage sections={[
      { id: "profile", label: "Profile",
        content: <TextField label="Display name" /> },
      { id: "alerts", label: "Notifications",
        content: <Switch label="Email me about deploys" /> },
    ]} />
  );
}`;

/* A coding agent at work, drawn with AI Elements in the page's theme. */
export function AiSection() {
  return (
    <section className="uxh-section uxh-section--ai" aria-labelledby="ai-h">
      <div className="uxh-wrap uxh-ai">
        <div className="uxh-col uxh-gap">
          <span className="uxh-eyebrow"><Icon icon={iconBot} />Built for AI, both ways</span>
          <h2 id="ai-h">Your agent knows the SDK. Your users see your brand.</h2>
          <p className="uxh-lede">Coding agents read the SDK's generated <code>AGENTS.md</code>, a Claude Code skill and an MCP server that describes the exact version you installed, so what they write follows the rules. And the chat UI you ship (AI Elements or assistant-ui) wears your theme through one stylesheet.</p>
          <ul className="uxh-checks">
            <li><Icon icon={iconCheck} />The MCP server answers with real widgets, props and tokens</li>
            <li><Icon icon={iconCheck} />AI Elements and assistant-ui, contrast-checked in every theme</li>
            <li><Icon icon={iconCheck} />Lint flags any colour, font or radius an agent hard-codes</li>
          </ul>
          <Command text="claude mcp add ux-builder -- npx @ux-builder/mcp" />
        </div>
        <AiFrame width="100%">
          <div className="uxh-chat">
            {/* A fixed exchange, laid out in full: Conversation would scroll it to its last message. */}
            <div className="uxh-chat__log">
                <Message from="user"><MessageContent>Add a settings page to the app, in our brand.</MessageContent></Message>
                <Message from="assistant">
                  <MessageContent>
                    <Reasoning duration={3} defaultOpen={false}>
                      <ReasoningTrigger />
                      <ReasoningContent>{"The app is on ux-builder-databricks. The SDK has a SettingsPage pattern, so I should use it with SDK fields rather than writing CSS."}</ReasoningContent>
                    </Reasoning>
                    <Tool defaultOpen={false}>
                      <ToolHeader type="tool-ux-builder.get_widget" state="output-available" />
                      <ToolContent>
                        <ToolInput input={{ name: "SettingsPage" }} />
                        <ToolOutput output={<p className="p-2 text-sm">sections, current, onChange · import from @ux-builder/ui/patterns</p>} errorText={undefined} />
                      </ToolContent>
                    </Tool>
                    <MessageResponse>{"Here it is. It uses only SDK widgets, so it follows the theme in light and dark and passes `ux-builder/no-hard-coded-values`:"}</MessageResponse>
                    <CodeBlock code={SETTINGS_CODE} language="jsx"><CodeBlockCopyButton /></CodeBlock>
                  </MessageContent>
                </Message>
            </div>
            <Suggestions>{["Add an API keys section", "Make dark mode the default", "Run the audit"].map((s) => <Suggestion key={s} suggestion={s} onClick={() => {}} />)}</Suggestions>
            <PromptInput onSubmit={() => {}}>
              <PromptInputBody><PromptInputTextarea placeholder="Ask your agent to build something" aria-label="Message the agent" /></PromptInputBody>
              <PromptInputFooter><PromptInputTools /><PromptInputSubmit status="ready" /></PromptInputFooter>
            </PromptInput>
          </div>
        </AiFrame>
      </div>
    </section>
  );
}

export const GUARDS = [
  { icon: iconShieldCheck, title: "Lint that knows your theme", text: "ESLint and Stylelint rules catch literal colours, fonts and radii, and suggest the role token to use instead.", code: `"ux-builder/no-hard-coded-values": ["error", { theme: "ux-builder-databricks" }]` },
  { icon: iconScanEye, title: "An audit of the running app", text: "Switches your app through every theme, light and dark, and reports anything that isn't the theme's: colours, fonts, icons, favicon, contrast.", code: "npx ux-builder-audit http://localhost:5173/" },
  { icon: iconTerminal, title: "A starter that begins on-theme", text: "A React + Vite app with ThemeProvider, an appearance switch, lint, the audit and CI, wired up from the first commit.", code: "npm create @ux-builder/app my-app -- --theme plain" },
];

export function Guardrails() {
  return (
    <section className="uxh-section" aria-labelledby="guard-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconShieldCheck} />Guardrails</span>
          <h2 id="guard-h">Drift gets caught before it ships.</h2>
        </div>
        <ul className="uxh-cards">
          {GUARDS.map((g) => (
            <li key={g.title} className="uxh-card">
              <span className="uxh-card__icon"><Icon icon={g.icon} /></span>
              <h3>{g.title}</h3>
              <p>{g.text}</p>
              <code className="uxh-card__code">{g.code}</code>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Packages() {
  return (
    <section className="uxh-section" aria-labelledby="pkg-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon name="package" />On npm, no token needed</span>
          <h2 id="pkg-h">Five packages. Take what you need.</h2>
        </div>
        <ul className="uxh-cards uxh-cards--five">
          {PACKAGES.map(({ pkg, icon, what }) => (
            <li key={pkg.name}>
              <a className="uxh-card uxh-card--link" href={`https://www.npmjs.com/package/${pkg.name}`}>
                <span className="uxh-card__icon"><Icon icon={icon} /></span>
                <h3><code>{pkg.name}</code></h3>
                <p>{what}</p>
                <span className="uxh-version">v{pkg.version}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function GetStarted() {
  return (
    <section className="uxh-section uxh-section--start" aria-labelledby="start-h">
      <div className="uxh-wrap uxh-col uxh-gap">
        <div className="uxh-head">
          <span className="uxh-eyebrow"><Icon icon={iconTerminal} />Get started</span>
          <h2 id="start-h">On-theme in three steps.</h2>
        </div>
        <ol className="uxh-steps">
          <li><b>Install</b><Command text="npm install @ux-builder/tokens @ux-builder/ui" /></li>
          <li><b>Load the theme</b><Command code text={'import "@ux-builder/tokens/themes/ux-builder-databricks.css";\nimport "@ux-builder/ui/ui.css";'} /></li>
          <li><b>Wrap the app</b><Command code text={'<ThemeProvider theme="ux-builder-databricks" appearance="system">\n  <App />\n</ThemeProvider>'} /></li>
        </ol>
        <div className="uxh-row">
          <a className="uxh-btn uxh-btn--primary" href={`${REPO}#quick-start`}>Read the quick start<Icon name="arrow-right" /></a>
          <a className="uxh-btn" href={`${ROOT}storybook/`}>Browse every widget</a>
        </div>
      </div>
    </section>
  );
}
