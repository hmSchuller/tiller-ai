export function generateVscodeMcpJson(): string {
  const config = {
    servers: {
      tiller: {
        command: 'npx',
        args: ['tiller-ai', 'mcp-server'],
      },
    },
  };

  return JSON.stringify(config, null, 2);
}
