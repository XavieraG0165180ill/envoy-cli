import { createCopyCommand } from '../copy';
import * as keyManager from '../../../crypto/keyManager';
import * as envStore from '../../../env/envStore';
import * as envParser from '../../../env/envParser';

jest.mock('../../../crypto/keyManager');
jest.mock('../../../env/envStore');
jest.mock('../../../env/envParser');

const mockLoadMasterKey = keyManager.loadMasterKey as jest.Mock;
const mockLoadEnv = envStore.loadEnv as jest.Mock;
const mockSaveEnv = envStore.saveEnv as jest.Mock;
const mockParseEnvContent = envParser.parseEnvContent as jest.Mock;
const mockSerializeEnv = envParser.serializeEnv as jest.Mock;

describe('copy command', () => {
  const MASTER_KEY = Buffer.from('test-key');

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadMasterKey.mockResolvedValue(MASTER_KEY);
    mockSerializeEnv.mockReturnValue('KEY=value');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('copies all variables from source to new destination', async () => {
    mockLoadEnv
      .mockResolvedValueOnce('KEY1=val1\nKEY2=val2')
      .mockRejectedValueOnce(new Error('not found'));
    mockParseEnvContent.mockReturnValue([
      { key: 'KEY1', value: 'val1' },
      { key: 'KEY2', value: 'val2' },
    ]);

    const cmd = createCopyCommand();
    await cmd.parseAsync(['node', 'copy', 'staging', 'production']);

    expect(mockSaveEnv).toHaveBeenCalledWith('production', 'KEY=value', MASTER_KEY);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Copied 2 variable(s)'));
  });

  it('skips existing keys without --overwrite', async () => {
    mockLoadEnv
      .mockResolvedValueOnce('KEY1=new')
      .mockResolvedValueOnce('KEY1=old');
    mockParseEnvContent
      .mockReturnValueOnce([{ key: 'KEY1', value: 'new' }])
      .mockReturnValueOnce([{ key: 'KEY1', value: 'old' }]);

    const cmd = createCopyCommand();
    await cmd.parseAsync(['node', 'copy', 'staging', 'production']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Copied 0 variable(s)'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Skipped 1'));
  });

  it('copies only specified keys when --keys is provided', async () => {
    mockLoadEnv
      .mockResolvedValueOnce('KEY1=val1\nKEY2=val2')
      .mockRejectedValueOnce(new Error('not found'));
    mockParseEnvContent.mockReturnValue([
      { key: 'KEY1', value: 'val1' },
      { key: 'KEY2', value: 'val2' },
    ]);

    const cmd = createCopyCommand();
    await cmd.parseAsync(['node', 'copy', 'staging', 'production', '--keys', 'KEY1']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Copied 1 variable(s)'));
  });

  it('exits with error when master key cannot be loaded', async () => {
    mockLoadMasterKey.mockRejectedValue(new Error('no key'));
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    const cmd = createCopyCommand();
    await expect(cmd.parseAsync(['node', 'copy', 'a', 'b'])).rejects.toThrow('exit');
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
