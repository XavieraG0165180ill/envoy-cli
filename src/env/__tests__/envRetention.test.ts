import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-retention-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadRetentions,
  setRetention,
  removeRetention,
  getRetention,
  listRetentions,
  isExpiredByAge,
} from '../envRetention';

describe('envRetention', () => {
  it('returns empty map when no file exists', () => {
    expect(loadRetentions()).toEqual({});
  });

  it('sets and retrieves a retention policy', () => {
    const policy = setRetention('production', 10, 30);
    expect(policy.environment).toBe('production');
    expect(policy.maxVersions).toBe(10);
    expect(policy.maxAgeDays).toBe(30);
    expect(getRetention('production')).toEqual(policy);
  });

  it('overwrites existing policy for same environment', () => {
    setRetention('staging', 5);
    setRetention('staging', 20, 60);
    const policy = getRetention('staging');
    expect(policy?.maxVersions).toBe(20);
    expect(policy?.maxAgeDays).toBe(60);
  });

  it('removes a retention policy', () => {
    setRetention('dev', 3);
    expect(removeRetention('dev')).toBe(true);
    expect(getRetention('dev')).toBeUndefined();
  });

  it('returns false when removing non-existent policy', () => {
    expect(removeRetention('nonexistent')).toBe(false);
  });

  it('lists all retention policies', () => {
    setRetention('env1', 5);
    setRetention('env2', 10, 14);
    const list = listRetentions();
    expect(list).toHaveLength(2);
    expect(list.map((p) => p.environment)).toContain('env1');
    expect(list.map((p) => p.environment)).toContain('env2');
  });

  it('isExpiredByAge returns false when no maxAgeDays', () => {
    const policy = setRetention('test', 5);
    expect(isExpiredByAge(policy)).toBe(false);
  });

  it('isExpiredByAge returns true for old policy', () => {
    const oldDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString();
    const policy = { environment: 'old', maxAgeDays: 30, createdAt: oldDate };
    expect(isExpiredByAge(policy)).toBe(true);
  });

  it('isExpiredByAge returns false for recent policy', () => {
    const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString();
    const policy = { environment: 'recent', maxAgeDays: 30, createdAt: recentDate };
    expect(isExpiredByAge(policy)).toBe(false);
  });
});
