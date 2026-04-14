import { createBackupCommand, formatBackup } from '../backup';
import * as envBackup from '../../../env/envBackup';
import * as envStore from '../../../env/envStore';
import * as fs from 'fs';

jest.mock('fs');
jest.mock('../../../env/envBackup');
jest.mock('../../../env/envStore');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockBackup = envBackup as jest.Mocked<typeof envBackup>;
const mockStore = envStore as jest.Mocked<typeof envStore>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as never);
});

describe('formatBackup', () => {
  it('formats entry without description', () => {
    const result = formatBackup({ id: 'abc', createdAt: '2024-01-01T00:00:00Z' });
    expect(result).toBe('[abc] 2024-01-01T00:00:00Z');
  });

  it('formats entry with description', () => {
    const result = formatBackup({ id: 'abc', createdAt: '2024-01-01T00:00:00Z', description: 'test' });
    expect(result).toBe('[abc] 2024-01-01T00:00:00Z — test');
  });
});

describe('backup create', () => {
  it('creates a backup for an existing environment', async () => {
    mockStore.getStorePath.mockReturnValue('/mock/.envoy/production.enc');
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue('encrypted-data');
    mockBackup.saveBackup.mockReturnValue({ id: '1', environment: 'production', createdAt: '2024-01-01', data: 'encrypted-data' });
    const cmd = createBackupCommand();
    await cmd.parseAsync(['create', 'production'], { from: 'user' });
    expect(mockBackup.saveBackup).toHaveBeenCalledWith('production', 'encrypted-data', undefined);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[1]'));
  });

  it('exits if environment store not found', async () => {
    mockStore.getStorePath.mockReturnValue('/mock/.envoy/missing.enc');
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['create', 'missing'], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('backup list', () => {
  it('lists backups for an environment', async () => {
    mockBackup.loadBackups.mockReturnValue([
      { id: 'b1', environment: 'staging', createdAt: '2024-01-01', data: 'x' },
    ]);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['list', 'staging'], { from: 'user' });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('[b1]'));
  });

  it('shows message when no backups exist', async () => {
    mockBackup.loadBackups.mockReturnValue([]);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['list', 'staging'], { from: 'user' });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No backups found'));
  });
});

describe('backup restore', () => {
  it('restores environment from backup', async () => {
    mockBackup.getBackupById.mockReturnValue({ id: 'b1', environment: 'production', createdAt: '2024-01-01', data: 'restored-data' });
    mockStore.getStorePath.mockReturnValue('/mock/.envoy/production.enc');
    (mockFs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['restore', 'production', 'b1'], { from: 'user' });
    expect(mockFs.writeFileSync).toHaveBeenCalledWith('/mock/.envoy/production.enc', 'restored-data');
  });

  it('exits if backup not found', async () => {
    mockBackup.getBackupById.mockReturnValue(undefined);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['restore', 'production', 'missing'], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});

describe('backup delete', () => {
  it('deletes a backup', async () => {
    mockBackup.deleteBackup.mockReturnValue(true);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['delete', 'production', 'b1'], { from: 'user' });
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('deleted'));
  });

  it('exits if backup not found', async () => {
    mockBackup.deleteBackup.mockReturnValue(false);
    const cmd = createBackupCommand();
    await cmd.parseAsync(['delete', 'production', 'missing'], { from: 'user' });
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
