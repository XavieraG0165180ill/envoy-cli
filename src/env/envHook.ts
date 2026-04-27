import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Hook {
  id: string;
  event: 'pre-push' | 'post-push' | 'pre-pull' | 'post-pull';
  environment: string;
  command: string;
  enabled: boolean;
  createdAt: string;
}

export type HookMap = Record<string, Hook>;

export function getHookFilePath(): string {
  return path.join(ensureEnvoyDir(), 'hooks.json');
}

export function loadHooks(): HookMap {
  const filePath = getHookFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveHooks(hooks: HookMap): void {
  fs.writeFileSync(getHookFilePath(), JSON.stringify(hooks, null, 2));
}

export function addHook(
  event: Hook['event'],
  environment: string,
  command: string
): Hook {
  const hooks = loadHooks();
  const id = `${event}-${environment}-${Date.now()}`;
  const hook: Hook = {
    id,
    event,
    environment,
    command,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  hooks[id] = hook;
  saveHooks(hooks);
  return hook;
}

export function removeHook(id: string): boolean {
  const hooks = loadHooks();
  if (!hooks[id]) return false;
  delete hooks[id];
  saveHooks(hooks);
  return true;
}

export function toggleHook(id: string, enabled: boolean): boolean {
  const hooks = loadHooks();
  if (!hooks[id]) return false;
  hooks[id].enabled = enabled;
  saveHooks(hooks);
  return true;
}

export function getHooksForEvent(
  event: Hook['event'],
  environment: string
): Hook[] {
  const hooks = loadHooks();
  return Object.values(hooks).filter(
    (h) => h.event === event && h.environment === environment && h.enabled
  );
}
