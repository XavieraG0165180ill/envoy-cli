import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-profile-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import {
  loadProfiles,
  addProfile,
  removeProfile,
  getProfile,
  listProfiles,
} from '../envProfile';

describe('envProfile', () => {
  it('returns empty map when no profiles file exists', () => {
    expect(loadProfiles()).toEqual({});
  });

  it('adds a new profile', () => {
    const profile = addProfile('staging', ['staging', 'staging-eu'], 'Staging envs');
    expect(profile.name).toBe('staging');
    expect(profile.environments).toEqual(['staging', 'staging-eu']);
    expect(profile.description).toBe('Staging envs');
    expect(profile.createdAt).toBeDefined();
  });

  it('updates an existing profile without changing createdAt', () => {
    const first = addProfile('prod', ['production']);
    const second = addProfile('prod', ['production', 'production-eu']);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.environments).toContain('production-eu');
  });

  it('removes a profile', () => {
    addProfile('dev', ['development']);
    expect(removeProfile('dev')).toBe(true);
    expect(getProfile('dev')).toBeUndefined();
  });

  it('returns false when removing non-existent profile', () => {
    expect(removeProfile('ghost')).toBe(false);
  });

  it('gets a specific profile by name', () => {
    addProfile('test', ['test'], 'Test env', 'test');
    const profile = getProfile('test');
    expect(profile).toBeDefined();
    expect(profile?.defaultEnvironment).toBe('test');
  });

  it('lists all profiles', () => {
    addProfile('alpha', ['alpha']);
    addProfile('beta', ['beta']);
    const profiles = listProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.map((p) => p.name)).toContain('alpha');
    expect(profiles.map((p) => p.name)).toContain('beta');
  });
});
