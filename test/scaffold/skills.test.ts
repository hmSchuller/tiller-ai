import { describe, it, expect } from 'vitest';
import { generateSailSkill } from '../../src/scaffold/skills/sail.js';
import { generateAnchorSkill } from '../../src/scaffold/skills/anchor.js';
import { generateRecapSkill } from '../../src/scaffold/skills/recap.js';
import { generateDockSkill } from '../../src/scaffold/skills/dock.js';
import { generateTechDebtSkill } from '../../src/scaffold/skills/tech-debt.js';
import { generateScoutSkill } from '../../src/scaffold/skills/scout.js';
import { generateRepairHullSkill } from '../../src/scaffold/skills/repair-hull.js';
import { generateCookbookSkill } from '../../src/scaffold/skills/cookbook.js';
import { simpleConfig, detailedConfig, teamSimpleConfig } from '../helpers/fixtures.js';

describe('generateSailSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateSailSkill(simpleConfig)).toContain('name: sail');
  });

  it('has updated frontmatter description covering features, fixes, and tasks', () => {
    expect(generateSailSkill(simpleConfig)).toContain('features, fixes, and tasks');
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

  it('supports fix/ branch prefix for bug-related arguments', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('fix/');
    expect(result).toContain('broken');
    expect(result).toContain('repair');
  });

  it('includes branch chaining logic when already on a feature branch', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Clearly related');
    expect(result).toContain('Clearly unrelated');
    expect(result).toContain('Uncertain');
  });

  it('asks user when continuation vs new branch is uncertain', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Should I continue on');
    expect(result).toContain('start a new branch');
  });

  it('covers all four branch routing cases', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('$ARGUMENTS provided + already on a feature or fix branch');
    expect(result).toContain('$ARGUMENTS provided + on main');
    expect(result).toContain('No arguments + already on a feature or fix branch');
    expect(result).toContain('No arguments + on main');
  });

  it('includes tech debt check step between branch routing and planning', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 2.5');
    expect(result).toContain('tech debt');
    expect(result).toContain('.tiller/tech-debt.json');
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

  it('uses /fleet for parallel execution instead of TeamCreate', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).not.toContain('TeamCreate');
    expect(result).toContain('/fleet');
  });

  it('does not use SendMessage for worker coordination', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).not.toContain('SendMessage');
  });

  it('includes Small tier for solo sequential execution', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Small tier');
    expect(result).toContain('solo sequential');
  });

  it('includes within-milestone split option', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Within-milestone split');
  });

  it('Commit incrementally in fleet tiers', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Commit incrementally');
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

  it('includes Step 2.7 requirements interview', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 2.7');
    expect(result).toContain('Requirements Interview');
  });

  it('interview uses AskUserQuestion and covers core topics', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('AskUserQuestion');
    expect(result).toContain('Scope & goals');
    expect(result).toContain('User-facing behavior');
    expect(result).toContain('Edge cases & constraints');
    expect(result).toContain('Acceptance criteria');
  });

  it('interview produces a Requirements Summary', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Requirements Summary');
    expect(result).toContain('anything to correct or add');
  });

  it('interview has a user escape hatch', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('skip the interview');
  });

  it('interview has skip condition for branch continuation', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Skip condition');
    expect(result).toContain('no new `$ARGUMENTS`');
  });

  it('detailed mode includes technical topic questions', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('detailed mode only');
    expect(result).toContain('Technical topics');
    expect(result).toContain('Architecture');
    expect(result).toContain('Data flow & error handling');
    expect(result).toContain('Testing strategy');
    expect(result).toContain('API contracts & backwards compatibility');
    expect(result).toContain('Performance');
  });

  it('interview covers core topics for all modes and tech topics for detailed', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Core topics (all modes)');
    expect(result).toContain('Technical topics (detailed mode only)');
  });

  it('includes Step 3.5 evaluate scope section', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 3.5');
    expect(result).toContain('Evaluate scope');
  });

  it('Step 3.5 defines three tier heuristics (Small, Medium, Large)', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('**Small**');
    expect(result).toContain('**Medium**');
    expect(result).toContain('**Large**');
    expect(result).toContain('< 3 milestones');
    expect(result).toContain('>= 6 milestones');
  });

  it('Step 3.5 evaluates silently in simple mode', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Evaluate silently');
  });

  it('Step 3.5 announces and allows override in detailed mode', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Scope assessment:');
    expect(result).toContain('confirm or override');
  });

  it('Step 4 has three tier subsections', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('### Small tier');
    expect(result).toContain('### Medium tier');
    expect(result).toContain('### Large tier');
  });

  it('Medium tier uses /fleet for parallel execution', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Medium tier — parallel with /fleet');
  });

  it('Large tier delegates all work — orchestrator does not implement', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('orchestrator mode');
    expect(result).toContain('does NOT implement any code itself');
  });

  it('Large tier selects model per milestone complexity (haiku/sonnet/opus)', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('**haiku**');
    expect(result).toContain('**sonnet**');
    expect(result).toContain('**opus**');
  });

  it('Large tier commits incrementally after each milestone', () => {
    const result = generateSailSkill(simpleConfig);
    // "Commit incrementally" appears in the Large tier section
    expect(result).toContain('Commit incrementally');
  });

  it('Large tier uses /fleet for dependency-based execution', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('/fleet');
    expect(result).toContain('newly unblocked milestones');
  });

  it('execution rules reference Step 3.5 evaluation', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('evaluate scope per Step 3.5');
  });

  it('Step 3 references requirements summary from Step 2.7', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('requirements summary from Step 2.7');
  });

  it('includes Step 0 with TaskCreate for progress tracking', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Step 0: Set up progress tracking');
    expect(result).toContain('TaskCreate');
    expect(result).toContain('Dust off compass');
    expect(result).toContain('"Orient"');
    expect(result).toContain('"Branch routing"');
    expect(result).toContain('"Tech debt check"');
    expect(result).toContain('"Requirements interview"');
    expect(result).toContain('"Plan milestones"');
    expect(result).toContain('"Build"');
    expect(result).toContain('"Code review"');
    expect(result).toContain('"Complete"');
  });

  it('uses TaskUpdate to mark steps in_progress and completed', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('TaskUpdate');
    expect(result).toContain('in_progress');
    expect(result).toContain('completed');
  });

  it('dynamically creates per-milestone tasks after planning', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('dynamically create one `TaskCreate` per milestone');
    expect(result).toContain('delete the placeholder "Build" task');
  });

  it('reads compass.md in Step 1 orient', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('compass.md');
  });

  it('detailed mode creates .tiller/compass.md if missing and updates it in Step 3 execution rules', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain("create `.tiller/compass.md` if it doesn't exist");
    expect(result).toContain('check off Orientation and Planning stages');
  });

  it('Step 4 reads .tiller/compass.md to resume from unchecked milestone', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Read `.tiller/compass.md` to find the milestone checklist');
  });

  it('Step 4 checks off milestones in compass.md after each commit', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('check off this milestone');
  });

  it('Step 4.5 checks off Testing and Quartermaster review stages in compass.md', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('check off the Testing stage');
    expect(result).toContain('Check off the Quartermaster review stage');
  });

  it('Step 5 notes completion in compass.md', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Sail complete — ready to /dock');
  });

  it('includes session folder creation instructions', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('.tiller/sessions/');
    expect(result).toContain('session.json');
    expect(result).toContain('mkdir -p .tiller/sessions/');
  });

  it('includes dashboard URL mention', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Dashboard: http://localhost:19850');
    expect(result).toContain('tiller-ai dashboard');
  });

  it('does not contain TeamCreate or TaskCreate for orchestration', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).not.toContain('TeamCreate');
  });

  it('includes TILLER_AGENT_NAME for agent registration', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('TILLER_AGENT_NAME');
  });

  it('registers agents in session.json before spawning', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('Sub-agent registration rule');
    expect(result).toContain('MUST register it in the session BEFORE spawning');
  });

  it('reuses existing session folder when resuming', () => {
    const result = generateSailSkill(simpleConfig);
    expect(result).toContain('resuming a previous sail');
    expect(result).toContain('Do not overwrite');
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

  it('includes Step 6 code review with Quartermaster', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('Step 6');
    expect(result).toContain('Quartermaster');
    expect(result).toContain('subagent_type: "quartermaster"');
  });

  it('escalates to Captain on unresolved disputes', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('Captain');
    expect(result).toContain('subagent_type: "captain"');
    expect(result).toContain('ESCALATE TO CAPTAIN');
  });

  it('handles PASS, FAIL, and Captain ruling outcomes', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });

  it('includes Step 0 with TaskCreate for progress tracking', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('Step 0: Set up progress tracking');
    expect(result).toContain('TaskCreate');
    expect(result).toContain('"Check branch"');
    expect(result).toContain('"Run verify"');
    expect(result).toContain('"Commit"');
    expect(result).toContain('"Update changelog"');
    expect(result).toContain('"Code review"');
    expect(result).toContain('"Confirm"');
  });

  it('uses TaskUpdate to mark steps in_progress and completed', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('TaskUpdate');
    expect(result).toContain('in_progress');
    expect(result).toContain('completed');
  });

  it('Step 7 confirm comes after review step', () => {
    const result = generateAnchorSkill(simpleConfig);
    expect(result).toContain('Step 7');
    expect(result).toContain('Anchored');
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

  it('updates .tiller/tech-debt.json state', () => {
    expect(generateTechDebtSkill(simpleConfig)).toContain('.tiller/tech-debt.json');
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

  it('solo workflow: merges chore branch with --no-ff', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('--no-ff');
    expect(result).toContain('git branch -d chore/tech-debt-');
  });

  it('team workflow: pushes chore branch and opens PR', () => {
    const result = generateTechDebtSkill(teamSimpleConfig);
    expect(result).toContain('git push origin chore/tech-debt-');
    expect(result).toContain('gh pr create --fill');
    expect(result).toContain('which gh');
  });

  it('team workflow: does not delete chore branch locally', () => {
    const result = generateTechDebtSkill(teamSimpleConfig);
    expect(result).toContain('Do NOT delete the chore branch locally');
  });

  it('reads workflow from local.json with fallback to tiller.json', () => {
    const result = generateTechDebtSkill(simpleConfig);
    expect(result).toContain('.tiller/local.json');
    expect(result).toContain('.tiller/tiller.json');
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

  it('includes Step 4 Quartermaster check', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('Step 4');
    expect(result).toContain('Quartermaster check');
    expect(result).toContain('subagent_type: "quartermaster"');
  });

  it('Step 4 handles three cases: QM ran, QM not run, history unavailable', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('Case A');
    expect(result).toContain('Case B');
    expect(result).toContain('Case C');
  });

  it('Step 4 asks user when session history is not available', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('context may have been cleared');
    expect(result).toContain('Would you like me to run it now before docking');
  });

  it('Step 4 handles PASS, FAIL, and ESCALATE TO CAPTAIN outcomes', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('PASS');
    expect(result).toContain('FAIL');
    expect(result).toContain('ESCALATE TO CAPTAIN');
  });

  it('Step 4 escalates to Captain on unresolved disputes', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('AGREE WITH QUARTERMASTER');
    expect(result).toContain('AGREE WITH SAILING AGENT');
    expect(result).toContain('COMPROMISE');
  });

  it('cartographer is now Step 5 after QM check added', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('## Step 5: Run cartographer');
  });

  it('workflow check is now Step 6 after renumbering', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('## Step 6: Check workflow');
    expect(result).toContain('## Step 6a: Solo');
    expect(result).toContain('## Step 6b: Team');
  });

  it('includes Step 0 with TaskCreate for progress tracking', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('Step 0: Set up progress tracking');
    expect(result).toContain('TaskCreate');
    expect(result).toContain('"Check branch"');
    expect(result).toContain('"Run verify"');
    expect(result).toContain('"Commit uncommitted changes"');
    expect(result).toContain('"Quartermaster check"');
    expect(result).toContain('"Run cartographer"');
    expect(result).toContain('"Check workflow & merge/PR"');
    expect(result).toContain('"Update changelog"');
    expect(result).toContain('"Confirm"');
  });

  it('uses TaskUpdate to mark steps in_progress and completed', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('TaskUpdate');
    expect(result).toContain('in_progress');
    expect(result).toContain('completed');
  });

  it('changelog update is now Step 7 and confirm is Step 8', () => {
    const result = generateDockSkill(simpleConfig);
    expect(result).toContain('## Step 7: Update changelog.md');
    expect(result).toContain('## Step 8: Confirm');
  });
});

describe('generateRepairHullSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('name: repair-hull');
  });

  it('is user-invocable (description does not say "Not user-invocable")', () => {
    expect(generateRepairHullSkill(simpleConfig)).not.toContain('Not user-invocable');
  });

  it('contains AskUserQuestion for item selection', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('AskUserQuestion');
  });

  it('delegates to Bosun via Task tool', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('subagent_type: "bosun"');
    expect(result).toContain('Task tool');
  });

  it('uses verify command from config', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('npm test');
  });

  it('uses verify command from config (detailed)', () => {
    expect(generateRepairHullSkill(detailedConfig)).toContain('npm run verify');
  });

  it('contains chore branch pattern', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('chore/repair-hull-');
  });

  it('simple mode reports "Fixed: <desc>"', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('Fixed: <desc>');
  });

  it('detailed mode reports full summary', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('detailed mode');
    expect(result).toContain('Full summary');
  });

  it('reads tech-backlog.md for open items', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('tech-backlog.md');
  });

  it('handles empty backlog gracefully', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('No open items in tech-backlog.md');
  });

  it('merges with --no-ff', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('--no-ff');
  });

  it('includes stash and restore steps', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('git stash');
    expect(result).toContain('stash pop');
  });

  it('marks item done in tech-backlog.md after fix', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('Mark the item as done in');
  });

  it('supports $ARGUMENTS for direct item selection', () => {
    expect(generateRepairHullSkill(simpleConfig)).toContain('$ARGUMENTS');
  });

  it('includes guardrails section', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('Guardrails');
    expect(result).toContain('MUST NOT');
  });

  it('solo workflow: merges chore branch with --no-ff', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('--no-ff');
    expect(result).toContain('git branch -d chore/repair-hull-');
  });

  it('team workflow: pushes chore branch and opens PR', () => {
    const result = generateRepairHullSkill(teamSimpleConfig);
    expect(result).toContain('git push origin chore/repair-hull-');
    expect(result).toContain('gh pr create --fill');
    expect(result).toContain('which gh');
  });

  it('team workflow: does not delete chore branch locally', () => {
    const result = generateRepairHullSkill(teamSimpleConfig);
    expect(result).toContain('Do NOT delete the chore branch locally');
  });

  it('reads workflow from local.json with fallback to tiller.json', () => {
    const result = generateRepairHullSkill(simpleConfig);
    expect(result).toContain('.tiller/local.json');
    expect(result).toContain('.tiller/tiller.json');
  });
});

describe('generateCookbookSkill', () => {
  it('has correct frontmatter name', () => {
    expect(generateCookbookSkill(simpleConfig)).toContain('name: cookbook');
  });

  it('has a description covering best-practice documentation', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('best practices');
  });

  it('includes orient step that reads tiller.json', () => {
    expect(generateCookbookSkill(simpleConfig)).toContain('.tiller/tiller.json');
  });

  it('includes orient step that announces current mode', () => {
    expect(generateCookbookSkill(simpleConfig)).toContain('Mode: <mode>');
  });

  it('detects technologies by scanning manifest files', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('package.json');
    expect(result).toContain('Cargo.toml');
    expect(result).toContain('go.mod');
  });

  it('uses Explore agent to scan the project', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('Explore agent');
    expect(result).toContain('subagent_type: "Explore"');
  });

  it('checks for existing guidelines in common documentation locations', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('CONTRIBUTING.md');
    expect(result).toContain('README.md');
  });

  it('asks user to confirm when no guidelines are found', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('confirm');
    expect(result).toContain('confirmed');
  });

  it('asks user where to place the cookbook folder', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('cookbook-root');
    expect(result).toContain('docs/cookbook');
  });

  it('spawns general-purpose sub-agent to research each technology', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('subagent_type: "general-purpose"');
    expect(result).toContain('production-grade');
  });

  it('instructs creation of per-technology subfolders', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('<technology-1>');
    expect(result).toContain('<technology-2>');
  });

  it('creates multiple topic files per technology rather than one big file', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('coding-style.md');
    expect(result).toContain('testing.md');
    expect(result).toContain('security.md');
    expect(result).toContain('pitfalls.md');
  });

  it('creates a top-level README.md with an index', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('README.md');
    expect(result).toContain('Project Cookbook');
  });

  it('instructs cross-referencing between technology files', () => {
    expect(generateCookbookSkill(simpleConfig)).toContain('Cross-reference');
  });

  it('outputs a summary of what was created', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('Cookbook created at');
    expect(result).toContain('Technologies documented');
  });

  it('handles both simple and detailed modes at runtime', () => {
    const result = generateCookbookSkill(simpleConfig);
    expect(result).toContain('simple');
    expect(result).toContain('detailed');
  });

  it('does not vary output based on config mode (runtime-evaluated)', () => {
    const simple = generateCookbookSkill(simpleConfig);
    const detailed = generateCookbookSkill(detailedConfig);
    expect(simple).toEqual(detailed);
  });
});
