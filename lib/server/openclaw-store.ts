import {
  approveMissionControlTask,
  claimMissionControlTask,
  createAgentInDb,
  createSummaryAndPersist,
  createVoiceSessionInDb,
  deleteAgentInDb,
  getMissionControlDashboardFromDb,
  getMissionControlSnapshotFromDb,
  transitionMissionControlTask,
  updateAgentInDb,
  updatePresenceInDb,
  UpsertAgentInput,
} from "@/lib/server/missioncontrol-db";
import { AuthorType, PresenceMode, TaskStatus } from "@/lib/types";

export interface OpenClawActor {
  id: string;
  name: string;
  type: AuthorType;
}

export async function getOpenClawSnapshot() {
  return getMissionControlSnapshotFromDb();
}

export async function getOpenClawDashboard() {
  const dashboard = await getMissionControlDashboardFromDb();
  return {
    stats: dashboard.stats,
    blockedRadar: dashboard.blockedRadar,
    tacticalAssignments: dashboard.tacticalAssignments,
    standupMarkdown: dashboard.standupMarkdown,
  };
}

export async function listOpenClawAgents() {
  return (await getOpenClawSnapshot()).agents;
}

export async function getOpenClawAgent(agentId: string) {
  const agent = (await getOpenClawSnapshot()).agents.find((entry) => entry.id === agentId);
  if (!agent) {
    throw new Error(`No existe el agente ${agentId}.`);
  }

  return agent;
}

export async function createOpenClawAgent(input: UpsertAgentInput) {
  const { agentId, snapshot } = await createAgentInDb(input);
  return {
    ok: true,
    agent: snapshot.agents.find((entry) => entry.id === agentId),
    snapshot,
  };
}

export async function updateOpenClawAgent(agentId: string, input: Partial<UpsertAgentInput>) {
  const { snapshot } = await updateAgentInDb(agentId, input);
  return {
    ok: true,
    agent: snapshot.agents.find((entry) => entry.id === agentId),
    snapshot,
  };
}

export async function deleteOpenClawAgent(agentId: string) {
  const { snapshot } = await deleteAgentInDb(agentId);
  return {
    ok: true,
    deletedAgentId: agentId,
    snapshot,
  };
}

export async function getOpenClawAgentContext(agentId: string) {
  const snapshot = await getOpenClawSnapshot();
  const agent = snapshot.agents.find((entry) => entry.id === agentId);

  if (!agent) {
    throw new Error(`No existe el agente ${agentId}.`);
  }

  return {
    agent,
    assignedTasks: snapshot.tasks
      .filter((task) => task.assignedAgentIds.includes(agentId))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    presence: snapshot.presence.find((entry) => entry.entityId === agentId),
    summaries: snapshot.summaries.filter((summary) => summary.participants.includes(agent.name)),
    policy: {
      canApprove: false,
      canPublishSummary: true,
      canUseVoice: true,
    },
  };
}

export async function listOpenClawTasks() {
  return (await getOpenClawSnapshot()).tasks;
}

export async function getOpenClawTask(taskId: string) {
  const task = (await getOpenClawSnapshot()).tasks.find((entry) => entry.id === taskId);
  if (!task) {
    throw new Error(`No existe la tarea ${taskId}.`);
  }

  return task;
}

export async function transitionOpenClawTask(taskId: string, nextStatus: TaskStatus, actor: OpenClawActor) {
  const snapshot = await transitionMissionControlTask(taskId, nextStatus, actor.name);
  return {
    ok: true,
    task: snapshot.tasks.find((entry) => entry.id === taskId),
    history: snapshot.taskHistory.at(-1),
    snapshot,
  };
}

export async function approveOpenClawTask(taskId: string, actor: OpenClawActor) {
  const snapshot = await approveMissionControlTask(taskId, actor.name);
  return {
    ok: true,
    task: snapshot.tasks.find((entry) => entry.id === taskId),
    xpEvents: snapshot.xpEvents.filter((entry) => entry.taskId === taskId),
    agents: snapshot.agents.filter((agent) =>
      snapshot.tasks.find((entry) => entry.id === taskId)?.assignedAgentIds.includes(agent.id),
    ),
    snapshot,
  };
}

export async function claimOpenClawTask(taskId: string, agentId: string, actor: OpenClawActor) {
  const snapshot = await claimMissionControlTask(taskId, agentId, actor.name);
  return {
    ok: true,
    task: snapshot.tasks.find((entry) => entry.id === taskId),
    snapshot,
  };
}

export async function listOpenClawSummaries() {
  return (await getOpenClawSnapshot()).summaries;
}

export async function getOpenClawSummary(summaryId: string) {
  const summary = (await getOpenClawSnapshot()).summaries.find((entry) => entry.id === summaryId);
  if (!summary) {
    throw new Error(`No existe el resumen ${summaryId}.`);
  }

  return summary;
}

export async function createOpenClawSummary(input: {
  title: string;
  sourceChannelId: string;
  participants: string[];
  highlights: string[];
  markdown: string;
  threadId?: string;
}) {
  const { summary, snapshot } = await createSummaryAndPersist(input);
  return {
    ok: true,
    summary,
    snapshot,
  };
}

export async function getOpenClawStandup() {
  const dashboard = await getMissionControlDashboardFromDb();
  return {
    ok: true,
    markdown: dashboard.standupMarkdown,
  };
}

export async function listOpenClawPresence() {
  return (await getOpenClawSnapshot()).presence;
}

export async function updateOpenClawPresence(input: {
  entityId: string;
  mode: PresenceMode;
  typing: boolean;
  channelId?: string;
}) {
  const snapshot = await updatePresenceInDb(input);
  return {
    ok: true,
    presence: snapshot.presence.find((entry) => entry.entityId === input.entityId),
    snapshot,
  };
}

export async function createOpenClawVoiceSession(
  agentId?: string,
  enabled = true,
  channelId?: string,
) {
  const { session, snapshot } = await createVoiceSessionInDb({ agentId, enabled, channelId });
  return {
    ok: true,
    ...session,
    snapshot,
  };
}

export async function getOpenClawActor(agentId?: string) {
  const snapshot = await getOpenClawSnapshot();

  if (!agentId) {
    return {
      id: snapshot.currentUser.id,
      name: snapshot.currentUser.name,
      type: "user" as const,
    };
  }

  const agent = snapshot.agents.find((entry) => entry.id === agentId);
  if (!agent) {
    throw new Error(`No existe el agente ${agentId}.`);
  }

  return {
    id: agent.id,
    name: agent.name,
    type: "agent" as const,
  };
}

export async function getOpenClawHealth() {
  const snapshot = await getOpenClawSnapshot();
  return {
    ok: true,
    mode: "postgres-prisma",
    agents: snapshot.agents.length,
    tasks: snapshot.tasks.length,
    channels: snapshot.channels.length,
    summaries: snapshot.summaries.length,
    timestamp: new Date().toISOString(),
  };
}

export async function getOpenClawSnapshotView() {
  return {
    ok: true,
    snapshot: await getOpenClawSnapshot(),
  };
}

export async function listOpenClawDashboardTasks() {
  const snapshot = await getOpenClawSnapshot();
  return {
    backlog: snapshot.tasks.filter((task) => task.status === "backlog"),
    inProgress: snapshot.tasks.filter((task) => task.status === "in_progress"),
    review: snapshot.tasks.filter((task) => task.status === "review"),
    done: snapshot.tasks.filter((task) => task.status === "done"),
  };
}

export async function listOpenClawTaskAssignments(taskId: string) {
  const snapshot = await getOpenClawSnapshot();
  const task = snapshot.tasks.find((entry) => entry.id === taskId);
  if (!task) {
    throw new Error(`No existe la tarea ${taskId}.`);
  }

  return task.assignedAgentIds
    .map((agentId) => snapshot.agents.find((agent) => agent.id === agentId))
    .filter(Boolean);
}

export async function getOpenClawTaskContext(taskId: string) {
  const snapshot = await getOpenClawSnapshot();
  const task = snapshot.tasks.find((entry) => entry.id === taskId);

  if (!task) {
    throw new Error(`No existe la tarea ${taskId}.`);
  }

  return {
    task,
    assignedAgents: snapshot.agents.filter((agent) => task.assignedAgentIds.includes(agent.id)),
    history: snapshot.taskHistory.filter((entry) => entry.taskId === taskId),
    xpEvents: snapshot.xpEvents.filter((entry) => entry.taskId === taskId),
  };
}
