"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useMissionControl } from "@/components/mission-control-provider";
import { Task, TaskStatus } from "@/lib/types";
import { MissionShell, Panel, SectionTitle } from "@/components/ui-shell";
import { TaskHoverCard } from "@/components/views/shared-cards";

const labels: Record<TaskStatus, string> = {
  backlog: "Pendientes",
  in_progress: "En curso",
  review: "Revision",
  done: "Hechas",
  closed: "Cerradas",
};

const boardStatuses: TaskStatus[] = ["backlog", "in_progress", "review", "done"];

export function TaskBoardView() {
  const { approveTask, moveTask, snapshot } = useMissionControl();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskStatus | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const tasksByStatus = useMemo(() => {
    const now = Date.now();
    const HOURS_24_MS = 24 * 60 * 60 * 1000;

    return Object.fromEntries(
      boardStatuses.map((status) => [
        status,
        snapshot.tasks.filter((task) => {
          if (task.status !== status) return false;
          if (status === "done" && task.completedAt) {
            const completedMs = new Date(task.completedAt).getTime();
            if (now - completedMs > HOURS_24_MS) return false;
          }
          return true;
        }),
      ]),
    ) as Record<(typeof boardStatuses)[number], Task[]>;
  }, [snapshot.tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const status = event.over?.id;
    setDropTarget(boardStatuses.includes(status as TaskStatus) ? (status as TaskStatus) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id);
    const targetStatus = event.over?.id as TaskStatus | undefined;
    const task = snapshot.tasks.find((entry) => entry.id === taskId);

    setDraggedTaskId(null);
    setDropTarget(null);

    if (!task || !targetStatus || !boardStatuses.includes(targetStatus) || task.status === targetStatus) {
      return;
    }

    void moveTask(taskId, targetStatus);
  };

  const handleDragCancel = () => {
    setDraggedTaskId(null);
    setDropTarget(null);
  };

  return (
    <MissionShell title="Tablero de misiones">
      <DndContext
        id="mission-board-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid gap-3 xl:grid-cols-4">
          {boardStatuses.map((status) => (
            <MissionColumn
              key={status}
              status={status}
              title={labels[status]}
              tasks={tasksByStatus[status]}
              active={dropTarget === status}
            >
              {tasksByStatus[status].map((task) => (
                <DraggableMissionCard
                  key={task.id}
                  task={task}
                  onMove={moveTask}
                  onApprove={approveTask}
                  dragging={draggedTaskId === task.id}
                  dragActive={draggedTaskId !== null}
                  agentNames={snapshot.agents
                    .filter((agent) => task.assignedAgentIds.includes(agent.id))
                    .map((agent) => agent.name)}
                />
              ))}
            </MissionColumn>
          ))}
        </div>
      </DndContext>
    </MissionShell>
  );
}

function MissionColumn({
  status,
  title,
  tasks,
  active,
  children,
}: Readonly<{
  status: TaskStatus;
  title: string;
  tasks: Task[];
  active: boolean;
  children: React.ReactNode;
}>) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const highlighted = active || isOver;

  return (
    <div ref={setNodeRef} data-mission-status={status} className="min-h-[420px]">
      <Panel
        className={`h-full min-h-[420px] ${
          highlighted ? "border-cyan-300/70 shadow-[0_0_0_4px_#22d3ee55]" : ""
        }`}
      >
        <SectionTitle title={title} subtitle={`${tasks.length} misiones`} />
        <div
          className={`mt-3 min-h-[320px] space-y-3 rounded-[16px] transition-colors ${
            highlighted ? "bg-cyan-400/6" : ""
          }`}
        >
          {children}
          {tasks.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-white/5 px-3 py-4 font-mono text-xs text-slate-400">
              Sin misiones en esta columna.
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function DraggableMissionCard({
  task,
  agentNames,
  onMove,
  onApprove,
  dragging,
  dragActive,
}: Readonly<{
  task: Task;
  agentNames: string[];
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onApprove: (taskId: string) => void;
  dragging: boolean;
  dragActive: boolean;
}>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  return (
    <TaskHoverCard
      task={task}
      agentNames={agentNames}
      onMove={onMove}
      onApprove={onApprove}
      cardRef={setNodeRef}
      dragHandleProps={{
        ...attributes,
        ...listeners,
      }}
      dragging={dragging || isDragging}
      dragActive={dragActive}
      style={{
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 40 : undefined,
      }}
    />
  );
}
