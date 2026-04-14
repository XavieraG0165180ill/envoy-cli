import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { encrypt, decrypt } from '../crypto/encryption';
import { loadMasterKey } from '../crypto/keyManager';
import { getStorePath } from './envStore';

export interface ShareToken {
  id: string;
  environment: string;
  createdAt: string;
  expiresAt: string | null;
  encryptedPayload: string;
  iv: string;
  salt: string;
}

export function getShareDir(): string {
  return path.join(process.env.HOME || '~', '.envoy', 'shares');
}

export function getShareFilePath(id: string): string {
  return path.join(getShareDir(), `${id}.json`);
}

export async function createShareToken(
  environment: string,
  ttlMinutes?: number
): Promise<ShareToken> {
  const masterKey = await loadMasterKey();
  const storePath = getStorePath(environment);

  if (!fs.existsSync(storePath)) {
    throw new Error(`Environment '${environment}' does not exist.`);
  }

  const raw = fs.readFileSync(storePath, 'utf-8');
  const { encryptedData, iv, salt } = await encrypt(raw, masterKey);

  const id = crypto.randomBytes(12).toString('hex');
  const now = new Date();
  const expiresAt = ttlMinutes
    ? new Date(now.getTime() + ttlMinutes * 60 * 1000).toISOString()
    : null;

  const token: ShareToken = {
    id,
    environment,
    createdAt: now.toISOString(),
    expiresAt,
    encryptedPayload: encryptedData,
    iv,
    salt,
  };

  const shareDir = getShareDir();
  if (!fs.existsSync(shareDir)) {
    fs.mkdirSync(shareDir, { recursive: true });
  }

  fs.writeFileSync(getShareFilePath(id), JSON.stringify(token, null, 2));
  return token;
}

export async function resolveShareToken(id: string): Promise<string> {
  const filePath = getShareFilePath(id);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Share token '${id}' not found.`);
  }

  const token: ShareToken = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
    throw new Error(`Share token '${id}' has expired.`);
  }

  const masterKey = await loadMasterKey();
  const decrypted = await decrypt(token.encryptedPayload, token.iv, token.salt, masterKey);
  return decrypted;
}

export function revokeShareToken(id: string): void {
  const filePath = getShareFilePath(id);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Share token '${id}' not found.`);
  }
  fs.unlinkSync(filePath);
}

export function listShareTokens(): ShareToken[] {
  const shareDir = getShareDir();
  if (!fs.existsSync(shareDir)) return [];
  return fs.readdirSync(shareDir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(shareDir, f), 'utf-8')));
}
