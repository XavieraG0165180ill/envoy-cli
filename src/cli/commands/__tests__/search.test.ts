import { createSearchCommand } from '../search';
import * as envSearch from '../../../env/envSearch';
import * as envStore from '../../../env/envStore';

jest.mock('../../../env/envSearch');
jest.mock('../../../env/envStore');

const mockResults = [
  { environment: 'production', key: 'API_KEY', value: 'secret', line: 1 },
  { environment: 'staging', key: 'API_KEY', value: 'staging-secret', line: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
  (envStore.listEnvironments as jest.Mock).mockResolvedValue(['production', 'staging']);
  (envSearch.searchAcrossEnvironments as jest.Mock).mockResolvedValue(mockResults);
  (envSearch.searchInEnvironment as jest.Mock).mockResolvedValue([mockResults[0]]);
});

async function runCommand(args: string[]) {
  const cmd = createSearchCommand();
  await cmd.parseAsync(['node', 'envoy', ...args]);
}

describe('createSearchCommand', () => {
  it('searches across all environments by key pattern', async () => {
    await runCommand(['--key', 'API_KEY']);
    expect(envSearch.searchAcrossEnvironments).toHaveBeenCalledWith(
      ['production', 'staging'],
      expect.objectContaining({ keyPattern: 'API_KEY' })
    );
  });

  it('limits search to specified environment', async () => {
    await runCommand(['--key', 'API_KEY', '--env', 'production']);
    expect(envSearch.searchInEnvironment).toHaveBeenCalledWith(
      'production',
      expect.objectContaining({ keyPattern: 'API_KEY' })
    );
  });

  it('passes value pattern to search', async () => {
    await runCommand(['--value', 'secret']);
    expect(envSearch.searchAcrossEnvironments).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ valuePattern: 'secret' })
    );
  });

  it('passes case-sensitive flag', async () => {
    await runCommand(['--key', 'API', '--case-sensitive']);
    expect(envSearch.searchAcrossEnvironments).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ caseSensitive: true })
    );
  });

  it('passes exact match flag', async () => {
    await runCommand(['--key', 'API_KEY', '--exact']);
    expect(envSearch.searchAcrossEnvironments).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ exactMatch: true })
    );
  });

  it('exits with error when no pattern provided', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    await expect(runCommand([])).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
  });

  it('shows message when no results found', async () => {
    (envSearch.searchAcrossEnvironments as jest.Mock).mockResolvedValue([]);
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await runCommand(['--key', 'NONEXISTENT']);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No matching entries found'));
    consoleSpy.mockRestore();
  });
});
