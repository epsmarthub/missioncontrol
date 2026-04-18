"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { generateAutomaticStandup } from "@/lib/mission-control";
import { MeetingSummary, MissionControlSnapshot, TaskStatus } from "@/lib/types";

const STORAGE_KEY = "missioncontrol.snapshot.v2";

interface MissionControlContextValue {
  snapshot: MissionControlSnapshot;
  activeChannelId: string;
  realtimeStatus: "connecting" | "connected" | "reconnecting";
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
  const [realtimeStatus, setRealtimeStatus] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const pollingInFlightRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  const refreshSnapshot = useCallback(async () => {
    if (pollingInFlightRef.current) {
      return;
    }

    pollingInFlightRef.current = true;

    try {
      const response = await fetch("/api/snapshot", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { snapshot?: MissionControlSnapshot };
      if (payload.snapshot) {
        setSnapshot(payload.snapshot);
      }
    } catch {
      return;
    } finally {
      pollingInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    let reconnectTimeoutId: number | null = null;
    let fallbackTimeoutId: number | null = null;
    let disposed = false;

    const scheduleFallbackRefresh = () => {
      if (disposed) {
        return;
      }

      fallbackTimeoutId = window.setTimeout(() => {
        if (!document.hidden) {
          void refreshSnapshot();
        }

        scheduleFallbackRefresh();
      }, 30000);
    };

    const connectWebSocket = () => {
      if (disposed) {
        return;
      }

      setRealtimeStatus(socketRef.current ? "reconnecting" : "connecting");
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        setRealtimeStatus("connected");
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data as string) as { type?: string };
          if (payload.type !== "snapshot.invalidate") {
            return;
          }

          if (document.hidden) {
            pendingRefreshRef.current = true;
            return;
          }

          void refreshSnapshot();
        } catch {
          // noop
        }
      });

      socket.addEventListener("close", () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
        }

        if (!disposed) {
          setRealtimeStatus("reconnecting");
          reconnectTimeoutId = window.setTimeout(() => {
            connectWebSocket();
          }, 1500);
        }
      });

      socket.addEventListener("error", () => {
        try {
          socket.close();
        } catch {
          // noop
        }
      });
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (
          !socketRef.current ||
          socketRef.current.readyState === WebSocket.CLOSING ||
          socketRef.current.readyState === WebSocket.CLOSED
        ) {
          connectWebSocket();
        }

        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
        }

        void refreshSnapshot();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    connectWebSocket();
    fallbackTimeoutId = window.setTimeout(() => {
      if (!document.hidden) {
        void refreshSnapshot();
      }
      scheduleFallbackRefresh();
    }, 0);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeoutId !== null) {
        window.clearTimeout(reconnectTimeoutId);
      }
      if (fallbackTimeoutId !== null) {
        window.clearTimeout(fallbackTimeoutId);
      }
      if (socketRef.current) {
        try {
          socketRef.current.close();
        } catch {
          // noop
        }
        socketRef.current = null;
      }
    };
  }, [refreshSnapshot]);

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
      realtimeStatus,
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
      realtimeStatus,
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
