import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';
import { parseEnvContent, serializeEnv } from './envParser';

export interface CascadeConfig {
  environments: string[];
  strategy: 'merge' | 'override';
}

export function getCascadeFilePath(baseDir: string): string {
  return path.join(baseDir, '.envoy', 'cascade.json');
}

export function loadCascadeConfig(baseDir: string): CascadeConfig | null {
  const filePath = getCascadeFilePath(baseDir);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as CascadeConfig;
  } catch {
    return null;
  }
}

export function saveCascadeConfig(baseDir: string, config: CascadeConfig): void {
  const filePath = getCascadeFilePath(baseDir);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}

export function removeCascadeConfig(baseDir: string): void {
  const filePath = getCascadeFilePath(baseDir);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

export function resolveCascade(
  baseDir: string,
  targetEnv: string,
  config: CascadeConfig
): Map<string, string> {
  const result = new Map<string, string>();
  const envs = [...config.environments, targetEnv];

  for (const env of envs) {
    const storePath = getStorePath(baseDir, env);
    if (!fs.existsSync(storePath)) continue;
    const content = fs.readFileSync(storePath, 'utf-8');
    const entries = parseEnvContent(content);
    for (const [key, value] of entries) {
      if (config.strategy === 'override' || !result.has(key)) {
        result.set(key, value);
      }
    }
  }

  return result;
}
