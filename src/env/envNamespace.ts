import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Namespace {
  name: string;
  prefix: string;
  description?: string;
  createdAt: string;
}

type NamespaceMap = Record<string, Namespace>;

export function getNamespaceFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'namespaces.json');
}

export function loadNamespaces(): NamespaceMap {
  const filePath = getNamespaceFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as NamespaceMap;
  } catch {
    return {};
  }
}

export function saveNamespaces(namespaces: NamespaceMap): void {
  fs.writeFileSync(getNamespaceFilePath(), JSON.stringify(namespaces, null, 2));
}

export function addNamespace(name: string, prefix: string, description?: string): Namespace {
  const namespaces = loadNamespaces();
  if (namespaces[name]) {
    throw new Error(`Namespace '${name}' already exists.`);
  }
  const ns: Namespace = { name, prefix, description, createdAt: new Date().toISOString() };
  namespaces[name] = ns;
  saveNamespaces(namespaces);
  return ns;
}

export function removeNamespace(name: string): boolean {
  const namespaces = loadNamespaces();
  if (!namespaces[name]) return false;
  delete namespaces[name];
  saveNamespaces(namespaces);
  return true;
}

export function getNamespace(name: string): Namespace | undefined {
  return loadNamespaces()[name];
}

export function listNamespaces(): Namespace[] {
  return Object.values(loadNamespaces());
}

export function applyNamespace(envMap: Map<string, string>, prefix: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of envMap.entries()) {
    result.set(`${prefix}_${key}`, value);
  }
  return result;
}

export function stripNamespace(envMap: Map<string, string>, prefix: string): Map<string, string> {
  const result = new Map<string, string>();
  const prefixWithUnderscore = `${prefix}_`;
  for (const [key, value] of envMap.entries()) {
    if (key.startsWith(prefixWithUnderscore)) {
      result.set(key.slice(prefixWithUnderscore.length), value);
    }
  }
  return result;
}
