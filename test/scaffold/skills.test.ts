import { describe, it, expect } from 'vitest';
import { generateSailSkill } from '../../src/scaffold/skills/sail.js';
import { generateAnchorSkill } from '../../src/scaffold/skills/anchor.js';
import { generateRecapSkill } from '../../src/scaffold/skills/recap.js';
import { generateDockSkill } from '../../src/scaffold/skills/dock.js';
import { generateTechDebtSkill } from '../../src/scaffold/skills/tech-debt.js';
import { generateScoutSkill } from '../../src/scaffold/skills/scout.js';
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

  it('writes Done entries to changelog.md', () => {
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

  it('includes Step 4.5 code review with Quartermaster', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 4.5');
    expect(result).toContain('Quartermaster');
    expect(result).toContain('subagent_type: "quartermaster"');
  });

  it('escalates to Captain on unresolved disputes', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Captain');
    expect(result).toContain('subagent_type: "captain"');
    expect(result).toContain('ESCALATE TO CAPTAIN');
  });

  it('handles PASS, FAIL, and Captain ruling outcomes', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });

  it('Step 2.5 checks tech-backlog.md for critical items', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('tech-backlog.md');
    expect(result).toContain('[critical]');
    expect(result).toContain('Critical debt items');
  });

  it('embedded execution rules include self-contained Quartermaster review', () => {
    const result = generateSailSkill(simpleConfig);
    // subagent_type: "quartermaster" must appear at least twice: once in the Step 3
    // embedded execution rules, and once in the standalone Step 4.5 section.
    const matches = (result.match(/subagent_type: "quartermaster"/g) || []).length;
    expect(matches).toBeGreaterThanOrEqual(2);
    // Execution rules must inline the full PASS/FAIL/ESCALATE protocol
    expect(result).toContain('ESCALATE TO CAPTAIN');
    expect(result).toContain('subagent_type: "captain"');
    expect(result).toContain('Code Review');
    // Must NOT reference the dead "Step 4.5 protocol" pattern in the execution rules
    expect(result).not.toContain('per the sail skill Step 4.5 protocol');
  });

  it('tech debt counter pattern counts docked entries', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('(landed|docked) feature/');
  });

  it('reads codebase-map.md in Step 1 if it exists', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('codebase-map.md');
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

  it('reads changelog.md', () => {
    const result = generateRecapSkill(simpleConfig);
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

  it('delegates to Bosun via Task tool', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('subagent_type: "bosun"');
    expect(result).toContain('Task tool');
  });

  it('checks tech-backlog.md for critical items before spawning Bosun', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('tech-backlog.md');
    expect(result).toContain('[critical]');
    expect(result).toContain('Critical debt items found');
  });

  it('reports Bosun results in detailed mode', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain("Bosun's results");
  });

  it('tech debt counter pattern counts docked entries', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('(landed|docked) feature/');
  });
});

describe('generateScoutSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateScoutSkill(simpleConfig)).toContain('name: scout');
  });

  it('produces the same template structure regardless of mode', () => {
    const simple = generateScoutSkill(simpleConfig);
    const detailed = generateScoutSkill(detailedConfig);
    expect(simple).toContain('simple');
    expect(simple).toContain('detailed');
    expect(detailed).toContain('simple');
    expect(detailed).toContain('detailed');
  });

  it('includes $ARGUMENTS usage', () => {
    expect(generateScoutSkill(simpleConfig)).toContain('$ARGUMENTS');
  });

  it('includes Step 1 orient with codebase-map.md', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('codebase-map.md');
    expect(result).toContain('changelog.md');
    expect(result).toContain('Mode: <mode>');
  });

  it('uses Explore agent with very thorough setting', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('Explore agent');
    expect(result).toContain('"very thorough"');
  });

  it('asks clarifying questions using AskUserQuestion', () => {
    expect(generateScoutSkill(simpleConfig)).toContain('AskUserQuestion');
  });

  it('detailed mode asks both product and technical questions', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('product/behavior questions');
    expect(result).toContain('technical questions');
  });

  it('ticket includes all required sections', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('### Summary');
    expect(result).toContain('### Relevant code');
    expect(result).toContain('### Suggested approach');
    expect(result).toContain('### Open questions');
    expect(result).toContain('### Scope estimate');
  });

  it('scope estimate has three sizes', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('small');
    expect(result).toContain('medium');
    expect(result).toContain('large');
  });

  it('publishes via gh issue create when gh is available', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('gh issue create');
    expect(result).toContain('which gh');
  });

  it('falls back to copy-paste output when gh is unavailable', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('copy-paste');
  });

  it('asks user to review before publishing', () => {
    expect(generateScoutSkill(simpleConfig)).toContain('adjust anything before publishing');
  });

  it('milestones tagged with dependency annotations', () => {
    const result = generateScoutSkill(simpleConfig);
    expect(result).toContain('[independent]');
    expect(result).toContain('[depends-on: N]');
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

  it('updates changelog.md when docking', () => {
    expect(generateDockSkill(simpleConfig)).toContain('changelog.md');
  });

  it('includes cartographer step after committing uncommitted changes', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('cartographer');
    expect(result).toContain('subagent_type: "cartographer"');
    expect(result).toContain('codebase-map.md');
  });

  it('cartographer step commits map changes', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('map: update codebase map');
  });

  it('handles structural concerns escalation after cartographer runs', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('Structural Concerns');
    expect(result).toContain('escalate to captain');
    expect(result).toContain('subagent_type: "captain"');
    expect(result).toContain('log to tech-backlog.md');
  });
});
