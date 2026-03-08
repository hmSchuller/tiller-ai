import { createInterface, type Interface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { JsonRpcMessage } from './types.js';

export interface McpTransport {
  onMessage: (handler: (message: JsonRpcMessage) => void) => void;
  send: (message: JsonRpcMessage) => void;
  start: () => void;
  close: () => void;
}

export function createStdioTransport(
  input: Readable = process.stdin,
  output: Writable = process.stdout,
): McpTransport {
  let messageHandler: ((message: JsonRpcMessage) => void) | null = null;
  let rl: Interface | null = null;

  function onMessage(handler: (message: JsonRpcMessage) => void): void {
    messageHandler = handler;
  }

  function send(message: JsonRpcMessage): void {
    output.write(JSON.stringify(message) + '\n');
  }

  function start(): void {
    rl = createInterface({ input, terminal: false });

    rl.on('line', (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const parsed = JSON.parse(trimmed) as JsonRpcMessage;
        messageHandler?.(parsed);
      } catch {
        // Malformed JSON — send parse error if possible
        send({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        });
      }
    });

    rl.on('close', () => {
      close();
    });
  }

  function close(): void {
    rl?.close();
    rl = null;
  }

  return { onMessage, send, start, close };
}
