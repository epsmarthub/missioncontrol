import {
  AgentClass,
  ChannelType,
  PresenceMode,
  PrismaClient,
  TaskPriority,
  TaskStatus,
  UserRole,
} from "@prisma/client";
import { createDemoSnapshot } from "../lib/demo-data";

const prisma = new PrismaClient();
const seedMode = (process.env.MISSIONCONTROL_SEED_MODE ?? "base").toLowerCase();

type DemoSnapshot = ReturnType<typeof createDemoSnapshot>;

function toTaskStatus(status: DemoSnapshot["tasks"][number]["status"]): TaskStatus {
  switch (status) {
    case "backlog":
      return TaskStatus.BACKLOG;
    case "in_progress":
      return TaskStatus.IN_PROGRESS;
    case "review":
      return TaskStatus.REVIEW;
    case "done":
      return TaskStatus.DONE;
    case "closed":
      return TaskStatus.CLOSED;
  }
}

function toTaskPriority(priority: DemoSnapshot["tasks"][number]["priority"]): TaskPriority {
  switch (priority) {
    case "low":
      return TaskPriority.LOW;
    case "medium":
      return TaskPriority.MEDIUM;
    case "high":
      return TaskPriority.HIGH;
    case "critical":
      return TaskPriority.CRITICAL;
  }
}

function toChannelType(type: DemoSnapshot["channels"][number]["type"]): ChannelType {
  switch (type) {
    case "public":
      return ChannelType.PUBLIC;
    case "private":
      return ChannelType.PRIVATE;
    case "dm":
      return ChannelType.DM;
    case "summary":
      return ChannelType.SUMMARY;
  }
}

function toPresenceMode(mode: DemoSnapshot["presence"][number]["mode"]): PresenceMode {
  switch (mode) {
    case "online":
      return PresenceMode.ONLINE;
    case "focus":
      return PresenceMode.FOCUS;
    case "away":
      return PresenceMode.AWAY;
    case "in_voice":
      return PresenceMode.IN_VOICE;
  }
}

async function resetDatabase() {
  await prisma.voiceSession.deleteMany();
  await prisma.xpEvent.deleteMany();
  await prisma.taskStatusHistory.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.directThread.deleteMany();
  await prisma.meetingSummary.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatChannel.deleteMany();
  await prisma.presenceState.deleteMany();
  await prisma.agentProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function seedBaseMode() {
  const now = new Date();

  const user = await prisma.user.create({
    data: {
      id: "user-vega",
      email: "vega@missioncontrol.local",
      name: "Comandante Vega",
      handle: "@vega",
      role: UserRole.SUPERVISOR,
    },
  });

  const agent = await prisma.agentProfile.create({
    data: {
      id: "jarvis",
      name: "Jarvis",
      handle: "@jarvis",
      classId: AgentClass.MAGE,
      title: "Mago Tactico",
      level: 1,
      currentXp: 0,
      nextLevelXp: 200,
      specialty: "Coordinacion base y automatizaciones",
      avatarSeed: "jarvis-base",
      voice: "alloy",
      statsArcana: 12,
      statsTactics: 14,
      statsStrength: 6,
      statsAgility: 8,
      statsSupport: 15,
      quote: "Listo para poner orden en la operacion.",
    },
  });

  const channels = [
    {
      id: "hq-command",
      name: "#HQ-COMMAND",
      slug: "hq-command",
      type: ChannelType.PUBLIC,
      description: "Canal principal de coordinacion.",
    },
    {
      id: "meeting-summaries",
      name: "#MEETING-SUMMARIES",
      slug: "meeting-summaries",
      type: ChannelType.SUMMARY,
      description: "Resumenes operativos y notas exportables.",
    },
    {
      id: "dm-vega-jarvis",
      name: "DM VEGA/JARVIS",
      slug: "dm-vega-jarvis",
      type: ChannelType.DM,
      description: "Canal directo entre supervisor y agente base.",
    },
  ] as const;

  for (const channel of channels) {
    await prisma.chatChannel.create({ data: channel });
  }

  await prisma.chatMessage.create({
    data: {
      id: "msg-bootstrap",
      channelId: "hq-command",
      authorName: "MissionControl",
      authorType: "system",
      content: "Bootstrap base completado. Ya puedes crear tareas y operar con OpenClaw.",
      mentions: [],
      createdAt: now,
    },
  });

  await prisma.presenceState.createMany({
    data: [
      {
        id: "presence-user-vega",
        userId: user.id,
        channelId: "hq-command",
        mode: PresenceMode.ONLINE,
        typing: false,
      },
      {
        id: "presence-agent-jarvis",
        agentId: agent.id,
        channelId: "hq-command",
        mode: PresenceMode.FOCUS,
        typing: false,
      },
    ],
  });
}

async function seedDemoMode() {
  const snapshot = createDemoSnapshot();
  const agentClassMap: Record<DemoSnapshot["agents"][number]["classId"], AgentClass> = {
    mage: AgentClass.MAGE,
    hunter: AgentClass.HUNTER,
    warrior: AgentClass.WARRIOR,
    paladin: AgentClass.PALADIN,
    rogue: AgentClass.ROGUE,
    bard: AgentClass.BARD,
    engineer: AgentClass.ENGINEER,
    summoner: AgentClass.SUMMONER,
  };

  const user = await prisma.user.create({
    data: {
      id: snapshot.currentUser.id,
      email: "vega@missioncontrol.local",
      name: snapshot.currentUser.name,
      handle: snapshot.currentUser.handle,
      role: snapshot.currentUser.role === "supervisor" ? UserRole.SUPERVISOR : UserRole.OPERATOR,
    },
  });

  for (const agent of snapshot.agents) {
    await prisma.agentProfile.create({
      data: {
        id: agent.id,
        name: agent.name,
        handle: agent.handle,
        classId: agentClassMap[agent.classId],
        title: agent.title,
        level: agent.level,
        currentXp: agent.currentXp,
        nextLevelXp: agent.nextLevelXp,
        specialty: agent.specialty,
        avatarSeed: agent.avatarSeed,
        voice: agent.voice,
        statsArcana: agent.stats.arcana,
        statsTactics: agent.stats.tactics,
        statsStrength: agent.stats.strength,
        statsAgility: agent.stats.agility,
        statsSupport: agent.stats.support,
        quote: agent.quote,
      },
    });
  }

  for (const task of snapshot.tasks) {
    await prisma.task.create({
      data: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: toTaskStatus(task.status),
        priority: toTaskPriority(task.priority),
        tags: task.tags,
        xpReward: task.xpReward,
        requiresApproval: task.requiresApproval,
        dueAt: new Date(task.dueAt),
        reviewRequestedAt: task.reviewRequestedAt ? new Date(task.reviewRequestedAt) : null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        approvedAt: task.approvedAt ? new Date(task.approvedAt) : null,
        blockedReason: task.blockedReason ?? null,
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      },
    });

    for (const agentId of task.assignedAgentIds) {
      await prisma.taskAssignment.create({
        data: {
          taskId: task.id,
          agentId,
        },
      });
    }
  }

  for (const history of snapshot.taskHistory) {
    await prisma.taskStatusHistory.create({
      data: {
        id: history.id,
        taskId: history.taskId,
        fromStatus: toTaskStatus(history.fromStatus),
        toStatus: toTaskStatus(history.toStatus),
        changedBy: history.changedBy,
        changedAt: new Date(history.changedAt),
      },
    });
  }

  for (const event of snapshot.xpEvents) {
    await prisma.xpEvent.create({
      data: {
        id: event.id,
        taskId: event.taskId,
        agentId: event.agentId,
        amount: event.amount,
        reason: event.reason,
        createdAt: new Date(event.createdAt),
      },
    });
  }

  for (const channel of snapshot.channels) {
    await prisma.chatChannel.create({
      data: {
        id: channel.id,
        name: channel.name,
        slug: channel.id,
        type: toChannelType(channel.type),
        description: channel.description,
      },
    });
  }

  for (const message of snapshot.messages) {
    await prisma.chatMessage.create({
      data: {
        id: message.id,
        channelId: message.channelId,
        userId: message.authorType === "user" ? user.id : null,
        authorName: message.authorName,
        authorType: message.authorType,
        content: message.content,
        mentions: message.mentions,
        createdAt: new Date(message.createdAt),
      },
    });
  }

  for (const thread of snapshot.threads) {
    await prisma.chatChannel.upsert({
      where: { slug: thread.id },
      update: {},
      create: {
        id: thread.id,
        name: `#${thread.topic.slice(0, 32)}`,
        slug: thread.id,
        type: ChannelType.PRIVATE,
        description: `Hilo privado: ${thread.topic}`,
      },
    });

    await prisma.directThread.create({
      data: {
        id: thread.id,
        sourceChannelId: thread.sourceChannelId,
        agentAId: thread.agentAId,
        agentBId: thread.agentBId,
        topic: thread.topic,
        summaryId: thread.summaryId,
        createdAt: new Date(thread.createdAt),
      },
    });
  }

  for (const summary of snapshot.summaries) {
    await prisma.meetingSummary.create({
      data: {
        id: summary.id,
        title: summary.title,
        sourceChannelId: summary.sourceChannelId,
        threadId: summary.threadId,
        participants: summary.participants,
        highlights: summary.highlights,
        markdown: summary.markdown,
        createdAt: new Date(summary.createdAt),
      },
    });
  }

  for (const state of snapshot.presence) {
    await prisma.presenceState.create({
      data: {
        id: state.id,
        userId: state.entityType === "user" ? state.entityId : null,
        agentId: state.entityType === "agent" ? state.entityId : null,
        channelId: state.channelId ?? null,
        mode: toPresenceMode(state.mode),
        typing: state.typing,
      },
    });
  }

  if (snapshot.voice.enabledChannels.length > 0) {
    for (const channelId of snapshot.voice.enabledChannels) {
      const activeAgent =
        (snapshot.voice.activeAgentId &&
          snapshot.agents.find((entry) => entry.id === snapshot.voice.activeAgentId)) ||
        snapshot.agents[0];

      await prisma.voiceSession.create({
        data: {
          id: `voice-${channelId}`,
          channelId,
          userId: user.id,
          enabled: true,
          provider: "demo",
          model: "gpt-realtime",
          voice: activeAgent.voice,
        },
      });
    }
  }
}

async function main() {
  await resetDatabase();

  if (seedMode === "demo") {
    await seedDemoMode();
    console.log("MissionControl seed completada en modo demo.");
    return;
  }

  await seedBaseMode();
  console.log("MissionControl seed completada en modo base.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
