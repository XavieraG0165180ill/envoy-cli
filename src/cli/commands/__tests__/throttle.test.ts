import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

jest.mock('../../../env/envThrottle', () => {
  const actual = jest.requireActual('../../../env/envThrottle');
  return { ...actual };
});

jest.mock('../../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-throttle-cmd-test-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

import { createThrottleCommand } from '../throttle';

async function runCommand(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origExit = process.exit;
  let exitCode = 0;

  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errors.push(a.join(' '));
  (process.exit as unknown) = (code: number) => { exitCode = code; throw new Error('exit'); };

  const program = new Command();
  program.addCommand(createThrottleCommand());
  program.exitOverride();

  try {
    await program.parseAsync(['node', 'test', 'throttle', ...args]);
  } catch {
    // ignore exit
  } finally {
    console.log = origLog;
    console.error = origErr;
    (process.exit as unknown) = origExit;
  }

  return { stdout: logs.join('\n'), stderr: errors.join('\n'), exitCode };
}

describe('throttle command', () => {
  it('should set a throttle policy', async () => {
    const { stdout } = await runCommand(['set', 'production', '10', '100']);
    expect(stdout).toContain('Throttle policy set');
    expect(stdout).toContain('production');
  });

  it('should reject invalid perMinute value', async () => {
    const { stderr, exitCode } = await runCommand(['set', 'production', 'abc', '100']);
    expect(stderr).toContain('positive integers');
    expect(exitCode).toBe(1);
  });

  it('should list policies after setting', async () => {
    await runCommand(['set', 'staging', '5', '50']);
    const { stdout } = await runCommand(['list']);
    expect(stdout).toContain('staging');
  });

  it('should show empty list message when no policies', async () => {
    const { stdout } = await runCommand(['list']);
    expect(stdout).toContain('No throttle policies');
  });

  it('should remove an existing policy', async () => {
    await runCommand(['set', 'dev', '3', '30']);
    const { stdout } = await runCommand(['remove', 'dev']);
    expect(stdout).toContain('removed');
  });

  it('should error when removing non-existent policy', async () => {
    const { stderr, exitCode } = await runCommand(['remove', 'ghost']);
    expect(stderr).toContain('No throttle policy');
    expect(exitCode).toBe(1);
  });

  it('should allow check when within limits', async () => {
    await runCommand(['set', 'dev', '10', '100']);
    const { stdout } = await runCommand(['check', 'dev']);
    expect(stdout).toContain('allowed');
  });
});
