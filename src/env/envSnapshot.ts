import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';

export interface Snapshot {
  id: string;
  environment: string;
  timestamp: string;
  label?: string;
  data: Record<string, string>;
}

function getSnapshotDir(): string {
  return path.join(getStorePath(), 'snapshots');
}

export function getSnapshotPath(environment: string): string {
  return path.join(getSnapshotDir(), `${environment}.json`);
}

export function loadSnapshots(environment: string): Snapshot[] {
  const filePath = getSnapshotPath(environment);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveSnapshot(
  environment: string,
  data: Record<string, string>,
  label?: string
): Snapshot {
  const dir = getSnapshotDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const snapshots = loadSnapshots(environment);
  const snapshot: Snapshot = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    environment,
    timestamp: new Date().toISOString(),
    label,
    data,
  };

  snapshots.push(snapshot);
  fs.writeFileSync(getSnapshotPath(environment), JSON.stringify(snapshots, null, 2));
  return snapshot;
}

export function deleteSnapshot(environment: string, id: string): boolean {
  const snapshots = loadSnapshots(environment);
  const filtered = snapshots.filter((s) => s.id !== id);
  if (filtered.length === snapshots.length) return false;
  fs.writeFileSync(getSnapshotPath(environment), JSON.stringify(filtered, null, 2));
  return true;
}

export function getSnapshotById(environment: string, id: string): Snapshot | undefined {
  return loadSnapshots(environment).find((s) => s.id === id);
}

export function clearSnapshots(environment: string): void {
  const filePath = getSnapshotPath(environment);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
