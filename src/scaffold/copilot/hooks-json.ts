import type { ProjectConfig } from '../types.js';

export function generateCopilotHooksJson(_config: ProjectConfig): string {
  const sessionLog = {
    type: 'command',
    bash: './.github/hooks/session-log.sh',
    comment: 'Log event to active session',
  };

  const hooksConfig = {
    version: 1,
    hooks: {
      sessionStart: [
        {
          type: 'command',
          bash: './.github/hooks/session-resume.sh',
          comment: 'Inject branch and compass context on session start',
        },
        sessionLog,
      ],
      sessionEnd: [
        sessionLog,
      ],
      userPromptSubmitted: [
        sessionLog,
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
        sessionLog,
      ],
      postToolUse: [
        {
          type: 'command',
          bash: './.github/hooks/post-write.sh',
          comment: 'Auto-format after file edits (works with formatters on PATH)',
        },
        sessionLog,
      ],
      errorOccurred: [
        sessionLog,
      ],
    },
  };

  return JSON.stringify(hooksConfig, null, 2);
}
