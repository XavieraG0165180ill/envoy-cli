import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

jest.mock('../../../../src/crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import { createRoleCommand } from '../role';

function runCommand(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];
  const spyLog = jest.spyOn(console, 'log').mockImplementation((m) => logs.push(m));
  const spyErr = jest.spyOn(console, 'error').mockImplementation((m) => errors.push(m));
  const spyExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  const program = new Command();
  program.addCommand(createRoleCommand());
  let exitCode = 0;
  try {
    program.parse(['node', 'envoy', 'role', ...args]);
  } catch {
    exitCode = 1;
  }
  spyLog.mockRestore();
  spyErr.mockRestore();
  spyExit.mockRestore();
  return { stdout: logs.join('\n'), stderr: errors.join('\n'), exitCode };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-role-cmd-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('role command', () => {
  it('should add a role', () => {
    const { stdout } = runCommand(['add', 'developer', '-p', 'read,write', '-e', 'dev,staging']);
    expect(stdout).toContain('Role "developer" created');
  });

  it('should fail to add duplicate role', () => {
    runCommand(['add', 'admin', '-p', 'admin', '-e', '*']);
    const { stderr, exitCode } = runCommand(['add', 'admin', '-p', 'read', '-e', 'dev']);
    expect(stderr).toContain('already exists');
    expect(exitCode).toBe(1);
  });

  it('should list roles', () => {
    runCommand(['add', 'viewer', '-p', 'read', '-e', '*']);
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('viewer');
  });

  it('should show empty list when no roles', () => {
    const { stdout } = runCommand(['list']);
    expect(stdout).toContain('No roles defined');
  });

  it('should assign a role to a user', () => {
    runCommand(['add', 'ops', '-p', 'write', '-e', 'production']);
    const { stdout } = runCommand(['assign', 'alice', 'ops']);
    expect(stdout).toContain('alice');
    expect(stdout).toContain('ops');
  });

  it('should show user role with whoami', () => {
    runCommand(['add', 'devops', '-p', 'read,write', '-e', '*']);
    runCommand(['assign', 'bob', 'devops']);
    const { stdout } = runCommand(['whoami', 'bob']);
    expect(stdout).toContain('devops');
  });

  it('should show no role for unknown user', () => {
    const { stdout } = runCommand(['whoami', 'ghost']);
    expect(stdout).toContain('no assigned role');
  });

  it('should remove a role', () => {
    runCommand(['add', 'temp', '-p', 'read', '-e', 'dev']);
    const { stdout } = runCommand(['remove', 'temp']);
    expect(stdout).toContain('removed');
  });
});
