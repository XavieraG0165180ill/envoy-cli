import * as fs from 'fs';
import * as path from 'path';
import { encrypt, decrypt } from '../crypto/encryption';
import { loadMasterKey } from '../crypto/keyManager';

export interface CipherEntry {
  environment: string;
  key: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
}

export interface CipherStore {
  entries: CipherEntry[];
}

export function getCipherFilePath(baseDir: string): string {
  return path.join(baseDir, '.envoy', 'cipher.json');
}

export function loadCipherStore(baseDir: string): CipherStore {
  const filePath = getCipherFilePath(baseDir);
  if (!fs.existsSync(filePath)) {
    return { entries: [] };
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as CipherStore;
}

export function saveCipherStore(baseDir: string, store: CipherStore): void {
  const filePath = getCipherFilePath(baseDir);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

export async function cipherSet(
  baseDir: string,
  environment: string,
  key: string,
  value: string
): Promise<void> {
  const masterKey = await loadMasterKey(baseDir);
  const { ciphertext, iv } = await encrypt(value, masterKey);
  const store = loadCipherStore(baseDir);
  const now = new Date().toISOString();
  const idx = store.entries.findIndex(
    (e) => e.environment === environment && e.key === key
  );
  if (idx >= 0) {
    store.entries[idx] = { environment, key, ciphertext, iv, createdAt: store.entries[idx].createdAt, updatedAt: now };
  } else {
    store.entries.push({ environment, key, ciphertext, iv, createdAt: now, updatedAt: now });
  }
  saveCipherStore(baseDir, store);
}

export async function cipherGet(
  baseDir: string,
  environment: string,
  key: string
): Promise<string | undefined> {
  const store = loadCipherStore(baseDir);
  const entry = store.entries.find((e) => e.environment === environment && e.key === key);
  if (!entry) return undefined;
  const masterKey = await loadMasterKey(baseDir);
  return decrypt(entry.ciphertext, entry.iv, masterKey);
}

export function cipherRemove(baseDir: string, environment: string, key: string): boolean {
  const store = loadCipherStore(baseDir);
  const before = store.entries.length;
  store.entries = store.entries.filter((e) => !(e.environment === environment && e.key === key));
  if (store.entries.length !== before) {
    saveCipherStore(baseDir, store);
    return true;
  }
  return false;
}

export function cipherList(baseDir: string, environment: string): CipherEntry[] {
  const store = loadCipherStore(baseDir);
  return store.entries.filter((e) => e.environment === environment);
}
