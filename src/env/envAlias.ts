import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface AliasMap {
  [alias: string]: string;
}

export function getAliasFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'aliases.json');
}

export function loadAliases(): AliasMap {
  const filePath = getAliasFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AliasMap;
  } catch {
    return {};
  }
}

export function saveAliases(aliases: AliasMap): void {
  const filePath = getAliasFilePath();
  fs.writeFileSync(filePath, JSON.stringify(aliases, null, 2), 'utf-8');
}

export function addAlias(alias: string, environment: string): void {
  const aliases = loadAliases();
  aliases[alias] = environment;
  saveAliases(aliases);
}

export function removeAlias(alias: string): boolean {
  const aliases = loadAliases();
  if (!(alias in aliases)) return false;
  delete aliases[alias];
  saveAliases(aliases);
  return true;
}

export function resolveAlias(nameOrAlias: string): string {
  const aliases = loadAliases();
  return aliases[nameOrAlias] ?? nameOrAlias;
}

export function listAliases(): Array<{ alias: string; environment: string }> {
  const aliases = loadAliases();
  return Object.entries(aliases).map(([alias, environment]) => ({ alias, environment }));
}
