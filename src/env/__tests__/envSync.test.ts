import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pushEnv, pullEnv, diffEnv } from '../envSync';
import * as keyManager from '../../crypto/keyManager';
import * as encryption from '../../crypto/encryption';

jest.mock('../../crypto/keyManager');
jest.mock('../../crypto/encryption');

const mockLoadMasterKey = keyManager.loadMasterKey as jest.MockedFunction<typeof keyManager.loadMasterKey>;
const mockEncrypt = encryption.encrypt as jest.MockedFunction<typeof encryption.encrypt>;
const mockDecrypt = encryption.decrypt as jest.MockedFunction<typeof encryption.decrypt>;

describe('envSync', () => {
  let tmpDir: string;
  let envFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-test-'));
    envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'KEY1=value1\nKEY2=value2\n');

    mockLoadMasterKey.mockResolvedValue('mock-master-key');
    mockEncrypt.mockResolvedValue({ iv: 'abc', data: 'encrypted', tag: 'tag' } as any);
    mockDecrypt.mockResolvedValue('KEY1=value1\nKEY2=value2\n');

    jest.spyOn(require('../envStore'), 'getStorePath').mockImplementation(
      (env: string) => path.join(tmpDir, `.envoy/store/${env}.enc`)
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  describe('pushEnv', () => {
    it('should encrypt and store the env file', async () => {
      await pushEnv({ environment: 'staging', filePath: envFile });
      const storePath = path.join(tmpDir, '.envoy/store/staging.enc');
      expect(fs.existsSync(storePath)).toBe(true);
      const stored = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      expect(stored).toEqual({ iv: 'abc', data: 'encrypted', tag: 'tag' });
    });

    it('should throw if file does not exist', async () => {
      await expect(
        pushEnv({ environment: 'staging', filePath: '/nonexistent/.env' })
      ).rejects.toThrow('File not found');
    });
  });

  describe('pullEnv', () => {
    it('should decrypt and write env file', async () => {
      const storePath = path.join(tmpDir, '.envoy/store/production.enc');
      fs.mkdirSync(path.dirname(storePath), { recursive: true });
      fs.writeFileSync(storePath, JSON.stringify({ iv: 'abc', data: 'encrypted', tag: 'tag' }));

      const result = await pullEnv({ environment: 'production', filePath: envFile });
      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' });
      expect(fs.readFileSync(envFile, 'utf-8')).toContain('KEY1=value1');
    });

    it('should throw if no stored environment found', async () => {
      await expect(
        pullEnv({ environment: 'nonexistent', filePath: envFile })
      ).rejects.toThrow('No stored environment found for: nonexistent');
    });
  });

  describe('diffEnv', () => {
    it('should return added keys when no remote exists', async () => {
      const diff = await diffEnv('new-env', envFile);
      expect(diff.added).toEqual(expect.arrayContaining(['KEY1', 'KEY2']));
      expect(diff.removed).toHaveLength(0);
      expect(diff.changed).toHaveLength(0);
    });
  });
});
