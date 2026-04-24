import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';
import { loadHistory } from './envHistory';

/**
 * Represents a single migration step that transforms an env map.
 */
export interface MigrationStep {
  version: number;
  description: string;
  /** Transform function: receives current key-value map, returns updated map */
  up: (env: Record<string, string>) => Record<string, string>;
  /** Reverse transform (optional rollback) */
  down?: (env: Record<string, string>) => Record<string, string>;
}

/**
 * Metadata stored per environment to track which migration version it's at.
 */
export interface MigrationState {
  environment: string;
  currentVersion: number;
  appliedAt: string;
}

type MigrationStateMap = Record<string, MigrationState>;

/** Returns path to the migration state file inside the envoy data dir. */
export function getMigrationFilePath(baseDir: string): string {
  return path.join(baseDir, 'migrations.json');
}

/** Load migration states from disk. */
export function loadMigrationStates(baseDir: string): MigrationStateMap {
  const filePath = getMigrationFilePath(baseDir);
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MigrationStateMap;
  } catch {
    return {};
  }
}

/** Persist migration states to disk. */
export function saveMigrationStates(baseDir: string, states: MigrationStateMap): void {
  const filePath = getMigrationFilePath(baseDir);
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(states, null, 2), 'utf-8');
}

/**
 * Apply pending migrations to an env map.
 *
 * @param env          - Current key-value map for the environment.
 * @param environment  - Environment name (e.g. "production").
 * @param migrations   - Ordered list of migration steps (ascending version).
 * @param baseDir      - Directory where state file is stored.
 * @returns            - Updated env map after applying all pending steps.
 */
export function applyMigrations(
  env: Record<string, string>,
  environment: string,
  migrations: MigrationStep[],
  baseDir: string
): { env: Record<string, string>; applied: number[] } {
  const states = loadMigrationStates(baseDir);
  const state = states[environment] ?? { environment, currentVersion: 0, appliedAt: '' };

  const pending = migrations
    .filter((m) => m.version > state.currentVersion)
    .sort((a, b) => a.version - b.version);

  const applied: number[] = [];
  let current = { ...env };

  for (const step of pending) {
    current = step.up(current);
    applied.push(step.version);
  }

  if (applied.length > 0) {
    const lastVersion = applied[applied.length - 1];
    states[environment] = {
      environment,
      currentVersion: lastVersion,
      appliedAt: new Date().toISOString(),
    };
    saveMigrationStates(baseDir, states);
  }

  return { env: current, applied };
}

/**
 * Roll back the last applied migration for an environment.
 *
 * @returns Updated env map, or null if no rollback is possible.
 */
export function rollbackMigration(
  env: Record<string, string>,
  environment: string,
  migrations: MigrationStep[],
  baseDir: string
): { env: Record<string, string>; rolledBack: number } | null {
  const states = loadMigrationStates(baseDir);
  const state = states[environment];
  if (!state || state.currentVersion === 0) return null;

  const step = migrations.find((m) => m.version === state.currentVersion);
  if (!step || !step.down) return null;

  const updated = step.down({ ...env });
  const prevVersion = Math.max(
    0,
    ...migrations.filter((m) => m.version < state.currentVersion).map((m) => m.version)
  );

  states[environment] = {
    environment,
    currentVersion: prevVersion,
    appliedAt: new Date().toISOString(),
  };
  saveMigrationStates(baseDir, states);

  return { env: updated, rolledBack: step.version };
}

/** Get the current migration version for an environment. */
export function getMigrationVersion(environment: string, baseDir: string): number {
  const states = loadMigrationStates(baseDir);
  return states[environment]?.currentVersion ?? 0;
}
