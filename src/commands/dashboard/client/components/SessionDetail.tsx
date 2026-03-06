import { useState } from 'react';
import type { SessionDetailResponse, AgentDetailResponse } from '../../contracts.js';

export type SessionDetailProps = {
  session: SessionDetailResponse;
  onBack: () => void;
  onSendMessage: (agentName: string, content: string) => void;
};

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

const TYPE_LABELS: Record<AgentDetailResponse['type'], string> = {
  fleet: 'Fleet',
  specialist: 'Specialist',
  ephemeral: 'Ephemeral',
};

function AgentCard({
  agent,
  onSendMessage,
}: {
  agent: AgentDetailResponse;
  onSendMessage: (agentName: string, content: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;
    onSendMessage(agent.name, trimmed);
    setMessage('');
  };

  return (
    <article className="agent-card card">
      <button
        className="agent-card-header"
        onClick={() => setExpanded((prev) => !prev)}
        type="button"
      >
        <span className="agent-name">{agent.name}</span>
        <span className="agent-badges">
          <span className={`agent-type-badge ${agent.type}`}>{TYPE_LABELS[agent.type]}</span>
          <span className={`status-badge ${agent.status}`}>{agent.status}</span>
        </span>
      </button>

      {expanded && (
        <div className="agent-detail-body">
          <div className="agent-meta">
            <span>Started: {formatTime(agent.startedAt)}</span>
            {agent.completedAt && <span>Completed: {formatTime(agent.completedAt)}</span>}
          </div>

          {agent.log && (
            <div className="agent-log-section">
              <h4 className="agent-section-title">Log</h4>
              <pre className="agent-log">{agent.log}</pre>
            </div>
          )}

          <div className="inbox-section">
            <h4 className="agent-section-title">Inbox</h4>
            {agent.inbox.length === 0 ? (
              <p className="empty-state">No messages yet.</p>
            ) : (
              <div className="inbox-messages">
                {agent.inbox.map((msg, index) => (
                  <div key={`${msg.timestamp}-${index}`} className="inbox-message">
                    <span className={`inbox-from-badge ${msg.from}`}>{msg.from}</span>
                    <span className="inbox-content">{msg.content}</span>
                    <span className="inbox-time">{formatTime(msg.timestamp)}</span>
                  </div>
                ))}
              </div>
            )}

            {agent.status === 'active' && (
              <div className="message-form">
                <input
                  className="message-input"
                  type="text"
                  placeholder="Send a message…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                />
                <button className="send-button" type="button" onClick={handleSend}>
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export function SessionDetail({ session, onBack, onSendMessage }: SessionDetailProps) {
  return (
    <div className="session-detail">
      <div className="session-detail-header">
        <button className="back-button" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="session-detail-info">
          <h2 className="session-detail-branch">{session.branch}</h2>
          <div className="session-detail-meta">
            <span className={`status-badge ${session.status}`}>{session.status}</span>
            <span className="session-time">Started: {formatTime(session.startedAt)}</span>
          </div>
        </div>
      </div>

      <div className="agent-list">
        {session.agents.length === 0 ? (
          <div className="empty-state">No agents in this session.</div>
        ) : (
          session.agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} onSendMessage={onSendMessage} />
          ))
        )}
      </div>
    </div>
  );
}
