import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Command } from 'commander';

let tmpDir: string;

jest.mock('../../../env/envVersion', () => {
  const actual = jest.requireActual('../../../env/envVersion');
  return { ...actual };
});

jest.mock('../../../crypto/keyManager', () => ({
  ensureEnvoyDir: () => tmpDir,
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-version-cmd-'));
  jest.resetModules();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function runCommand(args: string[]): Promise<string> {
  const { createVersionCommand } = await import('../version');
  const logs: string[] = [];
  jest.spyOn(console, 'log').mockImplementation((...a) => logs.push(a.join(' ')));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const program = new Command();
  program.addCommand(createVersionCommand());
  await program.parseAsync(['node', 'test', 'version', ...args]);
  return logs.join('\n');
}

test('add and list versions', async () => {
  await runCommand(['add', 'staging', 'KEY=value', '-m', 'first']);
  const out = await runCommand(['list', 'staging']);
  expect(out).toContain('staging');
  expect(out).toContain('first');
});

test('list returns empty message when no versions', async () => {
  const out = await runCommand(['list', 'staging']);
  expect(out).toContain('No versions found');
});

test('show version by id', async () => {
  await runCommand(['add', 'production', 'A=1']);
  const { loadVersions } = await import('../../../env/envVersion');
  const versions = loadVersions();
  const id = versions[0].id;
  const out = await runCommand(['show', id]);
  expect(out).toContain(id);
});

test('remove version', async () => {
  await runCommand(['add', 'production', 'A=1']);
  const { loadVersions } = await import('../../../env/envVersion');
  const id = loadVersions()[0].id;
  const out = await runCommand(['remove', id]);
  expect(out).toContain('removed');
  expect(loadVersions()).toHaveLength(0);
});
