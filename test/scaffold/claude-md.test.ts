import { describe, it, expect } from 'vitest';
import { generateRootClaudeMd, generateDotClaudeMd } from '../../src/scaffold/claude-md.js';
import { simpleConfig } from '../helpers/fixtures.js';

describe('generateRootClaudeMd', () => {
  it('includes project name as h1', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('# test-project');
  });

  it('includes description', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('A test project for unit tests');
  });

  it('does not include verify command, mode, or workflow', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).not.toContain('## Verify command');
    expect(result).not.toContain('## Mode');
    expect(result).not.toContain('## Workflow');
  });
});

describe('generateDotClaudeMd', () => {
  it('contains vibe loop instructions', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('Orient');
    expect(result).toContain('Confirm');
    expect(result).toContain('Build');
    expect(result).toContain('Complete');
  });

  it('lists all four skills', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('/sail');
    expect(result).toContain('/anchor');
    expect(result).toContain('/dock');
    expect(result).toContain('/recap');
  });

  it('mentions feature branches', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('feature branch');
  });

  it('describes both workflow modes', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('### solo');
    expect(result).toContain('### team');
  });

  it('explains vibestate.md vs changelog.md split', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('vibestate.md');
    expect(result).toContain('changelog.md');
  });

  it('documents per-dev override via .tiller.local.json', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('.tiller.local.json');
  });

  it('mentions agent team parallelization in vibe loop description', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('agent teams');
    expect(result).toContain('[independent]');
  });

  it('describes agent team usage in /sail skill listing', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('parallelized');
  });

  it('has an Agents section listing all three agents', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('## Agents');
    expect(result).toContain('quartermaster');
    expect(result).toContain('bosun');
    expect(result).toContain('captain');
  });

  it('notes which agents require opus model', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('model: "opus"');
  });

  it('Agents section appears after Skills section', () => {
    const result = generateDotClaudeMd(simpleConfig);
    const skillsIdx = result.indexOf('## Skills');
    const agentsIdx = result.indexOf('## Agents');
    expect(skillsIdx).toBeGreaterThan(-1);
    expect(agentsIdx).toBeGreaterThan(skillsIdx);
  });
});

describe('generateDotClaudeMd — config source', () => {
  it('references .tiller.json for mode, not CLAUDE.md', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('.claude/.tiller.json');
    expect(result).not.toContain('mode is set in CLAUDE.md');
  });

  it('references .tiller.json for workflow, not CLAUDE.md', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).not.toContain('workflow is set in CLAUDE.md');
  });
});
