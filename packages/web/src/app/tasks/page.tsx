import { TasksDashboard } from "./tasks-dashboard";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  // Dashboard fetches data client-side via API
  return <TasksDashboard />;
}
