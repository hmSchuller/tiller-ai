import { describe, it, expect } from 'vitest';
import { generateRootClaudeMd, generateDotClaudeMd } from '../../src/scaffold/claude-md.js';
import { simpleConfig, detailedConfig } from '../helpers/fixtures.js';

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
    expect(result).toContain('/vibe');
    expect(result).toContain('/snapshot');
    expect(result).toContain('/land');
    expect(result).toContain('/recap');
  });

  it('mentions feature branches', () => {
    const result = generateDotClaudeMd(simpleConfig);
    expect(result).toContain('feature branch');
  });
});
