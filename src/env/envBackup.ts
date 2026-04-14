import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface BackupEntry {
  id: string;
  environment: string;
  createdAt: string;
  description?: string;
  data: string;
}

export function getBackupDir(): string {
  const envoyDir = ensureEnvoyDir();
  const backupDir = path.join(envoyDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

export function getBackupFilePath(environment: string): string {
  return path.join(getBackupDir(), `${environment}.backups.json`);
}

export function loadBackups(environment: string): BackupEntry[] {
  const filePath = getBackupFilePath(environment);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveBackup(
  environment: string,
  data: string,
  description?: string
): BackupEntry {
  const backups = loadBackups(environment);
  const entry: BackupEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    environment,
    createdAt: new Date().toISOString(),
    description,
    data,
  };
  backups.push(entry);
  fs.writeFileSync(getBackupFilePath(environment), JSON.stringify(backups, null, 2));
  return entry;
}

export function deleteBackup(environment: string, id: string): boolean {
  const backups = loadBackups(environment);
  const filtered = backups.filter((b) => b.id !== id);
  if (filtered.length === backups.length) return false;
  fs.writeFileSync(getBackupFilePath(environment), JSON.stringify(filtered, null, 2));
  return true;
}

export function getBackupById(environment: string, id: string): BackupEntry | undefined {
  return loadBackups(environment).find((b) => b.id === id);
}

export function clearBackups(environment: string): void {
  const filePath = getBackupFilePath(environment);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
