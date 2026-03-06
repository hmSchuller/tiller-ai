import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  appendFileSync,
} from 'node:fs';
import { join } from 'node:path';
import type { Session, AgentRecord, InboxMessage } from './types.js';

export function branchToSlug(branch: string): string {
  return branch.replace(/\//g, '-').replace(/^-+|-+$/g, '');
}

export function sessionDir(projectRoot: string, slug: string): string {
  return join(projectRoot, '.tiller', 'sessions', slug);
}

export function createSession(projectRoot: string, branch: string): Session {
  const slug = branchToSlug(branch);
  const dir = sessionDir(projectRoot, slug);
  mkdirSync(dir, { recursive: true });

  const session: Session = {
    id: slug,
    branch,
    startedAt: new Date().toISOString(),
    status: 'active',
    agents: [],
  };

  writeFileSync(join(dir, 'session.json'), JSON.stringify(session, null, 2), 'utf-8');
  return session;
}

export function readSession(projectRoot: string, slug: string): Session | null {
  const filePath = join(sessionDir(projectRoot, slug), 'session.json');
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Session;
}

export function writeSession(projectRoot: string, slug: string, session: Session): void {
  const dir = sessionDir(projectRoot, slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'session.json'), JSON.stringify(session, null, 2), 'utf-8');
}

export function listSessions(projectRoot: string): Session[] {
  const sessionsRoot = join(projectRoot, '.tiller', 'sessions');
  if (!existsSync(sessionsRoot)) return [];

  const sessions: Session[] = [];
  for (const entry of readdirSync(sessionsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const session = readSession(projectRoot, entry.name);
    if (session) sessions.push(session);
  }
  return sessions;
}

export function registerAgent(projectRoot: string, slug: string, agent: AgentRecord): void {
  const session = readSession(projectRoot, slug);
  if (!session) throw new Error(`Session not found: ${slug}`);

  session.agents.push(agent);
  writeSession(projectRoot, slug, session);

  const dir = sessionDir(projectRoot, slug);
  const inboxPath = join(dir, `${agent.name}.inbox.md`);
  const logPath = join(dir, `${agent.name}.log.md`);
  if (!existsSync(inboxPath)) writeFileSync(inboxPath, '', 'utf-8');
  if (!existsSync(logPath)) writeFileSync(logPath, '', 'utf-8');
}

export function appendLog(
  projectRoot: string,
  slug: string,
  agentName: string,
  entry: string,
): void {
  const logPath = join(sessionDir(projectRoot, slug), `${agentName}.log.md`);
  const timestamp = new Date().toISOString();
  appendFileSync(logPath, `[${timestamp}] ${entry}\n`, 'utf-8');
}

export function readLog(projectRoot: string, slug: string, agentName: string): string {
  const logPath = join(sessionDir(projectRoot, slug), `${agentName}.log.md`);
  if (!existsSync(logPath)) return '';
  return readFileSync(logPath, 'utf-8');
}

export function appendInboxMessage(
  projectRoot: string,
  slug: string,
  agentName: string,
  message: Omit<InboxMessage, 'delivered'>,
): void {
  const inboxPath = join(sessionDir(projectRoot, slug), `${agentName}.inbox.md`);
  const block = [
    '---',
    `timestamp: ${message.timestamp}`,
    `from: ${message.from}`,
    'delivered: false',
    '---',
    message.content,
    '',
  ].join('\n');
  appendFileSync(inboxPath, block, 'utf-8');
}

function parseInbox(raw: string): InboxMessage[] {
  if (!raw.trim()) return [];

  const messages: InboxMessage[] = [];
  // Split on frontmatter delimiters: each message starts with ---\n<fields>\n---\n<content>
  const blocks = raw.split(/^---$/m);

  // blocks alternate: [before-first-fence, frontmatter1, content1, frontmatter2, content2, ...]
  // First element is empty or whitespace if file starts with ---
  for (let i = 1; i < blocks.length - 1; i += 2) {
    const frontmatter = blocks[i].trim();
    const content = (blocks[i + 1] ?? '').trim();

    const timestampMatch = frontmatter.match(/^timestamp:\s*(.+)$/m);
    const fromMatch = frontmatter.match(/^from:\s*(.+)$/m);
    const deliveredMatch = frontmatter.match(/^delivered:\s*(.+)$/m);

    if (timestampMatch && fromMatch && deliveredMatch) {
      messages.push({
        timestamp: timestampMatch[1].trim(),
        from: fromMatch[1].trim() as InboxMessage['from'],
        delivered: deliveredMatch[1].trim() === 'true',
        content,
      });
    }
  }

  return messages;
}

function serializeInbox(messages: InboxMessage[]): string {
  return messages
    .map((m) => {
      return [
        '---',
        `timestamp: ${m.timestamp}`,
        `from: ${m.from}`,
        `delivered: ${m.delivered}`,
        '---',
        m.content,
        '',
      ].join('\n');
    })
    .join('');
}

export function readInbox(projectRoot: string, slug: string, agentName: string): InboxMessage[] {
  const inboxPath = join(sessionDir(projectRoot, slug), `${agentName}.inbox.md`);
  if (!existsSync(inboxPath)) return [];
  return parseInbox(readFileSync(inboxPath, 'utf-8'));
}

export function getUndeliveredMessages(
  projectRoot: string,
  slug: string,
  agentName: string,
): InboxMessage[] {
  return readInbox(projectRoot, slug, agentName).filter((m) => !m.delivered);
}

export function markMessagesDelivered(
  projectRoot: string,
  slug: string,
  agentName: string,
): void {
  const inboxPath = join(sessionDir(projectRoot, slug), `${agentName}.inbox.md`);
  if (!existsSync(inboxPath)) return;

  const messages = parseInbox(readFileSync(inboxPath, 'utf-8'));
  for (const m of messages) {
    m.delivered = true;
  }
  writeFileSync(inboxPath, serializeInbox(messages), 'utf-8');
}
