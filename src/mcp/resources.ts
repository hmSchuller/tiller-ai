import { readdirSync, readFileSync, existsSync, watch } from 'node:fs';
import { join } from 'node:path';
import type { McpResource, McpResourceContent } from './types.js';
import { readInbox } from '../sessions/fs.js';

export interface ResourceManager {
  listResources(): McpResource[];
  readResource(uri: string): McpResourceContent[];
  subscribe(uri: string): void;
  unsubscribe(uri: string): void;
  close(): void;
}

interface ParsedUri {
  slug: string;
  agent: string;
}

function parseInboxUri(uri: string): ParsedUri | null {
  const match = uri.match(/^inbox:\/\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { slug: match[1], agent: match[2] };
}

export function createResourceManager(
  projectRoot: string,
  notify: (uri: string) => void,
): ResourceManager {
  const subscriptions = new Set<string>();
  const watchers = new Map<string, ReturnType<typeof watch>>();
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function sessionsRoot(): string {
    return join(projectRoot, '.tiller', 'sessions');
  }

  function listResources(): McpResource[] {
    const root = sessionsRoot();
    if (!existsSync(root)) return [];

    const resources: McpResource[] = [];
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const slug = entry.name;
      const sessionDir = join(root, slug);
      for (const file of readdirSync(sessionDir)) {
        if (!file.endsWith('.inbox.md')) continue;
        const agent = file.replace(/\.inbox\.md$/, '');
        resources.push({
          uri: `inbox://${slug}/${agent}`,
          name: `${agent} inbox (${slug})`,
          description: `Inbox messages for agent ${agent} in session ${slug}`,
          mimeType: 'application/json',
        });
      }
    }
    return resources;
  }

  function readResource(uri: string): McpResourceContent[] {
    const parsed = parseInboxUri(uri);
    if (!parsed) throw new Error(`Invalid resource URI: ${uri}`);

    const inboxPath = join(sessionsRoot(), parsed.slug, `${parsed.agent}.inbox.md`);
    if (!existsSync(inboxPath)) throw new Error(`Resource not found: ${uri}`);

    const messages = readInbox(projectRoot, parsed.slug, parsed.agent);
    return [
      {
        uri,
        mimeType: 'application/json',
        text: JSON.stringify(messages),
      },
    ];
  }

  function startWatcher(slug: string): void {
    if (watchers.has(slug)) return;

    const dir = join(sessionsRoot(), slug);
    if (!existsSync(dir)) return;

    const watcher = watch(dir, (_event, filename) => {
      if (!filename || !filename.endsWith('.inbox.md')) return;
      const agent = filename.replace(/\.inbox\.md$/, '');
      const uri = `inbox://${slug}/${agent}`;
      if (!subscriptions.has(uri)) return;

      // Debounce to avoid duplicate fires
      const existing = debounceTimers.get(uri);
      if (existing) clearTimeout(existing);
      debounceTimers.set(
        uri,
        setTimeout(() => {
          debounceTimers.delete(uri);
          notify(uri);
        }, 100),
      );
    });

    watchers.set(slug, watcher);
  }

  function subscribe(uri: string): void {
    const parsed = parseInboxUri(uri);
    if (!parsed) throw new Error(`Invalid resource URI: ${uri}`);

    subscriptions.add(uri);
    startWatcher(parsed.slug);
  }

  function unsubscribe(uri: string): void {
    subscriptions.delete(uri);

    // If no more subscriptions for this slug, close its watcher
    const parsed = parseInboxUri(uri);
    if (!parsed) return;

    const hasOtherSubs = [...subscriptions].some((s) => s.startsWith(`inbox://${parsed.slug}/`));
    if (!hasOtherSubs) {
      const watcher = watchers.get(parsed.slug);
      if (watcher) {
        watcher.close();
        watchers.delete(parsed.slug);
      }
    }
  }

  function close(): void {
    for (const timer of debounceTimers.values()) clearTimeout(timer);
    debounceTimers.clear();
    for (const watcher of watchers.values()) watcher.close();
    watchers.clear();
    subscriptions.clear();
  }

  return { listResources, readResource, subscribe, unsubscribe, close };
}
