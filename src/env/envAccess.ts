import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface AccessEntry {
  environment: string;
  allowedUsers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AccessMap {
  [environment: string]: AccessEntry;
}

export function getAccessFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'access.json');
}

export function loadAccess(): AccessMap {
  const filePath = getAccessFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AccessMap;
  } catch {
    return {};
  }
}

export function saveAccess(access: AccessMap): void {
  const filePath = getAccessFilePath();
  fs.writeFileSync(filePath, JSON.stringify(access, null, 2), 'utf-8');
}

export function grantAccess(environment: string, user: string): AccessEntry {
  const access = loadAccess();
  const now = new Date().toISOString();
  if (!access[environment]) {
    access[environment] = { environment, allowedUsers: [], createdAt: now, updatedAt: now };
  }
  const entry = access[environment];
  if (!entry.allowedUsers.includes(user)) {
    entry.allowedUsers.push(user);
    entry.updatedAt = now;
  }
  saveAccess(access);
  return entry;
}

export function revokeAccess(environment: string, user: string): boolean {
  const access = loadAccess();
  if (!access[environment]) return false;
  const entry = access[environment];
  const idx = entry.allowedUsers.indexOf(user);
  if (idx === -1) return false;
  entry.allowedUsers.splice(idx, 1);
  entry.updatedAt = new Date().toISOString();
  saveAccess(access);
  return true;
}

export function listAccess(environment: string): string[] {
  const access = loadAccess();
  return access[environment]?.allowedUsers ?? [];
}

export function hasAccess(environment: string, user: string): boolean {
  return listAccess(environment).includes(user);
}
