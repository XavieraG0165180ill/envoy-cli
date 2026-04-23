import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';
import { loadHistory, appendHistory } from './envHistory';

export interface CloneOptions {
  overwrite?: boolean;
  includeHistory?: boolean;
}

export interface CloneResult {
  source: string;
  destination: string;
  keysCloned: number;
  historyCloned: boolean;
}

export async function cloneEnvironment(
  source: string,
  destination: string,
  options: CloneOptions = {}
): Promise<CloneResult> {
  const srcPath = getStorePath(source);
  const dstPath = getStorePath(destination);

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source environment '${source}' does not exist.`);
  }

  if (fs.existsSync(dstPath) && !options.overwrite) {
    throw new Error(
      `Destination environment '${destination}' already exists. Use --overwrite to replace it.`
    );
  }

  const srcContent = fs.readFileSync(srcPath, 'utf-8');
  const dir = path.dirname(dstPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dstPath, srcContent, 'utf-8');

  const lines = srcContent.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const keysCloned = lines.length;

  let historyCloned = false;
  if (options.includeHistory) {
    const history = await loadHistory(source);
    for (const entry of history) {
      await appendHistory(destination, { ...entry, environment: destination });
    }
    historyCloned = true;
  }

  return { source, destination, keysCloned, historyCloned };
}

export async function listCloneable(): Promise<string[]> {
  const storeDir = path.dirname(getStorePath('__probe__'));
  if (!fs.existsSync(storeDir)) return [];
  return fs
    .readdirSync(storeDir)
    .filter((f) => f.endsWith('.enc'))
    .map((f) => f.replace(/\.enc$/, ''));
}
