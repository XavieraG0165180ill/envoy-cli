import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-dep-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadDependencies,
  addDependency,
  removeDependency,
  getDependentsOf,
  resolveDependencyOrder,
} from '../envDependency';

describe('envDependency', () => {
  it('returns empty object when no file exists', () => {
    expect(loadDependencies()).toEqual({});
  });

  it('adds and loads a dependency', () => {
    addDependency('DATABASE_URL', ['DB_HOST', 'DB_PORT'], 'Database connection string');
    const deps = loadDependencies();
    expect(deps['DATABASE_URL']).toMatchObject({
      key: 'DATABASE_URL',
      dependsOn: ['DB_HOST', 'DB_PORT'],
      description: 'Database connection string',
    });
  });

  it('removes a dependency', () => {
    addDependency('API_URL', ['API_HOST']);
    const removed = removeDependency('API_URL');
    expect(removed).toBe(true);
    expect(loadDependencies()['API_URL']).toBeUndefined();
  });

  it('returns false when removing non-existent key', () => {
    expect(removeDependency('MISSING_KEY')).toBe(false);
  });

  it('gets dependents of a key', () => {
    addDependency('DATABASE_URL', ['DB_HOST']);
    addDependency('REPLICA_URL', ['DB_HOST']);
    const dependents = getDependentsOf('DB_HOST');
    expect(dependents).toContain('DATABASE_URL');
    expect(dependents).toContain('REPLICA_URL');
  });

  it('resolves dependency order correctly', () => {
    addDependency('DATABASE_URL', ['DB_HOST', 'DB_PORT']);
    addDependency('APP_URL', ['DATABASE_URL']);
    const order = resolveDependencyOrder(['APP_URL']);
    expect(order.indexOf('DB_HOST')).toBeLessThan(order.indexOf('DATABASE_URL'));
    expect(order.indexOf('DATABASE_URL')).toBeLessThan(order.indexOf('APP_URL'));
  });

  it('handles keys with no dependencies in order resolution', () => {
    const order = resolveDependencyOrder(['SIMPLE_KEY']);
    expect(order).toContain('SIMPLE_KEY');
  });
});
