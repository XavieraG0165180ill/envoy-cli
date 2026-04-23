import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface ArchiveEntry {
  environment: string;
  archivedAt: string;
  reason?: string;
  snapshot: Record<string, string>;
}

export interface ArchiveMap {
  [environment: string]: ArchiveEntry;
}

export function getArchiveFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'archives.json');
}

export function loadArchives(): ArchiveMap {
  const filePath = getArchiveFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveArchives(archives: ArchiveMap): void {
  const filePath = getArchiveFilePath();
  fs.writeFileSync(filePath, JSON.stringify(archives, null, 2), 'utf-8');
}

export function archiveEnvironment(
  environment: string,
  snapshot: Record<string, string>,
  reason?: string
): ArchiveEntry {
  const archives = loadArchives();
  const entry: ArchiveEntry = {
    environment,
    archivedAt: new Date().toISOString(),
    reason,
    snapshot,
  };
  archives[environment] = entry;
  saveArchives(archives);
  return entry;
}

export function restoreArchive(environment: string): ArchiveEntry | null {
  const archives = loadArchives();
  return archives[environment] ?? null;
}

export function deleteArchive(environment: string): boolean {
  const archives = loadArchives();
  if (!archives[environment]) return false;
  delete archives[environment];
  saveArchives(archives);
  return true;
}

export function listArchives(): ArchiveEntry[] {
  const archives = loadArchives();
  return Object.values(archives).sort(
    (a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime()
  );
}
