import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  computeChecksum,
  setChecksum,
  verifyChecksum,
  removeChecksum,
  getChecksum,
  loadChecksums,
} from '../envChecksum';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-checksum-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('computeChecksum', () => {
  it('returns consistent sha256 hex string', () => {
    const result = computeChecksum('KEY=value');
    expect(result).toHaveLength(64);
    expect(computeChecksum('KEY=value')).toBe(result);
  });

  it('differs for different content', () => {
    expect(computeChecksum('A=1')).not.toBe(computeChecksum('A=2'));
  });
});

describe('setChecksum / getChecksum', () => {
  it('stores and retrieves checksum entry', () => {
    const entry = setChecksum('production', 'KEY=value');
    expect(entry.environment).toBe('production');
    expect(entry.checksum).toHaveLength(64);
    const fetched = getChecksum('production');
    expect(fetched).toEqual(entry);
  });
});

describe('verifyChecksum', () => {
  it('returns true for matching content', () => {
    setChecksum('staging', 'DB=postgres');
    expect(verifyChecksum('staging', 'DB=postgres')).toBe(true);
  });

  it('returns false for modified content', () => {
    setChecksum('staging', 'DB=postgres');
    expect(verifyChecksum('staging', 'DB=mysql')).toBe(false);
  });

  it('returns false for unknown environment', () => {
    expect(verifyChecksum('unknown', 'X=1')).toBe(false);
  });
});

describe('removeChecksum', () => {
  it('removes an existing entry', () => {
    setChecksum('dev', 'X=1');
    removeChecksum('dev');
    expect(getChecksum('dev')).toBeUndefined();
  });
});
