import { createRoot } from "react-dom/client";
import { App } from "./app.js";
import "./styles.css";
import { WorkspaceStore } from "./workspace-store.js";

const root = document.getElementById("root");
if (!root) throw new Error("Agentis browser root is missing");

createRoot(root).render(<App store={new WorkspaceStore()} />);
