import { describe, it, expect } from 'vitest';
import { generateOpenCodeJson } from '../../src/scaffold/opencode/opencode-json.js';
import { generateAgentsMd } from '../../src/scaffold/opencode/agents-md.js';
import { generateOCQuartermasterAgent } from '../../src/scaffold/opencode/agents/quartermaster.js';
import { generateOCBosunAgent } from '../../src/scaffold/opencode/agents/bosun.js';
import { generateOCCaptainAgent } from '../../src/scaffold/opencode/agents/captain.js';
import { generateOCCartographerAgent } from '../../src/scaffold/opencode/agents/cartographer.js';
import { simpleConfig, openCodeOnlyConfig } from '../helpers/fixtures.js';

describe('generateOpenCodeJson', () => {
  it('produces valid JSON', () => {
    const result = generateOpenCodeJson(openCodeOnlyConfig);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('has $schema field', () => {
    const parsed = JSON.parse(generateOpenCodeJson(openCodeOnlyConfig));
    expect(parsed.$schema).toContain('opencode.ai');
  });

  it('has permissions.allow array', () => {
    const parsed = JSON.parse(generateOpenCodeJson(openCodeOnlyConfig));
    expect(Array.isArray(parsed.permissions.allow)).toBe(true);
    expect(parsed.permissions.allow.length).toBeGreaterThan(0);
  });

  it('allows git and npm commands', () => {
    const parsed = JSON.parse(generateOpenCodeJson(openCodeOnlyConfig));
    const allow: string[] = parsed.permissions.allow;
    expect(allow.some((p) => p.includes('git'))).toBe(true);
    expect(allow.some((p) => p.includes('npm'))).toBe(true);
  });
});

describe('generateAgentsMd', () => {
  it('includes protocol enforcement', () => {
    expect(generateAgentsMd(simpleConfig)).toContain('Protocol enforcement');
  });

  it('includes vibe loop', () => {
    expect(generateAgentsMd(simpleConfig)).toContain('Vibe loop');
  });

  it('includes both modes', () => {
    const result = generateAgentsMd(simpleConfig);
    expect(result).toContain('### simple');
    expect(result).toContain('### detailed');
  });

  it('includes both workflows', () => {
    const result = generateAgentsMd(simpleConfig);
    expect(result).toContain('### solo');
    expect(result).toContain('### team');
  });

  it('lists all four agents', () => {
    const result = generateAgentsMd(simpleConfig);
    expect(result).toContain('quartermaster');
    expect(result).toContain('bosun');
    expect(result).toContain('captain');
    expect(result).toContain('cartographer');
  });
});

describe('generateOCQuartermasterAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateOCQuartermasterAgent(simpleConfig)).toContain('description: Independent code reviewer');
  });

  it('has mode subagent', () => {
    expect(generateOCQuartermasterAgent(simpleConfig)).toContain('mode: subagent');
  });

  it('includes PASS/FAIL verdict instructions', () => {
    const result = generateOCQuartermasterAgent(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
  });

  it('includes escalation protocol', () => {
    expect(generateOCQuartermasterAgent(simpleConfig)).toContain('ESCALATE TO CAPTAIN');
  });
});

describe('generateOCBosunAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateOCBosunAgent(simpleConfig)).toContain('description: Tech debt maintenance agent');
  });

  it('has mode subagent', () => {
    expect(generateOCBosunAgent(simpleConfig)).toContain('mode: subagent');
  });

  it('interpolates runCommand', () => {
    expect(generateOCBosunAgent(simpleConfig)).toContain('npm test');
  });

  it('references tech-backlog.md', () => {
    expect(generateOCBosunAgent(simpleConfig)).toContain('tech-backlog.md');
  });
});

describe('generateOCCaptainAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateOCCaptainAgent(simpleConfig)).toContain('description: Arbitration agent');
  });

  it('has mode subagent', () => {
    expect(generateOCCaptainAgent(simpleConfig)).toContain('mode: subagent');
  });

  it('includes three ruling options', () => {
    const result = generateOCCaptainAgent(simpleConfig);
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });
});

describe('generateOCCartographerAgent', () => {
  it('has description in frontmatter', () => {
    expect(generateOCCartographerAgent(simpleConfig)).toContain('description: Codebase map maintainer');
  });

  it('has mode subagent', () => {
    expect(generateOCCartographerAgent(simpleConfig)).toContain('mode: subagent');
  });

  it('references codebase-map.md', () => {
    expect(generateOCCartographerAgent(simpleConfig)).toContain('codebase-map.md');
  });

  it('mentions Structural Concerns output', () => {
    expect(generateOCCartographerAgent(simpleConfig)).toContain('Structural Concerns');
  });
});
