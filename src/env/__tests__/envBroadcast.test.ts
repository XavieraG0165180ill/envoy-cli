import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-broadcast-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function getBroadcast() {
  return await import('../envBroadcast');
}

test('loads empty array when file does not exist', async () => {
  const { loadBroadcasts } = await getBroadcast();
  expect(loadBroadcasts()).toEqual([]);
});

test('addBroadcast creates and persists a message', async () => {
  const { addBroadcast, loadBroadcasts } = await getBroadcast();
  const entry = addBroadcast('production', 'Deploy imminent', 'warning', { author: 'alice' });
  expect(entry.environment).toBe('production');
  expect(entry.message).toBe('Deploy imminent');
  expect(entry.severity).toBe('warning');
  expect(entry.author).toBe('alice');
  expect(entry.id).toBeDefined();
  expect(loadBroadcasts()).toHaveLength(1);
});

test('removeBroadcast deletes by id', async () => {
  const { addBroadcast, removeBroadcast, loadBroadcasts } = await getBroadcast();
  const entry = addBroadcast('staging', 'Test message', 'info');
  const removed = removeBroadcast(entry.id);
  expect(removed).toBe(true);
  expect(loadBroadcasts()).toHaveLength(0);
});

test('removeBroadcast returns false for unknown id', async () => {
  const { removeBroadcast } = await getBroadcast();
  expect(removeBroadcast('nonexistent')).toBe(false);
});

test('getBroadcastsForEnvironment filters correctly', async () => {
  const { addBroadcast, getBroadcastsForEnvironment } = await getBroadcast();
  addBroadcast('production', 'msg1', 'info');
  addBroadcast('staging', 'msg2', 'warning');
  addBroadcast('production', 'msg3', 'critical');
  const prod = getBroadcastsForEnvironment('production');
  expect(prod).toHaveLength(2);
  expect(prod.every((b) => b.environment === 'production')).toBe(true);
});

test('pruneExpiredBroadcasts removes expired entries', async () => {
  const { addBroadcast, pruneExpiredBroadcasts, loadBroadcasts } = await getBroadcast();
  addBroadcast('production', 'active', 'info', { expiresAt: '2099-01-01T00:00:00.000Z' });
  addBroadcast('production', 'expired', 'info', { expiresAt: '2000-01-01T00:00:00.000Z' });
  const count = pruneExpiredBroadcasts();
  expect(count).toBe(1);
  expect(loadBroadcasts()).toHaveLength(1);
  expect(loadBroadcasts()[0].message).toBe('active');
});
