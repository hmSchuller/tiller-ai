import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createToolDefinitions, createToolHandlers } from '../../src/mcp/tools.js';
import { createSession, registerAgent } from '../../src/sessions/fs.js';
import type { McpToolHandler } from '../../src/mcp/types.js';

describe('mcp/tools', () => {
  let tmpDir: string;
  let handlers: Record<string, McpToolHandler>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'tiller-mcp-tools-'));
    handlers = createToolHandlers(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('createToolDefinitions', () => {
    it('returns all 9 tool definitions', () => {
      const tools = createToolDefinitions();
      expect(tools).toHaveLength(9);
      const names = tools.map((t) => t.name);
      expect(names).toEqual([
        'register-agent',
        'complete-agent',
        'send-inbox-message',
        'check-inbox',
        'delete-inbox-message',
        'read-session',
        'list-sessions',
        'read-compass',
        'update-compass',
      ]);
    });

    it('each tool has a valid inputSchema', () => {
      const tools = createToolDefinitions();
      for (const tool of tools) {
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.description).toBeTruthy();
      }
    });
  });

  describe('register-agent', () => {
    it('registers an agent in an existing session', async () => {
      createSession(tmpDir, 'feature/reg-test');
      const result = await handlers['register-agent']({
        sessionSlug: 'feature-reg-test',
        name: 'quartermaster',
        type: 'specialist',
        startedAt: '2026-01-01T00:00:00Z',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ok).toBe(true);
      expect(data.agent).toBe('quartermaster');
    });

    it('returns error for missing session', async () => {
      const result = await handlers['register-agent']({
        sessionSlug: 'nonexistent',
        name: 'test',
        type: 'ephemeral',
        startedAt: '2026-01-01T00:00:00Z',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('returns error for invalid agent type', async () => {
      createSession(tmpDir, 'feature/type-test');
      const result = await handlers['register-agent']({
        sessionSlug: 'feature-type-test',
        name: 'test',
        type: 'invalid',
        startedAt: '2026-01-01T00:00:00Z',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid agent type');
    });

    it('returns error for missing params', async () => {
      const result = await handlers['register-agent']({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter');
    });
  });

  describe('complete-agent', () => {
    it('marks an agent as completed', async () => {
      createSession(tmpDir, 'feature/complete-test');
      registerAgent(tmpDir, 'feature-complete-test', {
        name: 'bosun',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      const result = await handlers['complete-agent']({
        sessionSlug: 'feature-complete-test',
        agentName: 'bosun',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ok).toBe(true);

      const readResult = await handlers['read-session']({ sessionSlug: 'feature-complete-test' });
      const session = JSON.parse(readResult.content[0].text);
      expect(session.agents[0].status).toBe('completed');
      expect(session.agents[0].completedAt).toBeTruthy();
    });

    it('returns error for missing session', async () => {
      const result = await handlers['complete-agent']({
        sessionSlug: 'nonexistent',
        agentName: 'test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('returns error for missing agent', async () => {
      createSession(tmpDir, 'feature/no-agent');
      const result = await handlers['complete-agent']({
        sessionSlug: 'feature-no-agent',
        agentName: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Agent not found');
    });
  });

  describe('send-inbox-message', () => {
    it('sends a message to an agent inbox', async () => {
      createSession(tmpDir, 'feature/inbox-send');
      registerAgent(tmpDir, 'feature-inbox-send', {
        name: 'worker',
        type: 'ephemeral',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      const result = await handlers['send-inbox-message']({
        sessionSlug: 'feature-inbox-send',
        agentName: 'worker',
        content: 'Hello agent',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ok).toBe(true);

      // Verify message exists via check-inbox
      const inbox = await handlers['check-inbox']({
        sessionSlug: 'feature-inbox-send',
        agentName: 'worker',
      });
      const inboxData = JSON.parse(inbox.content[0].text);
      expect(inboxData.messages).toHaveLength(1);
      expect(inboxData.messages[0].content).toBe('Hello agent');
      expect(inboxData.messages[0].from).toBe('orchestrator');
    });

    it('uses custom from value', async () => {
      createSession(tmpDir, 'feature/inbox-from');
      registerAgent(tmpDir, 'feature-inbox-from', {
        name: 'worker',
        type: 'ephemeral',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      await handlers['send-inbox-message']({
        sessionSlug: 'feature-inbox-from',
        agentName: 'worker',
        content: 'User message',
        from: 'user',
      });

      const inbox = await handlers['check-inbox']({
        sessionSlug: 'feature-inbox-from',
        agentName: 'worker',
      });
      const data = JSON.parse(inbox.content[0].text);
      expect(data.messages[0].from).toBe('user');
    });

    it('returns error for invalid from value', async () => {
      createSession(tmpDir, 'feature/inbox-bad-from');
      registerAgent(tmpDir, 'feature-inbox-bad-from', {
        name: 'worker',
        type: 'ephemeral',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      const result = await handlers['send-inbox-message']({
        sessionSlug: 'feature-inbox-bad-from',
        agentName: 'worker',
        content: 'test',
        from: 'invalid',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid from value');
    });
  });

  describe('check-inbox', () => {
    it('returns all messages', async () => {
      createSession(tmpDir, 'feature/check-all');
      registerAgent(tmpDir, 'feature-check-all', {
        name: 'agent1',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      await handlers['send-inbox-message']({
        sessionSlug: 'feature-check-all',
        agentName: 'agent1',
        content: 'Message 1',
      });
      await handlers['send-inbox-message']({
        sessionSlug: 'feature-check-all',
        agentName: 'agent1',
        content: 'Message 2',
      });

      const result = await handlers['check-inbox']({
        sessionSlug: 'feature-check-all',
        agentName: 'agent1',
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.messages).toHaveLength(2);
    });

    it('returns only undelivered messages when flag is set', async () => {
      createSession(tmpDir, 'feature/check-undelivered');
      registerAgent(tmpDir, 'feature-check-undelivered', {
        name: 'agent1',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      await handlers['send-inbox-message']({
        sessionSlug: 'feature-check-undelivered',
        agentName: 'agent1',
        content: 'Msg 1',
      });

      // All messages start undelivered
      const result = await handlers['check-inbox']({
        sessionSlug: 'feature-check-undelivered',
        agentName: 'agent1',
        undeliveredOnly: true,
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].delivered).toBe(false);
    });

    it('returns empty array for no messages', async () => {
      createSession(tmpDir, 'feature/check-empty');
      registerAgent(tmpDir, 'feature-check-empty', {
        name: 'agent1',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      const result = await handlers['check-inbox']({
        sessionSlug: 'feature-check-empty',
        agentName: 'agent1',
      });
      const data = JSON.parse(result.content[0].text);
      expect(data.messages).toHaveLength(0);
    });
  });

  describe('delete-inbox-message', () => {
    it('deletes a message by index', async () => {
      createSession(tmpDir, 'feature/delete-msg');
      registerAgent(tmpDir, 'feature-delete-msg', {
        name: 'agent1',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      await handlers['send-inbox-message']({
        sessionSlug: 'feature-delete-msg',
        agentName: 'agent1',
        content: 'To be deleted',
      });
      await handlers['send-inbox-message']({
        sessionSlug: 'feature-delete-msg',
        agentName: 'agent1',
        content: 'Keeper',
      });

      const result = await handlers['delete-inbox-message']({
        sessionSlug: 'feature-delete-msg',
        agentName: 'agent1',
        messageIndex: 0,
      });

      expect(result.isError).toBeUndefined();

      const inbox = await handlers['check-inbox']({
        sessionSlug: 'feature-delete-msg',
        agentName: 'agent1',
      });
      const data = JSON.parse(inbox.content[0].text);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].content).toBe('Keeper');
    });

    it('returns error for invalid index', async () => {
      createSession(tmpDir, 'feature/delete-bad');
      registerAgent(tmpDir, 'feature-delete-bad', {
        name: 'agent1',
        type: 'fleet',
        status: 'active',
        startedAt: '2026-01-01T00:00:00Z',
      });

      const result = await handlers['delete-inbox-message']({
        sessionSlug: 'feature-delete-bad',
        agentName: 'agent1',
        messageIndex: 99,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid message index');
    });

    it('returns error for missing messageIndex param', async () => {
      const result = await handlers['delete-inbox-message']({
        sessionSlug: 'test',
        agentName: 'agent1',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter');
    });
  });

  describe('read-session', () => {
    it('returns session data', async () => {
      createSession(tmpDir, 'feature/read-sess');

      const result = await handlers['read-session']({
        sessionSlug: 'feature-read-sess',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('feature-read-sess');
      expect(data.branch).toBe('feature/read-sess');
      expect(data.status).toBe('active');
    });

    it('returns error for missing session', async () => {
      const result = await handlers['read-session']({
        sessionSlug: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('returns error for missing params', async () => {
      const result = await handlers['read-session']({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter');
    });
  });

  describe('list-sessions', () => {
    it('returns all sessions', async () => {
      createSession(tmpDir, 'feature/list-a');
      createSession(tmpDir, 'feature/list-b');

      const result = await handlers['list-sessions']({});

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.sessions).toHaveLength(2);
      const ids = data.sessions.map((s: { id: string }) => s.id).sort();
      expect(ids).toEqual(['feature-list-a', 'feature-list-b']);
    });

    it('returns empty array when no sessions exist', async () => {
      const result = await handlers['list-sessions']({});
      const data = JSON.parse(result.content[0].text);
      expect(data.sessions).toEqual([]);
    });
  });

  describe('read-compass', () => {
    it('returns compass.md content', async () => {
      const tillerDir = join(tmpDir, '.tiller');
      mkdirSync(tillerDir, { recursive: true });
      writeFileSync(join(tillerDir, 'compass.md'), '# Current Progress\nWorking on feature X', 'utf-8');

      const result = await handlers['read-compass']({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBe('# Current Progress\nWorking on feature X');
    });

    it('returns error when compass.md does not exist', async () => {
      const result = await handlers['read-compass']({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('compass.md not found');
    });
  });

  describe('update-compass', () => {
    it('writes content to compass.md', async () => {
      const result = await handlers['update-compass']({
        content: '# Updated\nNew content',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.ok).toBe(true);

      const content = readFileSync(join(tmpDir, '.tiller', 'compass.md'), 'utf-8');
      expect(content).toBe('# Updated\nNew content');
    });

    it('creates .tiller directory if needed', async () => {
      await handlers['update-compass']({ content: 'test' });
      expect(existsSync(join(tmpDir, '.tiller', 'compass.md'))).toBe(true);
    });

    it('overwrites existing compass.md', async () => {
      const tillerDir = join(tmpDir, '.tiller');
      mkdirSync(tillerDir, { recursive: true });
      writeFileSync(join(tillerDir, 'compass.md'), 'old', 'utf-8');

      await handlers['update-compass']({ content: 'new' });

      const content = readFileSync(join(tillerDir, 'compass.md'), 'utf-8');
      expect(content).toBe('new');
    });

    it('returns error for missing content param', async () => {
      const result = await handlers['update-compass']({});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Missing required parameter');
    });
  });
});
