import * as fs from 'fs';
import * as path from 'path';
import { ensureEnvoyDir } from '../crypto/keyManager';

export interface Webhook {
  id: string;
  url: string;
  environment: string;
  events: WebhookEvent[];
  secret?: string;
  createdAt: string;
  active: boolean;
}

export type WebhookEvent = 'push' | 'pull' | 'rotate' | 'delete' | 'lock' | 'unlock';

export function getWebhookFilePath(): string {
  const envoyDir = ensureEnvoyDir();
  return path.join(envoyDir, 'webhooks.json');
}

export function loadWebhooks(): Webhook[] {
  const filePath = getWebhookFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Webhook[];
  } catch {
    return [];
  }
}

export function saveWebhooks(webhooks: Webhook[]): void {
  const filePath = getWebhookFilePath();
  fs.writeFileSync(filePath, JSON.stringify(webhooks, null, 2), 'utf-8');
}

export function addWebhook(
  url: string,
  environment: string,
  events: WebhookEvent[],
  secret?: string
): Webhook {
  const webhooks = loadWebhooks();
  const webhook: Webhook = {
    id: `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url,
    environment,
    events,
    secret,
    createdAt: new Date().toISOString(),
    active: true,
  };
  webhooks.push(webhook);
  saveWebhooks(webhooks);
  return webhook;
}

export function removeWebhook(id: string): boolean {
  const webhooks = loadWebhooks();
  const index = webhooks.findIndex((w) => w.id === id);
  if (index === -1) return false;
  webhooks.splice(index, 1);
  saveWebhooks(webhooks);
  return true;
}

export function listWebhooks(environment?: string): Webhook[] {
  const webhooks = loadWebhooks();
  if (!environment) return webhooks;
  return webhooks.filter((w) => w.environment === environment);
}

export function toggleWebhook(id: string, active: boolean): boolean {
  const webhooks = loadWebhooks();
  const webhook = webhooks.find((w) => w.id === id);
  if (!webhook) return false;
  webhook.active = active;
  saveWebhooks(webhooks);
  return true;
}
