import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getExpiryFilePath,
  loadExpiries,
  saveExpiries,
  setExpiry,
  removeExpiry,
  getExpiry,
  isExpired,
  isExpiringSoon,
} from '../envExpiry';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-expiry-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadExpiries', () => {
  it('returns empty object when file does not exist', () => {
    expect(loadExpiries()).toEqual({});
  });

  it('returns parsed expiries from file', () => {
    const data = { production: { environment: 'production', expiresAt: '2099-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' } };
    fs.writeFileSync(getExpiryFilePath(), JSON.stringify(data));
    expect(loadExpiries()).toEqual(data);
  });
});

describe('setExpiry', () => {
  it('saves an expiry entry for an environment', () => {
    const date = new Date('2099-06-01T00:00:00.000Z');
    const entry = setExpiry('staging', date, 7);
    expect(entry.environment).toBe('staging');
    expect(entry.expiresAt).toBe(date.toISOString());
    expect(entry.notifyBefore).toBe(7);
    const loaded = loadExpiries();
    expect(loaded['staging']).toBeDefined();
  });
});

describe('removeExpiry', () => {
  it('removes an existing expiry entry', () => {
    setExpiry('dev', new Date('2099-01-01'), 3);
    expect(removeExpiry('dev')).toBe(true);
    expect(getExpiry('dev')).toBeNull();
  });

  it('returns false when entry does not exist', () => {
    expect(removeExpiry('nonexistent')).toBe(false);
  });
});

describe('isExpired', () => {
  it('returns true when expiry date is in the past', () => {
    setExpiry('old-env', new Date('2000-01-01T00:00:00.000Z'));
    expect(isExpired('old-env')).toBe(true);
  });

  it('returns false when expiry date is in the future', () => {
    setExpiry('future-env', new Date('2099-01-01T00:00:00.000Z'));
    expect(isExpired('future-env')).toBe(false);
  });

  it('returns false when no expiry is set', () => {
    expect(isExpired('unknown-env')).toBe(false);
  });
});

describe('isExpiringSoon', () => {
  it('returns true when expiry is within notifyBefore days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    setExpiry('warn-env', soon, 7);
    expect(isExpiringSoon('warn-env')).toBe(true);
  });

  it('returns false when expiry is far in the future', () => {
    setExpiry('safe-env', new Date('2099-01-01'), 7);
    expect(isExpiringSoon('safe-env')).toBe(false);
  });

  it('returns false when no notifyBefore is set', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    setExpiry('no-notify-env', soon);
    expect(isExpiringSoon('no-notify-env')).toBe(false);
  });
});
