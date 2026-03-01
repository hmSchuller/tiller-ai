import { describe, it, expect } from 'vitest';
import { generateQuartermasterAgent } from '../../src/scaffold/agents/quartermaster.js';
import { generateBosunAgent } from '../../src/scaffold/agents/bosun.js';
import { generateCaptainAgent } from '../../src/scaffold/agents/captain.js';
import { generateCartographerAgent } from '../../src/scaffold/agents/cartographer.js';
import { generateTechBacklog } from '../../src/scaffold/tech-backlog.js';
import { simpleConfig, detailedConfig } from '../helpers/fixtures.js';

describe('generateQuartermasterAgent', () => {
  it('has correct frontmatter name', () => {
    expect(generateQuartermasterAgent(simpleConfig)).toContain('name: quartermaster');
  });

  it('specifies opus model in frontmatter', () => {
    expect(generateQuartermasterAgent(simpleConfig)).toContain('model: opus');
  });

  it('restricts tools to read-only set', () => {
    expect(generateQuartermasterAgent(simpleConfig)).toContain('tools: Read, Grep, Glob, Bash, LS');
  });

  it('produces PASS or FAIL verdict instructions', () => {
    const result = generateQuartermasterAgent(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
  });

  it('includes negotiation protocol with one-round limit', () => {
    const result = generateQuartermasterAgent(simpleConfig);
    expect(result).toContain('one round');
    expect(result).toContain('ESCALATE TO CAPTAIN');
  });

  it('reviews git diff against main', () => {
    expect(generateQuartermasterAgent(simpleConfig)).toContain('git diff main');
  });

  it('checks test coverage', () => {
    expect(generateQuartermasterAgent(simpleConfig)).toContain('Test coverage');
  });

  it('is mode-aware', () => {
    const result = generateQuartermasterAgent(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('produces the same structure regardless of config', () => {
    const s = generateQuartermasterAgent(simpleConfig);
    const d = generateQuartermasterAgent(detailedConfig);
    expect(s).toBe(d);
  });
});

describe('generateBosunAgent', () => {
  it('has correct frontmatter name', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('name: bosun');
  });

  it('includes verify command from config', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('npm test');
    expect(generateBosunAgent(detailedConfig)).toContain('npm run verify');
  });

  it('maintains tech-backlog.md', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('tech-backlog.md');
  });

  it('includes severity tags', () => {
    const result = generateBosunAgent(simpleConfig);
    expect(result).toContain('[critical]');
    expect(result).toContain('[major]');
    expect(result).toContain('[minor]');
  });

  it('marks fixed items as done with date', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('[done YYYY-MM-DD]');
  });

  it('alerts on critical items', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('CRITICAL DEBT ALERT');
  });

  it('includes guardrails section', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('MUST NOT');
  });

  it('includes simple and detailed mode reporting', () => {
    const result = generateBosunAgent(simpleConfig);
    expect(result).toContain('simple mode');
    expect(result).toContain('detailed mode');
  });

  it('specifies tools in frontmatter', () => {
    expect(generateBosunAgent(simpleConfig)).toContain('tools: Read, Grep, Glob, Edit, Write, Bash, LS');
  });
});

describe('generateCaptainAgent', () => {
  it('has correct frontmatter name', () => {
    expect(generateCaptainAgent(simpleConfig)).toContain('name: captain');
  });

  it('specifies opus model in frontmatter', () => {
    expect(generateCaptainAgent(simpleConfig)).toContain('model: opus');
  });

  it('restricts tools to read-only set', () => {
    expect(generateCaptainAgent(simpleConfig)).toContain('tools: Read, Grep, Glob, Edit, LS');
  });

  it('only activated on disputes', () => {
    expect(generateCaptainAgent(simpleConfig)).toContain('impasse');
  });

  it('includes three ruling types', () => {
    const result = generateCaptainAgent(simpleConfig);
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });

  it('reads project context files before ruling', () => {
    const result = generateCaptainAgent(simpleConfig);
    expect(result).toContain('changelog.md');
    expect(result).toContain('tech-backlog.md');
  });

  it('adds pattern problems to tech-backlog regardless of ruling', () => {
    expect(generateCaptainAgent(simpleConfig)).toContain('pattern');
  });

  it('produces the same structure regardless of config', () => {
    const s = generateCaptainAgent(simpleConfig);
    const d = generateCaptainAgent(detailedConfig);
    expect(s).toBe(d);
  });
});

describe('generateCartographerAgent', () => {
  it('has correct frontmatter name', () => {
    expect(generateCartographerAgent(simpleConfig)).toContain('name: cartographer');
  });

  it('references codebase-map.md', () => {
    expect(generateCartographerAgent(simpleConfig)).toContain('codebase-map.md');
  });

  it('includes full scan instructions for missing/empty map', () => {
    const result = generateCartographerAgent(simpleConfig);
    expect(result).toContain('full scan');
    expect(result).toContain('missing or empty');
  });

  it('includes incremental update instructions for existing map', () => {
    const result = generateCartographerAgent(simpleConfig);
    expect(result).toContain('incremental update');
    expect(result).toContain('git diff');
  });

  it('outputs Structural Concerns section and does not spawn agents', () => {
    const result = generateCartographerAgent(simpleConfig);
    expect(result).toContain('Structural Concerns');
    expect(result).toContain('Do NOT spawn other agents yourself');
  });

  it('recommends escalation actions for structural concerns', () => {
    const result = generateCartographerAgent(simpleConfig);
    expect(result).toContain('captain');
    expect(result).toContain('bosun');
    expect(result).toContain('feature creep');
    expect(result).toContain('tech debt');
  });

  it('specifies tools in frontmatter', () => {
    expect(generateCartographerAgent(simpleConfig)).toContain('tools: Read, Grep, Glob, Edit, Write, Bash, LS');
  });

  it('is mode-aware in reporting', () => {
    const result = generateCartographerAgent(simpleConfig);
    expect(result).toContain('simple mode');
    expect(result).toContain('detailed mode');
  });

  it('produces the same structure regardless of config', () => {
    const s = generateCartographerAgent(simpleConfig);
    const d = generateCartographerAgent(detailedConfig);
    expect(s).toBe(d);
  });
});

describe('generateTechBacklog', () => {
  it('includes project name', () => {
    expect(generateTechBacklog(simpleConfig)).toContain('test-project');
  });

  it('has Backlog and Done sections', () => {
    const result = generateTechBacklog(simpleConfig);
    expect(result).toContain('## Backlog');
    expect(result).toContain('## Done');
  });

  it('describes severity tags', () => {
    const result = generateTechBacklog(simpleConfig);
    expect(result).toContain('[critical]');
    expect(result).toContain('[major]');
    expect(result).toContain('[minor]');
  });

  it('notes it is committed and shared', () => {
    expect(generateTechBacklog(simpleConfig)).toContain('Committed and shared');
  });
});
