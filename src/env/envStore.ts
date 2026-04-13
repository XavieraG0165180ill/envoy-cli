import * as fs from 'fs/promises';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export function getStorePath(environment: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.envoy', 'envs', `${environment}.enc`);
}

export async function listStoredEnvironments(): Promise<string[]> {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const envsDir = path.join(home, '.envoy', 'envs');

  try {
    await fs.mkdir(envsDir, { recursive: true });
    const files = await fs.readdir(envsDir);
    return files
      .filter((f) => f.endsWith('.enc'))
      .map((f) => f.replace(/\.enc$/, ''));
  } catch {
    return [];
  }
}

export async function environmentExists(environment: string): Promise<boolean> {
  const storePath = getStorePath(environment);
  try {
    await fs.access(storePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteEnvironment(environment: string): Promise<void> {
  const storePath = getStorePath(environment);
  await fs.unlink(storePath);
}

export async function renameEnvironment(
  oldName: string,
  newName: string
): Promise<void> {
  await ensureEnvoyDir();
  const oldPath = getStorePath(oldName);
  const newPath = getStorePath(newName);
  const newDir = path.dirname(newPath);
  await fs.mkdir(newDir, { recursive: true });
  await fs.rename(oldPath, newPath);
}
