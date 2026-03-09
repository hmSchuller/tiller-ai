import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeFile } from '../utils/fs.js';
import {
  generateTillerManifest,
  getManagedFiles,
  TILLER_VERSION,
  type TillerManifest,
} from '../scaffold/tiller-manifest.js';
import type { ProjectConfig, ToolTarget } from '../scaffold/types.js';
import { regenerateFiles, deleteStaleFiles, deleteStaleManagedFiles } from '../scaffold/regenerate.js';

export type ConfigScope = 'project' | 'local';
export type ConfigOperation = 'read' | 'save';

type ConfigFailure<Operation extends ConfigOperation, Scope extends ConfigScope, Reason extends string> = {
  ok: false;
  operation: Operation;
  scope: Scope;
  reason: Reason;
};

type ConfigFailureWithCause<Operation extends ConfigOperation, Scope extends ConfigScope, Reason extends string> =
  ConfigFailure<Operation, Scope, Reason> & {
    cause: unknown;
  };

export type LocalConfigReadIssue =
  | { operation: 'read'; scope: 'local'; reason: 'read-failed'; cause: unknown }
  | { operation: 'read'; scope: 'local'; reason: 'parse-error'; cause: unknown };

export type ReadConfigResult =
  | { ok: true; manifest: TillerManifest; local: Record<string, unknown>; localIssue?: LocalConfigReadIssue }
  | ConfigFailure<'read', 'project', 'missing'>
  | ConfigFailureWithCause<'read', 'project', 'read-failed'>
  | ConfigFailureWithCause<'read', 'project', 'parse-error'>;

export type SaveConfigResult =
  | { ok: true }
  | ConfigFailureWithCause<'save', 'project', 'delete-stale-failed'>
  | ConfigFailureWithCause<'save', 'project', 'regenerate-failed'>
  | ConfigFailureWithCause<'save', 'project', 'write-failed'>
  | ConfigFailureWithCause<'save', 'local', 'delete-stale-failed'>
  | ConfigFailureWithCause<'save', 'local', 'regenerate-failed'>
  | ConfigFailureWithCause<'save', 'local', 'write-failed'>;

export type EffectiveConfig = {
  mode: 'simple' | 'detailed';
  workflow: 'solo' | 'team';
  tools: ToolTarget[];
};

function getProjectTools(manifest: TillerManifest): ToolTarget[] {
  return manifest.tools ?? ['claude'];
}

function getProjectManagedFiles(manifest: TillerManifest): string[] {
  return manifest.managedFiles ?? getManagedFiles(getProjectTools(manifest));
}

function getLocalManagedFiles(manifest: TillerManifest, local: Record<string, unknown>): string[] {
  return [...new Set([...getProjectManagedFiles(manifest), ...getManagedFiles(getEffectiveConfig(manifest, local).tools)])];
}

/** Order-insensitive array equality for string arrays. */
export function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Read .tiller/tiller.json (required) and .tiller/local.json.
 * Project-level failures are fatal; local-level failures are returned on the success result so
 * callers like the dashboard can surface them without losing access to project defaults.
 */
export async function readConfig(cwd: string): Promise<ReadConfigResult> {
  const manifestPath = resolve(cwd, '.tiller/tiller.json');

  if (!existsSync(manifestPath)) {
    return { ok: false, operation: 'read', scope: 'project', reason: 'missing' };
  }

  let rawManifest: string;
  try {
    rawManifest = await readFile(manifestPath, 'utf-8');
  } catch (cause) {
    return { ok: false, operation: 'read', scope: 'project', reason: 'read-failed', cause };
  }

  let manifest: TillerManifest;
  try {
    manifest = JSON.parse(rawManifest) as TillerManifest;
  } catch (cause) {
    return { ok: false, operation: 'read', scope: 'project', reason: 'parse-error', cause };
  }

  const localPath = resolve(cwd, '.tiller/local.json');
  let local: Record<string, unknown> = {};
  let localIssue: LocalConfigReadIssue | undefined;
  if (existsSync(localPath)) {
    let rawLocal: string;
    try {
      rawLocal = await readFile(localPath, 'utf-8');
    } catch (cause) {
      localIssue = { operation: 'read', scope: 'local', reason: 'read-failed', cause };
      return { ok: true, manifest, local, localIssue };
    }

    try {
      local = JSON.parse(rawLocal) as Record<string, unknown>;
    } catch (cause) {
      localIssue = { operation: 'read', scope: 'local', reason: 'parse-error', cause };
    }
  }

  return localIssue ? { ok: true, manifest, local, localIssue } : { ok: true, manifest, local };
}

/** Derive effective mode/workflow/tools: local overrides project manifest. */
export function getEffectiveConfig(
  manifest: TillerManifest,
  local: Record<string, unknown>,
): EffectiveConfig {
  return {
    mode: (local.mode as 'simple' | 'detailed' | undefined) ?? manifest.mode ?? 'detailed',
    workflow: (local.workflow as 'solo' | 'team' | undefined) ?? manifest.workflow ?? 'solo',
    tools: (local.tools as ToolTarget[] | undefined) ?? manifest.tools ?? ['claude'],
  };
}

/** True when all three new values already match the project manifest. */
export function isProjectNoOp(
  manifest: TillerManifest,
  newMode: 'simple' | 'detailed',
  newWorkflow: 'solo' | 'team',
  newTools: ToolTarget[],
): boolean {
  const oldTools = getProjectTools(manifest);
  return (
    manifest.mode === newMode &&
    (manifest.workflow ?? 'solo') === newWorkflow &&
    arraysEqual(oldTools, newTools)
  );
}

/**
 * True only when local.mode/workflow match AND local.tools is defined and matches.
 * Mirrors the original no-op guard: undefined tools in local is not a no-op.
 */
export function isLocalNoOp(
  local: Record<string, unknown>,
  newMode: 'simple' | 'detailed',
  newWorkflow: 'solo' | 'team',
  newTools: ToolTarget[],
): boolean {
  const oldLocalTools = local.tools as ToolTarget[] | undefined;
  return (
    (local.mode as string | undefined) === newMode &&
    (local.workflow as string | undefined) === newWorkflow &&
    oldLocalTools !== undefined &&
    arraysEqual(oldLocalTools, newTools)
  );
}

/** True when the new tools differ from the project manifest's managed tools. */
export function hasManagedToolsChanged(manifest: TillerManifest, newTools: ToolTarget[]): boolean {
  const oldManagedTools = getProjectTools(manifest);
  return !arraysEqual(oldManagedTools, newTools);
}

/**
 * Persist a project-scope config change.
 * If tools changed: deletes stale files and regenerates all managed files (updates manifest).
 * Otherwise: writes only the manifest.
 */
export async function saveProjectConfig(
  manifest: TillerManifest,
  newMode: 'simple' | 'detailed',
  newWorkflow: 'solo' | 'team',
  newTools: ToolTarget[],
  cwd: string,
): Promise<SaveConfigResult> {
  const config: ProjectConfig = {
    projectName: '',
    description: '',
    runCommand: manifest.runCommand,
    mode: newMode,
    workflow: newWorkflow,
    tools: newTools,
  };

  if (hasManagedToolsChanged(manifest, newTools)) {
    try {
      await deleteStaleFiles(getProjectManagedFiles(manifest), newTools, cwd);
    } catch (cause) {
      return { ok: false, operation: 'save', scope: 'project', reason: 'delete-stale-failed', cause };
    }

    try {
      await regenerateFiles(config, cwd);
    } catch (cause) {
      return { ok: false, operation: 'save', scope: 'project', reason: 'regenerate-failed', cause };
    }

    return { ok: true };
  }

  try {
    await writeFile(resolve(cwd, '.tiller/tiller.json'), generateTillerManifest(config, TILLER_VERSION));
  } catch (cause) {
    return { ok: false, operation: 'save', scope: 'project', reason: 'write-failed', cause };
  }

  return { ok: true };
}

/**
 * Persist a local-scope config change.
 * If tools changed: deletes stale files and regenerates managed files (skipManifest: true).
 * Merges new values into existing local.json to preserve unrelated keys.
 */
export async function saveLocalConfig(
  manifest: TillerManifest,
  local: Record<string, unknown>,
  newMode: 'simple' | 'detailed',
  newWorkflow: 'solo' | 'team',
  newTools: ToolTarget[],
  cwd: string,
): Promise<SaveConfigResult> {
  const localPath = resolve(cwd, '.tiller/local.json');
  const updated = { ...local, mode: newMode, workflow: newWorkflow, tools: newTools };
  const previousEffectiveTools = getEffectiveConfig(manifest, local).tools;

  if (!arraysEqual(previousEffectiveTools, newTools)) {
    const config: ProjectConfig = {
      projectName: '',
      description: '',
      runCommand: manifest.runCommand,
      mode: newMode,
      workflow: newWorkflow,
      tools: newTools,
    };

    try {
      await deleteStaleManagedFiles(
        getLocalManagedFiles(manifest, local),
        getLocalManagedFiles(manifest, updated),
        cwd,
      );
    } catch (cause) {
      return { ok: false, operation: 'save', scope: 'local', reason: 'delete-stale-failed', cause };
    }

    try {
      await regenerateFiles(config, cwd, { skipManifest: true });
    } catch (cause) {
      return { ok: false, operation: 'save', scope: 'local', reason: 'regenerate-failed', cause };
    }
  }

  try {
    await writeFile(localPath, JSON.stringify(updated, null, 2));
  } catch (cause) {
    return { ok: false, operation: 'save', scope: 'local', reason: 'write-failed', cause };
  }

  return { ok: true };
}
