import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvDependency {
  key: string;
  dependsOn: string[];
  description?: string;
}

export interface DependencyMap {
  [key: string]: EnvDependency;
}

function getDependencyFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'dependencies.json');
}

export function loadDependencies(): DependencyMap {
  const filePath = getDependencyFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as DependencyMap;
  } catch {
    return {};
  }
}

export function saveDependencies(deps: DependencyMap): void {
  const filePath = getDependencyFilePath();
  fs.writeFileSync(filePath, JSON.stringify(deps, null, 2), 'utf-8');
}

export function addDependency(key: string, dependsOn: string[], description?: string): DependencyMap {
  const deps = loadDependencies();
  deps[key] = { key, dependsOn, description };
  saveDependencies(deps);
  return deps;
}

export function removeDependency(key: string): boolean {
  const deps = loadDependencies();
  if (!deps[key]) return false;
  delete deps[key];
  saveDependencies(deps);
  return true;
}

export function getDependentsOf(key: string): string[] {
  const deps = loadDependencies();
  return Object.values(deps)
    .filter(d => d.dependsOn.includes(key))
    .map(d => d.key);
}

export function resolveDependencyOrder(keys: string[]): string[] {
  const deps = loadDependencies();
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(k: string) {
    if (visited.has(k)) return;
    visited.add(k);
    const dep = deps[k];
    if (dep) {
      for (const parent of dep.dependsOn) {
        visit(parent);
      }
    }
    result.push(k);
  }

  for (const k of keys) visit(k);
  return result;
}
