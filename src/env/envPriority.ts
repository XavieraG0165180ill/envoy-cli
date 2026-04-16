import fs from 'fs';
import path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface PriorityMap {
  [environment: string]: number;
}

export function getPriorityFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'priorities.json');
}

export function loadPriorities(): PriorityMap {
  const filePath = getPriorityFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function savePriorities(priorities: PriorityMap): void {
  fs.writeFileSync(getPriorityFilePath(), JSON.stringify(priorities, null, 2));
}

export function setPriority(environment: string, priority: number): void {
  const priorities = loadPriorities();
  priorities[environment] = priority;
  savePriorities(priorities);
}

export function removePriority(environment: string): void {
  const priorities = loadPriorities();
  delete priorities[environment];
  savePriorities(priorities);
}

export function getPriority(environment: string): number | undefined {
  return loadPriorities()[environment];
}

export function listByPriority(environments: string[]): string[] {
  const priorities = loadPriorities();
  return [...environments].sort((a, b) => {
    const pa = priorities[a] ?? 0;
    const pb = priorities[b] ?? 0;
    return pb - pa;
  });
}
