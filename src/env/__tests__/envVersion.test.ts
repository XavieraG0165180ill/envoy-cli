import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-version-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadVersions,
  saveVersions,
  addVersion,
  removeVersion,
  getVersionsForEnvironment,
  getVersionById,
  generateChecksum,
  EnvVersion,
} from '../envVersion';

const sample: EnvVersion = {
  id: 'v1',
  environment: 'production',
  timestamp: new Date().toISOString(),
  message: 'initial',
  checksum: 'abc123',
};

test('loadVersions returns empty array when no file', () => {
  expect(loadVersions()).toEqual([]);
});

test('saveVersions and loadVersions round-trip', () => {
  saveVersions([sample]);
  expect(loadVersions()).toEqual([sample]);
});

test('addVersion appends a version', () => {
  addVersion(sample);
  expect(loadVersions()).toHaveLength(1);
});

test('removeVersion removes by id', () => {
  addVersion(sample);
  expect(removeVersion('v1')).toBe(true);
  expect(loadVersions()).toHaveLength(0);
});

test('removeVersion returns false if not found', () => {
  expect(removeVersion('nonexistent')).toBe(false);
});

test('getVersionsForEnvironment filters correctly', () => {
  addVersion(sample);
  addVersion({ ...sample, id: 'v2', environment: 'staging' });
  expect(getVersionsForEnvironment('production')).toHaveLength(1);
});

test('getVersionById returns correct version', () => {
  addVersion(sample);
  expect(getVersionById('v1')).toEqual(sample);
});

test('generateChecksum returns consistent hash', () => {
  const cs = generateChecksum('hello');
  expect(generateChecksum('hello')).toBe(cs);
  expect(generateChecksum('world')).not.toBe(cs);
});
