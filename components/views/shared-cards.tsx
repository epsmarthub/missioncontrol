"use client";

import { AgentProfile, Task, TaskStatus } from "@/lib/types";
import { cn, formatRelativeDate } from "@/lib/utils";
import { AgentPortrait, Avatar, ExpBar } from "@/components/ui-shell";

export function StatCard({
  title,
  value,
  description,
}: Readonly<{ title: string; value: string; description: string }>) {
  return (
    <div className="rounded-[18px] border-2 border-cyan-300/30 bg-cyan-400/10 p-2.5">
      <p className="text-xs uppercase tracking-[0.16em] text-white">{title}</p>
      <p className="mt-1.5 text-2xl text-white sm:text-3xl">{value}</p>
      <p className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">{description}</p>
    </div>
  );
}

export function MiniList({
  title,
  items,
}: Readonly<{ title: string; items: Array<{ title: string; meta: string }> }>) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-2.5">
      <h4 className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">{title}</h4>
      <div className="mt-2.5 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.title}-${index}`} className="rounded-[16px] bg-black/20 p-2.5">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-100 sm:text-sm">{item.title}</p>
            <p className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">{item.meta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AgentCard({
  agent,
  compact = false,
}: Readonly<{ agent: AgentProfile; compact?: boolean }>) {
  return (
    <div className="rounded-[18px] border-2 border-white/10 bg-white/5 p-3">
      <div className={compact ? "flex items-start gap-3.5" : "flex flex-col items-center gap-3"}>
        {compact ? (
          <Avatar label={agent.avatarSeed} accent={agent.classId} size="lg" />
        ) : (
          <AgentPortrait label={agent.avatarSeed} accent={agent.classId} />
        )}
        <div className={compact ? "min-w-0 flex-1" : "w-full text-center"}>
          <p className="text-sm uppercase tracking-[0.12em] text-white sm:text-base">{agent.name}</p>
          <p className="font-mono text-xs text-cyan-200">
            {agent.classLabel} | Nv.{agent.level}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-300">{agent.title}</p>
        </div>
      </div>
      <ExpBar current={agent.currentXp} max={agent.nextLevelXp} className="mt-3" />
      {compact ? (
        <p className="mt-2 font-mono text-xs text-slate-300">{agent.specialty}</p>
      ) : (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          <StatChip label="Arcana" value={agent.stats.arcana} />
          <StatChip label="Tactica" value={agent.stats.tactics} />
          <StatChip label="Fuerza" value={agent.stats.strength} />
          <StatChip label="Agilidad" value={agent.stats.agility} />
          <StatChip label="Soporte" value={agent.stats.support} />
          <StatChip label="Voz" value={agent.voice} />
        </div>
      )}
    </div>
  );
}

function StatChip({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5">
      <p className="text-[5px] uppercase tracking-[0.02em] text-slate-400 sm:text-[6px] sm:tracking-[0.04em]">
        {label}
      </p>
      <p className="shrink-0 font-mono text-xs text-white sm:text-sm">{value}</p>
    </div>
  );
}

export function TaskCard({
  task,
  agentNames,
  onMove,
  onApprove,
}: Readonly<{
  task: Task;
  agentNames: string[];
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onApprove: (taskId: string) => void;
}>) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">{task.title}</p>
          <p className="mt-2 font-mono text-xs leading-5 text-slate-300 sm:text-sm">{task.description}</p>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs text-slate-300 sm:text-sm">
        <span>Equipo: {agentNames.join(", ")}</span>
        <span>EXP: +{task.xpReward}</span>
        <span>Limite: {formatRelativeDate(task.dueAt)}</span>
        <span>{task.requiresApproval ? "Requiere supervisor" : "Auto cierre"}</span>
      </div>
      {task.blockedReason ? (
        <div className="mt-2.5 rounded-[16px] border border-rose-300/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-100 sm:text-sm">
          Bloqueo: {task.blockedReason}
        </div>
      ) : null}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {task.status !== "backlog" && (
          <button
            type="button"
            onClick={() => onMove(task.id, previousStatus(task.status))}
            className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100 sm:text-xs"
          >
            Retroceder
          </button>
        )}
        {task.status !== "done" && (
          <button
            type="button"
            onClick={() => onMove(task.id, nextStatus(task.status))}
            className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100 sm:text-xs"
          >
            Avanzar
          </button>
        )}
        {task.status === "review" && (
          <button
            type="button"
            onClick={() => onApprove(task.id)}
            className="rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#fde68a] sm:text-xs"
          >
            Aprobar cierre
          </button>
        )}
      </div>
    </div>
  );
}

export function TaskHoverCard({
  task,
  agentNames,
  onMove,
  onApprove,
  onDragStart,
  onDragEnd,
  dragging = false,
}: Readonly<{
  task: Task;
  agentNames: string[];
  onMove: (taskId: string, nextStatus: TaskStatus) => void;
  onApprove: (taskId: string) => void;
  onDragStart?: (taskId: string) => void;
  onDragEnd?: () => void;
  dragging?: boolean;
}>) {
  return (
    <div className="group relative">
      <button
        type="button"
        draggable
        onDragStart={(event) => {
          event.dataTransfer.setData("text/task-id", task.id);
          event.dataTransfer.effectAllowed = "move";
          onDragStart?.(task.id);
        }}
        onDragEnd={onDragEnd}
        className={cn(
          "flex w-full flex-col items-start gap-2.5 rounded-[18px] border px-3 py-3.5 text-left transition-all focus:outline-none",
          getPriorityCardClass(task.priority),
          dragging && "opacity-45 scale-[0.98]",
        )}
      >
        <p className="w-full text-[10px] uppercase leading-[1.28] tracking-[0.05em] text-white sm:text-[11px]">
          {task.title}
        </p>
        <div className="flex w-full items-center justify-between gap-2">
          <PriorityBadge priority={task.priority} />
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300">
            {task.xpReward} EXP
          </span>
        </div>
      </button>

      <div className="pointer-events-none invisible absolute left-0 top-[calc(100%-2px)] z-30 w-[min(320px,calc(100vw-3rem))] translate-y-2 rounded-[18px] border border-cyan-300/35 bg-[#171427]/96 p-3 opacity-0 shadow-[0_18px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm transition-all duration-150 group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="space-y-2.5">
          <p className="text-[10px] uppercase leading-[1.28] tracking-[0.06em] text-white sm:text-[11px]">
            {task.title}
          </p>
          <div className="flex items-center justify-between gap-2">
            <PriorityBadge priority={task.priority} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-300">
              {task.xpReward} EXP
            </span>
          </div>
        </div>
        <p className="mt-2 font-mono text-xs leading-5 text-slate-300 sm:text-sm">{task.description}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-xs text-slate-300">
          <span>Equipo: {agentNames.join(", ")}</span>
          <span>EXP: +{task.xpReward}</span>
          <span>Limite: {formatRelativeDate(task.dueAt)}</span>
          <span>{task.requiresApproval ? "Requiere supervisor" : "Auto cierre"}</span>
        </div>
        {task.blockedReason ? (
          <div className="mt-2.5 rounded-[14px] border border-rose-300/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-100">
            Bloqueo: {task.blockedReason}
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          {task.status !== "backlog" && (
            <button
              type="button"
              onClick={() => onMove(task.id, previousStatus(task.status))}
              className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100"
            >
              Retroceder
            </button>
          )}
          {task.status !== "done" && (
            <button
              type="button"
              onClick={() => onMove(task.id, nextStatus(task.status))}
              className="rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100"
            >
              Avanzar
            </button>
          )}
          {task.status === "review" && (
            <button
              type="button"
              onClick={() => onApprove(task.id)}
              className="rounded-full border border-[#facc15]/40 bg-[#facc15]/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#fde68a]"
            >
              Aprobar cierre
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: Readonly<{ priority: Task["priority"] }>) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em]",
        priority === "critical"
          ? "border-rose-300/50 bg-rose-500/14 text-rose-100"
          : priority === "high"
            ? "border-amber-300/50 bg-amber-500/14 text-amber-100"
            : priority === "medium"
              ? "border-cyan-300/50 bg-cyan-500/14 text-cyan-100"
              : "border-white/15 bg-white/5 text-slate-200",
      )}
    >
      {priority}
    </span>
  );
}

function getPriorityCardClass(priority: Task["priority"]) {
  if (priority === "critical") {
    return "border-rose-300/30 bg-[linear-gradient(180deg,rgba(115,28,54,0.22),rgba(255,255,255,0.04))] hover:border-rose-300/60 hover:bg-[linear-gradient(180deg,rgba(115,28,54,0.28),rgba(255,255,255,0.06))]";
  }

  if (priority === "high") {
    return "border-amber-300/30 bg-[linear-gradient(180deg,rgba(125,88,18,0.2),rgba(255,255,255,0.04))] hover:border-amber-300/55 hover:bg-[linear-gradient(180deg,rgba(125,88,18,0.26),rgba(255,255,255,0.06))]";
  }

  if (priority === "medium") {
    return "border-cyan-300/30 bg-[linear-gradient(180deg,rgba(17,94,117,0.18),rgba(255,255,255,0.04))] hover:border-cyan-300/55 hover:bg-[linear-gradient(180deg,rgba(17,94,117,0.24),rgba(255,255,255,0.06))]";
  }

  return "border-emerald-300/25 bg-[linear-gradient(180deg,rgba(22,101,52,0.16),rgba(255,255,255,0.04))] hover:border-emerald-300/50 hover:bg-[linear-gradient(180deg,rgba(22,101,52,0.22),rgba(255,255,255,0.06))]";
}

function nextStatus(current: TaskStatus): TaskStatus {
  if (current === "backlog") return "in_progress";
  if (current === "in_progress") return "review";
  return "done";
}

function previousStatus(current: TaskStatus): TaskStatus {
  if (current === "done") return "review";
  if (current === "review") return "in_progress";
  return "backlog";
}
