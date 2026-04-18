"use client";

import { useState } from "react";
import { useMissionControl } from "@/components/mission-control-provider";
import { TaskStatus } from "@/lib/types";
import { MissionShell, Panel, SectionTitle } from "@/components/ui-shell";
import { TaskHoverCard } from "@/components/views/shared-cards";

const labels: Record<TaskStatus, string> = {
  backlog: "Pendientes",
  in_progress: "En curso",
  review: "Revision",
  done: "Hechas",
  closed: "Cerradas",
};

export function TaskBoardView() {
  const { approveTask, moveTask, snapshot } = useMissionControl();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);

  return (
    <MissionShell title="Tablero de misiones">
      <div className="grid gap-3 xl:grid-cols-4">
        {(["backlog", "in_progress", "review", "done"] as TaskStatus[]).map((status) => (
          <Panel
            key={status}
            className={`min-h-[420px] transition-all ${
              dropTarget === status ? "border-cyan-300/70 shadow-[0_0_0_4px_#22d3ee55]" : ""
            }`}
          >
            <SectionTitle
              title={labels[status]}
              subtitle={`${snapshot.tasks.filter((task) => task.status === status).length} misiones`}
            />
            <div
              className={`mt-3 min-h-[320px] space-y-3 rounded-[16px] transition-colors ${
                dropTarget === status ? "bg-cyan-400/6" : ""
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(status);
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current === status ? null : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/task-id") || draggedTaskId;
                if (taskId) {
                  moveTask(taskId, status);
                }
                setDraggedTaskId(null);
                setDropTarget(null);
              }}
            >
              {snapshot.tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskHoverCard
                    key={task.id}
                    task={task}
                    onMove={moveTask}
                    onApprove={approveTask}
                    onDragStart={setDraggedTaskId}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDropTarget(null);
                    }}
                    dragging={draggedTaskId === task.id}
                    agentNames={snapshot.agents
                      .filter((agent) => task.assignedAgentIds.includes(agent.id))
                      .map((agent) => agent.name)}
                  />
                ))}
              {snapshot.tasks.filter((task) => task.status === status).length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-white/10 bg-white/5 px-3 py-4 font-mono text-xs text-slate-400">
                  Sin misiones en esta columna.
                </div>
              ) : null}
            </div>
          </Panel>
        ))}
      </div>
    </MissionShell>
  );
}
