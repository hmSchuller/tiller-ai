import { describe, it, expect } from 'vitest';
import { generateSessionResumeHook } from '../../src/scaffold/hooks/session-resume.js';
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

  it('references compass.md', () => {
    const result = generateSessionResumeHook(simpleConfig);
    expect(result).toContain('compass.md');
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
