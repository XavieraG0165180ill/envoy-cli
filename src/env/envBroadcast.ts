import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface BroadcastMessage {
  id: string;
  environment: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: string;
  expiresAt?: string;
  author?: string;
}

function getBroadcastFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'broadcasts.json');
}

export function loadBroadcasts(): BroadcastMessage[] {
  const filePath = getBroadcastFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveBroadcasts(broadcasts: BroadcastMessage[]): void {
  const filePath = getBroadcastFilePath();
  fs.writeFileSync(filePath, JSON.stringify(broadcasts, null, 2), 'utf-8');
}

export function addBroadcast(
  environment: string,
  message: string,
  severity: BroadcastMessage['severity'] = 'info',
  options: { expiresAt?: string; author?: string } = {}
): BroadcastMessage {
  const broadcasts = loadBroadcasts();
  const entry: BroadcastMessage = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    environment,
    message,
    severity,
    createdAt: new Date().toISOString(),
    ...options,
  };
  broadcasts.push(entry);
  saveBroadcasts(broadcasts);
  return entry;
}

export function removeBroadcast(id: string): boolean {
  const broadcasts = loadBroadcasts();
  const next = broadcasts.filter((b) => b.id !== id);
  if (next.length === broadcasts.length) return false;
  saveBroadcasts(next);
  return true;
}

export function getBroadcastsForEnvironment(environment: string): BroadcastMessage[] {
  return loadBroadcasts().filter((b) => b.environment === environment);
}

export function pruneExpiredBroadcasts(): number {
  const broadcasts = loadBroadcasts();
  const now = new Date().toISOString();
  const active = broadcasts.filter((b) => !b.expiresAt || b.expiresAt > now);
  const removed = broadcasts.length - active.length;
  if (removed > 0) saveBroadcasts(active);
  return removed;
}
