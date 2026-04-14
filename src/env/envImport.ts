import * as fs from 'fs';
import * as path from 'path';
import { parseEnvContent, serializeEnv } from './envParser';
import { EnvMap } from './envParser';

export type ImportFormat = 'dotenv' | 'json' | 'yaml';

export interface ImportResult {
  entries: EnvMap;
  count: number;
  format: ImportFormat;
}

export function detectFormat(filePath: string): ImportFormat {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.json') return 'json';
  if (ext === '.yaml' || ext === '.yml') return 'yaml';
  return 'dotenv';
}

export function importFromJson(content: string): EnvMap {
  const parsed = JSON.parse(content);
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON must be a flat key-value object');
  }
  const result: EnvMap = [];
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      throw new Error(`Value for key "${key}" must be a string`);
    }
    result.push({ key, value });
  }
  return result;
}

export function importFromYaml(content: string): EnvMap {
  // Minimal YAML parser for flat key: value pairs
  const result: EnvMap = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key) result.push({ key, value });
  }
  return result;
}

export function importEnvFile(filePath: string): ImportResult {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const format = detectFormat(filePath);
  let entries: EnvMap;
  if (format === 'json') {
    entries = importFromJson(content);
  } else if (format === 'yaml') {
    entries = importFromYaml(content);
  } else {
    entries = parseEnvContent(content);
  }
  return { entries, count: entries.length, format };
}
