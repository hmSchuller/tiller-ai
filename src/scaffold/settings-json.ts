import type { ProjectConfig } from './types.js';

export function generateSettingsJson(_config: ProjectConfig): string {
  const settings = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit|Write|MultiEdit',
          hooks: [
            {
              type: 'command',
              command: 'bash .claude/hooks/post-write.sh "$CLAUDE_FILE_PATHS"',
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [
            {
              type: 'command',
              command: 'bash .claude/hooks/secret-scan.sh',
            },
          ],
        },
      ],
    },
    permissions: {
      allow: [
        'Bash(git:*)',
        'Bash(npm:*)',
        'Bash(npx:*)',
        'Bash(node:*)',
      ],
    },
  };

  return JSON.stringify(settings, null, 2);
}
