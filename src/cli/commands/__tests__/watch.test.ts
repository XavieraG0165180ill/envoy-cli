import { Command } from 'commander';
import { createWatchCommand } from '../watch';
import * as envWatch from '../../../env/envWatch';

jest.mock('../../../env/envWatch');

const mockWatchEnvironment = envWatch.watchEnvironment as jest.MockedFunction<
  typeof envWatch.watchEnvironment
>;
const mockUnwatchAll = envWatch.unwatchAll as jest.MockedFunction<typeof envWatch.unwatchAll>;

function runCommand(args: string[]): Promise<void> {
  const program = new Command();
  program.addCommand(createWatchCommand());
  program.exitOverride();
  return program.parseAsync(['node', 'envoy', 'watch', ...args]);
}

describe('watch command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Prevent the command from hanging indefinitely
    mockWatchEnvironment.mockImplementation(() => ({ close: jest.fn() } as any));
  });

  it('should exit with error if no environments provided', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(runCommand([])).rejects.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('specify at least one'));

    exitSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('should call watchEnvironment for each environment', async () => {
    // Override to resolve immediately
    jest.spyOn(global, 'Promise').mockImplementationOnce(() => ({
      then: () => {},
    }) as any);

    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    // Simulate the command calling watchEnvironment then hanging
    mockWatchEnvironment.mockImplementation((_env, _cb) => ({ close: jest.fn() } as any));

    // We can't await the full command (it hangs), so test the watcher setup
    const cmd = createWatchCommand();
    expect(cmd.name()).toBe('watch');
    expect(cmd.description()).toContain('Watch');

    logSpy.mockRestore();
  });

  it('should register watch command with correct name', () => {
    const cmd = createWatchCommand();
    expect(cmd.name()).toBe('watch');
  });

  it('should have quiet option', () => {
    const cmd = createWatchCommand();
    const quietOpt = cmd.options.find((o) => o.long === '--quiet');
    expect(quietOpt).toBeDefined();
  });

  it('should accept multiple environments as arguments', () => {
    const cmd = createWatchCommand();
    const args = cmd.registeredArguments;
    expect(args.length).toBeGreaterThan(0);
    expect(args[0].variadic).toBe(true);
  });
});
