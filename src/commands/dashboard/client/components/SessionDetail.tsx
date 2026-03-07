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

function formatRelativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

function sortAgents(agents: AgentDetailResponse[]): AgentDetailResponse[] {
  const statusOrder: Record<string, number> = { active: 0, failed: 1, completed: 2 };
  return [...agents].sort((a, b) => {
    const aLead = a.name === 'sail-lead' ? 0 : 1;
    const bLead = b.name === 'sail-lead' ? 0 : 1;
    if (aLead !== bLead) return aLead - bLead;
    const orderDiff = (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

const MESSAGE_MAX_LENGTH = 280;

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
  const [expanded, setExpanded] = useState(agent.status === 'active');
  const [message, setMessage] = useState('');
  const [expandedMessages, setExpandedMessages] = useState<Set<number>>(new Set());
  const [showLog, setShowLog] = useState(false);

  const toggleMessageExpand = (index: number) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;
    onSendMessage(agent.name, trimmed);
    setMessage('');
  };

  return (
    <article className={`agent-card card agent-card-${agent.status}`}>
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

      {!expanded && agent.completedAt && (
        <div className="agent-completed-summary">
          Completed {formatRelativeTime(agent.completedAt)}
        </div>
      )}

      {expanded && (
        <div className="agent-detail-body">
          <div className="agent-meta">
            <span>Started: {formatTime(agent.startedAt)}</span>
            {agent.completedAt && <span>Completed: {formatTime(agent.completedAt)}</span>}
          </div>

          <div className="inbox-section">
            <h4 className="agent-section-title">Inbox</h4>
            {agent.inbox.length === 0 ? (
              <p className="empty-state">No messages yet.</p>
            ) : (
              <div className="inbox-messages">
                {agent.inbox.map((msg, index) => (
                  <div key={`${msg.timestamp}-${index}`} className={`inbox-message ${msg.delivered ? 'delivered' : 'unread'}`}>
                    <span className={`inbox-from-badge ${msg.from}`}>{msg.from}</span>
                    <span className="inbox-content">
                      {msg.content.length > MESSAGE_MAX_LENGTH && !expandedMessages.has(index) ? (
                        <>
                          {msg.content.slice(0, MESSAGE_MAX_LENGTH)}…{' '}
                          <button className="show-more-btn" type="button" onClick={() => toggleMessageExpand(index)}>
                            show more
                          </button>
                        </>
                      ) : msg.content.length > MESSAGE_MAX_LENGTH && expandedMessages.has(index) ? (
                        <>
                          {msg.content}{' '}
                          <button className="show-more-btn" type="button" onClick={() => toggleMessageExpand(index)}>
                            show less
                          </button>
                        </>
                      ) : (
                        msg.content
                      )}
                    </span>
                    <span className="inbox-status">{msg.delivered ? '✓' : '●'}</span>
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

          {agent.log && (
            <div className="agent-log-section">
              <button
                className="log-toggle"
                type="button"
                onClick={() => setShowLog((prev) => !prev)}
              >
                {showLog ? '▾ Hide log' : '▸ Show log'}
              </button>
              {showLog && <pre className="agent-log">{agent.log}</pre>}
            </div>
          )}
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
          sortAgents(session.agents).map((agent) => (
            <AgentCard key={agent.name} agent={agent} onSendMessage={onSendMessage} />
          ))
        )}
      </div>
    </div>
  );
}
