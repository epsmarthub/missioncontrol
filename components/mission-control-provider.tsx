"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { generateAutomaticStandup } from "@/lib/mission-control";
import { MeetingSummary, MissionControlSnapshot, TaskStatus } from "@/lib/types";

const STORAGE_KEY = "missioncontrol.snapshot.v2";

interface MissionControlContextValue {
  snapshot: MissionControlSnapshot;
  activeChannelId: string;
  setActiveChannelId: (channelId: string) => void;
  moveTask: (taskId: string, nextStatus: TaskStatus) => Promise<void>;
  approveTask: (taskId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
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
  const [activeChannelId, setActiveChannelId] = useState("hq-command");

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

  const sendMessage = useCallback(async (content: string) => {
    const coordinationMatch = content
      .toLowerCase()
      .match(/(jarvis|alaria|brakka).*habla con.*(jarvis|alaria|brakka)/i);

    if (coordinationMatch) {
      const initiator = coordinationMatch[1].toLowerCase();
      const target = coordinationMatch[2].toLowerCase();

      const response = await fetch("/api/agents/coordinate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChannelId: activeChannelId,
          initiatorId: initiator,
          targetId: target,
          topic: content,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
        if (payload.snapshot) {
          setSnapshot(payload.snapshot);
        }
      }

      return;
    }

    const mentions = snapshot.agents
      .filter((agent) => content.toLowerCase().includes(agent.name.toLowerCase()))
      .map((agent) => agent.id);

    if (mentions.length > 0) {
      const agentId = mentions[0];

      try {
        const response = await fetch("/api/chat/mention", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: activeChannelId,
            message: content,
            agentId,
          }),
        });

        if (response.ok) {
          const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
          if (payload.snapshot) {
            setSnapshot(payload.snapshot);
          }
        }
      } catch {
        return;
      }

      return;
    }

    const response = await fetch("/api/chat/post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId: activeChannelId,
        content,
      }),
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
    if (payload.snapshot) {
      setSnapshot(payload.snapshot);
    }
  }, [activeChannelId, snapshot]);

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
      activeChannelId,
      setActiveChannelId,
      moveTask,
      approveTask,
      sendMessage,
      exportSummary,
      toggleVoiceForChannel,
      standupMarkdown,
    }),
    [
      activeChannelId,
      approveTask,
      exportSummary,
      moveTask,
      sendMessage,
      snapshot,
      standupMarkdown,
      toggleVoiceForChannel,
    ],
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
