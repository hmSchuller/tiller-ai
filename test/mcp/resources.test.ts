import { describe, it, expect, afterEach, vi } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createResourceManager, type ResourceManager } from '../../src/mcp/resources.js';

function makeTmpDir(): string {
  const dir = join(tmpdir(), `tiller-res-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createInboxFile(root: string, slug: string, agent: string, content = ''): void {
  const dir = join(root, '.tiller', 'sessions', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${agent}.inbox.md`), content, 'utf-8');
}

function createSessionFile(root: string, slug: string): void {
  const dir = join(root, '.tiller', 'sessions', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'session.json'),
    JSON.stringify({
      id: slug,
      branch: slug,
      startedAt: new Date().toISOString(),
      status: 'active',
      agents: [],
    }),
    'utf-8',
  );
}

const inboxBlock = [
  '<!-- TILLER-MSG -->',
  'timestamp: 2025-01-01T00:00:00Z',
  'from: orchestrator',
  'delivered: false',
  '<!-- /TILLER-MSG-HEAD -->',
  'Hello agent',
  '<!-- /TILLER-MSG -->',
  '',
].join('\n');

describe('ResourceManager', () => {
  let tmpRoot: string;
  let manager: ResourceManager;
  const notifySpy = vi.fn();

  afterEach(() => {
    manager?.close();
    rmSync(tmpRoot, { recursive: true, force: true });
    notifySpy.mockReset();
  });

  describe('listResources', () => {
    it('returns inbox resources for sessions with agents', () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'my-session', 'worker-1');
      createInboxFile(tmpRoot, 'my-session', 'worker-2');
      manager = createResourceManager(tmpRoot, notifySpy);

      const resources = manager.listResources();
      expect(resources).toHaveLength(2);

      const uris = resources.map((r) => r.uri).sort();
      expect(uris).toEqual([
        'inbox://my-session/worker-1',
        'inbox://my-session/worker-2',
      ]);
      expect(resources[0].mimeType).toBe('application/json');
    });

    it('returns empty array when no sessions exist', () => {
      tmpRoot = makeTmpDir();
      manager = createResourceManager(tmpRoot, notifySpy);

      expect(manager.listResources()).toEqual([]);
    });

    it('returns resources from multiple sessions', () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'session-a', 'agent-1');
      createInboxFile(tmpRoot, 'session-b', 'agent-2');
      manager = createResourceManager(tmpRoot, notifySpy);

      const resources = manager.listResources();
      expect(resources).toHaveLength(2);
    });
  });

  describe('readResource', () => {
    it('returns parsed inbox content as JSON', () => {
      tmpRoot = makeTmpDir();
      createSessionFile(tmpRoot, 'sess');
      createInboxFile(tmpRoot, 'sess', 'bot', inboxBlock);
      manager = createResourceManager(tmpRoot, notifySpy);

      const contents = manager.readResource('inbox://sess/bot');
      expect(contents).toHaveLength(1);
      expect(contents[0].uri).toBe('inbox://sess/bot');
      expect(contents[0].mimeType).toBe('application/json');

      const messages = JSON.parse(contents[0].text!);
      expect(messages).toHaveLength(1);
      expect(messages[0].from).toBe('orchestrator');
      expect(messages[0].content).toBe('Hello agent');
      expect(messages[0].delivered).toBe(false);
    });

    it('returns empty array for empty inbox', () => {
      tmpRoot = makeTmpDir();
      createSessionFile(tmpRoot, 'sess');
      createInboxFile(tmpRoot, 'sess', 'bot', '');
      manager = createResourceManager(tmpRoot, notifySpy);

      const contents = manager.readResource('inbox://sess/bot');
      const messages = JSON.parse(contents[0].text!);
      expect(messages).toEqual([]);
    });

    it('throws for non-existent resource', () => {
      tmpRoot = makeTmpDir();
      manager = createResourceManager(tmpRoot, notifySpy);

      expect(() => manager.readResource('inbox://no-session/no-agent')).toThrow(
        'Resource not found',
      );
    });

    it('throws for invalid URI format', () => {
      tmpRoot = makeTmpDir();
      manager = createResourceManager(tmpRoot, notifySpy);

      expect(() => manager.readResource('bad://uri')).toThrow('Invalid resource URI');
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('tracks subscriptions', () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'sess', 'bot');
      manager = createResourceManager(tmpRoot, notifySpy);

      // Should not throw
      manager.subscribe('inbox://sess/bot');
      manager.unsubscribe('inbox://sess/bot');
    });

    it('throws on invalid URI for subscribe', () => {
      tmpRoot = makeTmpDir();
      manager = createResourceManager(tmpRoot, notifySpy);

      expect(() => manager.subscribe('bad://uri')).toThrow('Invalid resource URI');
    });
  });

  describe('file-watch notification', () => {
    it('fires notify callback when subscribed inbox file is modified', async () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'watch-test', 'agent');
      manager = createResourceManager(tmpRoot, notifySpy);

      manager.subscribe('inbox://watch-test/agent');

      // Modify the inbox file after a small delay
      await new Promise((r) => setTimeout(r, 50));
      const inboxPath = join(tmpRoot, '.tiller', 'sessions', 'watch-test', 'agent.inbox.md');
      appendFileSync(inboxPath, inboxBlock, 'utf-8');

      // Wait for debounce (100ms) + margin
      await new Promise((r) => setTimeout(r, 300));

      expect(notifySpy).toHaveBeenCalledWith('inbox://watch-test/agent');
    });

    it('does not fire for non-subscribed inbox files', async () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'watch-test2', 'sub-agent');
      createInboxFile(tmpRoot, 'watch-test2', 'other-agent');
      manager = createResourceManager(tmpRoot, notifySpy);

      manager.subscribe('inbox://watch-test2/sub-agent');

      // Modify the other agent's inbox
      await new Promise((r) => setTimeout(r, 50));
      const otherPath = join(tmpRoot, '.tiller', 'sessions', 'watch-test2', 'other-agent.inbox.md');
      appendFileSync(otherPath, inboxBlock, 'utf-8');

      await new Promise((r) => setTimeout(r, 300));

      expect(notifySpy).not.toHaveBeenCalledWith('inbox://watch-test2/other-agent');
    });
  });

  describe('close', () => {
    it('cleans up watchers without errors', () => {
      tmpRoot = makeTmpDir();
      createInboxFile(tmpRoot, 'close-test', 'bot');
      manager = createResourceManager(tmpRoot, notifySpy);

      manager.subscribe('inbox://close-test/bot');
      expect(() => manager.close()).not.toThrow();
    });

    it('can be called multiple times safely', () => {
      tmpRoot = makeTmpDir();
      manager = createResourceManager(tmpRoot, notifySpy);

      expect(() => {
        manager.close();
        manager.close();
      }).not.toThrow();
    });
  });
});
