import type { SessionSummary } from '../../contracts.js';

export type SessionListProps = {
  sessions: SessionSummary[];
  onSelectSession: (slug: string) => void;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SessionList({ sessions, onSelectSession }: SessionListProps) {
  if (sessions.length === 0) {
    return <div className="empty-state">No sessions yet. Start a /sail to create one.</div>;
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <button
          key={session.id}
          className="session-card card"
          onClick={() => onSelectSession(session.id)}
          type="button"
        >
          <div className="session-card-header">
            <span className="session-branch">{session.branch}</span>
            <span className={`status-badge ${session.status}`}>{session.status}</span>
          </div>
          <div className="session-card-meta">
            <span className="session-agents">
              {session.agentCount} agent{session.agentCount !== 1 ? 's' : ''}
              {session.activeAgentCount > 0 && ` (${session.activeAgentCount} active)`}
            </span>
            <span className="session-time">{formatTime(session.startedAt)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
