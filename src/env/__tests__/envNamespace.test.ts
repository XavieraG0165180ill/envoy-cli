import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-ns-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  addNamespace,
  removeNamespace,
  getNamespace,
  listNamespaces,
  applyNamespace,
  stripNamespace,
} from '../envNamespace';

describe('addNamespace', () => {
  it('adds a new namespace', () => {
    const ns = addNamespace('myapp', 'MYAPP', 'My app namespace');
    expect(ns.name).toBe('myapp');
    expect(ns.prefix).toBe('MYAPP');
    expect(ns.description).toBe('My app namespace');
    expect(ns.createdAt).toBeDefined();
  });

  it('throws if namespace already exists', () => {
    addNamespace('myapp', 'MYAPP');
    expect(() => addNamespace('myapp', 'MYAPP2')).toThrow("Namespace 'myapp' already exists.");
  });
});

describe('removeNamespace', () => {
  it('removes an existing namespace', () => {
    addNamespace('toremove', 'TR');
    expect(removeNamespace('toremove')).toBe(true);
    expect(getNamespace('toremove')).toBeUndefined();
  });

  it('returns false for non-existent namespace', () => {
    expect(removeNamespace('ghost')).toBe(false);
  });
});

describe('listNamespaces', () => {
  it('returns all namespaces', () => {
    addNamespace('a', 'A');
    addNamespace('b', 'B');
    const list = listNamespaces();
    expect(list).toHaveLength(2);
    expect(list.map(n => n.name)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('returns empty array when none exist', () => {
    expect(listNamespaces()).toEqual([]);
  });
});

describe('applyNamespace', () => {
  it('prefixes all keys with the given prefix', () => {
    const map = new Map([['KEY', 'value'], ['OTHER', 'data']]);
    const result = applyNamespace(map, 'APP');
    expect(result.get('APP_KEY')).toBe('value');
    expect(result.get('APP_OTHER')).toBe('data');
    expect(result.size).toBe(2);
  });
});

describe('stripNamespace', () => {
  it('removes prefix from matching keys', () => {
    const map = new Map([['APP_KEY', 'value'], ['APP_OTHER', 'data'], ['UNRELATED', 'x']]);
    const result = stripNamespace(map, 'APP');
    expect(result.get('KEY')).toBe('value');
    expect(result.get('OTHER')).toBe('data');
    expect(result.has('UNRELATED')).toBe(false);
    expect(result.size).toBe(2);
  });
});
