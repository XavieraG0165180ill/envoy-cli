import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface NotificationChannel {
  id: string;
  type: 'slack' | 'email' | 'webhook';
  target: string;
  events: NotificationEvent[];
  createdAt: string;
}

export type NotificationEvent =
  | 'push'
  | 'pull'
  | 'rotate'
  | 'delete'
  | 'lock'
  | 'unlock';

const NOTIFY_FILE = 'notifications.json';

export function getNotifyFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, NOTIFY_FILE);
}

export function loadChannels(): NotificationChannel[] {
  const filePath = getNotifyFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as NotificationChannel[];
  } catch {
    return [];
  }
}

export function saveChannels(channels: NotificationChannel[]): void {
  const filePath = getNotifyFilePath();
  fs.writeFileSync(filePath, JSON.stringify(channels, null, 2), 'utf-8');
}

export function addChannel(
  type: NotificationChannel['type'],
  target: string,
  events: NotificationEvent[]
): NotificationChannel {
  const channels = loadChannels();
  const channel: NotificationChannel = {
    id: `${type}-${Date.now()}`,
    type,
    target,
    events,
    createdAt: new Date().toISOString(),
  };
  channels.push(channel);
  saveChannels(channels);
  return channel;
}

export function removeChannel(id: string): boolean {
  const channels = loadChannels();
  const index = channels.findIndex((c) => c.id === id);
  if (index === -1) return false;
  channels.splice(index, 1);
  saveChannels(channels);
  return true;
}

export function getChannelsForEvent(
  event: NotificationEvent
): NotificationChannel[] {
  return loadChannels().filter((c) => c.events.includes(event));
}

export function listChannels(): NotificationChannel[] {
  return loadChannels();
}
