import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface TagEntry {
  tag: string;
  environment: string;
  createdAt: string;
}

export type TagMap = Record<string, TagEntry>;

function getTagFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'tags.json');
}

export function loadTags(): TagMap {
  const tagFile = getTagFilePath();
  if (!fs.existsSync(tagFile)) return {};
  try {
    const raw = fs.readFileSync(tagFile, 'utf-8');
    return JSON.parse(raw) as TagMap;
  } catch {
    return {};
  }
}

export function saveTags(tags: TagMap): void {
  const tagFile = getTagFilePath();
  fs.writeFileSync(tagFile, JSON.stringify(tags, null, 2), 'utf-8');
}

export function addTag(tag: string, environment: string): void {
  const tags = loadTags();
  tags[tag] = { tag, environment, createdAt: new Date().toISOString() };
  saveTags(tags);
}

export function removeTag(tag: string): boolean {
  const tags = loadTags();
  if (!tags[tag]) return false;
  delete tags[tag];
  saveTags(tags);
  return true;
}

export function getTag(tag: string): TagEntry | undefined {
  return loadTags()[tag];
}

export function listTagsForEnvironment(environment: string): TagEntry[] {
  return Object.values(loadTags()).filter(t => t.environment === environment);
}

export function clearTags(): void {
  saveTags({});
}
