import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from '../crypto/encryption';
import { loadMasterKey } from '../crypto/keyManager';
import { parseEnvContent, serializeEnv, EnvEntry, envToRecord } from './envParser';

const ENVOY_STORE_DIR = '.envoy/store';

export function getStorePath(environment: string): string {
  return path.join(process.cwd(), ENVOY_STORE_DIR, `${environment}.enc`);
}

export async function saveEnvToStore(
  environment: string,
  entries: EnvEntry[]
): Promise<void> {
  const masterKey = await loadMasterKey();
  const plaintext = serializeEnv(entries);
  const encrypted = await encrypt(plaintext, masterKey);

  const storePath = getStorePath(environment);
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(encrypted), 'utf-8');
}

export async function loadEnvFromStore(
  environment: string
): Promise<EnvEntry[]> {
  const storePath = getStorePath(environment);

  if (!fs.existsSync(storePath)) {
    throw new Error(`No stored environment found for: ${environment}`);
  }

  const masterKey = await loadMasterKey();
  const encryptedData = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
  const plaintext = await decrypt(encryptedData, masterKey);
  return parseEnvContent(plaintext).entries;
}

export function listStoredEnvironments(): string[] {
  const storeDir = path.join(process.cwd(), ENVOY_STORE_DIR);
  if (!fs.existsSync(storeDir)) return [];

  return fs
    .readdirSync(storeDir)
    .filter((f) => f.endsWith('.enc'))
    .map((f) => f.replace('.enc', ''));
}

export async function exportEnvToFile(
  environment: string,
  outputPath: string
): Promise<void> {
  const entries = await loadEnvFromStore(environment);
  const content = serializeEnv(entries);
  fs.writeFileSync(outputPath, content, 'utf-8');
}
