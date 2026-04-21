import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  loadQuotas,
  saveQuotas,
  setQuota,
  removeQuota,
  getQuota,
  checkQuota,
} from '../envQuota';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-quota-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadQuotas / saveQuotas', () => {
  it('returns empty array when file does not exist', () => {
    expect(loadQuotas()).toEqual([]);
  });

  it('saves and loads quotas', () => {
    const quota = setQuota('production', 50, 256, 4096);
    const loaded = loadQuotas();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].environment).toBe('production');
    expect(loaded[0].maxKeys).toBe(50);
    expect(quota.createdAt).toBeDefined();
  });
});

describe('setQuota', () => {
  it('creates a new quota entry', () => {
    setQuota('staging', 30, 128, 2048);
    const q = getQuota('staging');
    expect(q).toBeDefined();
    expect(q!.maxValueLength).toBe(128);
  });

  it('updates an existing quota preserving createdAt', () => {
    const first = setQuota('staging', 30, 128, 2048);
    const second = setQuota('staging', 60, 512, 8192);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.maxKeys).toBe(60);
    expect(loadQuotas()).toHaveLength(1);
  });
});

describe('removeQuota', () => {
  it('removes an existing quota', () => {
    setQuota('dev', 10, 64, 1024);
    expect(removeQuota('dev')).toBe(true);
    expect(getQuota('dev')).toBeUndefined();
  });

  it('returns false when quota does not exist', () => {
    expect(removeQuota('nonexistent')).toBe(false);
  });
});

describe('checkQuota', () => {
  it('returns no violations when no quota is set', () => {
    const map = new Map([['KEY', 'value']]);
    expect(checkQuota('dev', map)).toEqual([]);
  });

  it('detects maxKeys violation', () => {
    setQuota('dev', 2, 256, 10000);
    const map = new Map([['A', '1'], ['B', '2'], ['C', '3']]);
    const violations = checkQuota('dev', map);
    expect(violations.some(v => v.type === 'maxKeys')).toBe(true);
  });

  it('detects maxValueLength violation', () => {
    setQuota('dev', 100, 5, 10000);
    const map = new Map([['KEY', 'toolongvalue']]);
    const violations = checkQuota('dev', map);
    expect(violations.some(v => v.type === 'maxValueLength')).toBe(true);
  });

  it('detects maxTotalSize violation', () => {
    setQuota('dev', 100, 10000, 10);
    const map = new Map([['LONGKEY', 'LONGVALUE']]);
    const violations = checkQuota('dev', map);
    expect(violations.some(v => v.type === 'maxTotalSize')).toBe(true);
  });

  it('returns empty array when within all limits', () => {
    setQuota('dev', 10, 100, 10000);
    const map = new Map([['KEY', 'val']]);
    expect(checkQuota('dev', map)).toEqual([]);
  });
});
