import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  loadAliases,
  saveAliases,
  addAlias,
  removeAlias,
  resolveAlias,
  listAliases,
  getAliasFilePath,
} from '../envAlias';

jest.mock('../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => testDir,
}));

let testDir: string;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-alias-test-'));
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

test('loadAliases returns empty object when file does not exist', () => {
  expect(loadAliases()).toEqual({});
});

test('saveAliases and loadAliases round-trip', () => {
  const aliases = { prod: 'production', dev: 'development' };
  saveAliases(aliases);
  expect(loadAliases()).toEqual(aliases);
});

test('addAlias adds a new alias', () => {
  addAlias('stg', 'staging');
  expect(loadAliases()).toEqual({ stg: 'staging' });
});

test('addAlias overwrites existing alias', () => {
  addAlias('prod', 'production');
  addAlias('prod', 'prod-v2');
  expect(loadAliases()['prod']).toBe('prod-v2');
});

test('removeAlias removes an existing alias and returns true', () => {
  addAlias('dev', 'development');
  const result = removeAlias('dev');
  expect(result).toBe(true);
  expect(loadAliases()).toEqual({});
});

test('removeAlias returns false when alias does not exist', () => {
  expect(removeAlias('nonexistent')).toBe(false);
});

test('resolveAlias returns environment for known alias', () => {
  addAlias('p', 'production');
  expect(resolveAlias('p')).toBe('production');
});

test('resolveAlias returns input unchanged when no alias found', () => {
  expect(resolveAlias('staging')).toBe('staging');
});

test('listAliases returns all alias entries', () => {
  addAlias('p', 'production');
  addAlias('d', 'development');
  const list = listAliases();
  expect(list).toHaveLength(2);
  expect(list).toContainEqual({ alias: 'p', environment: 'production' });
  expect(list).toContainEqual({ alias: 'd', environment: 'development' });
});

test('listAliases returns empty array when no aliases exist', () => {
  expect(listAliases()).toEqual([]);
});

test('getAliasFilePath returns a path within the envoy directory', () => {
  const filePath = getAliasFilePath();
  expect(filePath).toContain(testDir);
});
