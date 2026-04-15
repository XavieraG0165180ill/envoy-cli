import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getSecretFilePath,
  loadSecrets,
  saveSecrets,
  addSecret,
  getSecret,
  removeSecret,
  listSecrets,
} from '../envSecret';
import * as encryption from '../../crypto/encryption';
import * as keyManager from '../../crypto/keyManager';

jest.mock('../../crypto/encryption');
jest.mock('../../crypto/keyManager');

const mockedEncrypt = encryption.encrypt as jest.MockedFunction<typeof encryption.encrypt>;
const mockedDecrypt = encryption.decrypt as jest.MockedFunction<typeof encryption.decrypt>;
const mockedLoadMasterKey = keyManager.loadMasterKey as jest.MockedFunction<typeof keyManager.loadMasterKey>;

describe('envSecret', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-secret-test-'));
    filePath = getSecretFilePath(tmpDir, 'production');
    mockedLoadMasterKey.mockResolvedValue('master-key-mock');
    mockedEncrypt.mockResolvedValue('encrypted-value');
    mockedDecrypt.mockResolvedValue('plain-value');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty secrets when file does not exist', () => {
    const data = loadSecrets(filePath);
    expect(data.secrets).toEqual([]);
  });

  it('saves and loads secrets', () => {
    const now = new Date().toISOString();
    saveSecrets(filePath, {
      secrets: [{ key: 'DB_PASS', encryptedValue: 'enc', environment: 'production', createdAt: now, updatedAt: now }],
    });
    const loaded = loadSecrets(filePath);
    expect(loaded.secrets).toHaveLength(1);
    expect(loaded.secrets[0].key).toBe('DB_PASS');
  });

  it('adds a new secret', async () => {
    await addSecret(filePath, 'production', 'API_KEY', 'secret123');
    const data = loadSecrets(filePath);
    expect(data.secrets).toHaveLength(1);
    expect(data.secrets[0].key).toBe('API_KEY');
    expect(data.secrets[0].encryptedValue).toBe('encrypted-value');
  });

  it('updates existing secret', async () => {
    await addSecret(filePath, 'production', 'API_KEY', 'secret123');
    await addSecret(filePath, 'production', 'API_KEY', 'newsecret');
    const data = loadSecrets(filePath);
    expect(data.secrets).toHaveLength(1);
  });

  it('retrieves decrypted secret', async () => {
    await addSecret(filePath, 'production', 'API_KEY', 'secret123');
    const value = await getSecret(filePath, 'production', 'API_KEY');
    expect(value).toBe('plain-value');
  });

  it('returns null for missing secret', async () => {
    const value = await getSecret(filePath, 'production', 'MISSING_KEY');
    expect(value).toBeNull();
  });

  it('removes a secret', async () => {
    await addSecret(filePath, 'production', 'API_KEY', 'secret123');
    const removed = removeSecret(filePath, 'production', 'API_KEY');
    expect(removed).toBe(true);
    expect(loadSecrets(filePath).secrets).toHaveLength(0);
  });

  it('returns false when removing non-existent secret', () => {
    const removed = removeSecret(filePath, 'production', 'GHOST_KEY');
    expect(removed).toBe(false);
  });

  it('lists secrets for environment', async () => {
    await addSecret(filePath, 'production', 'KEY1', 'val1');
    await addSecret(filePath, 'production', 'KEY2', 'val2');
    const list = listSecrets(filePath, 'production');
    expect(list).toHaveLength(2);
  });
});
