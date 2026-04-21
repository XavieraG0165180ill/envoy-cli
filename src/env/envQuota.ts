import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface QuotaConfig {
  environment: string;
  maxKeys: number;
  maxValueLength: number;
  maxTotalSize: number; // bytes
  createdAt: string;
  updatedAt: string;
}

export interface QuotaViolation {
  type: 'maxKeys' | 'maxValueLength' | 'maxTotalSize';
  message: string;
  current: number;
  limit: number;
}

function getQuotaFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'quotas.json');
}

export function loadQuotas(): QuotaConfig[] {
  const filePath = getQuotaFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export function saveQuotas(quotas: QuotaConfig[]): void {
  const filePath = getQuotaFilePath();
  fs.writeFileSync(filePath, JSON.stringify(quotas, null, 2), 'utf-8');
}

export function setQuota(
  environment: string,
  maxKeys: number,
  maxValueLength: number,
  maxTotalSize: number
): QuotaConfig {
  const quotas = loadQuotas();
  const now = new Date().toISOString();
  const existing = quotas.findIndex(q => q.environment === environment);
  const quota: QuotaConfig = {
    environment,
    maxKeys,
    maxValueLength,
    maxTotalSize,
    createdAt: existing >= 0 ? quotas[existing].createdAt : now,
    updatedAt: now,
  };
  if (existing >= 0) {
    quotas[existing] = quota;
  } else {
    quotas.push(quota);
  }
  saveQuotas(quotas);
  return quota;
}

export function removeQuota(environment: string): boolean {
  const quotas = loadQuotas();
  const filtered = quotas.filter(q => q.environment !== environment);
  if (filtered.length === quotas.length) return false;
  saveQuotas(filtered);
  return true;
}

export function getQuota(environment: string): QuotaConfig | undefined {
  return loadQuotas().find(q => q.environment === environment);
}

export function checkQuota(
  environment: string,
  envMap: Map<string, string>
): QuotaViolation[] {
  const quota = getQuota(environment);
  if (!quota) return [];
  const violations: QuotaViolation[] = [];
  if (envMap.size > quota.maxKeys) {
    violations.push({
      type: 'maxKeys',
      message: `Too many keys in environment "${environment}"`,
      current: envMap.size,
      limit: quota.maxKeys,
    });
  }
  let totalSize = 0;
  for (const [key, value] of envMap) {
    totalSize += Buffer.byteLength(`${key}=${value}\n`, 'utf-8');
    if (value.length > quota.maxValueLength) {
      violations.push({
        type: 'maxValueLength',
        message: `Value for key "${key}" exceeds max length`,
        current: value.length,
        limit: quota.maxValueLength,
      });
    }
  }
  if (totalSize > quota.maxTotalSize) {
    violations.push({
      type: 'maxTotalSize',
      message: `Total size of environment "${environment}" exceeds limit`,
      current: totalSize,
      limit: quota.maxTotalSize,
    });
  }
  return violations;
}
