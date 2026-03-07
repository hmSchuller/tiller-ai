import { describe, it, expect } from 'vitest';
import { generateSessionResumeHook } from '../../src/scaffold/hooks/session-resume.js';
import { generatePlanContextHook } from '../../src/scaffold/hooks/plan-context.js';
import { generateSessionLogHook } from '../../src/scaffold/hooks/session-log.js';
import { generateInboxCheckHook } from '../../src/scaffold/hooks/inbox-check.js';
import { generateAgentCompleteHook } from '../../src/scaffold/hooks/agent-complete.js';
import { simpleConfig } from '../helpers/fixtures.js';

describe('generateSessionResumeHook', () => {
  it('detects feature/* branches', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('feature/*');
  });

  it('detects fix/* branches', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('fix/*');
  });

  it('references .tiller/compass.md', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('.tiller/compass.md');
  });

  it('tells Claude to read compass.md for full context', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('read it for full context');
  });

  it('still prompts to use /sail', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('/sail');
  });

  it('is a bash script', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });
});

describe('generatePlanContextHook', () => {
  it('is a bash script', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });

  it('contains the plan template with all required sections', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('## Context');
    expect(result).toContain('## Approach');
    expect(result).toContain('## Milestones');
    expect(result).toContain('## Files to modify');
    expect(result).toContain('## Trade-offs');
    expect(result).toContain('## Execution rules');
    expect(result).toContain('## Quartermaster review');
    expect(result).toContain('## Verification');
  });

  it('reads .tiller/compass.md if it exists', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('.tiller/compass.md');
    expect(result).toContain('cat .tiller/compass.md');
  });

  it('outputs JSON with hookSpecificOutput.additionalContext', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('hookSpecificOutput');
    expect(result).toContain('additionalContext');
  });

  it('includes the configured run command', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain(simpleConfig.runCommand);
  });

  it('mentions milestone tagging requirement', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('[independent]');
    expect(result).toContain('[depends-on: N]');
  });
});

describe('generateSessionLogHook', () => {
  it('is a bash script', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });

  it('reads JSON input from stdin', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('INPUT=$(cat)');
  });

  it('handles postToolUse events (toolName + toolResult)', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('toolResult');
    expect(result).toContain('TOOL_DONE');
  });

  it('handles preToolUse events (toolName without toolResult)', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('TOOL_START');
  });

  it('handles userPromptSubmitted events', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('USER_PROMPT');
    expect(result).toContain("'prompt'");
  });

  it('handles errorOccurred events', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('ERROR');
    expect(result).toContain("'error'");
  });

  it('handles sessionStart and sessionEnd events', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('SESSION_START');
    expect(result).toContain('SESSION_END');
  });

  it('writes to per-agent log file', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('.log.md');
    expect(result).toContain('AGENT_NAME');
  });

  it('finds active session by checking session.json status', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('session.json');
    expect(result).toContain('"active"');
  });

  it('defaults agent name to unknown when current-agent file is missing', () => {
    const result = generateSessionLogHook(simpleConfig);
    expect(result).toContain('current-agent');
    expect(result).toContain('AGENT_NAME="unknown"');
  });
});

describe('generateInboxCheckHook', () => {
  it('is a bash script', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });

  it('reads JSON input from stdin', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('INPUT=$(cat)');
  });

  it('uses deny-with-message pattern for undelivered messages', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('permissionDecision');
    expect(result).toContain('deny');
    expect(result).toContain('permissionDecisionReason');
    expect(result).toContain('INBOX MESSAGE');
  });

  it('checks for delivered: false in inbox file', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('delivered: false');
    expect(result).toContain('.inbox.md');
  });

  it('marks messages as delivered after reading', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('delivered: true');
  });

  it('exits silently when current-agent file is missing', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('current-agent');
    expect(result).toContain('exit 0');
  });

  it('exits silently when no undelivered messages', () => {
    const result = generateInboxCheckHook(simpleConfig);
    expect(result).toContain('grep -q "delivered: false"');
    expect(result).toContain('exit 0');
  });
});

describe('generateAgentCompleteHook', () => {
  it('is a bash script', () => {
    const result = generateAgentCompleteHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });

  it('reads JSON input from stdin', () => {
    const result = generateAgentCompleteHook(simpleConfig);
    expect(result).toContain('INPUT=$(cat)');
  });

  it('updates agent status to completed in session.json', () => {
    const result = generateAgentCompleteHook(simpleConfig);
    expect(result).toContain("'completed'");
    expect(result).toContain('session.json');
  });

  it('exits silently when current-agent file is missing', () => {
    const result = generateAgentCompleteHook(simpleConfig);
    expect(result).toContain('current-agent');
    expect(result).toContain('exit 0');
  });

  it('finds active session directory', () => {
    const result = generateAgentCompleteHook(simpleConfig);
    expect(result).toContain('.tiller/sessions/');
    expect(result).toContain('"active"');
  });
});
