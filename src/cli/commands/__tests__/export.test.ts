import { formatEnv, createExportCommand, ExportFormat } from '../export';
import * as keyManager from '../../../crypto/keyManager';
import * as envSync from '../../../env/envSync';
import * as fs from 'fs';

jest.mock('../../../crypto/keyManager');
jest.mock('../../../env/envSync');
jest.mock('fs');

const mockRecord: Record<string, string> = {
  API_KEY: 'abc123',
  DB_URL: 'postgres://localhost/db',
};

describe('formatEnv', () => {
  it('formats as dotenv by default', () => {
    const result = formatEnv(mockRecord, 'dotenv');
    expect(result).toContain('API_KEY=abc123');
    expect(result).toContain('DB_URL=postgres://localhost/db');
  });

  it('formats as JSON', () => {
    const result = formatEnv(mockRecord, 'json');
    const parsed = JSON.parse(result);
    expect(parsed.API_KEY).toBe('abc123');
    expect(parsed.DB_URL).toBe('postgres://localhost/db');
  });

  it('formats as shell exports', () => {
    const result = formatEnv(mockRecord, 'shell');
    expect(result).toContain('export API_KEY="abc123"');
    expect(result).toContain('export DB_URL="postgres://localhost/db"');
  });

  it('escapes double quotes in shell format', () => {
    const result = formatEnv({ VAL: 'say "hello"' }, 'shell');
    expect(result).toContain('export VAL="say \\"hello\\""');
  });
});

describe('createExportCommand', () => {
  const mockKey = Buffer.from('masterkey123456789012345678901234');

  beforeEach(() => {
    jest.clearAllMocks();
    (keyManager.loadMasterKey as jest.Mock).mockResolvedValue(mockKey);
    (envSync.pullEnvironment as jest.Mock).mockResolvedValue(mockRecord);
  });

  it('prints dotenv output to stdout by default', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const cmd = createExportCommand();
    await cmd.parseAsync(['node', 'envoy', 'production'], { from: 'user' });
    expect(envSync.pullEnvironment).toHaveBeenCalledWith('production', mockKey);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('writes to file when --output is specified', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    const cmd = createExportCommand();
    await cmd.parseAsync(['node', 'envoy', 'production', '--output', '/tmp/out.env'], { from: 'user' });
    expect(fs.writeFileSync).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('exits with error when no master key found', async () => {
    (keyManager.loadMasterKey as jest.Mock).mockResolvedValue(null);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const cmd = createExportCommand();
    await expect(cmd.parseAsync(['node', 'envoy', 'production'], { from: 'user' })).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
