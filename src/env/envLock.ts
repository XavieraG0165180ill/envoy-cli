import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface LockEntry {
  environment: string;
  lockedBy: string;
  lockedAt: string;
  reason?: string;
}

export type LockMap = Record<string, LockEntry>;

export function getLockFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'locks.json');
}

export function loadLocks(): LockMap {
  const lockFile = getLockFilePath();
  if (!fs.existsSync(lockFile)) return {};
  try {
    const raw = fs.readFileSync(lockFile, 'utf-8');
    return JSON.parse(raw) as LockMap;
  } catch {
    return {};
  }
}

export function saveLocks(locks: LockMap): void {
  const lockFile = getLockFilePath();
  fs.writeFileSync(lockFile, JSON.stringify(locks, null, 2), 'utf-8');
}

export function lockEnvironment(environment: string, lockedBy: string, reason?: string): void {
  const locks = loadLocks();
  locks[environment] = {
    environment,
    lockedBy,
    lockedAt: new Date().toISOString(),
    reason,
  };
  saveLocks(locks);
}

export function unlockEnvironment(environment: string): boolean {
  const locks = loadLocks();
  if (!locks[environment]) return false;
  delete locks[environment];
  saveLocks(locks);
  return true;
}

export function isLocked(environment: string): LockEntry | null {
  const locks = loadLocks();
  return locks[environment] ?? null;
}

export function listLocks(): LockEntry[] {
  return Object.values(loadLocks());
}
