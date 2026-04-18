"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { generateAutomaticStandup } from "@/lib/mission-control";
import { MeetingSummary, MissionControlSnapshot, TaskStatus } from "@/lib/types";

const STORAGE_KEY = "missioncontrol.snapshot.v2";

interface MissionControlContextValue {
  snapshot: MissionControlSnapshot;
  moveTask: (taskId: string, nextStatus: TaskStatus) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  exportSummary: (summary: MeetingSummary) => void;
  toggleVoiceForChannel: (channelId: string) => Promise<void>;
  standupMarkdown: string;
}

const MissionControlContext = createContext<MissionControlContextValue | null>(null);

export function MissionControlProvider({
  initialSnapshot,
  children,
}: Readonly<{
  initialSnapshot: MissionControlSnapshot;
  children: React.ReactNode;
}>) {
  const [snapshot, setSnapshot] = useState<MissionControlSnapshot>(initialSnapshot);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  const moveTask = useCallback(async (taskId: string, nextStatus: TaskStatus) => {
    const response = await fetch(`/api/tasks/${taskId}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus }),
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
    if (payload.snapshot) {
      setSnapshot(payload.snapshot);
    }
  }, []);

  const approveTask = useCallback(async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/approve`, {
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
    if (payload.snapshot) {
      setSnapshot(payload.snapshot);
    }
  }, []);

  const exportSummary = useCallback((summary: MeetingSummary) => {
    const blob = new Blob([summary.markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${summary.title.toLowerCase().replace(/\s+/g, "-")}.md`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, []);

  const toggleVoiceForChannel = useCallback(
    async (channelId: string) => {
      const isEnabled = snapshot.voice.enabledChannels.includes(channelId);
      let token = snapshot.voice.lastIssuedToken;

      if (!isEnabled) {
        const activeAgent = snapshot.agents.find(
          (agent) => agent.id === snapshot.voice.activeAgentId,
        ) ?? snapshot.agents[0];

        const response = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: activeAgent.id, channelId, enabled: true }),
        });

        if (response.ok) {
          const payload = (await response.json()) as {
            token?: string;
            snapshot?: MissionControlSnapshot;
          };
          token = payload.token;
          if (payload.snapshot) {
            setSnapshot(payload.snapshot);
            return;
          }
        }
      } else {
        const response = await fetch("/api/voice/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channelId, enabled: false }),
        });

        if (response.ok) {
          const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
          if (payload.snapshot) {
            setSnapshot(payload.snapshot);
            return;
          }
        }
      }

      setSnapshot((current) => ({
        ...current,
        voice: {
          ...current.voice,
          enabledChannels: isEnabled
            ? current.voice.enabledChannels.filter((entry) => entry !== channelId)
            : [...current.voice.enabledChannels, channelId],
          lastIssuedToken: token,
        },
      }));
    },
    [snapshot.agents, snapshot.voice],
  );

  const standupMarkdown = useMemo(() => generateAutomaticStandup(snapshot), [snapshot]);

  const value = useMemo<MissionControlContextValue>(
    () => ({
      snapshot,
      moveTask,
      approveTask,
      exportSummary,
      toggleVoiceForChannel,
      standupMarkdown,
    }),
    [approveTask, exportSummary, moveTask, snapshot, standupMarkdown, toggleVoiceForChannel],
  );

  return (
    <MissionControlContext.Provider value={value}>
      {children}
    </MissionControlContext.Provider>
  );
}

export function useMissionControl() {
  const context = useContext(MissionControlContext);

  if (!context) {
    throw new Error("useMissionControl debe usarse dentro de MissionControlProvider");
  }

  return context;
}
