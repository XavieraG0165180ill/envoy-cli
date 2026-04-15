import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Profile {
  name: string;
  description?: string;
  environments: string[];
  defaultEnvironment?: string;
  createdAt: string;
  updatedAt: string;
}

export type ProfileMap = Record<string, Profile>;

export function getProfileFilePath(): string {
  const dir = ensureEnvoyDir();
  return path.join(dir, 'profiles.json');
}

export function loadProfiles(): ProfileMap {
  const filePath = getProfileFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProfileMap;
  } catch {
    return {};
  }
}

export function saveProfiles(profiles: ProfileMap): void {
  const filePath = getProfileFilePath();
  fs.writeFileSync(filePath, JSON.stringify(profiles, null, 2), 'utf-8');
}

export function addProfile(name: string, environments: string[], description?: string, defaultEnvironment?: string): Profile {
  const profiles = loadProfiles();
  const now = new Date().toISOString();
  const profile: Profile = {
    name,
    description,
    environments,
    defaultEnvironment,
    createdAt: profiles[name]?.createdAt ?? now,
    updatedAt: now,
  };
  profiles[name] = profile;
  saveProfiles(profiles);
  return profile;
}

export function removeProfile(name: string): boolean {
  const profiles = loadProfiles();
  if (!profiles[name]) return false;
  delete profiles[name];
  saveProfiles(profiles);
  return true;
}

export function getProfile(name: string): Profile | undefined {
  return loadProfiles()[name];
}

export function listProfiles(): Profile[] {
  return Object.values(loadProfiles());
}
