import { describe, it, expect } from 'vitest';
import { generateSessionResumeHook } from '../../src/scaffold/hooks/session-resume.js';
import { generatePlanContextHook } from '../../src/scaffold/hooks/plan-context.js';
import { simpleConfig } from '../helpers/fixtures.js';

describe('generateSessionResumeHook', () => {
  it('detects feature/* branches', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('feature/*');
  });

  it('detects fix/* branches', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('fix/*');
  });

  it('references .tiller/compass.md', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('.tiller/compass.md');
  });

  it('tells Claude to read compass.md for full context', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('read it for full context');
  });

  it('still prompts to use /sail', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('/sail');
  });

  it('is a bash script', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });
});

describe('generatePlanContextHook', () => {
  it('is a bash script', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('#!/usr/bin/env bash');
  });

  it('contains the plan template with all required sections', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('## Context');
    expect(result).toContain('## Approach');
    expect(result).toContain('## Milestones');
    expect(result).toContain('## Files to modify');
    expect(result).toContain('## Trade-offs');
    expect(result).toContain('## Execution rules');
    expect(result).toContain('## Quartermaster review');
    expect(result).toContain('## Verification');
  });

  it('reads .tiller/compass.md if it exists', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('.tiller/compass.md');
    expect(result).toContain('cat .tiller/compass.md');
  });

  it('outputs JSON with hookSpecificOutput.additionalContext', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('hookSpecificOutput');
    expect(result).toContain('additionalContext');
  });

  it('includes the configured run command', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain(simpleConfig.runCommand);
  });

  it('mentions milestone tagging requirement', () => {
    const result = generatePlanContextHook(simpleConfig);
    expect(result).toContain('[independent]');
    expect(result).toContain('[depends-on: N]');
  });
});
