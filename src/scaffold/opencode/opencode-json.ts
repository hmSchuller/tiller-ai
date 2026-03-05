import type { ProjectConfig } from '../types.js';

export function generateOpenCodeJson(config: ProjectConfig): string {
  const openCodeConfig = {
    $schema: 'https://opencode.ai/schema.json',
    permissions: {
      allow: [
        'Bash(git:*)',
        'Bash(npm:*)',
        'Bash(npx:*)',
        'Bash(node:*)',
        'Bash(echo:*)',
      ],
    },
  };

  return JSON.stringify(openCodeConfig, null, 2);
}
