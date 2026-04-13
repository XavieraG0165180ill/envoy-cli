import { createRotateCommand } from '../rotate';
import * as keyManager from '../../../crypto/keyManager';
import * as envStore from '../../../env/envStore';
import * as encryption from '../../../crypto/encryption';
import * as fs from 'fs';

jest.mock('../../../crypto/keyManager');
jest.mock('../../../env/envStore');
jest.mock('../../../crypto/encryption');
jest.mock('fs');

const mockEnsureEnvoyDir = keyManager.ensureEnvoyDir as jest.Mock;
const mockLoadMasterKey = keyManager.loadMasterKey as jest.Mock;
const mockGenerateMasterKey = keyManager.generateMasterKey as jest.Mock;
const mockSaveMasterKey = keyManager.saveMasterKey as jest.Mock;
const mockListStoredEnvironments = envStore.listStoredEnvironments as jest.Mock;
const mockGetStorePath = envStore.getStorePath as jest.Mock;
const mockEncrypt = encryption.encrypt as jest.Mock;
const mockDecrypt = encryption.decrypt as jest.Mock;
const mockReadFileSync = fs.readFileSync as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;

describe('rotate command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureEnvoyDir.mockReturnValue(undefined);
    mockLoadMasterKey.mockReturnValue('old-master-key');
    mockGenerateMasterKey.mockReturnValue('new-master-key');
    mockSaveMasterKey.mockReturnValue(undefined);
    mockEncrypt.mockReturnValue('encrypted-data');
    mockDecrypt.mockReturnValue('decrypted-data');
    mockWriteFileSync.mockReturnValue(undefined);
  });

  it('should exit if no master key exists', async () => {
    mockLoadMasterKey.mockReturnValue(null);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    const cmd = createRotateCommand();
    await expect(cmd.parseAsync(['node', 'test', '--force'])).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('should rotate key with no environments', async () => {
    mockListStoredEnvironments.mockReturnValue([]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const cmd = createRotateCommand();
    await cmd.parseAsync(['node', 'test', '--force']);
    expect(mockGenerateMasterKey).toHaveBeenCalled();
    expect(mockSaveMasterKey).toHaveBeenCalledWith('new-master-key');
    expect(mockEncrypt).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should re-encrypt all environments on key rotation', async () => {
    mockListStoredEnvironments.mockReturnValue(['production', 'staging']);
    mockGetStorePath.mockImplementation((env: string) => `/store/${env}.enc`);
    mockReadFileSync.mockReturnValue('encrypted-data');
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const cmd = createRotateCommand();
    await cmd.parseAsync(['node', 'test', '--force']);
    expect(mockDecrypt).toHaveBeenCalledTimes(2);
    expect(mockEncrypt).toHaveBeenCalledTimes(2);
    expect(mockEncrypt).toHaveBeenCalledWith('decrypted-data', 'new-master-key');
    expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    consoleSpy.mockRestore();
  });

  it('should handle errors gracefully', async () => {
    mockListStoredEnvironments.mockImplementation(() => { throw new Error('disk error'); });
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const cmd = createRotateCommand();
    await expect(cmd.parseAsync(['node', 'test', '--force'])).rejects.toThrow('process.exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
