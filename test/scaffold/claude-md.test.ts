import { describe, it, expect } from 'vitest';
import { generateTillerMd, generateUserClaudeMd } from '../../src/scaffold/claude-md.js';
import { simpleConfig } from '../helpers/fixtures.js';

describe('generateTillerMd', () => {
  it('contains vibe loop instructions', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('Orient');
    expect(result).toContain('Plan');
    expect(result).toContain('Build');
    expect(result).toContain('Review');
    expect(result).toContain('Dock');
  });

  it('lists all four skills', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('/sail');
    expect(result).toContain('/anchor');
    expect(result).toContain('/dock');
    expect(result).toContain('/recap');
  });

  it('mentions feature branches', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('feature branch');
  });

  it('describes both workflow modes', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('### solo');
    expect(result).toContain('### team');
  });

  it('documents changelog.md tracking', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('changelog.md');
  });

  it('documents per-dev override via .tiller/local.json', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('.tiller/local.json');
  });

  it('mentions agent team parallelization in vibe loop description', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('agent teams');
    expect(result).toContain('[independent]');
  });

  it('describes agent team usage in /sail skill listing', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('parallelized');
  });

  it('has an Agents section listing all four agents', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('## Agents');
    expect(result).toContain('quartermaster');
    expect(result).toContain('bosun');
    expect(result).toContain('captain');
    expect(result).toContain('cartographer');
  });

  it('notes which agents use opus model', () => {
    const result = generateTillerMd(simpleConfig);
    // opus is now indicated via (opus) annotation, not model: "opus"
    expect(result).toContain('(opus)');
  });

  it('Agents section appears after Skills section', () => {
    const result = generateTillerMd(simpleConfig);
    const skillsIdx = result.indexOf('## Skills');
    const agentsIdx = result.indexOf('## Agents');
    expect(skillsIdx).toBeGreaterThan(-1);
    expect(agentsIdx).toBeGreaterThan(skillsIdx);
  });

  it('mentions codebase-map.md in the vibe loop orient step', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('codebase-map.md');
  });

  it('has an Upgrading section with key commands', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('## Upgrading');
    expect(result).toContain('npx tiller-ai --version');
    expect(result).toContain('npm view tiller-ai version');
    expect(result).toContain('npx tiller-ai upgrade --yes');
  });

  it('Upgrading section appears before Skills section', () => {
    const result = generateTillerMd(simpleConfig);
    const upgradingIdx = result.indexOf('## Upgrading');
    const skillsIdx = result.indexOf('## Skills');
    expect(upgradingIdx).toBeGreaterThan(-1);
    expect(skillsIdx).toBeGreaterThan(upgradingIdx);
  });

  it('does not contain "Do not edit manually" header', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).not.toContain('Do not edit manually');
  });

  it('team section notes chore branches are pushed as PRs', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('Tech debt chore branches');
    expect(result).toContain('pushed and opened as PRs');
  });
});

describe('generateTillerMd — config source', () => {
  it('references .tiller.json for mode, not CLAUDE.md', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).toContain('.tiller/tiller.json');
    expect(result).not.toContain('mode is set in CLAUDE.md');
  });

  it('references .tiller.json for workflow, not CLAUDE.md', () => {
    const result = generateTillerMd(simpleConfig);
    expect(result).not.toContain('workflow is set in CLAUDE.md');
  });
});

describe('generateUserClaudeMd', () => {
  it('contains the @../.tiller/TILLER.md import line', () => {
    const result = generateUserClaudeMd();
    expect(result).toContain('@../.tiller/TILLER.md');
  });

  it('does not contain Tiller rules content', () => {
    const result = generateUserClaudeMd();
    expect(result).not.toContain('## Modes');
    expect(result).not.toContain('## Vibe loop');
    expect(result).not.toContain('## Skills');
    expect(result).not.toContain('## Rules');
  });

  it('contains only the import line (no extra noise)', () => {
    const result = generateUserClaudeMd();
    expect(result.trim()).toBe('@../.tiller/TILLER.md');
  });
});
