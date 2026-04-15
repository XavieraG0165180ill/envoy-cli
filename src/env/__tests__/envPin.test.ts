import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getPinFilePath,
  loadPins,
  savePins,
  pinEnvironment,
  unpinEnvironment,
  getPin,
  isPinned,
  listPins,
} from '../envPin';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-pin-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadPins', () => {
  it('returns empty object when no file exists', () => {
    expect(loadPins()).toEqual({});
  });

  it('returns empty object on invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'pins.json'), 'not-json');
    expect(loadPins()).toEqual({});
  });
});

describe('savePins / loadPins', () => {
  it('persists and reloads pins', () => {
    const pins = {
      production: { environment: 'production', version: 'v1.2.3', pinnedAt: '2024-01-01T00:00:00.000Z' },
    };
    savePins(pins);
    expect(loadPins()).toEqual(pins);
  });
});

describe('pinEnvironment', () => {
  it('creates a pin entry with required fields', () => {
    const entry = pinEnvironment('staging', 'v2.0.0');
    expect(entry.environment).toBe('staging');
    expect(entry.version).toBe('v2.0.0');
    expect(entry.pinnedAt).toBeDefined();
    expect(entry.reason).toBeUndefined();
  });

  it('stores optional reason and pinnedBy', () => {
    const entry = pinEnvironment('production', 'v3.1.0', 'freeze for release', 'alice');
    expect(entry.reason).toBe('freeze for release');
    expect(entry.pinnedBy).toBe('alice');
  });

  it('overwrites existing pin for the same environment', () => {
    pinEnvironment('dev', 'v1.0.0');
    pinEnvironment('dev', 'v1.1.0');
    expect(getPin('dev')?.version).toBe('v1.1.0');
  });
});

describe('unpinEnvironment', () => {
  it('removes an existing pin and returns true', () => {
    pinEnvironment('staging', 'v1.0.0');
    expect(unpinEnvironment('staging')).toBe(true);
    expect(isPinned('staging')).toBe(false);
  });

  it('returns false when environment is not pinned', () => {
    expect(unpinEnvironment('nonexistent')).toBe(false);
  });
});

describe('isPinned', () => {
  it('returns true for pinned environment', () => {
    pinEnvironment('prod', 'v5.0.0');
    expect(isPinned('prod')).toBe(true);
  });

  it('returns false for unpinned environment', () => {
    expect(isPinned('dev')).toBe(false);
  });
});

describe('listPins', () => {
  it('returns all pin entries', () => {
    pinEnvironment('env1', 'v1.0.0');
    pinEnvironment('env2', 'v2.0.0');
    const pins = listPins();
    expect(pins).toHaveLength(2);
    expect(pins.map((p) => p.environment)).toEqual(expect.arrayContaining(['env1', 'env2']));
  });

  it('returns empty array when no pins', () => {
    expect(listPins()).toEqual([]);
  });
});
