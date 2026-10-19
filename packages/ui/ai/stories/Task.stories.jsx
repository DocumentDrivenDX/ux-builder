import { Task, TaskContent, TaskItem, TaskTrigger } from "../vendor/ai-elements/task";
import { AiFrame } from "./frame.jsx";

export default { title: "AI Components/AI Elements/Task", component: Task, parameters: { library: "AI Elements", layout: "padded" } };

export const Progress = { render: () => (
  <AiFrame>
    <Task defaultOpen>
      <TaskTrigger title="Prepared the October bill" />
      <TaskContent>{["Read 38 time entries", "Applied the agreed rates", "Checked the cap"].map((t) => <TaskItem key={t}>{t}</TaskItem>)}</TaskContent>
    </Task>
  </AiFrame>
) };
