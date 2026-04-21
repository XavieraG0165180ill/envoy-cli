import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../envStore', () => ({
  getStorePath: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-inherit-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadInheritMap,
  setParents,
  removeInheritance,
  getParents,
  resolveAncestors,
  applyInheritance,
} from '../envInherit';

describe('envInherit', () => {
  test('loadInheritMap returns empty object when file missing', () => {
    expect(loadInheritMap()).toEqual({});
  });

  test('setParents and getParents round-trip', () => {
    setParents('staging', ['base', 'defaults']);
    expect(getParents('staging')).toEqual(['base', 'defaults']);
  });

  test('removeInheritance deletes entry', () => {
    setParents('staging', ['base']);
    removeInheritance('staging');
    expect(getParents('staging')).toEqual([]);
  });

  test('resolveAncestors returns breadth-first ancestors without cycles', () => {
    setParents('prod', ['staging']);
    setParents('staging', ['base']);
    const ancestors = resolveAncestors('prod');
    expect(ancestors).toEqual(['staging', 'base']);
  });

  test('resolveAncestors handles no parents', () => {
    expect(resolveAncestors('base')).toEqual([]);
  });

  test('resolveAncestors does not infinite-loop on cycles', () => {
    setParents('a', ['b']);
    setParents('b', ['a']);
    const ancestors = resolveAncestors('a');
    expect(ancestors.length).toBeLessThanOrEqual(2);
  });

  test('applyInheritance merges ancestor values with child override', () => {
    setParents('staging', ['base']);
    const envMaps: Record<string, Map<string, string>> = {
      base: new Map([['DB_HOST', 'localhost'], ['LOG_LEVEL', 'info']]),
      staging: new Map([['DB_HOST', 'staging-db']]),
    };
    const result = applyInheritance('staging', envMaps);
    expect(result.get('DB_HOST')).toBe('staging-db');
    expect(result.get('LOG_LEVEL')).toBe('info');
  });

  test('applyInheritance with no parents returns only child keys', () => {
    const envMaps: Record<string, Map<string, string>> = {
      prod: new Map([['KEY', 'value']]),
    };
    const result = applyInheritance('prod', envMaps);
    expect(result.get('KEY')).toBe('value');
  });
});
