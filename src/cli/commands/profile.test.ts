import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { createProfileCommand } from '../profile';
import * as envProfile from '../../../env/envProfile';

jest.mock('../../../env/envProfile');

const mockLoadProfiles = envProfile.loadProfiles as jest.MockedFunction<typeof envProfile.loadProfiles>;
const mockAddProfile = envProfile.addProfile as jest.MockedFunction<typeof envProfile.addProfile>;
const mockRemoveProfile = envProfile.removeProfile as jest.MockedFunction<typeof envProfile.removeProfile>;
const mockGetProfile = envProfile.getProfile as jest.MockedFunction<typeof envProfile.getProfile>;

function runCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const logs: string[] = [];
    const errors: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...a) => logs.push(a.join(' '));
    console.error = (...a) => errors.push(a.join(' '));

    const program = new Command();
    program.addCommand(createProfileCommand());
    program.exitOverride();

    try {
      program.parse(['node', 'test', ...args]);
    } catch {
      // ignore exit
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    resolve({ stdout: logs.join('\n'), stderr: errors.join('\n') });
  });
}

describe('profile command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists profiles', async () => {
    mockLoadProfiles.mockResolvedValue([
      { name: 'dev', environment: 'development', description: 'Dev profile' },
      { name: 'prod', environment: 'production', description: 'Prod profile' },
    ]);
    const { stdout } = await runCommand(['profile', 'list']);
    expect(stdout).toContain('dev');
    expect(stdout).toContain('prod');
  });

  it('shows empty message when no profiles', async () => {
    mockLoadProfiles.mockResolvedValue([]);
    const { stdout } = await runCommand(['profile', 'list']);
    expect(stdout).toContain('No profiles');
  });

  it('adds a profile', async () => {
    mockAddProfile.mockResolvedValue(undefined);
    const { stdout } = await runCommand(['profile', 'add', 'dev', 'development']);
    expect(mockAddProfile).toHaveBeenCalledWith('dev', 'development', undefined);
    expect(stdout).toContain('dev');
  });

  it('removes a profile', async () => {
    mockRemoveProfile.mockResolvedValue(undefined);
    const { stdout } = await runCommand(['profile', 'remove', 'dev']);
    expect(mockRemoveProfile).toHaveBeenCalledWith('dev');
    expect(stdout).toContain('dev');
  });

  it('shows a profile', async () => {
    mockGetProfile.mockResolvedValue({ name: 'dev', environment: 'development', description: 'Dev' });
    const { stdout } = await runCommand(['profile', 'show', 'dev']);
    expect(stdout).toContain('development');
  });

  it('handles missing profile on show', async () => {
    mockGetProfile.mockResolvedValue(null);
    const { stderr } = await runCommand(['profile', 'show', 'missing']);
    expect(stderr).toContain('missing');
  });
});
