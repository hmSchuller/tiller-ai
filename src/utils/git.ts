import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function exec(cmd: string, cwd: string): void {
  execSync(cmd, { cwd, stdio: 'pipe' });
}

export function isGitRepo(cwd: string): boolean {
  return existsSync(join(cwd, '.git'));
}

export function gitInit(cwd: string): void {
  exec('git init', cwd);
  // Set branch to main only on fresh repos; existing repos keep their branch
  try {
    exec('git checkout -b main', cwd);
  } catch {
    // Already on a branch — that's fine
  }
  // Ensure a local identity exists so commits work in CI environments
  try {
    execSync('git config user.email', { cwd, stdio: 'pipe' });
  } catch {
    exec('git config user.email "tiller@scaffold"', cwd);
    exec('git config user.name "Tiller"', cwd);
  }
}

export function gitAdd(cwd: string, pattern = '-A'): void {
  exec(`git add ${pattern}`, cwd);
}

export function gitCommit(cwd: string, message: string): void {
  exec(`git commit -m "${message.replace(/"/g, '\\"')}"`, cwd);
}
