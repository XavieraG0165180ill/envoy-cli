import { createStatusCommand } from '../status';
import * as envStatus from '../../../env/envStatus';

jest.mock('../../../env/envStatus');

const mockStatus: envStatus.EnvStatus = {
  environment: 'production',
  exists: true,
  locked: false,
  expired: false,
  tags: ['stable', 'v2'],
  sizeBytes: 256,
  lastModified: '2024-01-01T00:00:00.000Z',
};

async function runCommand(...args: string[]) {
  const cmd = createStatusCommand();
  const logs: string[] = [];
  const errors: string[] = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.join(' ')));
  jest.spyOn(console, 'error').mockImplementation((...a) => errors.push(a.join(' ')));
  await cmd.parseAsync(args, { from: 'user' });
  return { logs, errors };
}

beforeEach(() => jest.clearAllMocks());

test('shows status for a single environment', async () => {
  (envStatus.getEnvStatus as jest.Mock).mockResolvedValue(mockStatus);
  const { logs } = await runCommand('production');
  expect(logs.some(l => l.includes('production'))).toBe(true);
  expect(logs.some(l => l.includes('stable'))).toBe(true);
});

test('outputs JSON when --json flag is set', async () => {
  (envStatus.getEnvStatus as jest.Mock).mockResolvedValue(mockStatus);
  const { logs } = await runCommand('production', '--json');
  const parsed = JSON.parse(logs[0]);
  expect(parsed.environment).toBe('production');
  expect(parsed.tags).toContain('stable');
});

test('lists all environments when no argument given', async () => {
  (envStatus.getAllEnvStatuses as jest.Mock).mockResolvedValue([mockStatus]);
  const { logs } = await runCommand();
  expect(logs.some(l => l.includes('production'))).toBe(true);
});

test('shows message when no environments found', async () => {
  (envStatus.getAllEnvStatuses as jest.Mock).mockResolvedValue([]);
  const { logs } = await runCommand();
  expect(logs.some(l => l.includes('No environments found'))).toBe(true);
});

test('handles errors gracefully', async () => {
  (envStatus.getEnvStatus as jest.Mock).mockRejectedValue(new Error('disk error'));
  const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  await expect(runCommand('staging')).rejects.toThrow('exit');
  mockExit.mockRestore();
});
