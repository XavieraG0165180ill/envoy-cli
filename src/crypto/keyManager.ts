import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const ENVOY_DIR = path.join(os.homedir(), '.envoy');
const KEY_FILE = path.join(ENVOY_DIR, 'master.key');

export function ensureEnvoyDir(): void {
  if (!fs.existsSync(ENVOY_DIR)) {
    fs.mkdirSync(ENVOY_DIR, { recursive: true, mode: 0o700 });
  }
}

export function generateMasterKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function saveMasterKey(key: string): void {
  ensureEnvoyDir();
  fs.writeFileSync(KEY_FILE, key, { encoding: 'utf8', mode: 0o600 });
}

export function loadMasterKey(): string | null {
  if (!fs.existsSync(KEY_FILE)) {
    return null;
  }
  return fs.readFileSync(KEY_FILE, 'utf8').trim();
}

export function masterKeyExists(): boolean {
  return fs.existsSync(KEY_FILE);
}

export function deleteMasterKey(): void {
  if (fs.existsSync(KEY_FILE)) {
    fs.unlinkSync(KEY_FILE);
  }
}

export function getKeyFilePath(): string {
  return KEY_FILE;
}
