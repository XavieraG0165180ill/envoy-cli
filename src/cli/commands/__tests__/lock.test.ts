import { createLockCommand } from '../lock';
import * as envLock from '../../../env/envLock';

jest.mock('../../../env/envLock');

const mockLockEnvironment = envLock.lockEnvironment as jest.Mock;
const mockUnlockEnvironment = envLock.unlockEnvironment as jest.Mock;
const mockIsLocked = envLock.isLocked as jest.Mock;
const mockListLocks = envLock.listLocks as jest.Mock;

function runCommand(args: string[]): { stdout: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];
  const spyLog = jest.spyOn(console, 'log').mockImplementation((m) => logs.push(m));
  const spyError = jest.spyOn(console, 'error').mockImplementation((m) => errors.push(m));
  const spyExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

  const cmd = createLockCommand();
  try {
    cmd.parse(['node', 'envoy', ...args]);
  } catch {}

  spyLog.mockRestore();
  spyError.mockRestore();
  spyExit.mockRestore();

  return { stdout: [...logs, ...errors].join('\n'), exitCode: 0 };
}

describe('lock command', () => {
  beforeEach(() => jest.clearAllMocks());

  it('locks an environment successfully', () => {
    mockIsLocked.mockReturnValue(null);
    const { stdout } = runCommand(['set', 'production', '--user', 'alice']);
    expect(mockLockEnvironment).toHaveBeenCalledWith('production', 'alice', undefined);
    expect(stdout).toContain('locked by alice');
  });

  it('fails if environment is already locked', () => {
    mockIsLocked.mockReturnValue({ environment: 'production', lockedBy: 'bob', lockedAt: new Date().toISOString() });
    const { stdout } = runCommand(['set', 'production']);
    expect(stdout).toContain('already locked by bob');
    expect(mockLockEnvironment).not.toHaveBeenCalled();
  });

  it('unlocks an environment successfully', () => {
    mockUnlockEnvironment.mockReturnValue(true);
    const { stdout } = runCommand(['unset', 'staging']);
    expect(mockUnlockEnvironment).toHaveBeenCalledWith('staging');
    expect(stdout).toContain('unlocked');
  });

  it('fails to unlock a non-locked environment', () => {
    mockUnlockEnvironment.mockReturnValue(false);
    const { stdout } = runCommand(['unset', 'staging']);
    expect(stdout).toContain('is not locked');
  });

  it('shows lock status for a locked environment', () => {
    mockIsLocked.mockReturnValue({ environment: 'production', lockedBy: 'alice', lockedAt: new Date().toISOString(), reason: 'deploy' });
    const { stdout } = runCommand(['status', 'production']);
    expect(stdout).toContain('alice');
    expect(stdout).toContain('deploy');
  });

  it('shows not locked status', () => {
    mockIsLocked.mockReturnValue(null);
    const { stdout } = runCommand(['status', 'development']);
    expect(stdout).toContain('is not locked');
  });

  it('lists all locked environments', () => {
    mockListLocks.mockReturnValue([
      { environment: 'production', lockedBy: 'alice', lockedAt: new Date().toISOString() },
    ]);
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('production');
    expect(stdout).toContain('alice');
  });

  it('shows message when no environments are locked', () => {
    mockListLocks.mockReturnValue([]);
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('No environments are currently locked');
  });
});
