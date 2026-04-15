import * as fs from 'fs';
import * as path from 'path';
import {
  addWebhook,
  removeWebhook,
  listWebhooks,
  toggleWebhook,
  loadWebhooks,
  getWebhookFilePath,
} from '../envWebhook';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => '/tmp/.envoy-test',
}));

const webhookFile = '/tmp/.envoy-test/webhooks.json';

beforeEach(() => {
  if (fs.existsSync(webhookFile)) fs.unlinkSync(webhookFile);
  if (!fs.existsSync('/tmp/.envoy-test')) {
    fs.mkdirSync('/tmp/.envoy-test', { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(webhookFile)) fs.unlinkSync(webhookFile);
});

describe('envWebhook', () => {
  test('loadWebhooks returns empty array when file does not exist', () => {
    expect(loadWebhooks()).toEqual([]);
  });

  test('addWebhook creates and persists a webhook', () => {
    const wh = addWebhook('https://example.com/hook', 'production', ['push', 'pull']);
    expect(wh.url).toBe('https://example.com/hook');
    expect(wh.environment).toBe('production');
    expect(wh.events).toEqual(['push', 'pull']);
    expect(wh.active).toBe(true);
    expect(wh.id).toMatch(/^wh_/);
    const stored = loadWebhooks();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(wh.id);
  });

  test('addWebhook stores optional secret', () => {
    const wh = addWebhook('https://example.com/hook', 'staging', ['rotate'], 'mysecret');
    expect(wh.secret).toBe('mysecret');
  });

  test('removeWebhook removes existing webhook and returns true', () => {
    const wh = addWebhook('https://example.com/hook', 'dev', ['push']);
    const result = removeWebhook(wh.id);
    expect(result).toBe(true);
    expect(loadWebhooks()).toHaveLength(0);
  });

  test('removeWebhook returns false for unknown id', () => {
    expect(removeWebhook('nonexistent')).toBe(false);
  });

  test('listWebhooks returns all webhooks when no environment filter', () => {
    addWebhook('https://a.com', 'production', ['push']);
    addWebhook('https://b.com', 'staging', ['pull']);
    expect(listWebhooks()).toHaveLength(2);
  });

  test('listWebhooks filters by environment', () => {
    addWebhook('https://a.com', 'production', ['push']);
    addWebhook('https://b.com', 'staging', ['pull']);
    const result = listWebhooks('production');
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://a.com');
  });

  test('toggleWebhook disables an active webhook', () => {
    const wh = addWebhook('https://example.com', 'dev', ['push']);
    const result = toggleWebhook(wh.id, false);
    expect(result).toBe(true);
    const stored = loadWebhooks().find((w) => w.id === wh.id);
    expect(stored?.active).toBe(false);
  });

  test('toggleWebhook returns false for unknown id', () => {
    expect(toggleWebhook('unknown_id', false)).toBe(false);
  });

  test('getWebhookFilePath returns correct path', () => {
    expect(getWebhookFilePath()).toBe(webhookFile);
  });
});
