export type AgentClassId =
  | "mage"
  | "hunter"
  | "warrior"
  | "paladin"
  | "rogue"
  | "bard"
  | "engineer"
  | "summoner";

export type TaskStatus = "backlog" | "in_progress" | "review" | "done" | "closed";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export type ChannelType = "public" | "private" | "dm" | "summary";

export type PresenceMode = "online" | "focus" | "away" | "in_voice";

export type AuthorType = "user" | "agent" | "system";

export interface StatBlock {
  arcana: number;
  tactics: number;
  strength: number;
  agility: number;
  support: number;
}

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  role: "supervisor" | "operator";
}

export interface AgentProfile {
  id: string;
  name: string;
  handle: string;
  classId: AgentClassId;
  classLabel: string;
  title: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  specialty: string;
  avatarSeed: string;
  voice: string;
  stats: StatBlock;
  quote: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  xpReward: number;
  requiresApproval: boolean;
  assignedAgentIds: string[];
  tags: string[];
  dueAt: string;
  updatedAt: string;
  createdAt: string;
  reviewRequestedAt?: string;
  completedAt?: string;
  approvedAt?: string;
  blockedReason?: string;
}

export interface TaskStatusHistory {
  id: string;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedAt: string;
  changedBy: string;
}

export interface XpEvent {
  id: string;
  taskId: string;
  agentId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
  members: string[];
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorType: AuthorType;
  content: string;
  createdAt: string;
  mentions: string[];
}

export interface DirectThread {
  id: string;
  sourceChannelId: string;
  agentAId: string;
  agentBId: string;
  topic: string;
  summaryId: string;
  createdAt: string;
}

export interface MeetingSummary {
  id: string;
  title: string;
  sourceChannelId: string;
  threadId?: string;
  createdAt: string;
  participants: string[];
  highlights: string[];
  markdown: string;
}

export interface VoiceSettings {
  enabledChannels: string[];
  enabledForUser: boolean;
  activeAgentId?: string;
  lastIssuedToken?: string;
}

export interface PresenceState {
  id: string;
  entityId: string;
  entityName: string;
  entityType: "user" | "agent";
  channelId?: string;
  mode: PresenceMode;
  typing: boolean;
}

export interface MissionControlSnapshot {
  currentUser: UserProfile;
  agents: AgentProfile[];
  tasks: Task[];
  taskHistory: TaskStatusHistory[];
  xpEvents: XpEvent[];
  channels: ChatChannel[];
  messages: ChatMessage[];
  threads: DirectThread[];
  summaries: MeetingSummary[];
  voice: VoiceSettings;
  presence: PresenceState[];
}

export interface MentionResponse {
  reply: string;
  agentId: string;
  agentName: string;
}

export interface CoordinationResponse {
  thread: DirectThread;
  transcript: ChatMessage[];
  summary: MeetingSummary;
}

export interface VoiceSessionResponse {
  enabled: boolean;
  token?: string;
  model: string;
  voice: string;
  provider: "openai" | "demo";
}
