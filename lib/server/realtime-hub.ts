type RealtimeSocketLike = {
  readyState: number;
  send: (payload: string) => void;
  close?: () => void;
};

export type MissionControlRealtimeEvent =
  | {
      type: "connection.ready";
      at: string;
    }
  | {
      type: "snapshot.invalidate";
      at: string;
      reason: string;
      channelId?: string;
      entityId?: string;
    };

type RealtimeState = {
  clients: Set<RealtimeSocketLike>;
};

declare global {
  var __MISSIONCONTROL_REALTIME__: RealtimeState | undefined;
}

function getRealtimeState(): RealtimeState {
  if (!globalThis.__MISSIONCONTROL_REALTIME__) {
    globalThis.__MISSIONCONTROL_REALTIME__ = {
      clients: new Set(),
    };
  }

  return globalThis.__MISSIONCONTROL_REALTIME__;
}

export function broadcastMissionControlEvent(event: MissionControlRealtimeEvent) {
  const state = getRealtimeState();
  const payload = JSON.stringify(event);

  for (const client of state.clients) {
    if (client.readyState !== 1) {
      state.clients.delete(client);
      continue;
    }

    try {
      client.send(payload);
    } catch {
      state.clients.delete(client);
      try {
        client.close?.();
      } catch {
        // noop
      }
    }
  }
}

export function broadcastSnapshotInvalidated(input: {
  reason: string;
  channelId?: string;
  entityId?: string;
}) {
  broadcastMissionControlEvent({
    type: "snapshot.invalidate",
    at: new Date().toISOString(),
    reason: input.reason,
    channelId: input.channelId,
    entityId: input.entityId,
  });
}
