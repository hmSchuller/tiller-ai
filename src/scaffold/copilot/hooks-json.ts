import type { ProjectConfig } from '../types.js';

export function generateCopilotHooksJson(_config: ProjectConfig): string {
  const hooksConfig = {
    version: 1,
    hooks: {
      sessionStart: [
        {
          type: 'command',
          bash: './.github/hooks/session-resume.sh',
          comment: 'Inject branch and compass context on session start',
        },
      ],
      preToolUse: [
        {
          type: 'command',
          bash: './.github/hooks/secret-scan.sh',
          comment: 'Block commits containing secrets',
        },
        {
          type: 'command',
          bash: './.github/hooks/inbox-check.sh',
          comment: 'Check agent inbox for undelivered messages',
        },
      ],
      postToolUse: [
        {
          type: 'command',
          bash: './.github/hooks/post-write.sh',
          comment: 'Auto-format after file edits (works with formatters on PATH)',
        },
        {
          type: 'command',
          bash: './.github/hooks/session-log.sh',
          comment: 'Log tool usage to the active session',
        },
      ],
      // Note: Copilot has no subagentStop event. Agent completion is tracked
      // via explicit bash commands in the sail skill after each worker finishes.
    },
  };

  return JSON.stringify(hooksConfig, null, 2);
}
