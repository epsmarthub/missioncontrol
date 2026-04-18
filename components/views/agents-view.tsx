"use client";

import { useMissionControl } from "@/components/mission-control-provider";
import { AgentCard } from "@/components/views/shared-cards";
import { MissionShell } from "@/components/ui-shell";

export function AgentsView() {
  const { snapshot } = useMissionControl();

  return (
    <MissionShell title="Agentes">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {snapshot.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </MissionShell>
  );
}
