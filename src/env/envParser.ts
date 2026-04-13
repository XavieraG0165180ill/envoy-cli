import * as fs from 'fs';
import * as path from 'path';

export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
}

export interface ParsedEnv {
  entries: EnvEntry[];
  raw: string;
}

export function parseEnvFile(filePath: string): ParsedEnv {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseEnvContent(raw);
}

export function parseEnvContent(content: string): ParsedEnv {
  const lines = content.split('\n');
  const entries: EnvEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    entries.push({ key, value });
  }

  return { entries, raw: content };
}

export function serializeEnv(entries: EnvEntry[]): string {
  return entries
    .map(({ key, value, comment }) => {
      const commentLine = comment ? `# ${comment}\n` : '';
      const needsQuotes = value.includes(' ') || value.includes('#');
      const serializedValue = needsQuotes ? `"${value}"` : value;
      return `${commentLine}${key}=${serializedValue}`;
    })
    .join('\n') + '\n';
}

export function envToRecord(entries: EnvEntry[]): Record<string, string> {
  return entries.reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
}
