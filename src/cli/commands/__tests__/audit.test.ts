import { createAuditCommand } from '../audit';
import * as envAudit from '../../../env/envAudit';

jest.mock('../../../env/envAudit');

const mockLoadAuditLog = envAudit.loadAuditLog as jest.MockedFunction<typeof envAudit.loadAuditLog>;
const mockGetAuditForEnvironment = envAudit.getAuditForEnvironment as jest.MockedFunction<typeof envAudit.getAuditForEnvironment>;
const mockClearAuditLog = envAudit.clearAuditLog as jest.MockedFunction<typeof envAudit.clearAuditLog>;

const sampleEntries = [
  { timestamp: '2024-01-01T10:00:00.000Z', action: 'push' as const, environment: 'production', user: 'alice', details: 'initial push' },
  { timestamp: '2024-01-02T11:00:00.000Z', action: 'pull' as const, environment: 'staging' },
];

describe('audit command', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('shows all audit entries', async () => {
    mockLoadAuditLog.mockReturnValue(sampleEntries);
    const cmd = createAuditCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(mockLoadAuditLog).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2 audit entries'));
  });

  it('filters by environment', async () => {
    mockGetAuditForEnvironment.mockReturnValue([sampleEntries[0]]);
    const cmd = createAuditCommand();
    await cmd.parseAsync(['--env', 'production'], { from: 'user' });
    expect(mockGetAuditForEnvironment).toHaveBeenCalledWith('production');
  });

  it('shows message when no entries found', async () => {
    mockLoadAuditLog.mockReturnValue([]);
    const cmd = createAuditCommand();
    await cmd.parseAsync([], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith('No audit entries found.');
  });

  it('clears the audit log with --clear flag', async () => {
    mockClearAuditLog.mockImplementation(() => {});
    const cmd = createAuditCommand();
    await cmd.parseAsync(['--clear'], { from: 'user' });
    expect(mockClearAuditLog).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith('Audit log cleared.');
  });

  it('respects --limit option', async () => {
    const manyEntries = Array.from({ length: 10 }, (_, i) => ({
      timestamp: `2024-01-0${i + 1}T00:00:00.000Z`,
      action: 'push' as const,
      environment: 'dev',
    }));
    mockLoadAuditLog.mockReturnValue(manyEntries);
    const cmd = createAuditCommand();
    await cmd.parseAsync(['--limit', '3'], { from: 'user' });
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3 audit entries'));
  });
});
