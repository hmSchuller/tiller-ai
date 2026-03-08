import { resolve } from 'node:path';
import { createServer, createToolDefinitions, createToolHandlers } from '../mcp/index.js';

export async function mcpServerCommand(options?: { cwd?: string }): Promise<void> {
  const projectRoot = resolve(options?.cwd ?? process.cwd());
  const tools = createToolDefinitions();
  const handlers = createToolHandlers(projectRoot);
  const server = createServer(tools, handlers, undefined, projectRoot);

  process.on('SIGINT', () => {
    server.close();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    server.close();
    process.exit(0);
  });

  server.start();
}
