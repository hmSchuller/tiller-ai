import { describe, it, expect } from 'vitest';
import { generateVibeSkill } from '../../src/scaffold/skills/vibe.js';
import { generateSnapshotSkill } from '../../src/scaffold/skills/snapshot.js';
import { generateRecapSkill } from '../../src/scaffold/skills/recap.js';
import { generateLandSkill } from '../../src/scaffold/skills/land.js';
import { simpleConfig, detailedConfig, teamSimpleConfig } from '../helpers/fixtures.js';

describe('generateVibeSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('name: vibe');
  });

  it('produces the same template structure regardless of mode', () => {
    // Both configs have same mode-agnostic structure; only runCommand differs
    const simple = generateVibeSkill(simpleConfig);
    const detailed = generateVibeSkill(detailedConfig);
    expect(simple).toContain('If mode is simple');
    expect(simple).toContain('If mode is detailed');
    expect(detailed).toContain('If mode is simple');
    expect(detailed).toContain('If mode is detailed');
  });

  it('includes $ARGUMENTS usage', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('$ARGUMENTS');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('instructs detailed mode to enter plan mode', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('EnterPlanMode');
  });

  it('instructs simple mode to plan internally', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('internally');
  });

  it('includes verify command', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('npm test');
  });

  it('includes milestone build loop', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('Add or update tests');
    expect(generateVibeSkill(simpleConfig)).toContain('git add -A && git commit');
  });

  it('mentions feature branch creation', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('feature/');
  });

  it('announces the current mode', () => {
    expect(generateVibeSkill(simpleConfig)).toContain('Mode: <mode>');
  });

  it('writes Done entries to changelog.md, not vibestate.md', () => {
    const result = generateVibeSkill(simpleConfig);
    expect(result).toContain('changelog.md');
  });
});

describe('generateSnapshotSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateSnapshotSkill(simpleConfig)).toContain('name: snapshot');
  });

  it('produces the same template structure regardless of mode', () => {
    const simple = generateSnapshotSkill(simpleConfig);
    const detailed = generateSnapshotSkill(detailedConfig);
    expect(simple).toContain('simple');
    expect(simple).toContain('detailed');
    expect(detailed).toContain('simple');
    expect(detailed).toContain('detailed');
  });

  it('checks for feature branch', () => {
    expect(generateSnapshotSkill(simpleConfig)).toContain('main');
  });

  it('runs verify command', () => {
    expect(generateSnapshotSkill(simpleConfig)).toContain('npm test');
  });

  it('commits with git add -A', () => {
    expect(generateSnapshotSkill(simpleConfig)).toContain('git add -A');
  });

  it('writes Done entry to changelog.md', () => {
    expect(generateSnapshotSkill(simpleConfig)).toContain('changelog.md');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateSnapshotSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });
});

describe('generateRecapSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateRecapSkill(simpleConfig)).toContain('name: recap');
  });

  it('is a single unified template regardless of config', () => {
    expect(generateRecapSkill(simpleConfig)).toBe(generateRecapSkill(detailedConfig));
  });

  it('is read-only — no file modifications', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain('Read-only');
    expect(result).toContain('No file modifications');
  });

  it('shows feature branches', () => {
    expect(generateRecapSkill(simpleConfig)).toContain('feature/*');
  });

  it('reads both vibestate.md and changelog.md', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain('vibestate.md');
    expect(result).toContain('changelog.md');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateRecapSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });
});

describe('generateLandSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateLandSkill(simpleConfig)).toContain('name: land');
  });

  it('produces the same template structure regardless of mode', () => {
    const simple = generateLandSkill(simpleConfig);
    const detailed = generateLandSkill(detailedConfig);
    expect(simple).toContain('simple');
    expect(simple).toContain('detailed');
    expect(detailed).toContain('simple');
    expect(detailed).toContain('detailed');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateLandSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('solo workflow: merges with --no-ff', () => {
    expect(generateLandSkill(simpleConfig)).toContain('--no-ff');
  });

  it('solo workflow: deletes the feature branch', () => {
    expect(generateLandSkill(simpleConfig)).toContain('git branch -d');
  });

  it('team workflow: opens PR with gh or manual link', () => {
    const result = generateLandSkill(teamSimpleConfig);
    expect(result).toContain('gh pr create');
    expect(result).toContain('which gh');
  });

  it('runs verify command', () => {
    expect(generateLandSkill(simpleConfig)).toContain('npm test');
  });

  it('updates changelog.md', () => {
    expect(generateLandSkill(simpleConfig)).toContain('changelog.md');
  });

  it('clears vibestate.md active feature', () => {
    expect(generateLandSkill(simpleConfig)).toContain('vibestate.md');
  });
});
