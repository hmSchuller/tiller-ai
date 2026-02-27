import { describe, it, expect } from 'vitest';
import { generateVibeSkill } from '../../src/scaffold/skills/vibe.js';
import { generateSnapshotSkill } from '../../src/scaffold/skills/snapshot.js';
import { generateRecapSkill } from '../../src/scaffold/skills/recap.js';
import { generateLandSkill } from '../../src/scaffold/skills/land.js';
import { simpleConfig, detailedConfig } from '../helpers/fixtures.js';

describe('generateVibeSkill', () => {
  it('has correct frontmatter name', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('name: vibe');
  });

  it('includes $ARGUMENTS usage', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('$ARGUMENTS');
  });

  it('simple mode plans milestones internally', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('Plan milestones (internal)');
    expect(result).not.toContain('Wait for explicit confirmation');
  });

  it('detailed mode enters plan mode', () => {
    const result = generateVibeSkill(detailedConfig);
    expect(result).toContain('EnterPlanMode');
  });

  it('both modes build milestone by milestone', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('Build milestone by milestone');
    expect(generateVibeSkill(detailedConfig)).toContain('Build milestone by milestone');
  });

  it('both modes require adding or updating tests', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('Add or update tests');
    expect(generateVibeSkill(detailedConfig)).toContain('Add or update tests');
  });

  it('both modes auto-commit after each milestone', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('git add -A && git commit');
    expect(generateVibeSkill(detailedConfig)).toContain('git add -A && git commit');
  });

  it('both modes announce feature complete', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('Feature complete');
    expect(generateVibeSkill(detailedConfig)).toContain('/land');
  });

  it('simple mode hides milestones from user', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('Do not show this plan to the user');
  });

  it('detailed mode embeds execution rules in plan', () => {
    const result = generateVibeSkill(detailedConfig);
    expect(result).toContain('Execution rules');
  });

  it('includes the verify command', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('npm test');
  });

  it('mentions feature branch creation', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('feature/');
  });
});

describe('generateSnapshotSkill', () => {
  it('has correct frontmatter name', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('name: snapshot');
  });

  it('checks for feature branch', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('main');
  });

  it('runs verify command', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('npm test');
  });

  it('commits with git add -A', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('git add -A');
  });

  it('updates vibestate.md', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('vibestate.md');
  });
});

describe('generateRecapSkill', () => {
  it('has correct frontmatter name', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain('name: recap');
  });

  it('is read-only — no file modifications', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain('Read-only');
    expect(result).toContain('No file modifications');
  });

  it('shows feature branches', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain("feature/*");
  });
});

describe('generateLandSkill', () => {
  it('has correct frontmatter name', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('name: land');
  });

  it('merges with --no-ff', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('--no-ff');
  });

  it('deletes the feature branch', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('git branch -d');
  });

  it('runs verify command', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('npm test');
  });

  it('updates vibestate.md', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('vibestate.md');
  });
});
