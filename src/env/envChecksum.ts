import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface ChecksumEntry {
  environment: string;
  checksum: string;
  updatedAt: string;
}

export type ChecksumMap = Record<string, ChecksumEntry>;

export function getChecksumFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'checksums.json');
}

export function loadChecksums(): ChecksumMap {
  const filePath = getChecksumFilePath();
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function saveChecksums(checksums: ChecksumMap): void {
  fs.writeFileSync(getChecksumFilePath(), JSON.stringify(checksums, null, 2));
}

export function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function setChecksum(environment: string, content: string): ChecksumEntry {
  const checksums = loadChecksums();
  const entry: ChecksumEntry = {
    environment,
    checksum: computeChecksum(content),
    updatedAt: new Date().toISOString(),
  };
  checksums[environment] = entry;
  saveChecksums(checksums);
  return entry;
}

export function verifyChecksum(environment: string, content: string): boolean {
  const checksums = loadChecksums();
  const entry = checksums[environment];
  if (!entry) return false;
  return entry.checksum === computeChecksum(content);
}

export function removeChecksum(environment: string): void {
  const checksums = loadChecksums();
  delete checksums[environment];
  saveChecksums(checksums);
}

export function getChecksum(environment: string): ChecksumEntry | undefined {
  return loadChecksums()[environment];
}
