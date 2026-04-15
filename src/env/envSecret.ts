import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from '../crypto/encryption';
import { loadMasterKey } from '../crypto/keyManager';

export interface SecretEntry {
  key: string;
  encryptedValue: string;
  environment: string;
  createdAt: string;
  updatedAt: string;
}

export interface SecretsFile {
  secrets: SecretEntry[];
}

export function getSecretFilePath(baseDir: string, environment: string): string {
  return path.join(baseDir, '.envoy', 'secrets', `${environment}.secrets.json`);
}

export function loadSecrets(filePath: string): SecretsFile {
  if (!fs.existsSync(filePath)) {
    return { secrets: [] };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as SecretsFile;
}

export function saveSecrets(filePath: string, data: SecretsFile): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function addSecret(
  filePath: string,
  environment: string,
  key: string,
  value: string
): Promise<void> {
  const masterKey = await loadMasterKey(path.join(path.dirname(path.dirname(filePath))));
  const encryptedValue = await encrypt(value, masterKey);
  const data = loadSecrets(filePath);
  const now = new Date().toISOString();
  const existing = data.secrets.findIndex(s => s.key === key && s.environment === environment);
  if (existing >= 0) {
    data.secrets[existing].encryptedValue = encryptedValue;
    data.secrets[existing].updatedAt = now;
  } else {
    data.secrets.push({ key, encryptedValue, environment, createdAt: now, updatedAt: now });
  }
  saveSecrets(filePath, data);
}

export async function getSecret(
  filePath: string,
  environment: string,
  key: string
): Promise<string | null> {
  const masterKey = await loadMasterKey(path.join(path.dirname(path.dirname(filePath))));
  const data = loadSecrets(filePath);
  const entry = data.secrets.find(s => s.key === key && s.environment === environment);
  if (!entry) return null;
  return decrypt(entry.encryptedValue, masterKey);
}

export function removeSecret(filePath: string, environment: string, key: string): boolean {
  const data = loadSecrets(filePath);
  const before = data.secrets.length;
  data.secrets = data.secrets.filter(s => !(s.key === key && s.environment === environment));
  if (data.secrets.length === before) return false;
  saveSecrets(filePath, data);
  return true;
}

export function listSecrets(filePath: string, environment: string): SecretEntry[] {
  const data = loadSecrets(filePath);
  return data.secrets.filter(s => s.environment === environment);
}
