"use client";

import { FormEvent, useState } from "react";
import { Headphones, Radio } from "lucide-react";
import { useMissionControl } from "@/components/mission-control-provider";
import { Avatar, MissionShell, Panel, SectionTitle } from "@/components/ui-shell";
import { formatRelativeDate, initials } from "@/lib/utils";

export function ChatView() {
  const {
    activeChannelId,
    realtimeStatus,
    sendMessage,
    setActiveChannelId,
    snapshot,
    toggleVoiceForChannel,
  } = useMissionControl();
  const [messageInput, setMessageInput] = useState("");

  const activeChannel =
    snapshot.channels.find((channel) => channel.id === activeChannelId) ?? snapshot.channels[0];
  const activeMessages = snapshot.messages.filter(
    (message) => message.channelId === activeChannel.id,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!messageInput.trim()) {
      return;
    }

    await sendMessage(messageInput.trim());
    setMessageInput("");
  }

  return (
    <MissionShell title="Sala de chat" wide>
      <div className="grid min-h-[calc(100vh-150px)] gap-3 xl:h-[calc(100vh-182px)] xl:min-h-0 xl:grid-cols-[210px_minmax(0,2.2fr)_190px] 2xl:grid-cols-[230px_minmax(0,2.5fr)_210px]">
        <Panel className="order-2 h-full xl:order-1 xl:min-h-0 xl:overflow-y-auto">
          <SectionTitle title="Canales" subtitle="Publicos, privados y resumenes" />
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 xl:block xl:space-y-2.5 xl:overflow-visible xl:pb-0">
            {snapshot.channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannelId(channel.id)}
                className={`min-w-[204px] shrink-0 rounded-2xl border-2 px-3 py-3 text-left transition-all xl:w-full xl:min-w-0 ${
                  channel.id === activeChannelId
                    ? "border-cyan-300 bg-cyan-400/10"
                    : "border-white/10 bg-white/5 hover:border-fuchsia-300/70"
                }`}
              >
                <p className="text-[11px] uppercase leading-[1.05] tracking-[0.08em] text-white sm:text-xs sm:tracking-[0.1em]">
                  {channel.name}
                </p>
                <p className="mt-1 font-mono text-[11px] leading-[1.45] text-slate-300 sm:text-xs">
                  {channel.description}
                </p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="order-1 flex min-h-[62vh] flex-col sm:min-h-[calc(100vh-170px)] xl:order-2 xl:h-full xl:min-h-0">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <SectionTitle
              title={activeChannel.name}
              subtitle="Menciones, DMs y coordinacion entre agentes"
            />
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${
                  realtimeStatus === "connected"
                    ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                    : "border-amber-300/50 bg-amber-500/15 text-amber-100"
                }`}
              >
                <Radio className="size-4" />
                {realtimeStatus === "connected" ? "En vivo" : "Reconectando"}
              </div>
              <button
                type="button"
                onClick={() => void toggleVoiceForChannel(activeChannel.id)}
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] ${
                  snapshot.voice.enabledChannels.includes(activeChannel.id)
                    ? "border-emerald-300/50 bg-emerald-500/15 text-emerald-100"
                    : "border-white/15 bg-white/5 text-slate-200"
                }`}
              >
                <Headphones className="size-4" />
                {snapshot.voice.enabledChannels.includes(activeChannel.id) ? "Voz activa" : "Voz apagada"}
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 sm:space-y-4 sm:pr-3">
            {activeMessages.map((message) => (
              <div
                key={message.id}
                className={`rounded-2xl border px-3 py-2.5 ${
                  message.authorType === "user"
                    ? "ml-3 border-cyan-300/40 bg-cyan-400/10 sm:ml-10 lg:ml-16"
                    : message.authorType === "system"
                      ? "border-fuchsia-300/40 bg-fuchsia-400/10"
                      : "mr-3 border-[#facc15]/40 bg-[#facc15]/10 sm:mr-10 lg:mr-16"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-white sm:text-sm">
                    {message.authorName}
                  </p>
                  <span className="font-mono text-[11px] text-slate-300 sm:text-xs">
                    {formatRelativeDate(message.createdAt)}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm leading-7 text-slate-100 sm:text-[15px]">
                  {message.content}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 shrink-0 space-y-3">
            <textarea
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              placeholder="Prueba: Jarvis como estas / Jarvis habla con Alaria sobre lo pendiente"
              className="min-h-28 w-full rounded-2xl border-2 border-white/10 bg-[#09101f] px-4 py-3 font-mono text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-cyan-300 sm:min-h-32 sm:leading-7 xl:min-h-24 xl:max-h-32 xl:leading-6"
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
              <p className="max-w-[68ch] font-mono text-xs leading-5 text-slate-400 sm:text-sm">
                La voz solo se activa cuando el usuario y la sala lo permiten.
              </p>
              <button
                type="submit"
                className="w-full rounded-full border-2 border-[#facc15] bg-[#facc15]/15 px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#fde68a] sm:w-auto"
              >
                Enviar comando
              </button>
            </div>
          </form>
        </Panel>

        <Panel className="order-3 h-full xl:min-h-0 xl:overflow-y-auto">
          <SectionTitle title="Presencia" subtitle="Estado operativo en vivo" />
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            {snapshot.presence.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center gap-3">
                  <Avatar
                    label={initials(entry.entityName)}
                    accent={
                      entry.entityType === "user"
                        ? "user"
                        : snapshot.agents.find((agent) => agent.id === entry.entityId)?.classId ??
                          "mage"
                    }
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-white sm:text-xs">
                      {entry.entityName}
                    </p>
                    <p className="font-mono text-xs text-slate-300 sm:text-sm">{entry.mode}</p>
                    {entry.typing ? (
                      <span className="mt-1 inline-flex rounded-full bg-emerald-400/15 px-2 py-1 font-mono text-[10px] text-emerald-200 sm:text-xs">
                        escribiendo
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </MissionShell>
  );
}
