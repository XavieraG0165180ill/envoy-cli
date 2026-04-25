import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Command } from 'commander';
import { createCascadeCommand } from '../cascade';
import { saveCascadeConfig, loadCascadeConfig } from '../../../env/envCascade';
import { getStorePath } from '../../../env/envStore';

let tmpDir: string;
let originalCwd: () => string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-cascade-cmd-'));
  fs.mkdirSync(path.join(tmpDir, '.envoy', 'store'), { recursive: true });
  originalCwd = process.cwd;
  jest.spyOn(process, 'cwd').mockReturnValue(tmpDir);
});

afterEach(() => {
  (process.cwd as jest.Mock).mockRestore();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function runCommand(args: string[]): Promise<string> {
  const program = new Command();
  program.addCommand(createCascadeCommand());
  const logs: string[] = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.join(' ')));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await program.parseAsync(['node', 'envoy', ...args]);
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
  return logs.join('\n');
}

test('cascade set stores configuration', async () => {
  await runCommand(['cascade', 'set', 'prod', '-e', 'base,staging']);
  const config = loadCascadeConfig(tmpDir);
  expect(config).not.toBeNull();
  expect(config!.environments).toEqual(['base', 'staging']);
  expect(config!.strategy).toBe('override');
});

test('cascade set with merge strategy', async () => {
  await runCommand(['cascade', 'set', 'prod', '-e', 'base', '-s', 'merge']);
  const config = loadCascadeConfig(tmpDir);
  expect(config!.strategy).toBe('merge');
});

test('cascade show prints configuration', async () => {
  saveCascadeConfig(tmpDir, { environments: ['base', 'staging'], strategy: 'override' });
  const output = await runCommand(['cascade', 'show']);
  expect(output).toContain('override');
  expect(output).toContain('base');
});

test('cascade show prints message when no config', async () => {
  const output = await runCommand(['cascade', 'show']);
  expect(output).toContain('No cascade configuration found');
});

test('cascade resolve outputs merged env', async () => {
  fs.writeFileSync(getStorePath(tmpDir, 'base'), 'HELLO=world\n');
  fs.writeFileSync(getStorePath(tmpDir, 'prod'), 'EXTRA=value\n');
  saveCascadeConfig(tmpDir, { environments: ['base'], strategy: 'override' });
  const output = await runCommand(['cascade', 'resolve', 'prod']);
  expect(output).toContain('HELLO=world');
  expect(output).toContain('EXTRA=value');
});

test('cascade remove deletes configuration', async () => {
  saveCascadeConfig(tmpDir, { environments: ['base'], strategy: 'merge' });
  await runCommand(['cascade', 'remove']);
  expect(loadCascadeConfig(tmpDir)).toBeNull();
});
