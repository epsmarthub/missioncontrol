"use client";

import { getBlockedRadar, getTacticalAssignments } from "@/lib/mission-control";
import { useMissionControl } from "@/components/mission-control-provider";
import { MiniList } from "@/components/views/shared-cards";
import { MissionShell, Panel, SectionTitle } from "@/components/ui-shell";

export function SupervisorView() {
  const { snapshot, standupMarkdown } = useMissionControl();
  const blockedRadar = getBlockedRadar(snapshot.tasks, snapshot.agents);
  const tacticalAssignments = getTacticalAssignments(snapshot.tasks, snapshot.agents);
  const reviewQueue = snapshot.tasks.filter((task) => task.status === "review");

  return (
    <MissionShell title="Supervision">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <SectionTitle title="Consola de supervision" subtitle="Reasignacion, aprobacion y alertas" />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <MiniList
              title="Cola de aprobacion"
              items={reviewQueue.map((task) => ({
                title: task.title,
                meta: `${task.priority} | ${task.assignedAgentIds.join(", ")}`,
              }))}
            />
            <MiniList
              title="Radar de bloqueos"
              items={blockedRadar.map((entry) => ({
                title: entry.task.title,
                meta: entry.task.blockedReason ?? "vencido",
              }))}
            />
          </div>
          <div className="mt-4 space-y-3">
            {tacticalAssignments.map((entry) => (
              <div key={entry.task.id} className="rounded-[22px] border border-white/10 bg-white/5 p-3.5">
                <p className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">{entry.task.title}</p>
                <p className="mt-2 font-mono text-xs text-slate-300 sm:text-sm">
                  Sugerencia: {entry.agent.name} | {entry.rationale}
                </p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="Stand-up automatico" subtitle="Markdown listo para publicar" />
          <pre className="mt-4 overflow-x-auto rounded-[22px] border border-white/10 bg-[#080c17] p-4 font-mono text-xs leading-6 text-emerald-100 sm:text-sm">
            {standupMarkdown}
          </pre>
        </Panel>
      </div>
    </MissionShell>
  );
}
