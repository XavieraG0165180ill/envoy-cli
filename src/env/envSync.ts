import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from '../crypto/encryption';
import { loadMasterKey } from '../crypto/keyManager';
import { parseEnvContent, serializeEnv, EnvRecord } from './envParser';
import { getStorePath } from './envStore';

export interface SyncOptions {
  environment: string;
  filePath?: string;
}

export async function pushEnv(options: SyncOptions): Promise<void> {
  const { environment, filePath = '.env' } = options;

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const masterKey = await loadMasterKey();
  const encrypted = await encrypt(content, masterKey);

  const storePath = getStorePath(environment);
  const storeDir = path.dirname(storePath);

  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }

  fs.writeFileSync(storePath, JSON.stringify(encrypted, null, 2), 'utf-8');
}

export async function pullEnv(options: SyncOptions): Promise<EnvRecord> {
  const { environment, filePath = '.env' } = options;

  const storePath = getStorePath(environment);

  if (!fs.existsSync(storePath)) {
    throw new Error(`No stored environment found for: ${environment}`);
  }

  const raw = fs.readFileSync(storePath, 'utf-8');
  const encrypted = JSON.parse(raw);
  const masterKey = await loadMasterKey();
  const decrypted = await decrypt(encrypted, masterKey);

  const parsed = parseEnvContent(decrypted);

  if (filePath) {
    const serialized = serializeEnv(parsed);
    fs.writeFileSync(filePath, serialized, 'utf-8');
  }

  return parsed;
}

export async function diffEnv(
  environment: string,
  filePath: string = '.env'
): Promise<{ added: string[]; removed: string[]; changed: string[] }> {
  const storePath = getStorePath(environment);

  const localVars: EnvRecord = fs.existsSync(filePath)
    ? parseEnvContent(fs.readFileSync(filePath, 'utf-8'))
    : {};

  if (!fs.existsSync(storePath)) {
    return { added: Object.keys(localVars), removed: [], changed: [] };
  }

  const raw = fs.readFileSync(storePath, 'utf-8');
  const encrypted = JSON.parse(raw);
  const masterKey = await loadMasterKey();
  const decrypted = await decrypt(encrypted, masterKey);
  const remoteVars = parseEnvContent(decrypted);

  const allKeys = new Set([...Object.keys(localVars), ...Object.keys(remoteVars)]);
  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];

  for (const key of allKeys) {
    if (!(key in remoteVars)) added.push(key);
    else if (!(key in localVars)) removed.push(key);
    else if (localVars[key] !== remoteVars[key]) changed.push(key);
  }

  return { added, removed, changed };
}

/**
 * Returns true if the local env file and the stored environment are in sync
 * (i.e. no added, removed, or changed keys).
 */
export async function isEnvInSync(
  environment: string,
  filePath: string = '.env'
): Promise<boolean> {
  const { added, removed, changed } = await diffEnv(environment, filePath);
  return added.length === 0 && removed.length === 0 && changed.length === 0;
}
