import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface RetentionPolicy {
  environment: string;
  maxVersions?: number;
  maxAgeDays?: number;
  createdAt: string;
}

export type RetentionMap = Record<string, RetentionPolicy>;

export function getRetentionFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'retention.json');
}

export function loadRetentions(): RetentionMap {
  const filePath = getRetentionFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RetentionMap;
  } catch {
    return {};
  }
}

export function saveRetentions(retentions: RetentionMap): void {
  const filePath = getRetentionFilePath();
  fs.writeFileSync(filePath, JSON.stringify(retentions, null, 2));
}

export function setRetention(
  environment: string,
  maxVersions?: number,
  maxAgeDays?: number
): RetentionPolicy {
  const retentions = loadRetentions();
  const policy: RetentionPolicy = {
    environment,
    maxVersions,
    maxAgeDays,
    createdAt: new Date().toISOString(),
  };
  retentions[environment] = policy;
  saveRetentions(retentions);
  return policy;
}

export function removeRetention(environment: string): boolean {
  const retentions = loadRetentions();
  if (!retentions[environment]) return false;
  delete retentions[environment];
  saveRetentions(retentions);
  return true;
}

export function getRetention(environment: string): RetentionPolicy | undefined {
  return loadRetentions()[environment];
}

export function listRetentions(): RetentionPolicy[] {
  return Object.values(loadRetentions());
}

export function isExpiredByAge(policy: RetentionPolicy): boolean {
  if (!policy.maxAgeDays) return false;
  const created = new Date(policy.createdAt).getTime();
  const now = Date.now();
  const ageDays = (now - created) / (1000 * 60 * 60 * 24);
  return ageDays > policy.maxAgeDays;
}
