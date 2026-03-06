import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  branchToSlug,
  sessionDir,
  createSession,
  readSession,
  writeSession,
  listSessions,
  registerAgent,
  appendLog,
  readLog,
  appendInboxMessage,
  readInbox,
  getUndeliveredMessages,
  markMessagesDelivered,
} from '../../src/sessions/fs.js';
import type { AgentRecord } from '../../src/sessions/types.js';

describe('sessions/fs', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tiller-session-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('branchToSlug', () => {
    it('replaces slashes with dashes', () => {
      expect(branchToSlug('feature/auth-redirect')).toBe('feature-auth-redirect');
    });

    it('handles fix branches', () => {
      expect(branchToSlug('fix/login-bug')).toBe('fix-login-bug');
    });

    it('passes through already-slugged names', () => {
      expect(branchToSlug('main')).toBe('main');
      expect(branchToSlug('already-slugged')).toBe('already-slugged');
    });

    it('strips leading and trailing dashes', () => {
      expect(branchToSlug('/leading/')).toBe('leading');
    });

    it('handles multiple slashes', () => {
      expect(branchToSlug('a/b/c')).toBe('a-b-c');
    });
  });

  describe('sessionDir', () => {
    it('returns the correct path', () => {
      const dir = sessionDir('/project', 'feature-x');
      expect(dir).toBe(join('/project', '.tiller', 'sessions', 'feature-x'));
    });
  });

  describe('createSession', () => {
    it('creates folder and session.json', () => {
      const session = createSession(tmpDir, 'feature/auth-redirect');
      expect(session.id).toBe('feature-auth-redirect');
      expect(session.branch).toBe('feature/auth-redirect');
      expect(session.status).toBe('active');
      expect(session.agents).toEqual([]);

      const filePath = join(tmpDir, '.tiller', 'sessions', 'feature-auth-redirect', 'session.json');
      expect(existsSync(filePath)).toBe(true);

      const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
      expect(raw.id).toBe('feature-auth-redirect');
    });
  });

  describe('readSession', () => {
    it('returns null for missing session', () => {
      expect(readSession(tmpDir, 'nonexistent')).toBeNull();
    });

    it('returns session data for existing session', () => {
      createSession(tmpDir, 'feature/read-test');
      const session = readSession(tmpDir, 'feature-read-test');
      expect(session).not.toBeNull();
      expect(session!.branch).toBe('feature/read-test');
    });
  });

  describe('writeSession', () => {
    it('overwrites session.json', () => {
      const session = createSession(tmpDir, 'feature/write-test');
      session.status = 'completed';
      writeSession(tmpDir, 'feature-write-test', session);

      const updated = readSession(tmpDir, 'feature-write-test');
      expect(updated!.status).toBe('completed');
    });
  });

  describe('listSessions', () => {
    it('returns empty array when no sessions exist', () => {
      expect(listSessions(tmpDir)).toEqual([]);
    });

    it('finds multiple sessions', () => {
      createSession(tmpDir, 'feature/a');
      createSession(tmpDir, 'feature/b');
      createSession(tmpDir, 'fix/c');

      const sessions = listSessions(tmpDir);
      expect(sessions).toHaveLength(3);
      const ids = sessions.map((s) => s.id).sort();
      expect(ids).toEqual(['feature-a', 'feature-b', 'fix-c']);
    });
  });

  describe('registerAgent', () => {
    it('adds agent to session and creates inbox/log files', () => {
      createSession(tmpDir, 'feature/agent-test');
      const agent: AgentRecord = {
        name: 'quartermaster',
        type: 'specialist',
        status: 'active',
        startedAt: new Date().toISOString(),
      };

      registerAgent(tmpDir, 'feature-agent-test', agent);

      const session = readSession(tmpDir, 'feature-agent-test');
      expect(session!.agents).toHaveLength(1);
      expect(session!.agents[0].name).toBe('quartermaster');

      const dir = sessionDir(tmpDir, 'feature-agent-test');
      expect(existsSync(join(dir, 'quartermaster.inbox.md'))).toBe(true);
      expect(existsSync(join(dir, 'quartermaster.log.md'))).toBe(true);
    });

    it('throws for missing session', () => {
      const agent: AgentRecord = {
        name: 'test',
        type: 'ephemeral',
        status: 'active',
        startedAt: new Date().toISOString(),
      };
      expect(() => registerAgent(tmpDir, 'nonexistent', agent)).toThrow('Session not found');
    });
  });

  describe('appendLog + readLog', () => {
    it('round-trips log entries', () => {
      createSession(tmpDir, 'feature/log-test');
      const agent: AgentRecord = {
        name: 'worker-1',
        type: 'fleet',
        status: 'active',
        startedAt: new Date().toISOString(),
      };
      registerAgent(tmpDir, 'feature-log-test', agent);

      appendLog(tmpDir, 'feature-log-test', 'worker-1', 'Started task A');
      appendLog(tmpDir, 'feature-log-test', 'worker-1', 'Completed task A');

      const log = readLog(tmpDir, 'feature-log-test', 'worker-1');
      expect(log).toContain('Started task A');
      expect(log).toContain('Completed task A');
      expect(log.split('\n').filter((l) => l.trim()).length).toBe(2);
    });

    it('returns empty string for missing log', () => {
      expect(readLog(tmpDir, 'nonexistent', 'agent')).toBe('');
    });
  });

  describe('inbox operations', () => {
    beforeEach(() => {
      createSession(tmpDir, 'feature/inbox-test');
      registerAgent(tmpDir, 'feature-inbox-test', {
        name: 'qm',
        type: 'specialist',
        status: 'active',
        startedAt: new Date().toISOString(),
      });
    });

    describe('appendInboxMessage + readInbox', () => {
      it('round-trips messages', () => {
        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:30:00Z',
          from: 'orchestrator',
          content: 'Please add error handling.',
        });

        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:35:00Z',
          from: 'user',
          content: 'Focus on API layer.',
        });

        const messages = readInbox(tmpDir, 'feature-inbox-test', 'qm');
        expect(messages).toHaveLength(2);
        expect(messages[0].from).toBe('orchestrator');
        expect(messages[0].content).toBe('Please add error handling.');
        expect(messages[0].delivered).toBe(false);
        expect(messages[1].from).toBe('user');
        expect(messages[1].content).toBe('Focus on API layer.');
      });
    });

    describe('getUndeliveredMessages', () => {
      it('filters to only undelivered messages', () => {
        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:30:00Z',
          from: 'orchestrator',
          content: 'Message 1',
        });

        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:35:00Z',
          from: 'user',
          content: 'Message 2',
        });

        // Mark delivered, then add a new one
        markMessagesDelivered(tmpDir, 'feature-inbox-test', 'qm');

        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:40:00Z',
          from: 'orchestrator',
          content: 'Message 3',
        });

        const undelivered = getUndeliveredMessages(tmpDir, 'feature-inbox-test', 'qm');
        expect(undelivered).toHaveLength(1);
        expect(undelivered[0].content).toBe('Message 3');
      });

      it('returns empty for missing inbox', () => {
        expect(getUndeliveredMessages(tmpDir, 'feature-inbox-test', 'nonexistent')).toEqual([]);
      });
    });

    describe('markMessagesDelivered', () => {
      it('marks all messages as delivered', () => {
        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-03-06T18:30:00Z',
          from: 'orchestrator',
          content: 'Undelivered message',
        });

        expect(getUndeliveredMessages(tmpDir, 'feature-inbox-test', 'qm')).toHaveLength(1);

        markMessagesDelivered(tmpDir, 'feature-inbox-test', 'qm');

        expect(getUndeliveredMessages(tmpDir, 'feature-inbox-test', 'qm')).toHaveLength(0);

        const all = readInbox(tmpDir, 'feature-inbox-test', 'qm');
        expect(all).toHaveLength(1);
        expect(all[0].delivered).toBe(true);
      });

      it('is a no-op for missing inbox', () => {
        expect(() => markMessagesDelivered(tmpDir, 'feature-inbox-test', 'nonexistent')).not.toThrow();
      });
    });

    describe('content with --- delimiters', () => {
      it('handles message content containing --- without corruption', () => {
        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-01-01T00:00:00Z',
          from: 'user',
          content: 'Here is some code:\n---\ntitle: example\n---\nDone.',
        });
        appendInboxMessage(tmpDir, 'feature-inbox-test', 'qm', {
          timestamp: '2026-01-01T00:01:00Z',
          from: 'orchestrator',
          content: 'Second message after the tricky one.',
        });

        const messages = readInbox(tmpDir, 'feature-inbox-test', 'qm');
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toContain('---');
        expect(messages[0].content).toContain('title: example');
        expect(messages[1].content).toBe('Second message after the tricky one.');
      });
    });
  });
});
