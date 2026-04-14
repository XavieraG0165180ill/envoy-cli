import * as fs from 'fs';
import * as path from 'path';
import {
  loadBackups,
  saveBackup,
  deleteBackup,
  getBackupById,
  clearBackups,
  getBackupFilePath,
} from '../envBackup';

jest.mock('fs');
jest.mock('../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => '/mock/.envoy',
}));

const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockFs.existsSync as jest.Mock).mockReturnValue(false);
  (mockFs.mkdirSync as jest.Mock).mockReturnValue(undefined);
});

describe('loadBackups', () => {
  it('returns empty array when file does not exist', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    expect(loadBackups('production')).toEqual([]);
  });

  it('returns parsed backups when file exists', () => {
    const data = [{ id: '1', environment: 'production', createdAt: '2024-01-01', data: 'enc' }];
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(data));
    expect(loadBackups('production')).toEqual(data);
  });

  it('returns empty array on parse error', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue('invalid json');
    expect(loadBackups('production')).toEqual([]);
  });
});

describe('saveBackup', () => {
  it('saves a new backup entry and returns it', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    (mockFs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    const entry = saveBackup('staging', 'encrypted-data', 'before deploy');
    expect(entry.environment).toBe('staging');
    expect(entry.data).toBe('encrypted-data');
    expect(entry.description).toBe('before deploy');
    expect(entry.id).toBeDefined();
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });
});

describe('deleteBackup', () => {
  it('returns false if backup not found', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify([]));
    expect(deleteBackup('production', 'nonexistent')).toBe(false);
  });

  it('removes the backup and returns true', () => {
    const data = [{ id: 'abc', environment: 'production', createdAt: '2024-01-01', data: 'x' }];
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(data));
    (mockFs.writeFileSync as jest.Mock).mockReturnValue(undefined);
    expect(deleteBackup('production', 'abc')).toBe(true);
  });
});

describe('getBackupById', () => {
  it('returns the backup entry if found', () => {
    const data = [{ id: 'xyz', environment: 'dev', createdAt: '2024-01-01', data: 'val' }];
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(data));
    expect(getBackupById('dev', 'xyz')).toEqual(data[0]);
  });

  it('returns undefined if not found', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(false);
    expect(getBackupById('dev', 'missing')).toBeUndefined();
  });
});

describe('clearBackups', () => {
  it('deletes the backup file if it exists', () => {
    (mockFs.existsSync as jest.Mock).mockReturnValue(true);
    (mockFs.unlinkSync as jest.Mock).mockReturnValue(undefined);
    clearBackups('production');
    expect(mockFs.unlinkSync).toHaveBeenCalled();
  });
});
