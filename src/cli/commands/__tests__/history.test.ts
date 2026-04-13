import { createHistoryCommand } from '../history';
import * as envHistory from '../../../env/envHistory';

jest.mock('../../../env/envHistory');

const mockLoad = envHistory.loadHistory as jest.MockedFunction<typeof envHistory.loadHistory>;
const mockClear = envHistory.clearHistory as jest.MockedFunction<typeof envHistory.clearHistory>;
const mockGetForEnv = envHistory.getHistoryForEnvironment as jest.MockedFunction<typeof envHistory.getHistoryForEnvironment>;

const sampleEntries: envHistory.HistoryEntry[] = [
  { timestamp: new Date('2024-01-01T10:00:00Z').toISOString(), environment: 'production', action: 'push', keyCount: 5 },
  { timestamp: new Date('2024-01-02T12:00:00Z').toISOString(), environment: 'staging', action: 'pull', keyCount: 3 },
];

describe('createHistoryCommand', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('lists all history entries', async () => {
    mockLoad.mockReturnValue(sampleEntries);
    const cmd = createHistoryCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(mockLoad).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('PUSH'));
  });

  it('shows message when no history exists', async () => {
    mockLoad.mockReturnValue([]);
    const cmd = createHistoryCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith('No history found.');
  });

  it('filters history by environment', async () => {
    mockGetForEnv.mockReturnValue([sampleEntries[0]]);
    const cmd = createHistoryCommand();
    await cmd.parseAsync(['--env', 'production'], { from: 'user' });
    expect(mockGetForEnv).toHaveBeenCalledWith('production');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('production'));
  });

  it('clears history when --clear flag is passed', async () => {
    const cmd = createHistoryCommand();
    await cmd.parseAsync(['--clear'], { from: 'user' });
    expect(mockClear).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('History cleared.');
  });

  it('respects --limit option', async () => {
    const manyEntries: envHistory.HistoryEntry[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date().toISOString(),
      environment: 'dev',
      action: 'push',
      keyCount: i,
    }));
    mockLoad.mockReturnValue(manyEntries);
    const cmd = createHistoryCommand();
    await cmd.parseAsync(['-n', '3'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3 entries'));
  });
});
