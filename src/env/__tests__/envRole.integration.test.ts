import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

let tmpDir: string;

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import {
  addRole,
  assignRole,
  hasPermission,
  removeRole,
  getRoleForUser,
  loadRoles,
} from '../envRole';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-role-integ-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('envRole integration', () => {
  it('full lifecycle: create, assign, check, remove', () => {
    addRole('engineer', ['read', 'write'], ['dev', 'staging']);
    assignRole('carol', 'engineer');

    expect(hasPermission('carol', 'read', 'dev')).toBe(true);
    expect(hasPermission('carol', 'write', 'staging')).toBe(true);
    expect(hasPermission('carol', 'admin', 'dev')).toBe(false);
    expect(hasPermission('carol', 'read', 'production')).toBe(false);

    removeRole('engineer');
    expect(getRoleForUser('carol')).toBeNull();
    expect(loadRoles().roles['engineer']).toBeUndefined();
  });

  it('multiple users with different roles', () => {
    addRole('reader', ['read'], ['*']);
    addRole('writer', ['read', 'write'], ['dev']);

    assignRole('user-a', 'reader');
    assignRole('user-b', 'writer');

    expect(hasPermission('user-a', 'read', 'production')).toBe(true);
    expect(hasPermission('user-a', 'write', 'dev')).toBe(false);
    expect(hasPermission('user-b', 'write', 'dev')).toBe(true);
    expect(hasPermission('user-b', 'write', 'production')).toBe(false);
  });

  it('reassigning a role replaces previous assignment', () => {
    addRole('junior', ['read'], ['dev']);
    addRole('senior', ['read', 'write'], ['*']);
    assignRole('dave', 'junior');
    assignRole('dave', 'senior');
    const role = getRoleForUser('dave');
    expect(role?.name).toBe('senior');
  });

  it('persists roles to disk', () => {
    addRole('persistent', ['read'], ['staging']);
    const rolesFile = path.join(tmpDir, 'roles.json');
    expect(fs.existsSync(rolesFile)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(rolesFile, 'utf-8'));
    expect(raw.roles['persistent']).toBeDefined();
  });
});
