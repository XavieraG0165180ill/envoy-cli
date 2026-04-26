import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export type EncryptionAlgorithm = 'aes-256-gcm' | 'aes-128-gcm' | 'chacha20-poly1305';

export interface EncryptionPolicy {
  environment: string;
  algorithm: EncryptionAlgorithm;
  rotationDays: number;
  requireEncryption: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EncryptionPolicyMap = Record<string, EncryptionPolicy>;

export function getPolicyFilePath(): string {
  return path.join(ensureEnvoyDir(), 'encryption-policies.json');
}

export function loadPolicies(): EncryptionPolicyMap {
  const filePath = getPolicyFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function savePolicies(policies: EncryptionPolicyMap): void {
  fs.writeFileSync(getPolicyFilePath(), JSON.stringify(policies, null, 2));
}

export function setPolicy(
  environment: string,
  algorithm: EncryptionAlgorithm,
  rotationDays: number,
  requireEncryption: boolean
): EncryptionPolicy {
  const policies = loadPolicies();
  const now = new Date().toISOString();
  const existing = policies[environment];
  const policy: EncryptionPolicy = {
    environment,
    algorithm,
    rotationDays,
    requireEncryption,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  policies[environment] = policy;
  savePolicies(policies);
  return policy;
}

export function removePolicy(environment: string): boolean {
  const policies = loadPolicies();
  if (!policies[environment]) return false;
  delete policies[environment];
  savePolicies(policies);
  return true;
}

export function getPolicy(environment: string): EncryptionPolicy | undefined {
  return loadPolicies()[environment];
}

export function isPolicyExpired(policy: EncryptionPolicy): boolean {
  const updated = new Date(policy.updatedAt).getTime();
  const expiresAt = updated + policy.rotationDays * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}
