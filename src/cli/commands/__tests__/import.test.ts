import { createImportCommand } from '../import';
import * as envImport from '../../../env/envImport';
import * as envStore from '../../../env/envStore';
import * as envAudit from '../../../env/envAudit';

jest.mock('../../../env/envImport');
jest.mock('../../../env/envStore');
jest.mock('../../../env/envAudit');

const mockedImport = envImport as jest.Mocked<typeof envImport>;
const mockedStore = envStore as jest.Mocked<typeof envStore>;
const mockedAudit = envAudit as jest.Mocked<typeof envAudit>;

describe('import command', () => {
  let consoleSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    mockedStore.loadEnvStore.mockReturnValue({});
    mockedStore.saveEnvStore.mockImplementation(() => {});
    mockedAudit.appendAuditEntry.mockImplementation(() => {});
  });

  afterEach(() => jest.clearAllMocks());

  it('imports variables and saves to store', async () => {
    mockedImport.importEnvFile.mockReturnValue({ entries: [{ key: 'FOO', value: 'bar' }], count: 1, format: 'dotenv' });
    const cmd = createImportCommand();
    await cmd.parseAsync(['.env', '--env', 'staging'], { from: 'user' });
    expect(mockedStore.saveEnvStore).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Imported 1'));
  });

  it('merges with existing variables when --merge flag is set', async () => {
    mockedImport.importEnvFile.mockReturnValue({ entries: [{ key: 'NEW', value: 'val' }], count: 1, format: 'json' });
    mockedStore.loadEnvStore.mockReturnValue({ production: [{ key: 'EXISTING', value: 'x' }] });
    const cmd = createImportCommand();
    await cmd.parseAsync(['.env', '--env', 'production', '--merge'], { from: 'user' });
    const savedStore = mockedStore.saveEnvStore.mock.calls[0][0];
    expect(savedStore.production).toHaveLength(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Merged'));
  });

  it('shows preview in dry-run mode without saving', async () => {
    mockedImport.importEnvFile.mockReturnValue({ entries: [{ key: 'KEY', value: 'val' }], count: 1, format: 'yaml' });
    const cmd = createImportCommand();
    await cmd.parseAsync(['.env', '--dry-run'], { from: 'user' });
    expect(mockedStore.saveEnvStore).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('dry-run'));
  });

  it('exits with error when import fails', async () => {
    mockedImport.importEnvFile.mockImplementation(() => { throw new Error('File not found'); });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const cmd = createImportCommand();
    await expect(cmd.parseAsync(['/bad/path.env'], { from: 'user' })).rejects.toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Import failed'));
  });
});
