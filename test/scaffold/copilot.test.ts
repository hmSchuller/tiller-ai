import { describe, it, expect } from 'vitest';
import { generateCopilotInstructions } from '../../src/scaffold/copilot/copilot-instructions.js';
import { generateCopilotQuartermasterAgent } from '../../src/scaffold/copilot/agents/quartermaster.js';
import { generateCopilotBosunAgent } from '../../src/scaffold/copilot/agents/bosun.js';
import { generateCopilotCaptainAgent } from '../../src/scaffold/copilot/agents/captain.js';
import { generateCopilotCartographerAgent } from '../../src/scaffold/copilot/agents/cartographer.js';
import { generateCopilotHooksJson } from '../../src/scaffold/copilot/hooks-json.js';
import { generateCopilotDockSkill } from '../../src/scaffold/copilot/skills/dock.js';
import { generateCopilotSailSkill } from '../../src/scaffold/copilot/skills/sail.js';
import { simpleConfig, copilotOnlyConfig } from '../helpers/fixtures.js';

describe('generateCopilotInstructions', () => {
  it('includes code quality section', () => {
    expect(generateCopilotInstructions(simpleConfig)).toContain('Code quality');
  });

  it('includes testing section', () => {
    expect(generateCopilotInstructions(simpleConfig)).toContain('Testing');
  });

  it('includes both modes', () => {
    const result = generateCopilotInstructions(simpleConfig);
    expect(result).toContain('**simple**');
    expect(result).toContain('**detailed**');
  });

  it('includes both workflows', () => {
    const result = generateCopilotInstructions(simpleConfig);
    expect(result).toContain('**solo**');
    expect(result).toContain('**team**');
  });
});

describe('generateCopilotQuartermasterAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateCopilotQuartermasterAgent(simpleConfig)).toContain('description: Independent code reviewer');
  });

  it('has tools as JSON array', () => {
    expect(generateCopilotQuartermasterAgent(simpleConfig)).toContain('tools: ["read", "search", "execute"]');
  });

  it('does not have name or model in frontmatter', () => {
    const result = generateCopilotQuartermasterAgent(simpleConfig);
    const frontmatter = result.split('---')[1];
    expect(frontmatter).not.toContain('name:');
    expect(frontmatter).not.toContain('model:');
  });

  it('includes PASS/FAIL verdict instructions', () => {
    const result = generateCopilotQuartermasterAgent(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
  });
});

describe('generateCopilotBosunAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateCopilotBosunAgent(simpleConfig)).toContain('description: Tech debt maintenance agent');
  });

  it('has tools including edit', () => {
    expect(generateCopilotBosunAgent(simpleConfig)).toContain('tools: ["read", "search", "edit", "execute"]');
  });

  it('interpolates runCommand', () => {
    expect(generateCopilotBosunAgent(simpleConfig)).toContain('npm test');
  });
});

describe('generateCopilotCaptainAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateCopilotCaptainAgent(simpleConfig)).toContain('description: Arbitration agent');
  });

  it('has tools without execute', () => {
    expect(generateCopilotCaptainAgent(simpleConfig)).toContain('tools: ["read", "search", "edit"]');
  });

  it('includes three ruling options', () => {
    const result = generateCopilotCaptainAgent(simpleConfig);
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });
});

describe('generateCopilotCartographerAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateCopilotCartographerAgent(simpleConfig)).toContain('description: Codebase map maintainer');
  });

  it('has tools including execute', () => {
    expect(generateCopilotCartographerAgent(simpleConfig)).toContain('tools: ["read", "search", "edit", "execute"]');
  });

  it('references codebase-map.md', () => {
    expect(generateCopilotCartographerAgent(simpleConfig)).toContain('codebase-map.md');
  });
});

describe('generateCopilotHooksJson', () => {
  it('produces valid JSON', () => {
    const result = generateCopilotHooksJson(copilotOnlyConfig);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('has version 1', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    expect(parsed.version).toBe(1);
  });

  it('has sessionStart hooks including session-log', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    expect(parsed.hooks.sessionStart).toHaveLength(2);
    expect(parsed.hooks.sessionStart[0].bash).toContain('session-resume.sh');
    expect(parsed.hooks.sessionStart[1].bash).toContain('session-log.sh');
  });

  it('has preToolUse hooks including session-log', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    expect(parsed.hooks.preToolUse).toHaveLength(3);
    expect(parsed.hooks.preToolUse[0].bash).toContain('secret-scan.sh');
    expect(parsed.hooks.preToolUse[1].bash).toContain('inbox-check.sh');
    expect(parsed.hooks.preToolUse[2].bash).toContain('session-log.sh');
  });

  it('has postToolUse hooks including session-log', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    expect(parsed.hooks.postToolUse).toHaveLength(2);
    expect(parsed.hooks.postToolUse[0].bash).toContain('post-write.sh');
    expect(parsed.hooks.postToolUse[1].bash).toContain('session-log.sh');
  });

  it('registers session-log on all 6 event types', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    for (const eventType of ['sessionStart', 'sessionEnd', 'userPromptSubmitted', 'preToolUse', 'postToolUse', 'errorOccurred']) {
      const hooks = parsed.hooks[eventType] as Array<{ bash: string }>;
      expect(hooks.some(h => h.bash.includes('session-log.sh')), `${eventType} should have session-log`).toBe(true);
    }
  });

  it('does not have subagentStop (not supported by Copilot)', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    expect(parsed.hooks.subagentStop).toBeUndefined();
  });

  it('does not include plan-context hook', () => {
    const result = generateCopilotHooksJson(copilotOnlyConfig);
    expect(result).not.toContain('plan-context');
  });

  it('all hooks have type command', () => {
    const parsed = JSON.parse(generateCopilotHooksJson(copilotOnlyConfig));
    for (const hookType of Object.values(parsed.hooks) as Array<Array<{ type: string }>>) {
      for (const hook of hookType) {
        expect(hook.type).toBe('command');
      }
    }
  });
});

describe('generateCopilotSailSkill', () => {
  it('has sail name in frontmatter', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('name: sail');
  });

  it('uses AskUserQuestion for all user interaction', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('AskUserQuestion');
    expect(result).toContain('No chat prompts, no `EnterPlanMode`');
  });

  it('always orchestrates — no scope tiers', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).not.toContain('Small tier');
    expect(result).not.toContain('Medium tier');
    expect(result).not.toContain('Large tier');
    expect(result).toContain('ALWAYS ORCHESTRATE');
  });

  it('delegates requirements to sub-agent', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('Requirements Interview — DELEGATED');
    expect(result).toContain('requirements interviewer');
  });

  it('delegates planning to sub-agent', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('Plan milestones — DELEGATED');
    expect(result).toContain('planning agent');
  });

  it('has dock/new-sail loop in Step 5', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('"Dock"');
    expect(result).toContain('"Start new sail"');
    expect(result).toContain('loop back to **Step 2**');
  });

  it('interpolates runCommand', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('npm test');
  });

  it('main agent never writes code', () => {
    const result = generateCopilotSailSkill(simpleConfig);
    expect(result).toContain('does NOT implement any code itself');
    expect(result).toContain('pure orchestrator');
  });
});

describe('generateCopilotDockSkill', () => {
  it('has dock name in frontmatter', () => {
    const result = generateCopilotDockSkill(simpleConfig);
    expect(result).toContain('name: dock');
  });

  it('uses AskUserQuestion only for the success loop interaction', () => {
    const result = generateCopilotDockSkill(simpleConfig);
    expect(result).toContain('All Step 8 user interaction uses `AskUserQuestion` only — no chat prompts.');
    expect(result).toContain('AskUserQuestion');
    expect(result).not.toContain('Say: "Done."');
  });

  it('offers Start new sail and Finish after a successful dock', () => {
    const result = generateCopilotDockSkill(simpleConfig);
    expect(result).toContain('After the dock completes successfully');
    expect(result).toContain('"Start new sail"');
    expect(result).toContain('"Finish"');
    expect(result).toContain('Done. What next?');
  });

  it('asks what to work on next before continuing the sail flow', () => {
    const result = generateCopilotDockSkill(simpleConfig);
    expect(result).toContain('What should we work on next?');
    expect(result).toContain('continue into the Copilot sail flow from **Step 2**');
  });

  it('does not auto-run sail from dock', () => {
    const result = generateCopilotDockSkill(simpleConfig);
    expect(result).toContain('Do NOT auto-run `/sail`');
  });
});
