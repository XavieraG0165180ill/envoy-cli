import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-throttle-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  setThrottlePolicy,
  removeThrottlePolicy,
  checkThrottle,
  listThrottlePolicies,
  loadThrottleStore,
} from '../envThrottle';

describe('envThrottle', () => {
  it('should set a throttle policy', () => {
    const policy = setThrottlePolicy('production', 10, 100);
    expect(policy.environment).toBe('production');
    expect(policy.maxOperationsPerMinute).toBe(10);
    expect(policy.maxOperationsPerHour).toBe(100);
  });

  it('should persist throttle policy to disk', () => {
    setThrottlePolicy('staging', 5, 50);
    const store = loadThrottleStore();
    expect(store.policies['staging']).toBeDefined();
    expect(store.policies['staging'].maxOperationsPerMinute).toBe(5);
  });

  it('should allow operations within limits', () => {
    setThrottlePolicy('dev', 5, 50);
    const result = checkThrottle('dev');
    expect(result.allowed).toBe(true);
  });

  it('should block operations exceeding per-minute limit', () => {
    setThrottlePolicy('dev', 2, 100);
    checkThrottle('dev');
    checkThrottle('dev');
    const result = checkThrottle('dev');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('per minute');
  });

  it('should allow operations with no policy set', () => {
    const result = checkThrottle('unknown-env');
    expect(result.allowed).toBe(true);
  });

  it('should remove a throttle policy', () => {
    setThrottlePolicy('production', 10, 100);
    const removed = removeThrottlePolicy('production');
    expect(removed).toBe(true);
    const store = loadThrottleStore();
    expect(store.policies['production']).toBeUndefined();
  });

  it('should return false when removing non-existent policy', () => {
    const removed = removeThrottlePolicy('nonexistent');
    expect(removed).toBe(false);
  });

  it('should list all throttle policies', () => {
    setThrottlePolicy('env1', 10, 100);
    setThrottlePolicy('env2', 20, 200);
    const policies = listThrottlePolicies();
    expect(policies).toHaveLength(2);
    expect(policies.map(p => p.environment)).toContain('env1');
    expect(policies.map(p => p.environment)).toContain('env2');
  });
});
