import { AgentProfile } from "@/lib/types";

export function nextLevelXp(level: number) {
  return 120 + level * 80;
}

export function applyXp(agent: AgentProfile, amount: number) {
  let currentXp = agent.currentXp + amount;
  let level = agent.level;
  let leveledUp = false;

  while (currentXp >= nextLevelXp(level)) {
    currentXp -= nextLevelXp(level);
    level += 1;
    leveledUp = true;
  }

  const growth = level - agent.level;

  return {
    leveledUp,
    agent: {
      ...agent,
      level,
      currentXp,
      nextLevelXp: nextLevelXp(level),
      stats: {
        arcana: agent.stats.arcana + growth,
        tactics: agent.stats.tactics + growth,
        strength: agent.stats.strength + Math.ceil(growth / 2),
        agility: agent.stats.agility + Math.ceil(growth / 2),
        support: agent.stats.support + growth,
      },
    },
  };
}
