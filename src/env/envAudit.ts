import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface AuditEntry {
  timestamp: string;
  action: 'push' | 'pull' | 'copy' | 'rotate' | 'delete' | 'rename';
  environment: string;
  user?: string;
  details?: string;
}

export function getAuditLogPath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'audit.log');
}

export function loadAuditLog(): AuditEntry[] {
  const logPath = getAuditLogPath();
  if (!fs.existsSync(logPath)) {
    return [];
  }
  const raw = fs.readFileSync(logPath, 'utf-8').trim();
  if (!raw) return [];
  return raw
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AuditEntry);
}

export function appendAuditEntry(entry: Omit<AuditEntry, 'timestamp'>): void {
  const logPath = getAuditLogPath();
  const full: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };
  fs.appendFileSync(logPath, JSON.stringify(full) + '\n', 'utf-8');
}

export function clearAuditLog(): void {
  const logPath = getAuditLogPath();
  if (fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '', 'utf-8');
  }
}

export function getAuditForEnvironment(environment: string): AuditEntry[] {
  return loadAuditLog().filter((e) => e.environment === environment);
}
