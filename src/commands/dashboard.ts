import { spawn } from 'node:child_process';
import type { DashboardServerHandle, DashboardServerOptions } from './dashboard/contracts.js';
import { startDashboardServer } from './dashboard/server.js';

export type { DashboardServerHandle, DashboardServerOptions } from './dashboard/contracts.js';
export { startDashboardServer } from './dashboard/server.js';

export type DashboardCommandOptions = DashboardServerOptions & {
  cwd?: string;
  log?: (message: string) => void;
  openBrowser?: (url: string) => Promise<void>;
};

function getOpenCommand(url: string): { command: string; args: string[] } {
  switch (process.platform) {
    case 'darwin':
      return { command: 'open', args: [url] };
    case 'win32':
      return { command: 'cmd', args: ['/c', 'start', '', url] };
    default:
      return { command: 'xdg-open', args: [url] };
  }
}

export async function openBrowserUrl(url: string): Promise<void> {
  const { command, args } = getOpenCommand(url);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });

    child.once('error', reject);
    child.once('spawn', () => {
      child.unref();
      resolve();
    });
  });
}

function attachSignalHandlers(handle: DashboardServerHandle): DashboardServerHandle {
  const listeners = (['SIGINT', 'SIGTERM'] as const).map((signal) => {
    const listener = () => {
      cleanup();
      void handle.close().finally(() => process.exit(0));
    };

    process.once(signal, listener);
    return { signal, listener };
  });

  const cleanup = () => {
    for (const { signal, listener } of listeners) {
      process.off(signal, listener);
    }
  };

  return {
    ...handle,
    close: async () => {
      cleanup();
      await handle.close();
    },
  };
}

export async function dashboardCommand(options: DashboardCommandOptions = {}): Promise<DashboardServerHandle> {
  const log = options.log ?? ((message: string) => console.log(message));
  const handle = attachSignalHandlers(await startDashboardServer(options.cwd ?? process.cwd(), options));

  log(`Dashboard available at ${handle.url}`);

  try {
    await (options.openBrowser ?? openBrowserUrl)(handle.url);
  } catch {
    log(`Failed to open the browser automatically. Open this URL manually: ${handle.url}`);
  }

  return handle;
}
