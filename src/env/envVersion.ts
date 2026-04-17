import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvVersion {
  id: string;
  environment: string;
  timestamp: string;
  message?: string;
  checksum: string;
}

export function getVersionFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'versions.json');
}

export function loadVersions(): EnvVersion[] {
  const filePath = getVersionFilePath();
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveVersions(versions: EnvVersion[]): void {
  fs.writeFileSync(getVersionFilePath(), JSON.stringify(versions, null, 2));
}

export function addVersion(version: EnvVersion): void {
  const versions = loadVersions();
  versions.push(version);
  saveVersions(versions);
}

export function removeVersion(id: string): boolean {
  const versions = loadVersions();
  const filtered = versions.filter(v => v.id !== id);
  if (filtered.length === versions.length) return false;
  saveVersions(filtered);
  return true;
}

export function getVersionsForEnvironment(environment: string): EnvVersion[] {
  return loadVersions().filter(v => v.environment === environment);
}

export function getVersionById(id: string): EnvVersion | undefined {
  return loadVersions().find(v => v.id === id);
}

export function generateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
