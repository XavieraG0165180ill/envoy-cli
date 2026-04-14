import * as fs from 'fs';
import * as path from 'path';
import {
  createShareToken,
  resolveShareToken,
  revokeShareToken,
  listShareTokens,
  getShareDir,
} from '../envShare';
import { encrypt, decrypt } from '../../crypto/encryption';
import { loadMasterKey } from '../../crypto/keyManager';
import { getStorePath } from '../envStore';

jest.mock('fs');
jest.mock('../../crypto/encryption');
jest.mock('../../crypto/keyManager');
jest.mock('../envStore');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;
const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;
const mockLoadMasterKey = loadMasterKey as jest.MockedFunction<typeof loadMasterKey>;
const mockGetStorePath = getStorePath as jest.MockedFunction<typeof getStorePath>;

describe('envShare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMasterKey.mockResolvedValue('master-key');
    mockGetStorePath.mockReturnValue('/fake/.envoy/store/production.enc');
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('encrypted-content' as any);
    mockFs.readdirSync.mockReturnValue([] as any);
    mockFs.mkdirSync.mockImplementation(() => undefined as any);
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockEncrypt.mockResolvedValue({ encryptedData: 'enc', iv: 'iv123', salt: 'salt123' });
    mockDecrypt.mockResolvedValue('KEY=value');
  });

  describe('createShareToken', () => {
    it('should create a share token for a valid environment', async () => {
      const token = await createShareToken('production');
      expect(token.environment).toBe('production');
      expect(token.id).toHaveLength(24);
      expect(token.expiresAt).toBeNull();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should set expiresAt when ttlMinutes is provided', async () => {
      const token = await createShareToken('production', 60);
      expect(token.expiresAt).not.toBeNull();
    });

    it('should throw if environment does not exist', async () => {
      mockFs.existsSync.mockReturnValueOnce(false);
      await expect(createShareToken('missing')).rejects.toThrow("Environment 'missing' does not exist.");
    });
  });

  describe('resolveShareToken', () => {
    it('should decrypt and return env content', async () => {
      const fakeToken = JSON.stringify({
        id: 'abc',
        environment: 'production',
        createdAt: new Date().toISOString(),
        expiresAt: null,
        encryptedPayload: 'enc',
        iv: 'iv',
        salt: 'salt',
      });
      mockFs.readFileSync.mockReturnValue(fakeToken as any);
      const result = await resolveShareToken('abc');
      expect(result).toBe('KEY=value');
    });

    it('should throw if token is expired', async () => {
      const fakeToken = JSON.stringify({
        id: 'abc',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        encryptedPayload: 'enc', iv: 'iv', salt: 'salt',
      });
      mockFs.readFileSync.mockReturnValue(fakeToken as any);
      await expect(resolveShareToken('abc')).rejects.toThrow('expired');
    });

    it('should throw if token file not found', async () => {
      mockFs.existsSync.mockReturnValue(false);
      await expect(resolveShareToken('missing')).rejects.toThrow("Share token 'missing' not found.");
    });
  });

  describe('revokeShareToken', () => {
    it('should delete the token file', () => {
      revokeShareToken('abc');
      expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('should throw if token not found', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(() => revokeShareToken('missing')).toThrow("Share token 'missing' not found.");
    });
  });

  describe('listShareTokens', () => {
    it('should return empty array if share dir does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);
      expect(listShareTokens()).toEqual([]);
    });

    it('should return parsed tokens', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue(['abc.json'] as any);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({ id: 'abc' }) as any);
      const tokens = listShareTokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].id).toBe('abc');
    });
  });
});
