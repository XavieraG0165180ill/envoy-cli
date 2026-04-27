import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  getCipherFilePath,
  loadCipherStore,
  saveCipherStore,
  cipherSet,
  cipherGet,
  cipherRemove,
  cipherList,
} from '../envCipher';
import * as keyManager from '../../crypto/keyManager';
import * as encryption from '../../crypto/encryption';

jest.mock('../../crypto/keyManager');
jest.mock('../../crypto/encryption');

const mockLoadMasterKey = keyManager.loadMasterKey as jest.MockedFunction<typeof keyManager.loadMasterKey>;
const mockEncrypt = encryption.encrypt as jest.MockedFunction<typeof encryption.encrypt>;
const mockDecrypt = encryption.decrypt as jest.MockedFunction<typeof encryption.decrypt>;

describe('envCipher', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-cipher-'));
    mockLoadMasterKey.mockResolvedValue('masterkey123' as any);
    mockEncrypt.mockResolvedValue({ ciphertext: 'enc_value', iv: 'test_iv' } as any);
    mockDecrypt.mockResolvedValue('plain_value');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('returns empty store when no file exists', () => {
    const store = loadCipherStore(tmpDir);
    expect(store.entries).toEqual([]);
  });

  it('saves and loads cipher store', () => {
    const store = { entries: [{ environment: 'prod', key: 'DB_PASS', ciphertext: 'c', iv: 'i', createdAt: 'now', updatedAt: 'now' }] };
    saveCipherStore(tmpDir, store);
    const loaded = loadCipherStore(tmpDir);
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0].key).toBe('DB_PASS');
  });

  it('getCipherFilePath returns correct path', () => {
    const p = getCipherFilePath(tmpDir);
    expect(p).toContain('.envoy');
    expect(p).toContain('cipher.json');
  });

  it('cipherSet stores encrypted entry', async () => {
    await cipherSet(tmpDir, 'prod', 'SECRET', 'mysecret');
    const store = loadCipherStore(tmpDir);
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].ciphertext).toBe('enc_value');
    expect(store.entries[0].iv).toBe('test_iv');
  });

  it('cipherSet updates existing entry', async () => {
    await cipherSet(tmpDir, 'prod', 'SECRET', 'first');
    await cipherSet(tmpDir, 'prod', 'SECRET', 'second');
    const store = loadCipherStore(tmpDir);
    expect(store.entries).toHaveLength(1);
  });

  it('cipherGet returns decrypted value', async () => {
    await cipherSet(tmpDir, 'prod', 'SECRET', 'mysecret');
    const val = await cipherGet(tmpDir, 'prod', 'SECRET');
    expect(val).toBe('plain_value');
  });

  it('cipherGet returns undefined for missing key', async () => {
    const val = await cipherGet(tmpDir, 'prod', 'MISSING');
    expect(val).toBeUndefined();
  });

  it('cipherRemove deletes entry and returns true', async () => {
    await cipherSet(tmpDir, 'prod', 'SECRET', 'val');
    const removed = cipherRemove(tmpDir, 'prod', 'SECRET');
    expect(removed).toBe(true);
    const store = loadCipherStore(tmpDir);
    expect(store.entries).toHaveLength(0);
  });

  it('cipherRemove returns false if entry not found', () => {
    const removed = cipherRemove(tmpDir, 'prod', 'NONE');
    expect(removed).toBe(false);
  });

  it('cipherList returns only entries for given environment', async () => {
    await cipherSet(tmpDir, 'prod', 'A', 'a');
    await cipherSet(tmpDir, 'staging', 'B', 'b');
    const entries = cipherList(tmpDir, 'prod');
    expect(entries).toHaveLength(1);
    expect(entries[0].key).toBe('A');
  });
});
