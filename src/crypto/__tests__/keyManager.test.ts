import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  generateMasterKey,
  saveMasterKey,
  loadMasterKey,
  masterKeyExists,
  deleteMasterKey,
} from '../keyManager';

const TEST_KEY_FILE = path.join(os.homedir(), '.envoy', 'master.key');

describe('keyManager', () => {
  afterEach(() => {
    if (fs.existsSync(TEST_KEY_FILE)) {
      fs.unlinkSync(TEST_KEY_FILE);
    }
  });

  it('should generate a 64-character hex key', () => {
    const key = generateMasterKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate unique keys on each call', () => {
    const key1 = generateMasterKey();
    const key2 = generateMasterKey();
    expect(key1).not.toBe(key2);
  });

  it('should save and load a master key', () => {
    const key = generateMasterKey();
    saveMasterKey(key);
    const loaded = loadMasterKey();
    expect(loaded).toBe(key);
  });

  it('should return null when no key file exists', () => {
    const result = loadMasterKey();
    expect(result).toBeNull();
  });

  it('should correctly report key existence', () => {
    expect(masterKeyExists()).toBe(false);
    saveMasterKey(generateMasterKey());
    expect(masterKeyExists()).toBe(true);
  });

  it('should delete the master key file', () => {
    saveMasterKey(generateMasterKey());
    deleteMasterKey();
    expect(masterKeyExists()).toBe(false);
  });

  it('should not throw when deleting non-existent key', () => {
    expect(() => deleteMasterKey()).not.toThrow();
  });

  it('should save the key file with restricted permissions (0o600)', () => {
    const key = generateMasterKey();
    saveMasterKey(key);
    const stats = fs.statSync(TEST_KEY_FILE);
    // Check that only the owner has read/write access (mode 0o600)
    const fileMode = stats.mode & 0o777;
    expect(fileMode).toBe(0o600);
  });
});
