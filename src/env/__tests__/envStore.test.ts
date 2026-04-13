import * as fs from 'fs';
import * as path from 'path';
import { saveEnvToStore, loadEnvFromStore, listStoredEnvironments } from '../envStore';
import { loadMasterKey } from '../../crypto/keyManager';
import { encrypt, decrypt } from '../../crypto/encryption';

jest.mock('../../crypto/keyManager');
jest.mock('../../crypto/encryption');
jest.mock('fs');

const mockMasterKey = Buffer.from('mock-master-key-32-bytes-padding!');
const mockEncrypted = { iv: 'mockiv', ciphertext: 'mockcipher', tag: 'mocktag' };

beforeEach(() => {
  jest.clearAllMocks();
  (loadMasterKey as jest.Mock).mockResolvedValue(mockMasterKey);
  (encrypt as jest.Mock).mockResolvedValue(mockEncrypted);
  (decrypt as jest.Mock).mockResolvedValue('FOO=bar\nBAZ=qux\n');
  (fs.mkdirSync as jest.Mock).mockImplementation(() => {});
  (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockEncrypted));
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.readdirSync as jest.Mock).mockReturnValue(['production.enc', 'staging.enc']);
});

describe('saveEnvToStore', () => {
  it('encrypts and writes env entries to the store', async () => {
    const entries = [{ key: 'FOO', value: 'bar' }];
    await saveEnvToStore('production', entries);
    expect(encrypt).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

describe('loadEnvFromStore', () => {
  it('reads, decrypts and parses env entries from the store', async () => {
    const entries = await loadEnvFromStore('production');
    expect(decrypt).toHaveBeenCalled();
    expect(entries).toEqual([
      { key: 'FOO', value: 'bar' },
      { key: 'BAZ', value: 'qux' },
    ]);
  });

  it('throws if environment file does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    await expect(loadEnvFromStore('missing')).rejects.toThrow(
      'No stored environment found for: missing'
    );
  });
});

describe('listStoredEnvironments', () => {
  it('returns list of stored environment names', () => {
    const envs = listStoredEnvironments();
    expect(envs).toEqual(['production', 'staging']);
  });

  it('returns empty array if store dir does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const envs = listStoredEnvironments();
    expect(envs).toEqual([]);
  });
});
