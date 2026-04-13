import { createRenameCommand } from '../rename';
import * as envStore from '../../../env/envStore';

jest.mock('../../../env/envStore', () => ({
  environmentExists: jest.fn(),
  renameEnvironment: jest.fn(),
  getStorePath: jest.fn(),
  listStoredEnvironments: jest.fn(),
  deleteEnvironment: jest.fn(),
}));

const mockEnvironmentExists = envStore.environmentExists as jest.MockedFunction<
  typeof envStore.environmentExists
>;
const mockRenameEnvironment = envStore.renameEnvironment as jest.MockedFunction<
  typeof envStore.renameEnvironment
>;

describe('rename command', () => {
  let exitSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should rename an environment successfully', async () => {
    mockEnvironmentExists.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockRenameEnvironment.mockResolvedValueOnce(undefined);

    const cmd = createRenameCommand();
    await cmd.parseAsync(['node', 'test', 'staging', 'production']);

    expect(mockRenameEnvironment).toHaveBeenCalledWith('staging', 'production');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('renamed to "production"')
    );
  });

  it('should error if old environment does not exist', async () => {
    mockEnvironmentExists.mockResolvedValueOnce(false);

    const cmd = createRenameCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'nonexistent', 'new'])
    ).rejects.toThrow('exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not exist')
    );
  });

  it('should error if new environment already exists without --force', async () => {
    mockEnvironmentExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    const cmd = createRenameCommand();
    await expect(
      cmd.parseAsync(['node', 'test', 'staging', 'production'])
    ).rejects.toThrow('exit');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('already exists')
    );
  });

  it('should overwrite if new environment exists with --force', async () => {
    mockEnvironmentExists.mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    mockRenameEnvironment.mockResolvedValueOnce(undefined);

    const cmd = createRenameCommand();
    await cmd.parseAsync(['node', 'test', 'staging', 'production', '--force']);

    expect(mockRenameEnvironment).toHaveBeenCalledWith('staging', 'production');
  });
});
