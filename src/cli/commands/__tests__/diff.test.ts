import { createDiffCommand } from '../diff';
import * as envStore from '../../../env/envStore';
import * as keyManager from '../../../crypto/keyManager';
import * as encryption from '../../../crypto/encryption';
import * as envParser from '../../../env/envParser';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('../../../env/envStore');
jest.mock('../../../crypto/keyManager');
jest.mock('../../../crypto/encryption');
jest.mock('../../../env/envParser');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockEnvStore = envStore as jest.Mocked<typeof envStore>;
const mockKeyManager = keyManager as jest.Mocked<typeof keyManager>;
const mockEncryption = encryption as jest.Mocked<typeof encryption>;
const mockEnvParser = envParser as jest.Mocked<typeof envParser>;

describe('createDiffCommand', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit'); });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should exit if local file does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const cmd = createDiffCommand();
    await expect(cmd.parseAsync(['node', 'diff', 'production'])).rejects.toThrow('process.exit');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Local file not found'));
  });

  it('should exit if stored environment does not exist', async () => {
    mockFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
    mockEnvStore.getStorePath.mockReturnValue('/mock/.envoy/production.enc');
    const cmd = createDiffCommand();
    await expect(cmd.parseAsync(['node', 'diff', 'production'])).rejects.toThrow('process.exit');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No stored environment found'));
  });

  it('should show no differences when files are identical', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockEnvStore.getStorePath.mockReturnValue('/mock/.envoy/production.enc');
    mockKeyManager.loadMasterKey.mockResolvedValue('masterkey');
    mockFs.readFileSync.mockReturnValue('encrypted-data');
    mockEncryption.decrypt.mockResolvedValue('KEY=value');
    mockEnvParser.parseEnvContent.mockReturnValue([{ key: 'KEY', value: 'value' }]);
    mockEnvParser.envToRecord.mockReturnValue({ KEY: 'value' });
    const cmd = createDiffCommand();
    await cmd.parseAsync(['node', 'diff', 'production']);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No differences found'));
  });

  it('should highlight added, removed, and changed keys', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockEnvStore.getStorePath.mockReturnValue('/mock/.envoy/production.enc');
    mockKeyManager.loadMasterKey.mockResolvedValue('masterkey');
    mockFs.readFileSync.mockReturnValue('encrypted-data');
    mockEncryption.decrypt.mockResolvedValue('STORED=old');
    mockEnvParser.parseEnvContent.mockReturnValue([]);
    mockEnvParser.envToRecord
      .mockReturnValueOnce({ STORED: 'old' })
      .mockReturnValueOnce({ LOCAL: 'new' });
    const cmd = createDiffCommand();
    await cmd.parseAsync(['node', 'diff', 'production']);
    const output = consoleLogSpy.mock.calls.map((c: unknown[]) => c[0]).join('\n');
    expect(output).toMatch(/LOCAL/);
    expect(output).toMatch(/STORED/);
  });
});
