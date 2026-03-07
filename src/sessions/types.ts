export interface Session {
  id: string;
  branch: string;
  startedAt: string;
  status: 'active' | 'completed';
  agents: AgentRecord[];
}

export interface AgentRecord {
  name: string;
  type: 'fleet' | 'specialist' | 'ephemeral';
  status: 'active' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
}

export interface InboxMessage {
  timestamp: string;
  from: 'orchestrator' | 'user';
  content: string;
  delivered: boolean;
}
