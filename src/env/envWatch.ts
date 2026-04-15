import fs from 'fs';
import path from 'path';
import { getStorePath } from './envStore';

export interface WatchEvent {
  environment: string;
  filePath: string;
  timestamp: string;
  changeType: 'modified' | 'deleted' | 'created';
}

export type WatchCallback = (event: WatchEvent) => void;

const activeWatchers = new Map<string, fs.FSWatcher>();

export function watchEnvironment(
  environment: string,
  callback: WatchCallback
): fs.FSWatcher {
  const filePath = getStorePath(environment);

  const watcher = fs.watch(path.dirname(filePath), (eventType, filename) => {
    if (!filename || !filename.startsWith(environment)) return;

    const changeType = !fs.existsSync(filePath)
      ? 'deleted'
      : eventType === 'rename'
      ? 'created'
      : 'modified';

    callback({
      environment,
      filePath,
      timestamp: new Date().toISOString(),
      changeType,
    });
  });

  activeWatchers.set(environment, watcher);
  return watcher;
}

export function unwatchEnvironment(environment: string): boolean {
  const watcher = activeWatchers.get(environment);
  if (!watcher) return false;
  watcher.close();
  activeWatchers.delete(environment);
  return true;
}

export function unwatchAll(): void {
  for (const [env, watcher] of activeWatchers.entries()) {
    watcher.close();
    activeWatchers.delete(env);
  }
}

export function listWatched(): string[] {
  return Array.from(activeWatchers.keys());
}
