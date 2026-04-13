import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createPushCommand } from '../push';
import { createPullCommand } from '../pull';
import * as keyManager from '../../../crypto/keyManager';
import * as envStore from '../../../env/envStore';
import * as encryption from '../../../crypto/encryption';

jest.mock('../../../crypto/keyManager');
jest.mock('../../../env/envStore');
jest.mock('../../../crypto/encryption');

const mockedKeyManager = keyManager as jest.Mocked<typeof keyManager>;
const mockedEnvStore = envStore as jest.Mocked<typeof envStore>;
const mockedEncryption = encryption as jest.Mocked<typeof encryption>;

describe('push command', () => {
  let tmpDir: string;
  let envFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-test-'));
    envFile = path.join(tmpDir, '.env');
    fs.writeFileSync(envFile, 'API_KEY=secret\nDEBUG=true\n');
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('should push env file to store', async () => {
    mockedKeyManager.masterKeyExists.mockReturnValue(true);
    mockedKeyManager.loadMasterKey.mockReturnValue('masterkey123');
    mockedEncryption.encrypt.mockResolvedValue('encrypted-data');
    mockedEnvStore.storeEnvironment.mockImplementation(() => {});

    const cmd = createPushCommand();
    await cmd.parseAsync(['node', 'envoy', 'production', '--file', envFile]);

    expect(mockedEncryption.encrypt).toHaveBeenCalledWith(
      expect.stringContaining('API_KEY'),
      'masterkey123'
    );
    expect(mockedEnvStore.storeEnvironment).toHaveBeenCalledWith('production', 'encrypted-data');
  });

  it('should exit if master key does not exist', async () => {
    mockedKeyManager.masterKeyExists.mockReturnValue(false);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    const cmd = createPushCommand();
    await expect(cmd.parseAsync(['node', 'envoy', 'production', '--file', envFile])).rejects.toThrow('exit');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});

describe('pull command', () => {
  it('should exit if environment not found', async () => {
    mockedKeyManager.masterKeyExists.mockReturnValue(true);
    mockedEnvStore.listStoredEnvironments.mockReturnValue(['staging']);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    const cmd = createPullCommand();
    await expect(cmd.parseAsync(['node', 'envoy', 'production'])).rejects.toThrow('exit');
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });
});
