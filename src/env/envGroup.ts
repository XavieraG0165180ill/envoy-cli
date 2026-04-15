import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface EnvGroup {
  name: string;
  environments: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

type GroupMap = Record<string, EnvGroup>;

export function getGroupFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'groups.json');
}

export function loadGroups(): GroupMap {
  const filePath = getGroupFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveGroups(groups: GroupMap): void {
  const filePath = getGroupFilePath();
  fs.writeFileSync(filePath, JSON.stringify(groups, null, 2), 'utf-8');
}

export function addGroup(name: string, environments: string[], description?: string): EnvGroup {
  const groups = loadGroups();
  const now = new Date().toISOString();
  const group: EnvGroup = {
    name,
    environments,
    description,
    createdAt: now,
    updatedAt: now,
  };
  groups[name] = group;
  saveGroups(groups);
  return group;
}

export function removeGroup(name: string): boolean {
  const groups = loadGroups();
  if (!groups[name]) return false;
  delete groups[name];
  saveGroups(groups);
  return true;
}

export function getGroup(name: string): EnvGroup | undefined {
  return loadGroups()[name];
}

export function listGroups(): EnvGroup[] {
  return Object.values(loadGroups());
}

export function addEnvironmentToGroup(groupName: string, env: string): boolean {
  const groups = loadGroups();
  if (!groups[groupName]) return false;
  if (!groups[groupName].environments.includes(env)) {
    groups[groupName].environments.push(env);
    groups[groupName].updatedAt = new Date().toISOString();
    saveGroups(groups);
  }
  return true;
}

export function removeEnvironmentFromGroup(groupName: string, env: string): boolean {
  const groups = loadGroups();
  if (!groups[groupName]) return false;
  groups[groupName].environments = groups[groupName].environments.filter(e => e !== env);
  groups[groupName].updatedAt = new Date().toISOString();
  saveGroups(groups);
  return true;
}
