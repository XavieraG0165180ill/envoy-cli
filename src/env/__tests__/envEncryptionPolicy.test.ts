import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-policy-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadPolicies,
  setPolicy,
  removePolicy,
  getPolicy,
  isPolicyExpired,
  EncryptionPolicy,
} from '../envEncryptionPolicy';

describe('loadPolicies', () => {
  it('returns empty object when file does not exist', () => {
    expect(loadPolicies()).toEqual({});
  });

  it('returns parsed policies when file exists', () => {
    setPolicy('production', 'aes-256-gcm', 30, true);
    const policies = loadPolicies();
    expect(policies['production']).toBeDefined();
    expect(policies['production'].algorithm).toBe('aes-256-gcm');
  });
});

describe('setPolicy', () => {
  it('creates a new policy', () => {
    const policy = setPolicy('staging', 'aes-128-gcm', 14, false);
    expect(policy.environment).toBe('staging');
    expect(policy.algorithm).toBe('aes-128-gcm');
    expect(policy.rotationDays).toBe(14);
    expect(policy.requireEncryption).toBe(false);
    expect(policy.createdAt).toBe(policy.updatedAt);
  });

  it('preserves createdAt when updating existing policy', () => {
    const first = setPolicy('dev', 'aes-256-gcm', 7, true);
    const second = setPolicy('dev', 'chacha20-poly1305', 30, false);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.algorithm).toBe('chacha20-poly1305');
  });
});

describe('removePolicy', () => {
  it('removes an existing policy and returns true', () => {
    setPolicy('test', 'aes-256-gcm', 30, true);
    expect(removePolicy('test')).toBe(true);
    expect(getPolicy('test')).toBeUndefined();
  });

  it('returns false when policy does not exist', () => {
    expect(removePolicy('nonexistent')).toBe(false);
  });
});

describe('isPolicyExpired', () => {
  it('returns false for a freshly created policy', () => {
    const policy = setPolicy('fresh', 'aes-256-gcm', 30, true);
    expect(isPolicyExpired(policy)).toBe(false);
  });

  it('returns true for an expired policy', () => {
    const pastDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const policy: EncryptionPolicy = {
      environment: 'old',
      algorithm: 'aes-256-gcm',
      rotationDays: 30,
      requireEncryption: true,
      createdAt: pastDate,
      updatedAt: pastDate,
    };
    expect(isPolicyExpired(policy)).toBe(true);
  });
});
