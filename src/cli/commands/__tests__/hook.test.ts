import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

jest.mock('../../../env/envHook', () => {
  const actual = jest.requireActual('../../../env/envHook');
  return actual;
});

jest.mock('../../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

import { createHookCommand } from '../hook';

function runCommand(args: string[]): { stdout: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];
  const spyLog = jest.spyOn(console, 'log').mockImplementation((m) => logs.push(m));
  const spyErr = jest.spyOn(console, 'error').mockImplementation((m) => errors.push(m));
  const spyExit = jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  const program = new Command();
  program.addCommand(createHookCommand());
  try {
    program.parse(['node', 'test', ...args], { from: 'user' });
  } catch {}
  spyLog.mockRestore();
  spyErr.mockRestore();
  spyExit.mockRestore();
  return { stdout: [...logs, ...errors].join('\n'), exitCode: 0 };
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-hook-cmd-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('hook add', () => {
  it('registers a valid hook', () => {
    const { stdout } = runCommand(['hook', 'add', 'pre-push', 'production', 'npm test']);
    expect(stdout).toContain('Hook registered:');
  });

  it('rejects an invalid event', () => {
    const { stdout } = runCommand(['hook', 'add', 'bad-event', 'production', 'cmd']);
    expect(stdout).toContain('Invalid event');
  });
});

describe('hook list', () => {
  it('shows no hooks message when empty', () => {
    const { stdout } = runCommand(['hook', 'list']);
    expect(stdout).toContain('No hooks registered');
  });

  it('lists hooks after adding', () => {
    runCommand(['hook', 'add', 'post-pull', 'staging', 'echo done']);
    const { stdout } = runCommand(['hook', 'list']);
    expect(stdout).toContain('post-pull');
    expect(stdout).toContain('staging');
  });
});

describe('hook disable / enable', () => {
  it('disables a hook', () => {
    runCommand(['hook', 'add', 'pre-push', 'dev', 'lint']);
    const { loadHooks } = require('../../../env/envHook');
    const id = Object.keys(loadHooks())[0];
    runCommand(['hook', 'disable', id]);
    expect(loadHooks()[id].enabled).toBe(false);
  });
});

describe('hook remove', () => {
  it('removes a hook by id', () => {
    runCommand(['hook', 'add', 'post-push', 'dev', 'deploy']);
    const { loadHooks } = require('../../../env/envHook');
    const id = Object.keys(loadHooks())[0];
    runCommand(['hook', 'remove', id]);
    expect(loadHooks()[id]).toBeUndefined();
  });

  it('errors on unknown id', () => {
    const { stdout } = runCommand(['hook', 'remove', 'ghost-id']);
    expect(stdout).toContain('not found');
  });
});
