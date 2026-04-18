import { AgentsView } from "@/components/views/agents-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { SummariesView } from "@/components/views/summaries-view";
import { SupervisorView } from "@/components/views/supervisor-view";
import { TaskBoardView } from "@/components/views/task-board-view";
import { SectionId } from "@/components/ui-shell";

export function MissionControlApp({ section }: { section: SectionId }) {
  if (section === "task-board") return <TaskBoardView />;
  if (section === "agents") return <AgentsView />;
  if (section === "meeting-summaries") return <SummariesView />;
  if (section === "supervisor") return <SupervisorView />;
  return <DashboardView />;
}
