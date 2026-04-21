import * as fs from 'fs';
import * as path from 'path';
import { getStorePath } from './envStore';

export interface InheritanceChain {
  environment: string;
  parents: string[];
}

export type InheritMap = Record<string, InheritanceChain>;

export function getInheritFilePath(): string {
  return path.join(getStorePath(), 'inherit.json');
}

export function loadInheritMap(): InheritMap {
  const filePath = getInheritFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as InheritMap;
  } catch {
    return {};
  }
}

export function saveInheritMap(map: InheritMap): void {
  const filePath = getInheritFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2));
}

export function setParents(environment: string, parents: string[]): void {
  const map = loadInheritMap();
  map[environment] = { environment, parents };
  saveInheritMap(map);
}

export function removeInheritance(environment: string): void {
  const map = loadInheritMap();
  delete map[environment];
  saveInheritMap(map);
}

export function getParents(environment: string): string[] {
  const map = loadInheritMap();
  return map[environment]?.parents ?? [];
}

/**
 * Resolve the full ordered list of ancestors (breadth-first, no cycles).
 */
export function resolveAncestors(environment: string): string[] {
  const map = loadInheritMap();
  const visited = new Set<string>();
  const queue = [...(map[environment]?.parents ?? [])];
  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    const next = map[current]?.parents ?? [];
    queue.push(...next);
  }

  return result;
}

/**
 * Merge env maps from ancestors (lowest priority first) then child (highest).
 */
export function applyInheritance(
  environment: string,
  envMaps: Record<string, Map<string, string>>
): Map<string, string> {
  const ancestors = resolveAncestors(environment).reverse();
  const merged = new Map<string, string>();

  for (const ancestor of ancestors) {
    const parentMap = envMaps[ancestor];
    if (parentMap) {
      for (const [k, v] of parentMap) merged.set(k, v);
    }
  }

  const childMap = envMaps[environment];
  if (childMap) {
    for (const [k, v] of childMap) merged.set(k, v);
  }

  return merged;
}
