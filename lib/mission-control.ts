import { z } from "zod";
import { getClassRationale, getTaskFitScore } from "@/lib/agent-classes";
import { createDemoSnapshot } from "@/lib/demo-data";
import { buildMeetingMarkdown } from "@/lib/markdown";
import { env, hasOpenAI } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";
import {
  AgentProfile,
  ChatMessage,
  CoordinationResponse,
  MeetingSummary,
  MentionResponse,
  MissionControlSnapshot,
  Task,
  VoiceSessionResponse,
} from "@/lib/types";
import { slugify } from "@/lib/utils";

export function getInitialSnapshot() {
  return createDemoSnapshot();
}

export function getDashboardStats(snapshot: MissionControlSnapshot) {
  return {
    totalTasks: snapshot.tasks.length,
    completedTasks: snapshot.tasks.filter((task) => task.status === "done").length,
    inReview: snapshot.tasks.filter((task) => task.status === "review").length,
    activeAgents: snapshot.presence.filter((entry) => entry.mode !== "away").length,
  };
}

export function getBlockedRadar(tasks: Task[], agents: AgentProfile[]) {
  return tasks
    .filter((task) => task.blockedReason || isOverdue(task.dueAt))
    .map((task) => ({
      task,
      severity: task.priority === "critical" ? "ALTA" : "MEDIA",
      owner: task.assignedAgentIds
        .map((agentId) => agents.find((agent) => agent.id === agentId)?.name)
        .filter(Boolean)
        .join(", "),
    }));
}

export function getTacticalAssignments(tasks: Task[], agents: AgentProfile[]) {
  return tasks.filter((task) => task.status === "backlog").map((task) => {
    const agent = agents
      .slice()
      .sort((left, right) => scoreAgentForTask(right, task) - scoreAgentForTask(left, task))[0];

    return {
      task,
      agent,
      rationale: getClassRationale(agent.classId),
    };
  });
}

export function generateAutomaticStandup(snapshot: MissionControlSnapshot) {
  const blocked = getBlockedRadar(snapshot.tasks, snapshot.agents);
  const reviewQueue = snapshot.tasks.filter((task) => task.status === "review");

  return [
    "# Stand-up automatico",
    "",
    "## Completado",
    ...snapshot.tasks
      .filter((task) => task.status === "done")
      .map((task) => `- ${task.title}`),
    "",
    "## Pendiente critico",
    ...snapshot.tasks
      .filter((task) => task.priority === "critical" && task.status !== "done")
      .map((task) => `- ${task.title}`),
    "",
    "## Riesgos",
    ...(blocked.length
      ? blocked.map((entry) => `- ${entry.task.title}: ${entry.task.blockedReason ?? "vencido"}`)
      : ["- Sin bloqueos detectados"]),
    "",
    "## Cola de aprobacion",
    ...(reviewQueue.length
      ? reviewQueue.map((task) => `- ${task.title}`)
      : ["- No hay revisiones pendientes"]),
  ].join("\n");
}

export function createFallbackMentionReply(
  snapshot: MissionControlSnapshot,
  content: string,
  agentHandle: string,
): MentionResponse {
  const agent = snapshot.agents.find(
    (entry) => entry.id === agentHandle || entry.name.toLowerCase() === agentHandle.toLowerCase(),
  );

  if (!agent) {
    return {
      agentId: "system",
      agentName: "MissionControl",
      reply: "No encontre a ese agente en el roster actual.",
    };
  }

  const relevantTasks = snapshot.tasks
    .filter((task) => task.assignedAgentIds.includes(agent.id) && task.status !== "done")
    .slice(0, 2)
    .map((task) => `${task.title} (${task.status})`);

  return {
    agentId: agent.id,
    agentName: agent.name,
    reply: `${agent.quote} Estado rapido: ${relevantTasks.join(", ") || "sin tareas activas"}. Sobre tu mensaje "${content}", mi siguiente foco es destrabar el frente mas cercano al cierre.`,
  };
}

const coordinationSchema = z.object({
  dialogue: z.array(
    z.object({
      speaker: z.string(),
      text: z.string(),
    }),
  ),
  highlights: z.array(z.string()).min(2).max(5),
  title: z.string(),
});

export async function createAgentReply(
  snapshot: MissionControlSnapshot,
  content: string,
  agentHandle: string,
) {
  if (!hasOpenAI) {
    return createFallbackMentionReply(snapshot, content, agentHandle);
  }

  const agent = snapshot.agents.find(
    (entry) => entry.id === agentHandle || entry.name.toLowerCase() === agentHandle.toLowerCase(),
  );

  if (!agent) {
    return createFallbackMentionReply(snapshot, content, agentHandle);
  }

  const openai = getOpenAI();
  if (!openai) {
    return createFallbackMentionReply(snapshot, content, agentHandle);
  }

  const tasks = snapshot.tasks
    .filter((task) => task.assignedAgentIds.includes(agent.id) && task.status !== "done")
    .map((task) => ({
      title: task.title,
      status: task.status,
      priority: task.priority,
      blockedReason: task.blockedReason ?? null,
    }));

  const response = await openai.responses.create({
    model: env.openaiTextModel,
    reasoning: { effort: "medium" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text: `Eres ${agent.name}, un agente de MissionControl. Responde en espanol, breve, con tono tactico estilo videojuego SNES.`,
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({ prompt: content, tasks }),
          },
        ],
      },
    ],
  });

  return {
    agentId: agent.id,
    agentName: agent.name,
    reply: response.output_text || createFallbackMentionReply(snapshot, content, agentHandle).reply,
  };
}

export async function coordinateAgents(
  snapshot: MissionControlSnapshot,
  sourceChannelId: string,
  initiatorId: string,
  targetId: string,
  topic: string,
): Promise<CoordinationResponse> {
  const initiator = snapshot.agents.find((agent) => agent.id === initiatorId);
  const target = snapshot.agents.find((agent) => agent.id === targetId);

  if (!initiator || !target) {
    throw new Error("Coordinacion invalida: faltan agentes.");
  }

  let dialogue = [
    {
      speaker: initiator.name,
      text: `Necesito cerrar ${topic}. Mi prioridad es bajar riesgo y destrabar dependencias.`,
    },
    {
      speaker: target.name,
      text: "Puedo tomar seguimiento de pendientes, confirmar responsables y dejar acuerdos listos.",
    },
    {
      speaker: initiator.name,
      text: "Perfecto. Yo preparo la ejecucion y tu validas bloqueos y tiempos.",
    },
  ];
  let highlights = [
    "Abrir hilo privado temporal entre ambos agentes",
    "Separar ejecucion y seguimiento para bajar ruido",
    "Publicar resumen final en canal de meeting summaries",
  ];
  let title = `Coordinacion ${initiator.name} x ${target.name}`;

  if (hasOpenAI) {
    const openai = getOpenAI();
    if (openai) {
      const response = await openai.responses.create({
        model: env.openaiTextModel,
        reasoning: { effort: "medium" },
        text: {
          format: {
            type: "json_schema",
            name: "coordination",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                highlights: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 5,
                },
                dialogue: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      speaker: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["speaker", "text"],
                  },
                },
              },
              required: ["title", "highlights", "dialogue"],
            },
          },
        },
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: "Genera una micro reunion en espanol entre dos agentes de operaciones. Debe ser concreta y util.",
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: JSON.stringify({
                  initiator: initiator.name,
                  target: target.name,
                  topic,
                }),
              },
            ],
          },
        ],
      });

      const parsed = coordinationSchema.safeParse(JSON.parse(response.output_text || "{}"));
      if (parsed.success) {
        dialogue = parsed.data.dialogue;
        highlights = parsed.data.highlights;
        title = parsed.data.title;
      }
    }
  }

  const createdAt = new Date().toISOString();
  const threadId = `thread-${slugify(`${initiator.name}-${target.name}-${topic}`)}`;
  const summaryId = `summary-${slugify(topic)}`;

  const transcript: ChatMessage[] = dialogue.map((entry, index) => ({
    id: `${threadId}-msg-${index + 1}`,
    channelId: threadId,
    authorId: slugify(entry.speaker),
    authorName: entry.speaker,
    authorType: "agent",
    content: entry.text,
    createdAt: new Date(Date.now() + index * 60_000).toISOString(),
    mentions: [],
  }));

  const baseSummary: MeetingSummary = {
    id: summaryId,
    title,
    sourceChannelId,
    threadId,
    createdAt,
    participants: [initiator.name, target.name],
    highlights,
    markdown: [
      "## Tema",
      topic,
      "",
      "## Acuerdos",
      ...highlights.map((item) => `- ${item}`),
    ].join("\n"),
  };

  const summary = {
    ...baseSummary,
    markdown: buildMeetingMarkdown(baseSummary),
  };

  return {
    thread: {
      id: threadId,
      sourceChannelId,
      agentAId: initiator.id,
      agentBId: target.id,
      topic,
      summaryId,
      createdAt,
    },
    transcript,
    summary,
  };
}

export async function createVoiceSession(agentVoice: string): Promise<VoiceSessionResponse> {
  if (!hasOpenAI) {
    return {
      enabled: true,
      token: "demo-session-token",
      model: env.openaiRealtimeModel,
      voice: agentVoice,
      provider: "demo",
    };
  }

  const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: {
        type: "realtime",
        model: env.openaiRealtimeModel,
        audio: {
          output: {
            voice: agentVoice,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error("No se pudo crear la sesion de voz.");
  }

  const data = await response.json();

  return {
    enabled: true,
    token: data.value,
    model: env.openaiRealtimeModel,
    voice: agentVoice,
    provider: "openai",
  };
}

function scoreAgentForTask(agent: AgentProfile, task: Task) {
  return getTaskFitScore(agent, task);
}

function isOverdue(dueAt: string) {
  return new Date(dueAt).getTime() < Date.now();
}
