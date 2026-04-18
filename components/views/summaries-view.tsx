"use client";

import { useState } from "react";
import { useMissionControl } from "@/components/mission-control-provider";
import { MissionShell, Panel, SectionTitle } from "@/components/ui-shell";
import { MiniList } from "@/components/views/shared-cards";

export function SummariesView() {
  const { exportSummary, snapshot } = useMissionControl();
  const [selectedId, setSelectedId] = useState(snapshot.summaries[0]?.id);
  const selected =
    snapshot.summaries.find((summary) => summary.id === selectedId) ?? snapshot.summaries[0];

  return (
    <MissionShell title="Resumenes de reuniones">
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel>
          <SectionTitle title="Resumenes" subtitle="Canal de acuerdos y exportacion markdown" />
          <div className="mt-3 space-y-2.5">
            {snapshot.summaries.map((summary) => (
              <button
                key={summary.id}
                type="button"
                onClick={() => setSelectedId(summary.id)}
                className={`w-full rounded-2xl border-2 px-3 py-2.5 text-left ${
                  selected?.id === summary.id
                    ? "border-fuchsia-300 bg-fuchsia-400/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">{summary.title}</p>
                <p className="mt-1 font-mono text-xs text-slate-300 sm:text-sm">
                  {summary.participants.join(" + ")}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel>
          {selected ? (
            <>
              <div className="flex flex-col gap-4 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle title={selected.title} subtitle={selected.participants.join(", ")} />
                <button
                  type="button"
                  onClick={() => exportSummary(selected)}
                  className="rounded-full border-2 border-cyan-300 bg-cyan-400/10 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-cyan-100"
                >
                  Exportar .md
                </button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <MiniList
                  title="Puntos clave"
                  items={selected.highlights.map((item) => ({ title: item, meta: "canal de resumenes" }))}
                />
                <pre className="overflow-x-auto rounded-[22px] border border-white/10 bg-[#080c17] p-4 font-mono text-xs leading-6 text-emerald-100 sm:text-sm">
                  {selected.markdown}
                </pre>
              </div>
            </>
          ) : null}
        </Panel>
      </div>
    </MissionShell>
  );
}
