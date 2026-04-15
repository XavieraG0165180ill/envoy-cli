import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import {
  addRole,
  removeRole,
  assignRole,
  getRoleForUser,
  listRoles,
  hasPermission,
  loadRoles,
} from '../envRole';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-role-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('envRole', () => {
  it('should add a new role', () => {
    const role = addRole('developer', ['read', 'write'], ['staging', 'dev']);
    expect(role.name).toBe('developer');
    expect(role.permissions).toContain('read');
    const store = loadRoles();
    expect(store.roles['developer']).toBeDefined();
  });

  it('should throw when adding duplicate role', () => {
    addRole('admin', ['admin'], ['*']);
    expect(() => addRole('admin', ['read'], ['dev'])).toThrow('already exists');
  });

  it('should remove a role and its assignments', () => {
    addRole('viewer', ['read'], ['*']);
    assignRole('user1', 'viewer');
    removeRole('viewer');
    const store = loadRoles();
    expect(store.roles['viewer']).toBeUndefined();
    expect(store.assignments['user1']).toBeUndefined();
  });

  it('should throw when removing non-existent role', () => {
    expect(() => removeRole('ghost')).toThrow('not found');
  });

  it('should assign a role to a user', () => {
    addRole('ops', ['read', 'write'], ['production']);
    assignRole('alice', 'ops');
    const role = getRoleForUser('alice');
    expect(role?.name).toBe('ops');
  });

  it('should return null for user with no role', () => {
    expect(getRoleForUser('nobody')).toBeNull();
  });

  it('should list all roles', () => {
    addRole('r1', ['read'], ['dev']);
    addRole('r2', ['write'], ['staging']);
    const roles = listRoles();
    expect(roles).toHaveLength(2);
  });

  it('should check permissions correctly', () => {
    addRole('dev', ['read', 'write'], ['dev', 'staging']);
    assignRole('bob', 'dev');
    expect(hasPermission('bob', 'read', 'dev')).toBe(true);
    expect(hasPermission('bob', 'admin', 'dev')).toBe(false);
    expect(hasPermission('bob', 'write', 'production')).toBe(false);
  });

  it('should allow wildcard environment access', () => {
    addRole('superadmin', ['read', 'write', 'admin'], ['*']);
    assignRole('root', 'superadmin');
    expect(hasPermission('root', 'admin', 'production')).toBe(true);
  });
});
