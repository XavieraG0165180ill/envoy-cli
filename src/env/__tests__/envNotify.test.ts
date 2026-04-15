import * as fs from 'fs';
import * as path from 'path';
import {
  addChannel,
  removeChannel,
  loadChannels,
  getChannelsForEvent,
  listChannels,
  NotificationChannel,
} from '../envNotify';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => '/tmp/.envoy-test-notify',
}));

const NOTIFY_PATH = '/tmp/.envoy-test-notify/notifications.json';

beforeEach(() => {
  if (fs.existsSync(NOTIFY_PATH)) fs.unlinkSync(NOTIFY_PATH);
  if (!fs.existsSync('/tmp/.envoy-test-notify')) {
    fs.mkdirSync('/tmp/.envoy-test-notify', { recursive: true });
  }
});

afterAll(() => {
  if (fs.existsSync(NOTIFY_PATH)) fs.unlinkSync(NOTIFY_PATH);
});

describe('envNotify', () => {
  it('returns empty array when no channels exist', () => {
    expect(loadChannels()).toEqual([]);
  });

  it('adds a slack channel', () => {
    const channel = addChannel('slack', 'https://hooks.slack.com/test', ['push', 'pull']);
    expect(channel.type).toBe('slack');
    expect(channel.target).toBe('https://hooks.slack.com/test');
    expect(channel.events).toContain('push');
    expect(channel.id).toMatch(/^slack-/);
    expect(channel.createdAt).toBeDefined();
  });

  it('persists channels across loads', () => {
    addChannel('email', 'admin@example.com', ['rotate']);
    const channels = loadChannels();
    expect(channels).toHaveLength(1);
    expect(channels[0].type).toBe('email');
  });

  it('removes a channel by id', () => {
    const ch = addChannel('webhook', 'https://example.com/hook', ['lock']);
    expect(removeChannel(ch.id)).toBe(true);
    expect(loadChannels()).toHaveLength(0);
  });

  it('returns false when removing non-existent channel', () => {
    expect(removeChannel('non-existent-id')).toBe(false);
  });

  it('filters channels by event', () => {
    addChannel('slack', 'https://slack.com/1', ['push', 'rotate']);
    addChannel('email', 'ops@example.com', ['pull']);
    addChannel('webhook', 'https://wh.com', ['push', 'delete']);

    const pushChannels = getChannelsForEvent('push');
    expect(pushChannels).toHaveLength(2);
    expect(pushChannels.map((c) => c.type)).toEqual(
      expect.arrayContaining(['slack', 'webhook'])
    );
  });

  it('listChannels returns all channels', () => {
    addChannel('slack', 'https://slack.com/a', ['push']);
    addChannel('email', 'dev@example.com', ['pull']);
    expect(listChannels()).toHaveLength(2);
  });

  it('handles corrupted JSON gracefully', () => {
    fs.writeFileSync(NOTIFY_PATH, 'not-valid-json', 'utf-8');
    expect(loadChannels()).toEqual([]);
  });
});
