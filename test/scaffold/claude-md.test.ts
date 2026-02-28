import { describe, it, expect } from 'vitest';
import { generateRootClaudeMd, generateDotClaudeMd } from '../../src/scaffold/claude-md.js';
import { simpleConfig, detailedConfig, teamSimpleConfig } from '../helpers/fixtures.js';

describe('generateRootClaudeMd', () => {
  it('includes project name as h1', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('# test-project');
  });

  it('includes description', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('A test project for unit tests');
  });

  it('includes verify command', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('npm test');
  });

  it('describes simple mode correctly', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('simple');
    expect(result).not.toContain('wait for confirmation');
  });

  it('describes detailed mode correctly', () => {
    const result = generateRootClaudeMd(detailedConfig);
    expect(result).toContain('detailed');
    expect(result).not.toContain('simple');
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
    expect(result).toContain('/land');
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
});

describe('generateRootClaudeMd — workflow section', () => {
  it('includes workflow section for solo', () => {
    const result = generateRootClaudeMd(simpleConfig);
    expect(result).toContain('## Workflow');
    expect(result).toContain('solo');
  });

  it('includes workflow section for team', () => {
    const result = generateRootClaudeMd(teamSimpleConfig);
    expect(result).toContain('## Workflow');
    expect(result).toContain('team');
  });
});
