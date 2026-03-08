import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type {
  McpToolDefinition,
  McpToolHandler,
  McpToolCallResult,
} from './types.js';
import {
  registerAgent,
  readSession,
  writeSession,
  listSessions,
  appendInboxMessage,
  readInbox,
  getUndeliveredMessages,
  deleteInboxMessage,
} from '../sessions/fs.js';

function success(data: unknown): McpToolCallResult {
  return {
    content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data) }],
  };
}

function error(message: string): McpToolCallResult {
  return {
    content: [{ type: 'text', text: `Error: ${message}` }],
    isError: true,
  };
}

function requireString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing required parameter: ${key}`);
  }
  return value;
}

function requireNumber(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value !== 'number') {
    throw new Error(`Missing required parameter: ${key}`);
  }
  return value;
}

export function createToolDefinitions(): McpToolDefinition[] {
  return [
    {
      name: 'register-agent',
      description: 'Register an agent in a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
          name: { type: 'string', description: 'Agent name' },
          type: { type: 'string', enum: ['fleet', 'specialist', 'ephemeral'], description: 'Agent type' },
          startedAt: { type: 'string', description: 'ISO 8601 start timestamp' },
        },
        required: ['sessionSlug', 'name', 'type', 'startedAt'],
      },
    },
    {
      name: 'complete-agent',
      description: 'Mark an agent as completed in a session',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
          agentName: { type: 'string', description: 'Name of the agent to complete' },
        },
        required: ['sessionSlug', 'agentName'],
      },
    },
    {
      name: 'send-inbox-message',
      description: 'Send a message to an agent inbox',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
          agentName: { type: 'string', description: 'Target agent name' },
          content: { type: 'string', description: 'Message content' },
          from: { type: 'string', enum: ['orchestrator', 'user'], description: 'Message sender (default: orchestrator)' },
        },
        required: ['sessionSlug', 'agentName', 'content'],
      },
    },
    {
      name: 'check-inbox',
      description: 'Read messages from an agent inbox',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
          agentName: { type: 'string', description: 'Agent name' },
          undeliveredOnly: { type: 'boolean', description: 'Only return undelivered messages (default: false)' },
        },
        required: ['sessionSlug', 'agentName'],
      },
    },
    {
      name: 'delete-inbox-message',
      description: 'Delete a message from an agent inbox by index',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
          agentName: { type: 'string', description: 'Agent name' },
          messageIndex: { type: 'number', description: 'Zero-based index of the message to delete' },
        },
        required: ['sessionSlug', 'agentName', 'messageIndex'],
      },
    },
    {
      name: 'read-session',
      description: 'Read session data by slug',
      inputSchema: {
        type: 'object',
        properties: {
          sessionSlug: { type: 'string', description: 'Session slug identifier' },
        },
        required: ['sessionSlug'],
      },
    },
    {
      name: 'list-sessions',
      description: 'List all sessions in the project',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'read-compass',
      description: 'Read the .tiller/compass.md file',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'update-compass',
      description: 'Update the .tiller/compass.md file',
      inputSchema: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'New compass file content' },
        },
        required: ['content'],
      },
    },
  ];
}

export function createToolHandlers(projectRoot: string): Record<string, McpToolHandler> {
  return {
    'register-agent': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const name = requireString(args, 'name');
        const type = requireString(args, 'type');
        const startedAt = requireString(args, 'startedAt');

        if (type !== 'fleet' && type !== 'specialist' && type !== 'ephemeral') {
          return error(`Invalid agent type: ${type}`);
        }

        registerAgent(projectRoot, sessionSlug, {
          name,
          type,
          status: 'active',
          startedAt,
        });

        return success({ ok: true, agent: name });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'complete-agent': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const agentName = requireString(args, 'agentName');

        const session = readSession(projectRoot, sessionSlug);
        if (!session) return error(`Session not found: ${sessionSlug}`);

        const agent = session.agents.find((a) => a.name === agentName);
        if (!agent) return error(`Agent not found: ${agentName}`);

        agent.status = 'completed';
        agent.completedAt = new Date().toISOString();
        writeSession(projectRoot, sessionSlug, session);

        return success({ ok: true, agent: agentName });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'send-inbox-message': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const agentName = requireString(args, 'agentName');
        const content = requireString(args, 'content');
        const from = typeof args.from === 'string' ? args.from : 'orchestrator';

        if (from !== 'orchestrator' && from !== 'user') {
          return error(`Invalid from value: ${from}`);
        }

        appendInboxMessage(projectRoot, sessionSlug, agentName, {
          timestamp: new Date().toISOString(),
          from,
          content,
        });

        return success({ ok: true });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'check-inbox': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const agentName = requireString(args, 'agentName');
        const undeliveredOnly = args.undeliveredOnly === true;

        const messages = undeliveredOnly
          ? getUndeliveredMessages(projectRoot, sessionSlug, agentName)
          : readInbox(projectRoot, sessionSlug, agentName);

        return success({ messages });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'delete-inbox-message': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const agentName = requireString(args, 'agentName');
        const messageIndex = requireNumber(args, 'messageIndex');

        deleteInboxMessage(projectRoot, sessionSlug, agentName, messageIndex);

        return success({ ok: true });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'read-session': async (args) => {
      try {
        const sessionSlug = requireString(args, 'sessionSlug');
        const session = readSession(projectRoot, sessionSlug);
        if (!session) return error(`Session not found: ${sessionSlug}`);
        return success(session);
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'list-sessions': async () => {
      try {
        const sessions = listSessions(projectRoot);
        return success({ sessions });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'read-compass': async () => {
      try {
        const compassPath = join(projectRoot, '.tiller', 'compass.md');
        if (!existsSync(compassPath)) return error('compass.md not found');
        const content = readFileSync(compassPath, 'utf-8');
        return success(content);
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },

    'update-compass': async (args) => {
      try {
        const content = requireString(args, 'content');
        const compassPath = join(projectRoot, '.tiller', 'compass.md');
        mkdirSync(dirname(compassPath), { recursive: true });
        writeFileSync(compassPath, content, 'utf-8');
        return success({ ok: true });
      } catch (err) {
        return error(err instanceof Error ? err.message : 'Unknown error');
      }
    },
  };
}
