import { describe, it, expect } from 'vitest';
import { generateSettingsJson } from '../../src/scaffold/settings-json.js';
import { simpleConfig } from '../helpers/fixtures.js';

describe('generateSettingsJson', () => {
  it('produces valid JSON', () => {
    const result = generateSettingsJson(simpleConfig);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('includes PostToolUse hook for Edit|Write|MultiEdit', () => {
    const result = JSON.parse(generateSettingsJson(simpleConfig));
    const postHooks = result.hooks.PostToolUse;
    expect(postHooks).toBeDefined();
    expect(postHooks[0].matcher).toBe('Edit|Write|MultiEdit');
  });

  it('includes PreToolUse hook for Bash', () => {
    const result = JSON.parse(generateSettingsJson(simpleConfig));
    const preHooks = result.hooks.PreToolUse;
    expect(preHooks).toBeDefined();
    expect(preHooks[0].matcher).toBe('Bash');
  });

  it('references post-write.sh', () => {
    const result = generateSettingsJson(simpleConfig);
    expect(result).toContain('post-write.sh');
  });

  it('references secret-scan.sh', () => {
    const result = generateSettingsJson(simpleConfig);
    expect(result).toContain('secret-scan.sh');
  });

  it('includes git permission', () => {
    const result = JSON.parse(generateSettingsJson(simpleConfig));
    expect(result.permissions.allow).toContain('Bash(git:*)');
  });
});
