"use client";

import { Radar, Sparkles } from "lucide-react";
import {
  getBlockedRadar,
  getDashboardStats,
  getTacticalAssignments,
} from "@/lib/mission-control";
import { useMissionControl } from "@/components/mission-control-provider";
import { AgentCard, MiniList, StatCard } from "@/components/views/shared-cards";
import { MissionShell, Panel, SectionTitle } from "@/components/ui-shell";

export function DashboardView() {
  const { snapshot } = useMissionControl();
  const stats = getDashboardStats(snapshot);
  const blockedRadar = getBlockedRadar(snapshot.tasks, snapshot.agents);
  const tacticalAssignments = getTacticalAssignments(snapshot.tasks, snapshot.agents);

  return (
    <MissionShell title="Centro HQ">
      <div className="grid gap-3 xl:grid-cols-[1.35fr_0.95fr]">
        <Panel>
          <SectionTitle title="Radar HQ" subtitle="Estado actual de la operacion" />
          <div className="mt-3 grid gap-2.5 md:grid-cols-3">
            <StatCard title="Tareas" value={String(stats.totalTasks)} description="carga total" />
            <StatCard title="Hechas" value={String(stats.completedTasks)} description="misiones cerradas" />
            <StatCard title="Revision" value={String(stats.inReview)} description="esperando supervisor" />
          </div>
          <div className="mt-3 grid gap-2.5 lg:grid-cols-2">
            <MiniList
              title="Bloqueos detectados"
              items={blockedRadar.slice(0, 3).map((entry) => ({
                title: entry.task.title,
                meta: `${entry.owner || "sin responsable"} | ${entry.severity}`,
              }))}
            />
            <MiniList
              title="Asignacion tactica"
              items={tacticalAssignments.slice(0, 3).map((entry) => ({
                title: entry.task.title,
                meta: `${entry.agent.name} | ${entry.rationale}`,
              }))}
            />
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-fuchsia-300" />
            <SectionTitle title="Funciones proactivas" subtitle="Motor extra para adelantar trabajo" />
          </div>
          <div className="mt-3 space-y-2.5">
            <MiniFeature
              title="Radar de bloqueos"
              body="Encuentra tareas estancadas, revisiones vencidas y agentes sin avance."
              icon={<Radar className="size-5 text-cyan-200" />}
            />
            <MiniFeature
              title="Asignacion tactica"
              body="Sugiere el mejor agente segun clase, carga y prioridad."
              icon={<Sparkles className="size-5 text-cyan-200" />}
            />
            <MiniFeature
              title="Stand-up automatico"
              body="Entrega un markdown diario listo para compartir."
              icon={<Sparkles className="size-5 text-cyan-200" />}
            />
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <SectionTitle title="Agentes en campana" subtitle="Clases, stats y especialidades" />
          <div className="mt-3 grid gap-2.5 md:grid-cols-3">
            {snapshot.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} compact />
            ))}
          </div>
        </Panel>
      </div>
    </MissionShell>
  );
}

function MiniFeature({
  title,
  body,
  icon,
}: Readonly<{ title: string; body: string; icon: React.ReactNode }>) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3">
      <div className="flex items-center gap-3">
        <div className="rounded-[14px] border border-cyan-300/30 bg-cyan-400/10 p-2">{icon}</div>
        <p className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">{title}</p>
      </div>
      <p className="mt-2 font-mono text-xs leading-5 text-slate-300 sm:text-sm">{body}</p>
    </div>
  );
}
