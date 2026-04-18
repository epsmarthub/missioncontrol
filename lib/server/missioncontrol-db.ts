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
  coordinateAgents,
  createAgentReply,
  createVoiceSession,
  generateAutomaticStandup,
  getBlockedRadar,
  getDashboardStats,
  getTacticalAssignments,
} from "@/lib/mission-control";
import { prisma } from "@/lib/prisma";
import {
  AgentProfile,
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

  return getMissionControlSnapshotFromDb();
}

export async function postMissionControlMessage(input: {
  channelId: string;
  authorId: string;
  authorName: string;
  authorType: AuthorType;
  content: string;
  mentions: string[];
}) {
  ensureDatabase();

  const channel = await prisma.chatChannel.findUnique({ where: { slug: input.channelId } });
  if (!channel) {
    throw new Error(`No existe el canal ${input.channelId}.`);
  }

  await prisma.chatMessage.create({
    data: {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      channelId: channel.id,
      userId: input.authorType === "user" ? input.authorId : null,
      authorName: input.authorName,
      authorType: input.authorType,
      content: input.content,
      mentions: input.mentions,
      createdAt: new Date(),
    },
  });

  return getMissionControlSnapshotFromDb();
}

export async function createMentionReplyAndPersist(input: {
  channelId: string;
  message: string;
  agentId: string;
  authorId: string;
  authorName: string;
  authorType: AuthorType;
}) {
  ensureDatabase();

  await postMissionControlMessage({
    channelId: input.channelId,
    authorId: input.authorId,
    authorName: input.authorName,
    authorType: input.authorType,
    content: input.message,
    mentions: [input.agentId],
  });

  const snapshot = await getMissionControlSnapshotFromDb();
  const reply = await createAgentReply(snapshot, input.message, input.agentId);
  const channel = await prisma.chatChannel.findUnique({ where: { slug: input.channelId } });

  if (!channel) {
    throw new Error(`No existe el canal ${input.channelId}.`);
  }

  await prisma.chatMessage.create({
    data: {
      id: `msg-${Date.now()}-reply`,
      channelId: channel.id,
      authorName: reply.agentName,
      authorType: "agent",
      content: reply.reply,
      mentions: [],
      createdAt: new Date(),
    },
  });

  return {
    reply,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}

export async function coordinateAgentsAndPersist(input: {
  sourceChannelId: string;
  initiatorId: string;
  targetId: string;
  topic: string;
}) {
  ensureDatabase();

  const snapshot = await getMissionControlSnapshotFromDb();
  const payload = await coordinateAgents(
    snapshot,
    input.sourceChannelId,
    input.initiatorId,
    input.targetId,
    input.topic,
  );

  const sourceChannel = await prisma.chatChannel.findUnique({
    where: { slug: input.sourceChannelId },
  });
  const summaryChannel = await prisma.chatChannel.findUnique({
    where: { slug: "meeting-summaries" },
  });

  if (!sourceChannel || !summaryChannel) {
    throw new Error("No existen los canales requeridos para coordinacion.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.chatChannel.upsert({
      where: { slug: payload.thread.id },
      update: {
        name: `#${payload.thread.topic.slice(0, 32)}`,
        description: `Hilo privado: ${payload.thread.topic}`,
      },
      create: {
        id: payload.thread.id,
        name: `#${payload.thread.topic.slice(0, 32)}`,
        slug: payload.thread.id,
        type: ChannelType.PRIVATE,
        description: `Hilo privado: ${payload.thread.topic}`,
      },
    });

    await tx.directThread.upsert({
      where: { id: payload.thread.id },
      update: {
        sourceChannelId: payload.thread.sourceChannelId,
        agentAId: payload.thread.agentAId,
        agentBId: payload.thread.agentBId,
        topic: payload.thread.topic,
        summaryId: payload.thread.summaryId,
      },
      create: {
        id: payload.thread.id,
        sourceChannelId: payload.thread.sourceChannelId,
        agentAId: payload.thread.agentAId,
        agentBId: payload.thread.agentBId,
        topic: payload.thread.topic,
        summaryId: payload.thread.summaryId,
        createdAt: new Date(payload.thread.createdAt),
      },
    });

    for (const message of payload.transcript) {
      await tx.chatMessage.upsert({
        where: { id: message.id },
        update: {
          channelId: payload.thread.id,
          authorName: message.authorName,
          authorType: message.authorType,
          content: message.content,
          mentions: message.mentions,
          createdAt: new Date(message.createdAt),
        },
        create: {
          id: message.id,
          channelId: payload.thread.id,
          authorName: message.authorName,
          authorType: message.authorType,
          content: message.content,
          mentions: message.mentions,
          createdAt: new Date(message.createdAt),
        },
      });
    }

    await tx.meetingSummary.upsert({
      where: { id: payload.summary.id },
      update: {
        title: payload.summary.title,
        sourceChannelId: sourceChannel.id,
        threadId: payload.summary.threadId,
        participants: payload.summary.participants,
        highlights: payload.summary.highlights,
        markdown: payload.summary.markdown,
        createdAt: new Date(payload.summary.createdAt),
      },
      create: {
        id: payload.summary.id,
        title: payload.summary.title,
        sourceChannelId: sourceChannel.id,
        threadId: payload.summary.threadId,
        participants: payload.summary.participants,
        highlights: payload.summary.highlights,
        markdown: payload.summary.markdown,
        createdAt: new Date(payload.summary.createdAt),
      },
    });

    await tx.chatMessage.create({
      data: {
        id: `system-${Date.now()}`,
        channelId: summaryChannel.id,
        authorName: "MissionControl",
        authorType: "system",
        content: `Resumen publicado: ${payload.summary.title}`,
        mentions: [],
        createdAt: new Date(),
      },
    });
  });

  return {
    payload,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
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

  return {
    session,
    snapshot: await getMissionControlSnapshotFromDb(),
  };
}
