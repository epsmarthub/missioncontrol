import { AgentClassId, AgentProfile, Task, TaskPriority } from "@/lib/types";

type StatKey = keyof AgentProfile["stats"];

interface AgentClassDefinition {
  label: string;
  rationale: string;
  preferredTags: string[];
  primaryStat: StatKey;
  secondaryStat: StatKey;
}

export const AGENT_CLASS_CONFIG: Record<AgentClassId, AgentClassDefinition> = {
  mage: {
    label: "Mago Tactico",
    rationale: "convierte contexto, automatizacion y IA en avance ordenado",
    preferredTags: ["ai", "openai", "voice", "automation", "workflow"],
    primaryStat: "arcana",
    secondaryStat: "support",
  },
  hunter: {
    label: "Cazador de Riesgos",
    rationale: "rastrea bloqueos, dependencias y puntos ciegos antes de que exploten",
    preferredTags: ["ops", "risk", "review", "tracking", "dependencies"],
    primaryStat: "agility",
    secondaryStat: "tactics",
  },
  warrior: {
    label: "Guerrero de Entrega",
    rationale: "puede empujar ejecucion, sostener presion y cerrar el frente",
    preferredTags: ["delivery", "chat", "realtime", "execution", "launch"],
    primaryStat: "strength",
    secondaryStat: "tactics",
  },
  paladin: {
    label: "Paladin de Guardia",
    rationale: "asegura calidad, permisos y aprobaciones sin frenar el ritmo",
    preferredTags: ["safety", "approval", "security", "review", "supervisor"],
    primaryStat: "support",
    secondaryStat: "strength",
  },
  rogue: {
    label: "Picaro de Sigilo",
    rationale: "encuentra friccion invisible, huecos raros y atajos efectivos",
    preferredTags: ["performance", "debug", "ops", "realtime", "latency"],
    primaryStat: "agility",
    secondaryStat: "arcana",
  },
  bard: {
    label: "Bardo de Enlace",
    rationale: "ordena conversaciones, acuerdos y documentacion para que el equipo fluya",
    preferredTags: ["markdown", "meetings", "docs", "summary", "comms"],
    primaryStat: "support",
    secondaryStat: "tactics",
  },
  engineer: {
    label: "Ingeniero de Pixel",
    rationale: "aterriza sistemas, interfaces y tooling en algo estable y mantenible",
    preferredTags: ["ui", "retro", "hq", "build", "systems"],
    primaryStat: "tactics",
    secondaryStat: "agility",
  },
  summoner: {
    label: "Invocador de Flujos",
    rationale: "coordina agentes, herramientas y secuencias para mover varias piezas a la vez",
    preferredTags: ["agents", "workflow", "ai", "chat", "orchestration"],
    primaryStat: "arcana",
    secondaryStat: "tactics",
  },
};

const TAG_STAT_HINTS: Record<string, StatKey> = {
  ai: "arcana",
  openai: "arcana",
  voice: "support",
  safety: "support",
  approval: "support",
  security: "support",
  ops: "tactics",
  risk: "tactics",
  review: "tactics",
  tracking: "tactics",
  workflow: "tactics",
  orchestration: "tactics",
  ui: "agility",
  retro: "agility",
  hq: "agility",
  realtime: "agility",
  performance: "agility",
  latency: "agility",
  delivery: "strength",
  execution: "strength",
  launch: "strength",
  meetings: "support",
  markdown: "support",
  docs: "support",
  summary: "support",
  chat: "support",
  comms: "support",
  build: "tactics",
  systems: "tactics",
  debug: "arcana",
  dependencies: "tactics",
};

const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 6,
};

function normalizeTags(task: Task) {
  return task.tags.map((tag) => tag.trim().toLowerCase());
}

export function getClassRationale(classId: AgentClassId) {
  return AGENT_CLASS_CONFIG[classId].rationale;
}

export function getTaskFitScore(agent: AgentProfile, task: Task) {
  const normalizedTags = normalizeTags(task);
  const classConfig = AGENT_CLASS_CONFIG[agent.classId];

  const classMatch = normalizedTags.reduce((score, tag) => {
    if (classConfig.preferredTags.includes(tag)) {
      return score + 4;
    }

    const partialMatch = classConfig.preferredTags.some(
      (preferredTag) => preferredTag.includes(tag) || tag.includes(preferredTag),
    );

    return partialMatch ? score + 2 : score;
  }, 0);

  const relevantStats = normalizedTags.reduce((score, tag) => {
    const hintedStat = TAG_STAT_HINTS[tag];
    if (!hintedStat) {
      return score;
    }

    return score + agent.stats[hintedStat] / 6;
  }, 0);

  const classStatBonus =
    agent.stats[classConfig.primaryStat] / 5 + agent.stats[classConfig.secondaryStat] / 8;

  const approvalBonus =
    task.requiresApproval && (agent.classId === "paladin" || agent.classId === "bard") ? 3 : 0;

  const blockerBonus =
    task.blockedReason && (agent.classId === "hunter" || agent.classId === "rogue") ? 2 : 0;

  return (
    agent.level +
    PRIORITY_WEIGHT[task.priority] +
    classMatch +
    Math.round(relevantStats) +
    Math.round(classStatBonus) +
    approvalBonus +
    blockerBonus
  );
}
