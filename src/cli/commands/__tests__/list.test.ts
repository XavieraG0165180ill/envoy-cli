import { createListCommand } from '../list';
import * as envStore from '../../../env/envStore';
import * as keyManager from '../../../crypto/keyManager';

jest.mock('../../../env/envStore');
jest.mock('../../../crypto/keyManager');
jest.mock('chalk', () => ({
  red: (s: string) => s,
  yellow: (s: string) => s,
  cyan: (s: string) => s,
  white: (s: string) => s,
  bold: (s: string) => s,
  dim: (s: string) => s,
}));

const mockListStoredEnvironments = envStore.listStoredEnvironments as jest.Mock;
const mockMasterKeyExists = keyManager.masterKeyExists as jest.Mock;

describe('list command', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should exit with error if master key does not exist', async () => {
    mockMasterKeyExists.mockReturnValue(false);
    const cmd = createListCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('No master key found'),
      expect.any(String)
    );
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should show message when no environments are stored', async () => {
    mockMasterKeyExists.mockReturnValue(true);
    mockListStoredEnvironments.mockReturnValue([]);
    const cmd = createListCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No environments stored yet.')
    );
  });

  it('should list stored environments', async () => {
    mockMasterKeyExists.mockReturnValue(true);
    mockListStoredEnvironments.mockReturnValue([
      { name: 'development', lastModified: '2024-01-01' },
      { name: 'production', lastModified: '2024-01-02' },
    ]);
    const cmd = createListCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('development')
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('production')
    );
  });

  it('should show last modified date in verbose mode', async () => {
    mockMasterKeyExists.mockReturnValue(true);
    mockListStoredEnvironments.mockReturnValue([
      { name: 'staging', lastModified: '2024-03-15' },
    ]);
    const cmd = createListCommand();
    await cmd.parseAsync(['--verbose'], { from: 'user' });
    const calls = consoleLogSpy.mock.calls.flat().join(' ');
    expect(calls).toContain('2024-03-15');
  });
});
