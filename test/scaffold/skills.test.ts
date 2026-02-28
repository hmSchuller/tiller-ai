import { describe, it, expect } from 'vitest';
import { generateSailSkill } from '../../src/scaffold/skills/sail.js';
import { generateAnchorSkill } from '../../src/scaffold/skills/anchor.js';
import { generateRecapSkill } from '../../src/scaffold/skills/recap.js';
import { generateDockSkill } from '../../src/scaffold/skills/dock.js';
import { generateTechDebtSkill } from '../../src/scaffold/skills/tech-debt.js';
import { simpleConfig, detailedConfig, teamSimpleConfig } from '../helpers/fixtures.js';

describe('generateSailSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateSailSkill(simpleConfig)).toContain('name: sail');
  });

  it('produces the same template structure regardless of mode', () => {
    // Both configs have same mode-agnostic structure; only runCommand differs
    const simple = generateSailSkill(simpleConfig);
    const detailed = generateSailSkill(detailedConfig);
    expect(simple).toContain('If mode is simple');
    expect(simple).toContain('If mode is detailed');
    expect(detailed).toContain('If mode is simple');
    expect(detailed).toContain('If mode is detailed');
  });

  it('includes $ARGUMENTS usage', () => {
    expect(generateSailSkill(simpleConfig)).toContain('$ARGUMENTS');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('instructs detailed mode to enter plan mode', () => {
    expect(generateSailSkill(simpleConfig)).toContain('EnterPlanMode');
  });

  it('instructs simple mode to plan internally', () => {
    expect(generateSailSkill(simpleConfig)).toContain('internally');
  });

  it('includes verify command', () => {
    expect(generateSailSkill(simpleConfig)).toContain('npm test');
  });

  it('includes milestone build loop', () => {
    expect(generateSailSkill(simpleConfig)).toContain('Add or update tests');
    expect(generateSailSkill(simpleConfig)).toContain('git add -A && git commit');
  });

  it('mentions feature branch creation', () => {
    expect(generateSailSkill(simpleConfig)).toContain('feature/');
  });

  it('announces the current mode', () => {
    expect(generateSailSkill(simpleConfig)).toContain('Mode: <mode>');
  });

  it('includes tech debt check step between branch routing and planning', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 2.5');
    expect(result).toContain('tech debt');
    expect(result).toContain('.tiller-tech-debt.json');
    expect(result).toContain('landedCount');
  });

  it('instructs vibe to use Task tool for tech debt agent', () => {
    expect(generateSailSkill(simpleConfig)).toContain('Task tool');
  });

  it('writes Done entries to changelog.md, not vibestate.md', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('changelog.md');
  });

  it('tags milestones with dependency annotations in plan step', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('[independent]');
    expect(result).toContain('[depends-on: N]');
  });

  it('includes TeamCreate and TaskCreate for parallel execution', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('TeamCreate');
    expect(result).toContain('TaskCreate');
  });

  it('includes SendMessage for worker coordination', () => {
    expect(generateSailSkill(simpleConfig)).toContain('SendMessage');
  });

  it('includes sequential fallback when all milestones depend on each other', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('all milestones are sequential');
  });

  it('includes within-milestone split option', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Within-milestone split');
  });

  it('lead agent owns commits in team mode', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('lead agent commits');
  });
});

describe('generateAnchorSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateAnchorSkill(simpleConfig)).toContain('name: anchor');
  });

  it('produces the same template structure regardless of mode', () => {
    const simple = generateAnchorSkill(simpleConfig);
    const detailed = generateAnchorSkill(detailedConfig);
    expect(simple).toContain('simple');
    expect(simple).toContain('detailed');
    expect(detailed).toContain('simple');
    expect(detailed).toContain('detailed');
  });

  it('checks for feature branch', () => {
    expect(generateAnchorSkill(simpleConfig)).toContain('main');
  });

  it('runs verify command', () => {
    expect(generateAnchorSkill(simpleConfig)).toContain('npm test');
  });

  it('commits with git add -A', () => {
    expect(generateAnchorSkill(simpleConfig)).toContain('git add -A');
  });

  it('writes Done entry to changelog.md', () => {
    expect(generateAnchorSkill(simpleConfig)).toContain('changelog.md');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateAnchorSkill(simpleConfig);
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

describe('generateTechDebtSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('name: tech-debt');
  });

  it('is not user-invocable (marked as internal)', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('Not user-invocable');
  });

  it('includes guardrails section', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('Guardrails');
    expect(generateTechDebtSkill(simpleConfig)).toContain('MUST NOT');
  });

  it('includes verify command', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('npm test');
  });

  it('includes stash/restore steps', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('git stash');
    expect(result).toContain('stash pop');
  });

  it('includes chore branch creation and merge', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('chore/tech-debt-');
    expect(result).toContain('--no-ff');
  });

  it('updates .tiller-tech-debt.json state', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('.tiller-tech-debt.json');
  });

  it('includes simple and detailed mode reporting', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('simple mode');
    expect(result).toContain('detailed mode');
    expect(result).toContain('Cleaned up a bit');
  });

  it('uses verify command from config', () => {
    const result = generateTechDebtSkill(detailedConfig);
    expect(result).toContain('npm run verify');
  });
});

describe('generateDockSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateDockSkill(simpleConfig)).toContain('name: dock');
  });

  it('produces the same template structure regardless of mode', () => {
    const simple = generateDockSkill(simpleConfig);
    const detailed = generateDockSkill(detailedConfig);
    expect(simple).toContain('simple');
    expect(simple).toContain('detailed');
    expect(detailed).toContain('simple');
    expect(detailed).toContain('detailed');
  });

  it('handles both simple and detailed mode at runtime', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('solo workflow: merges with --no-ff', () => {
    expect(generateDockSkill(simpleConfig)).toContain('--no-ff');
  });

  it('solo workflow: deletes the feature branch', () => {
    expect(generateDockSkill(simpleConfig)).toContain('git branch -d');
  });

  it('team workflow: opens PR with gh or manual link', () => {
    const result = generateDockSkill(teamSimpleConfig);
    expect(result).toContain('gh pr create');
    expect(result).toContain('which gh');
  });

  it('runs verify command', () => {
    expect(generateDockSkill(simpleConfig)).toContain('npm test');
  });

  it('updates changelog.md', () => {
    expect(generateDockSkill(simpleConfig)).toContain('changelog.md');
  });

  it('clears vibestate.md active feature', () => {
    expect(generateDockSkill(simpleConfig)).toContain('vibestate.md');
  });
});
