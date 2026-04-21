/**
 * envDiff.ts
 * Tracks and persists diff history between environment snapshots,
 * enabling audit-friendly change tracking over time.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';
import { compareEnvMaps, formatDiff } from './envCompare';

export interface DiffEntry {
  id: string;
  timestamp: string;
  environment: string;
  fromLabel: string;
  toLabel: string;
  added: string[];
  removed: string[];
  changed: string[];
  summary: string;
}

export interface DiffLog {
  entries: DiffEntry[];
}

/** Returns the path to the diff log file. */
export function getDiffLogPath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'diff-log.json');
}

/** Loads the existing diff log, or returns an empty log. */
export function loadDiffLog(): DiffLog {
  const filePath = getDiffLogPath();
  if (!fs.existsSync(filePath)) {
    return { entries: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as DiffLog;
  } catch {
    return { entries: [] };
  }
}

/** Persists the diff log to disk. */
export function saveDiffLog(log: DiffLog): void {
  const filePath = getDiffLogPath();
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
}

/**
 * Records a diff between two env maps into the persistent diff log.
 * Returns the newly created DiffEntry.
 */
export function recordDiff(
  environment: string,
  fromLabel: string,
  toLabel: string,
  fromMap: Map<string, string>,
  toMap: Map<string, string>
): DiffEntry {
  const result = compareEnvMaps(fromMap, toMap);

  const added = result.added.map((e) => e.key);
  const removed = result.removed.map((e) => e.key);
  const changed = result.changed.map((e) => e.key);

  const parts: string[] = [];
  if (added.length) parts.push(`+${added.length} added`);
  if (removed.length) parts.push(`-${removed.length} removed`);
  if (changed.length) parts.push(`~${changed.length} changed`);
  const summary = parts.length ? parts.join(', ') : 'no changes';

  const entry: DiffEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    environment,
    fromLabel,
    toLabel,
    added,
    removed,
    changed,
    summary,
  };

  const log = loadDiffLog();
  log.entries.push(entry);
  saveDiffLog(log);

  return entry;
}

/** Returns all diff entries for a given environment, newest first. */
export function getDiffsForEnvironment(environment: string): DiffEntry[] {
  const log = loadDiffLog();
  return log.entries
    .filter((e) => e.environment === environment)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Removes all diff log entries for a given environment. */
export function clearDiffsForEnvironment(environment: string): void {
  const log = loadDiffLog();
  log.entries = log.entries.filter((e) => e.environment !== environment);
  saveDiffLog(log);
}

/** Clears the entire diff log. */
export function clearAllDiffs(): void {
  saveDiffLog({ entries: [] });
}
