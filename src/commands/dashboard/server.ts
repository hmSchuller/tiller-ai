import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { DashboardServerHandle, DashboardServerOptions } from './contracts.js';
import { createDashboardRequestHandler } from './routes.js';

const DEFAULT_HOST = '127.0.0.1';

export async function startDashboardServer(
  cwd: string,
  options: DashboardServerOptions = {},
): Promise<DashboardServerHandle> {
  const server = createServer(createDashboardRequestHandler(cwd));

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      resolve();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(options.port ?? 0, options.host ?? DEFAULT_HOST);
  });

  const address = server.address() as AddressInfo;
  const host = options.host ?? DEFAULT_HOST;

  return {
    url: `http://${host}:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      }),
  };
}
