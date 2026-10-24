import { Brand, ThemeSwitch } from "./ThemeSwitch.jsx";
import { Assistant } from "./Assistant.jsx";

/* A chat app: the conversation is the interface, filling the window under
   the header (docs/ux-builder/blueprint/app.blueprint.json, screen "assistant"). */
export function App() {
  return (
    <div className="chat-app">
      <header className="masthead">
        <Brand as="h1" />
        <ThemeSwitch />
      </header>
      <main>
        <Assistant />
      </main>
    </div>
  );
}
