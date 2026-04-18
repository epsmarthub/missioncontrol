import {
  AgentClass,
  ChannelType,
  PresenceMode,
  TaskPriority,
  TaskStatus,
} from "@prisma/client";
import { env, hasDatabase } from "@/lib/env";
import { AGENT_CLASS_CONFIG } from "@/lib/agent-classes";
import { buildMeetingMarkdown } from "@/lib/markdown";
import {
  createVoiceSession,
  generateAutomaticStandup,
  getBlockedRadar,
  getDashboardStats,
  getTacticalAssignments,
} from "@/lib/mission-control";
import { prisma } from "@/lib/prisma";
import { broadcastSnapshotInvalidated } from "@/lib/server/realtime-hub";
import {
  AgentProfile,
  AgentClassId,
  AuthorType,
  ChatMessage,
  MeetingSummary,
  MissionControlSnapshot,
  PresenceState,
  Task,
  TaskStatus as AppTaskStatus,
} from "@/lib/types";
import { applyXp } from "@/lib/xp";

function ensureDatabase() {
  if (!hasDatabase || !env.databaseUrl) {
    throw new Error("DATABASE_URL no configurada. Este modo requiere PostgreSQL real.");
  }
}

function nowIso() {
  return new Date().toISOString();
}

function fromAgentClass(classId: AgentClass): AgentProfile["classId"] {
  switch (classId) {
    case AgentClass.MAGE:
      return "mage";
    case AgentClass.HUNTER:
      return "hunter";
    case AgentClass.WARRIOR:
      return "warrior";
    case AgentClass.PALADIN:
      return "paladin";
    case AgentClass.ROGUE:
      return "rogue";
    case AgentClass.BARD:
      return "bard";
    case AgentClass.ENGINEER:
      return "engineer";
    case AgentClass.SUMMONER:
      return "summoner";
  }
}

function fromTaskStatus(status: TaskStatus): AppTaskStatus {
  switch (status) {
    case TaskStatus.BACKLOG:
      return "backlog";
    case TaskStatus.IN_PROGRESS:
      return "in_progress";
    case TaskStatus.REVIEW:
      return "review";
    case TaskStatus.DONE:
      return "done";
  }
}

function toAgentClass(classId: AgentClassId): AgentClass {
  switch (classId) {
    case "mage":
      return AgentClass.MAGE;
    case "hunter":
      return AgentClass.HUNTER;
    case "warrior":
      return AgentClass.WARRIOR;
    case "paladin":
      return AgentClass.PALADIN;
    case "rogue":
      return AgentClass.ROGUE;
    case "bard":
      return AgentClass.BARD;
    case "engineer":
      return AgentClass.ENGINEER;
    case "summoner":
      return AgentClass.SUMMONER;
  }
}

function toTaskStatus(status: AppTaskStatus): TaskStatus {
  switch (status) {
    case "backlog":
      return TaskStatus.BACKLOG;
    case "in_progress":
      return TaskStatus.IN_PROGRESS;
    case "review":
      return TaskStatus.REVIEW;
    case "done":
      return TaskStatus.DONE;
  }
}

function fromTaskPriority(priority: TaskPriority): Task["priority"] {
  switch (priority) {
    case TaskPriority.LOW:
      return "low";
    case TaskPriority.MEDIUM:
      return "medium";
    case TaskPriority.HIGH:
      return "high";
    case TaskPriority.CRITICAL:
      return "critical";
  }
}

function fromChannelType(type: ChannelType): MissionControlSnapshot["channels"][number]["type"] {
  switch (type) {
    case ChannelType.PUBLIC:
      return "public";
    case ChannelType.PRIVATE:
      return "private";
    case ChannelType.DM:
      return "dm";
    case ChannelType.SUMMARY:
      return "summary";
  }
}

function fromPresenceMode(mode: PresenceMode): PresenceState["mode"] {
  switch (mode) {
    case PresenceMode.ONLINE:
      return "online";
    case PresenceMode.FOCUS:
      return "focus";
    case PresenceMode.AWAY:
      return "away";
    case PresenceMode.IN_VOICE:
      return "in_voice";
  }
}

function inferAuthorId(
  authorType: string,
  authorName: string,
  userId: string | null,
  agents: AgentProfile[],
) {
  if (authorType === "user" && userId) {
    return userId;
  }

  const agent = agents.find(
    (entry) =>
      entry.name.toLowerCase() === authorName.toLowerCase() ||
      entry.handle.toLowerCase() === authorName.toLowerCase(),
  );

  return agent?.id ?? authorName.toLowerCase().replace(/\s+/g, "-");
}

function slugifyAgentId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `agent-${Date.now()}`;
}

function normalizeHandle(value: string) {
  const cleaned = value.trim().replace(/^@+/, "");
  return `@${cleaned.toLowerCase()}`;
}

function createDefaultStats(classId: AgentClassId, level = 1) {
  const levelBonus = Math.max(level - 1, 0);

  switch (classId) {
    case "mage":
      return { arcana: 14 + levelBonus, tactics: 11 + levelBonus, strength: 6, agility: 8, support: 13 + levelBonus };
    case "hunter":
      return { arcana: 8, tactics: 12 + levelBonus, strength: 8, agility: 14 + levelBonus, support: 9 };
    case "warrior":
      return { arcana: 6, tactics: 11 + levelBonus, strength: 15 + levelBonus, agility: 9, support: 8 };
    case "paladin":
      return { arcana: 9, tactics: 11 + levelBonus, strength: 13 + levelBonus, agility: 7, support: 14 + levelBonus };
    case "rogue":
      return { arcana: 8, tactics: 10 + levelBonus, strength: 8, agility: 15 + levelBonus, support: 8 };
    case "bard":
      return { arcana: 10, tactics: 12 + levelBonus, strength: 7, agility: 9, support: 15 + levelBonus };
    case "engineer":
      return { arcana: 11 + levelBonus, tactics: 14 + levelBonus, strength: 8, agility: 10, support: 9 };
    case "summoner":
      return { arcana: 15 + levelBonus, tactics: 12 + levelBonus, strength: 6, agility: 8, support: 11 + levelBonus };
  }
}

export interface UpsertAgentInput {
  id?: string;
  name: string;
  handle: string;
  classId: AgentClassId;
  title?: string;
  level?: number;
  currentXp?: number;
  nextLevelXp?: number;
  specialty?: string;
  avatarSeed?: string;
  voice?: string;
  quote?: string;
  stats?: Partial<AgentProfile["stats"]>;
}

export async function getMissionControlSnapshotFromDb(): Promise<MissionControlSnapshot> {
  ensureDatabase();

  const [
    currentUser,
    agentsRaw,
    tasksRaw,
    taskHistoryRaw,
    xpEventsRaw,
    channelsRaw,
    messagesRaw,
    threadsRaw,
    summariesRaw,
    voiceSessionsRaw,
    presenceRaw,
  ] = await Promise.all([
    prisma.user.findFirst({ orderBy: { createdAt: "asc" } }),
    prisma.agentProfile.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      include: {
        assignments: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskStatusHistory.findMany({ orderBy: { changedAt: "asc" } }),
    prisma.xpEvent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.chatChannel.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.chatMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.directThread.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.meetingSummary.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.voiceSession.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.presenceState.findMany({
      include: {
        user: true,
        agent: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!currentUser) {
    throw new Error("No existe usuario base en la BD. Ejecuta npm run db:seed.");
  }

  const agents: AgentProfile[] = agentsRaw.map((agent) => ({
    id: agent.id,
    name: agent.name,
    handle: agent.handle,
    classId: fromAgentClass(agent.classId),
    classLabel: AGENT_CLASS_CONFIG[fromAgentClass(agent.classId)].label,
    title: agent.title,
    level: agent.level,
    currentXp: agent.currentXp,
    nextLevelXp: agent.nextLevelXp,
    specialty: agent.specialty,
    avatarSeed: agent.avatarSeed,
    voice: agent.voice,
    stats: {
      arcana: agent.statsArcana,
      tactics: agent.statsTactics,
      strength: agent.statsStrength,
      agility: agent.statsAgility,
      support: agent.statsSupport,
    },
    quote: agent.quote,
  }));

  const rosterIds = [currentUser.id, ...agents.map((agent) => agent.id)];
  const channelMembers = new Map<string, string[]>(
    channelsRaw.map((channel) => [channel.slug, rosterIds]),
  );

  const tasks: Task[] = tasksRaw.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: fromTaskStatus(task.status),
    priority: fromTaskPriority(task.priority),
    tags: task.tags,
    xpReward: task.xpReward,
    requiresApproval: task.requiresApproval,
    assignedAgentIds: task.assignments.map((assignment) => assignment.agentId),
    dueAt: task.dueAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    createdAt: task.createdAt.toISOString(),
    reviewRequestedAt: task.reviewRequestedAt?.toISOString(),
    completedAt: task.completedAt?.toISOString(),
    approvedAt: task.approvedAt?.toISOString(),
    blockedReason: task.blockedReason ?? undefined,
  }));

  const channels: MissionControlSnapshot["channels"] = channelsRaw.map((channel) => ({
    id: channel.slug,
    name: channel.name,
    type: fromChannelType(channel.type),
    description: channel.description,
    members: channelMembers.get(channel.slug) ?? rosterIds,
  }));

  const messages: ChatMessage[] = messagesRaw.map((message) => ({
    id: message.id,
    channelId:
      channelsRaw.find((channel) => channel.id === message.channelId)?.slug ?? message.channelId,
    authorId: inferAuthorId(message.authorType, message.authorName, message.userId, agents),
    authorName: message.authorName,
    authorType: message.authorType as AuthorType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    mentions: message.mentions,
  }));

  const summaries: MeetingSummary[] = summariesRaw.map((summary) => ({
    id: summary.id,
    title: summary.title,
    sourceChannelId:
      channelsRaw.find((channel) => channel.id === summary.sourceChannelId)?.slug ??
      summary.sourceChannelId,
    threadId: summary.threadId ?? undefined,
    createdAt: summary.createdAt.toISOString(),
    participants: summary.participants,
    highlights: summary.highlights,
    markdown: summary.markdown,
  }));

  const presence: PresenceState[] = presenceRaw.map((entry) => ({
    id: entry.id,
    entityId: entry.agentId ?? entry.userId ?? entry.id,
    entityName: entry.agent?.name ?? entry.user?.name ?? "Desconocido",
    entityType: entry.agentId ? "agent" : "user",
    channelId: entry.channelId ?? undefined,
    mode: fromPresenceMode(entry.mode),
    typing: entry.typing,
  }));

  const activeVoiceSessions = voiceSessionsRaw.filter(
    (session) => session.enabled && (!session.expiresAt || session.expiresAt > new Date()),
  );
  const activeAgentId =
    activeVoiceSessions
      .map((session) => agents.find((agent) => agent.voice === session.voice)?.id)
      .find(Boolean) ?? agents[0]?.id;

  return {
    currentUser: {
      id: currentUser.id,
      name: currentUser.name,
      handle: currentUser.handle,
      role: currentUser.role === "SUPERVISOR" ? "supervisor" : "operator",
    },
    agents,
    tasks,
    taskHistory: taskHistoryRaw.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      fromStatus: fromTaskStatus(entry.fromStatus),
      toStatus: fromTaskStatus(entry.toStatus),
      changedAt: entry.changedAt.toISOString(),
      changedBy: entry.changedBy,
    })),
    xpEvents: xpEventsRaw.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      agentId: entry.agentId,
      amount: entry.amount,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
    channels,
    messages,
    threads: threadsRaw.map((thread) => ({
      id: thread.id,
      sourceChannelId: thread.sourceChannelId,
      agentAId: thread.agentAId,
      agentBId: thread.agentBId,
      topic: thread.topic,
      summaryId: thread.summaryId ?? "",
      createdAt: thread.createdAt.toISOString(),
    })),
    summaries,
    voice: {
      enabledChannels: activeVoiceSessions.map((session) => session.channelId),
      enabledForUser: activeVoiceSessions.some((session) => session.userId === currentUser.id),
      activeAgentId,
      lastIssuedToken: activeVoiceSessions[0]?.id,
    },
    presence,
  };
}

export async function getMissionControlDashboardFromDb() {
  const snapshot = await getMissionControlSnapshotFromDb();
  return {
    snapshot,
    stats: getDashboardStats(snapshot),
    blockedRadar: getBlockedRadar(snapshot.tasks, snapshot.agents),
    tacticalAssignments: getTacticalAssignments(snapshot.tasks, snapshot.agents),
    standupMarkdown: generateAutomaticStandup(snapshot),
  };
}

export async function transitionMissionControlTask(
  taskId: string,
  nextStatus: AppTaskStatus,
  changedBy: string,
) {
  ensureDatabase();

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task) {
      throw new Error(`No existe la tarea ${taskId}.`);
    }

    const effectiveStatus =
      nextStatus === "done" && task.requiresApproval ? ("review" as const) : nextStatus;
    const timestamp = new Date();

    await tx.task.update({
      where: { id: taskId },
      data: {
        status: toTaskStatus(effectiveStatus),
        updatedAt: timestamp,
        reviewRequestedAt: effectiveStatus === "review" ? timestamp : task.reviewRequestedAt,
        completedAt: effectiveStatus === "done" ? timestamp : task.completedAt,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId,
        fromStatus: task.status,
        toStatus: toTaskStatus(effectiveStatus),
        changedBy,
        changedAt: timestamp,
      },
    });
  });

  broadcastSnapshotInvalidated({
    reason: "task.transition",
    entityId: taskId,
  });

  return getMissionControlSnapshotFromDb();
}

export async function approveMissionControlTask(taskId: string, changedBy: string) {
  ensureDatabase();

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });

    if (!task) {
      throw new Error(`No existe la tarea ${taskId}.`);
    }

    const assignedAgents = await tx.agentProfile.findMany({
      where: {
        id: {
          in: task.assignments.map((assignment) => assignment.agentId),
        },
      },
    });

    const xpChunk = Math.ceil(task.xpReward / Math.max(assignedAgents.length, 1));
    const timestamp = new Date();

    for (const agent of assignedAgents) {
      const appAgent: AgentProfile = {
        id: agent.id,
        name: agent.name,
        handle: agent.handle,
        classId: fromAgentClass(agent.classId),
        classLabel: agent.title,
        title: agent.title,
        level: agent.level,
        currentXp: agent.currentXp,
        nextLevelXp: agent.nextLevelXp,
        specialty: agent.specialty,
        avatarSeed: agent.avatarSeed,
        voice: agent.voice,
        stats: {
          arcana: agent.statsArcana,
          tactics: agent.statsTactics,
          strength: agent.statsStrength,
          agility: agent.statsAgility,
          support: agent.statsSupport,
        },
        quote: agent.quote,
      };

      const result = applyXp(appAgent, xpChunk);

      await tx.agentProfile.update({
        where: { id: agent.id },
        data: {
          level: result.agent.level,
          currentXp: result.agent.currentXp,
          nextLevelXp: result.agent.nextLevelXp,
          statsArcana: result.agent.stats.arcana,
          statsTactics: result.agent.stats.tactics,
          statsStrength: result.agent.stats.strength,
          statsAgility: result.agent.stats.agility,
          statsSupport: result.agent.stats.support,
        },
      });

      await tx.xpEvent.create({
        data: {
          id: `xp-${Date.now()}-${agent.id}`,
          taskId,
          agentId: agent.id,
          amount: xpChunk,
          reason: result.leveledUp ? "Entrega aprobada + level up" : "Entrega aprobada",
          createdAt: timestamp,
        },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.DONE,
        approvedAt: timestamp,
        completedAt: timestamp,
        updatedAt: timestamp,
      },
    });

    await tx.taskStatusHistory.create({
      data: {
        id: `hist-${Date.now()}-approval`,
        taskId,
        fromStatus: task.status,
        toStatus: TaskStatus.DONE,
        changedBy,
        changedAt: timestamp,
      },
    });
  });

  broadcastSnapshotInvalidated({
    reason: "task.approve",
    entityId: taskId,
  });

  return getMissionControlSnapshotFromDb();
}

export async function claimMissionControlTask(taskId: string, agentId: string, changedBy: string) {
  ensureDatabase();

  await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { assignments: true },
    });

    if (!task) {
      throw new Error(`No existe la tarea ${taskId}.`);
    }

    const existing = task.assignments.find((assignment) => assignment.agentId === agentId);
    if (!existing) {
      await tx.taskAssignment.create({
        data: {
          taskId,
          agentId,
        },
      });
    }

    await tx.task.update({
      where: { id: taskId },
      data: { updatedAt: new Date() },
    });

    await tx.taskStatusHistory.create({
      data: {
        id: `hist-${Date.now()}-claim`,
        taskId,
        fromStatus: task.status,
        toStatus: task.status,
        changedBy,
        changedAt: new Date(),
      },
    });
  });

  broadcastSnapshotInvalidated({
    reason: "task.claim",
    entityId: taskId,
  });

  return getMissionControlSnapshotFromDb();
}

export async function createSummaryAndPersist(input: {
  title: string;
  sourceChannelId: string;
  participants: string[];
  highlights: string[];
  markdown: string;
  threadId?: string;
}) {
  ensureDatabase();

  const sourceChannel = await prisma.chatChannel.findUnique({
    where: { slug: input.sourceChannelId },
  });

  if (!sourceChannel) {
    throw new Error(`No existe el canal ${input.sourceChannelId}.`);
  }

  const createdAt = nowIso();
  const baseSummary: MeetingSummary = {
    id: `summary-${Date.now()}`,
    title: input.title,
    sourceChannelId: input.sourceChannelId,
    threadId: input.threadId,
    createdAt,
    participants: input.participants,
    highlights: input.highlights,
    markdown: input.markdown,
  };
  const summary = {
    ...baseSummary,
    markdown: buildMeetingMarkdown(baseSummary),
  };

  await prisma.meetingSummary.create({
    data: {
      id: summary.id,
      title: summary.title,
      sourceChannelId: sourceChannel.id,
      threadId: summary.threadId,
      participants: summary.participants,
      highlights: summary.highlights,
      markdown: summary.markdown,
      createdAt: new Date(summary.createdAt),
    },
  });

  await prisma.chatMessage.create({
    data: {
      id: `summary-msg-${Date.now()}`,
      channelId: sourceChannel.id,
      authorName: "MissionControl",
      authorType: "system",
      content: `Nuevo resumen: ${summary.title}`,
      mentions: [],
      createdAt: new Date(),
    },
  });

  broadcastSnapshotInvalidated({
    reason: "summary.create",
    channelId: input.sourceChannelId,
  });

  return {
    summary,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}

export async function updatePresenceInDb(input: {
  entityId: string;
  mode: PresenceState["mode"];
  typing: boolean;
  channelId?: string;
}) {
  ensureDatabase();

  const user = await prisma.user.findUnique({ where: { id: input.entityId } });
  const agent = user ? null : await prisma.agentProfile.findUnique({ where: { id: input.entityId } });

  if (!user && !agent) {
    throw new Error(`No existe la entidad ${input.entityId}.`);
  }

  const existing = await prisma.presenceState.findFirst({
    where: user ? { userId: user.id } : { agentId: agent!.id },
  });

  const data = {
    userId: user?.id ?? null,
    agentId: agent?.id ?? null,
    channelId: input.channelId ?? null,
    mode:
      input.mode === "online"
        ? PresenceMode.ONLINE
        : input.mode === "focus"
          ? PresenceMode.FOCUS
          : input.mode === "away"
            ? PresenceMode.AWAY
            : PresenceMode.IN_VOICE,
    typing: input.typing,
  };

  if (existing) {
    await prisma.presenceState.update({
      where: { id: existing.id },
      data,
    });
  } else {
    await prisma.presenceState.create({
      data: {
        id: `presence-${Date.now()}`,
        ...data,
      },
    });
  }

  broadcastSnapshotInvalidated({
    reason: "presence.update",
    entityId: input.entityId,
    channelId: input.channelId,
  });

  return getMissionControlSnapshotFromDb();
}

export async function createVoiceSessionInDb(input: { agentId?: string; channelId?: string; enabled?: boolean }) {
  ensureDatabase();

  if (input.enabled === false) {
    if (input.channelId) {
      await prisma.voiceSession.updateMany({
        where: { channelId: input.channelId, enabled: true },
        data: { enabled: false, expiresAt: new Date() },
      });
    }

    broadcastSnapshotInvalidated({
      reason: "voice.disable",
      channelId: input.channelId,
    });

    return {
      session: {
        enabled: false,
        model: env.openaiRealtimeModel,
        voice: "alloy",
        provider: "demo" as const,
      },
      snapshot: await getMissionControlSnapshotFromDb(),
    };
  }

  const snapshot = await getMissionControlSnapshotFromDb();
  const agent = input.agentId
    ? (snapshot.agents.find((entry) => entry.id === input.agentId) ?? snapshot.agents[0])
    : snapshot.agents[0];

  if (!agent) {
    throw new Error("No existe un agente disponible para sesion de voz.");
  }

  const session = await createVoiceSession(agent.voice);

  await prisma.voiceSession.create({
    data: {
      id: `voice-${Date.now()}`,
      channelId: input.channelId ?? "hq-command",
      userId: snapshot.currentUser.id,
      enabled: true,
      provider: session.provider,
      model: session.model,
      voice: session.voice,
      expiresAt: session.token ? new Date(Date.now() + 55 * 60 * 1000) : null,
    },
  });

  broadcastSnapshotInvalidated({
    reason: "voice.enable",
    channelId: input.channelId ?? "hq-command",
    entityId: agent.id,
  });

  return {
    session,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}

export async function createAgentInDb(input: UpsertAgentInput) {
  ensureDatabase();

  const id = input.id ? slugifyAgentId(input.id) : slugifyAgentId(input.handle || input.name);
  const handle = normalizeHandle(input.handle || input.name);
  const level = Math.max(input.level ?? 1, 1);
  const classLabel = AGENT_CLASS_CONFIG[input.classId].label;
  const defaultStats = createDefaultStats(input.classId, level);

  await prisma.agentProfile.create({
    data: {
      id,
      name: input.name.trim(),
      handle,
      classId: toAgentClass(input.classId),
      title: input.title?.trim() || classLabel,
      level,
      currentXp: Math.max(input.currentXp ?? 0, 0),
      nextLevelXp: Math.max(input.nextLevelXp ?? 200, 50),
      specialty: input.specialty?.trim() || AGENT_CLASS_CONFIG[input.classId].rationale,
      avatarSeed: input.avatarSeed?.trim() || `${id}-portrait`,
      voice: input.voice?.trim() || "alloy",
      statsArcana: input.stats?.arcana ?? defaultStats.arcana,
      statsTactics: input.stats?.tactics ?? defaultStats.tactics,
      statsStrength: input.stats?.strength ?? defaultStats.strength,
      statsAgility: input.stats?.agility ?? defaultStats.agility,
      statsSupport: input.stats?.support ?? defaultStats.support,
      quote: input.quote?.trim() || `Soy ${input.name.trim()} y estoy listo para la siguiente mision.`,
    },
  });

  await prisma.presenceState.create({
    data: {
      id: `presence-${id}`,
      agentId: id,
      channelId: "hq-command",
      mode: PresenceMode.ONLINE,
      typing: false,
    },
  });

  broadcastSnapshotInvalidated({
    reason: "agent.create",
    entityId: id,
    channelId: "hq-command",
  });

  const snapshot = await getMissionControlSnapshotFromDb();
  return {
    agentId: id,
    snapshot,
  };
}

export async function updateAgentInDb(agentId: string, input: Partial<UpsertAgentInput>) {
  ensureDatabase();

  const existing = await prisma.agentProfile.findUnique({ where: { id: agentId } });
  if (!existing) {
    throw new Error(`No existe el agente ${agentId}.`);
  }

  const nextClassId = input.classId ?? fromAgentClass(existing.classId);
  const nextLevel = Math.max(input.level ?? existing.level, 1);
  const defaultStats = createDefaultStats(nextClassId, nextLevel);

  await prisma.agentProfile.update({
    where: { id: agentId },
    data: {
      name: input.name?.trim() ?? existing.name,
      handle: input.handle ? normalizeHandle(input.handle) : existing.handle,
      classId: input.classId ? toAgentClass(input.classId) : existing.classId,
      title: input.title?.trim() ?? existing.title,
      level: nextLevel,
      currentXp: Math.max(input.currentXp ?? existing.currentXp, 0),
      nextLevelXp: Math.max(input.nextLevelXp ?? existing.nextLevelXp, 50),
      specialty: input.specialty?.trim() ?? existing.specialty,
      avatarSeed: input.avatarSeed?.trim() ?? existing.avatarSeed,
      voice: input.voice?.trim() ?? existing.voice,
      statsArcana: input.stats?.arcana ?? existing.statsArcana ?? defaultStats.arcana,
      statsTactics: input.stats?.tactics ?? existing.statsTactics ?? defaultStats.tactics,
      statsStrength: input.stats?.strength ?? existing.statsStrength ?? defaultStats.strength,
      statsAgility: input.stats?.agility ?? existing.statsAgility ?? defaultStats.agility,
      statsSupport: input.stats?.support ?? existing.statsSupport ?? defaultStats.support,
      quote: input.quote?.trim() ?? existing.quote,
    },
  });

  broadcastSnapshotInvalidated({
    reason: "agent.update",
    entityId: agentId,
    channelId: "hq-command",
  });

  return {
    agentId,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}

export async function deleteAgentInDb(agentId: string) {
  ensureDatabase();

  const count = await prisma.agentProfile.count();
  if (count <= 1) {
    throw new Error("No puedes eliminar el ultimo agente operativo.");
  }

  const existing = await prisma.agentProfile.findUnique({ where: { id: agentId } });
  if (!existing) {
    throw new Error(`No existe el agente ${agentId}.`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.presenceState.deleteMany({ where: { agentId } });
    await tx.voiceSession.deleteMany({ where: { voice: existing.voice } });
    await tx.agentProfile.delete({ where: { id: agentId } });
  });

  broadcastSnapshotInvalidated({
    reason: "agent.delete",
    entityId: agentId,
    channelId: "hq-command",
  });

  return {
    agentId,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}
