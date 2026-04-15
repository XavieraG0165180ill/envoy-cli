import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getSecretFilePath, addSecret, getSecret, removeSecret, listSecrets } from '../envSecret';
import { generateMasterKey, saveMasterKey } from '../../crypto/keyManager';

describe('envSecret integration', () => {
  let tmpDir: string;
  let filePath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-secret-int-'));
    const envoyDir = path.join(tmpDir, '.envoy');
    fs.mkdirSync(envoyDir, { recursive: true });
    const masterKey = generateMasterKey();
    await saveMasterKey(envoyDir, masterKey);
    filePath = getSecretFilePath(tmpDir, 'staging');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('encrypts and decrypts a secret round-trip', async () => {
    await addSecret(filePath, 'staging', 'DB_PASSWORD', 'my-super-secret');
    const value = await getSecret(filePath, 'staging', 'DB_PASSWORD');
    expect(value).toBe('my-super-secret');
  });

  it('stored value is not plaintext', async () => {
    await addSecret(filePath, 'staging', 'DB_PASSWORD', 'my-super-secret');
    const raw = fs.readFileSync(filePath, 'utf-8');
    expect(raw).not.toContain('my-super-secret');
  });

  it('manages multiple secrets independently', async () => {
    await addSecret(filePath, 'staging', 'KEY_A', 'value-a');
    await addSecret(filePath, 'staging', 'KEY_B', 'value-b');
    expect(await getSecret(filePath, 'staging', 'KEY_A')).toBe('value-a');
    expect(await getSecret(filePath, 'staging', 'KEY_B')).toBe('value-b');
    expect(listSecrets(filePath, 'staging')).toHaveLength(2);
  });

  it('removes secret and cannot retrieve it', async () => {
    await addSecret(filePath, 'staging', 'TEMP_KEY', 'temp-value');
    removeSecret(filePath, 'staging', 'TEMP_KEY');
    const value = await getSecret(filePath, 'staging', 'TEMP_KEY');
    expect(value).toBeNull();
  });
});
