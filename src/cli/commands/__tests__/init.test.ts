import { createInitCommand } from '../init';
import * as fs from 'fs';
import * as path from 'path';
import * as keyManager from '../../../crypto/keyManager';

jest.mock('fs');
jest.mock('../../../crypto/keyManager');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockKeyManager = keyManager as jest.Mocked<typeof keyManager>;

describe('createInitCommand', () => {
  const originalCwd = process.cwd;
  const fakeCwd = '/fake/project';

  beforeEach(() => {
    jest.clearAllMocks();
    process.cwd = jest.fn().mockReturnValue(fakeCwd);
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.writeFileSync.mockImplementation(() => undefined);
    mockFs.appendFileSync.mockImplementation(() => undefined);
    mockKeyManager.masterKeyExists.mockReturnValue(false);
    mockKeyManager.generateMasterKey.mockReturnValue('mock-master-key');
    mockKeyManager.saveMasterKey.mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.cwd = originalCwd;
  });

  it('should create the init command with correct name and description', () => {
    const cmd = createInitCommand();
    expect(cmd.name()).toBe('init');
    expect(cmd.description()).toBe('Initialize envoy in the current project directory');
  });

  it('should have --force option', () => {
    const cmd = createInitCommand();
    const forceOption = cmd.options.find((o) => o.long === '--force');
    expect(forceOption).toBeDefined();
  });

  it('should exit with error if already initialized and no --force', async () => {
    mockFs.existsSync.mockReturnValue(true);
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const cmd = createInitCommand();
    await expect(cmd.parseAsync(['node', 'test'], { from: 'user' })).rejects.toThrow();
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it('should generate master key when not exists', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'test'], { from: 'user' });
    expect(mockKeyManager.generateMasterKey).toHaveBeenCalled();
    expect(mockKeyManager.saveMasterKey).toHaveBeenCalledWith('mock-master-key');
  });

  it('should write default config file on fresh init', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'test'], { from: 'user' });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      path.join(fakeCwd, '.envoy', 'config.json'),
      expect.stringContaining('"version"'),
      'utf-8'
    );
  });

  it('should append to .gitignore if it exists', async () => {
    mockFs.existsSync.mockImplementation((p) => {
      return String(p).endsWith('.gitignore');
    });
    mockFs.readFileSync.mockReturnValue('');
    const cmd = createInitCommand();
    await cmd.parseAsync(['node', 'test'], { from: 'user' });
    expect(mockFs.appendFileSync).toHaveBeenCalledWith(
      path.join(fakeCwd, '.gitignore'),
      expect.stringContaining('.envoy/master.key')
    );
  });
});
