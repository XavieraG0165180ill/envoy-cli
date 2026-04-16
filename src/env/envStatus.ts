import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';
import { loadLocks } from './envLock';
import { loadExpiries } from './envExpiry';
import { loadTags } from './envTag';

export interface EnvStatus {
  environment: string;
  exists: boolean;
  locked: boolean;
  expired: boolean;
  expiresAt?: string;
  tags: string[];
  sizeBytes: number;
  lastModified?: string;
}

export async function getEnvStatus(environment: string): Promise<EnvStatus> {
  const storePath = getStorePath(environment);
  const exists = fs.existsSync(storePath);

  let sizeBytes = 0;
  let lastModified: string | undefined;
  if (exists) {
    const stat = fs.statSync(storePath);
    sizeBytes = stat.size;
    lastModified = stat.mtime.toISOString();
  }

  const locks = await loadLocks();
  const locked = !!locks[environment];

  const expiries = await loadExpiries();
  const expiry = expiries[environment];
  const now = new Date();
  const expired = expiry ? new Date(expiry) < now : false;

  const allTags = await loadTags();
  const tags = allTags[environment] ?? [];

  return {
    environment,
    exists,
    locked,
    expired,
    expiresAt: expiry,
    tags,
    sizeBytes,
    lastModified,
  };
}

export async function getAllEnvStatuses(envoyDir: string): Promise<EnvStatus[]> {
  if (!fs.existsSync(envoyDir)) return [];
  const files = fs.readdirSync(envoyDir).filter(f => f.endsWith('.enc'));
  const environments = files.map(f => path.basename(f, '.enc'));
  return Promise.all(environments.map(getEnvStatus));
}
